import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, setSessionExpiredHandler, tokens } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const { access } = await tokens.get();
      if (!access) return setUser(null);
      const { data } = await api.get('/auth/me/');
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => setUser(null));
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login/', { email: email.trim().toLowerCase(), password });
    await tokens.set(data);
    setUser(data.user);
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register/', payload);
    await tokens.set(data);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const { refresh } = await tokens.get();
    try {
      await api.post('/auth/logout/', { refresh });
    } catch {
      // Déconnexion locale même si le serveur est injoignable
    }
    await tokens.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, login, register, logout, reload: loadUser }),
    [user, loading, login, register, logout, loadUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
