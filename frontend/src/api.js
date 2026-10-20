import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * URL de l'API Django.
 * - EXPO_PUBLIC_API_URL si défini (production)
 * - Web : même hôte que la page, port 8000
 * - Mobile (Expo Go) : IP de la machine qui sert le bundle, port 8000
 */
function resolveApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000/api`;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:8000/api`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://localhost:8000/api';
}

export const API_URL = resolveApiUrl();

const KEYS = { access: 'gf.access', refresh: 'gf.refresh' };

export const tokens = {
  async get() {
    const [access, refresh] = await Promise.all([
      AsyncStorage.getItem(KEYS.access),
      AsyncStorage.getItem(KEYS.refresh),
    ]);
    return { access, refresh };
  },
  async set({ access, refresh }) {
    if (access) await AsyncStorage.setItem(KEYS.access, access);
    if (refresh) await AsyncStorage.setItem(KEYS.refresh, refresh);
  },
  async clear() {
    await AsyncStorage.multiRemove([KEYS.access, KEYS.refresh]);
  },
};

export const api = axios.create({ baseURL: API_URL, timeout: 20000 });

let onSessionExpired = () => {};
export const setSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

api.interceptors.request.use(async (config) => {
  const { access } = await tokens.get();
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

let refreshing = null;

async function refreshAccess() {
  const { refresh } = await tokens.get();
  if (!refresh) throw new Error('no refresh token');
  const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
  await tokens.set(data);
  return data.access;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        refreshing = refreshing || refreshAccess();
        const access = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      } catch {
        refreshing = null;
        await tokens.clear();
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  },
);

/** Extrait un message d'erreur lisible depuis une réponse DRF. */
export function errorMessage(error, fallback = 'Une erreur est survenue.') {
  const data = error?.response?.data;
  if (!error?.response) return "Impossible de joindre le serveur. Vérifiez votre connexion.";
  if (typeof data === 'string') return fallback;
  if (data?.detail) return data.detail;
  if (data && typeof data === 'object') {
    const first = Object.entries(data)[0];
    if (first) {
      const [field, value] = first;
      const text = Array.isArray(value) ? (typeof value[0] === 'object' ? JSON.stringify(value[0]) : value[0]) : String(value);
      return field === 'non_field_errors' ? text : `${field} : ${text}`;
    }
  }
  return fallback;
}

/** Envoi multipart (logo / signature) compatible web et mobile. */
export async function uploadForm(path, fields, method = 'PATCH') {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value && typeof value === 'object' && value.uri) {
      if (Platform.OS === 'web') {
        const blob = value.file || (await (await fetch(value.uri)).blob());
        form.append(key, blob, value.name);
      } else {
        form.append(key, { uri: value.uri, name: value.name, type: value.type || 'image/png' });
      }
    } else if (value !== undefined && value !== null) {
      form.append(key, String(value));
    }
  }
  const { access } = await tokens.get();
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${access}` },
    body: form,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('upload failed');
    error.response = { status: response.status, data };
    throw error;
  }
  return data;
}
