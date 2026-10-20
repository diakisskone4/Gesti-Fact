import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { api, errorMessage, uploadForm } from '../../src/api';
import { useAuth } from '../../src/auth';
import { Button, Card, confirm, Input, Loader, notify, Screen, SectionTitle } from '../../src/components/ui';
import { fetchCompany, useFocusFetch } from '../../src/hooks';
import { colors } from '../../src/theme';

const FIELDS = [
  ['name', 'Raison sociale *'],
  ['slogan', 'Slogan / activité'],
  ['address', 'Adresse'],
  ['phone', 'Téléphone'],
  ['email', 'Email'],
  ['website', 'Site web'],
  ['legal_ids', 'RCCM / NCC / IFU'],
  ['bank_details', 'Coordonnées bancaires'],
  ['signatory_name', 'Nom du signataire'],
  ['signatory_title', 'Titre du signataire (ex. Le Directeur Général)'],
  ['footer_note', 'Mention de bas de page'],
];
const PALETTE = ['#1F3A5F', '#0F766E', '#7C2D12', '#4C1D95', '#111827', '#9D174D'];

export default function Settings() {
  const { user, logout } = useAuth();
  const { data: company, setData, loading } = useFocusFetch(fetchCompany);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState('');

  useEffect(() => {
    if (company && !form) setForm(company);
  }, [company, form]);

  if (loading || !form) return <Loader />;
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const { logo, signature, id, ...payload } = form;
      const { data } = await api.patch('/company/', {
        ...payload,
        default_tva_rate: String(payload.default_tva_rate).replace(',', '.'),
      });
      setData(data);
      setForm(data);
      notify('Paramètres enregistrés');
    } catch (e) {
      notify('Erreur', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const pickImage = async (field) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(field);
    try {
      const data = await uploadForm('/company/', {
        [field]: {
          uri: asset.uri,
          file: asset.file,
          name: asset.fileName || `${field}.png`,
          type: asset.mimeType || 'image/png',
        },
      });
      setData(data);
      setForm((f) => ({ ...f, [field]: data[field] }));
    } catch (e) {
      notify('Envoi impossible', errorMessage(e));
    } finally {
      setUploading('');
    }
  };

  const clearImage = async (field) => {
    const data = await uploadForm('/company/', { [field]: '' });
    setData(data);
    setForm((f) => ({ ...f, [field]: null }));
  };

  const doLogout = async () => {
    if (await confirm('Déconnexion', 'Voulez-vous vous déconnecter ?', 'Se déconnecter')) logout();
  };

  return (
    <Screen maxWidth={900}>
      <View style={styles.images}>
        <ImageSlot label="Logo de l'entreprise" uri={form.logo} loading={uploading === 'logo'} onPick={() => pickImage('logo')} onClear={() => clearImage('logo')} />
        <ImageSlot label="Signature / cachet" uri={form.signature} loading={uploading === 'signature'} onPick={() => pickImage('signature')} onClear={() => clearImage('signature')} />
      </View>

      <Card style={{ marginBottom: 14 }}>
        <SectionTitle>Informations de l'entreprise</SectionTitle>
        <View style={styles.grid}>
          {FIELDS.map(([key, label]) => (
            <Input key={key} style={styles.cell} label={label} value={form[key] || ''} onChangeText={set(key)} autoCapitalize={key === 'email' || key === 'website' ? 'none' : 'sentences'} />
          ))}
        </View>
      </Card>

      <Card style={{ marginBottom: 14 }}>
        <SectionTitle>Facturation</SectionTitle>
        <View style={styles.grid}>
          <Input style={styles.cell} label="Préfixe des factures (ex. FAC)" value={form.invoice_prefix} onChangeText={set('invoice_prefix')} autoCapitalize="characters" />
          <Input style={styles.cell} label="TVA par défaut (%)" value={String(form.default_tva_rate)} onChangeText={set('default_tva_rate')} keyboardType="decimal-pad" />
          <Input style={styles.cell} label="Symbole monétaire (ex. FCFA)" value={form.currency_code} onChangeText={set('currency_code')} />
          <Input style={styles.cell} label="Devise en lettres (ex. francs CFA)" value={form.currency_name} onChangeText={set('currency_name')} />
        </View>
        <Text style={styles.label}>Couleur des factures</Text>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          {PALETTE.map((c) => (
            <Pressable key={c} onPress={() => set('primary_color')(c)} style={[styles.swatch, { backgroundColor: c }, form.primary_color === c && styles.swatchActive]} />
          ))}
        </View>
      </Card>

      <Button title="Enregistrer les paramètres" icon="save-outline" onPress={save} loading={saving} />

      <Card style={{ marginTop: 20 }}>
        <SectionTitle>Mon compte</SectionTitle>
        <Text style={{ color: colors.ink, fontWeight: '700' }}>{user?.first_name} {user?.last_name}</Text>
        <Text style={{ color: colors.muted, marginBottom: 12 }}>{user?.email} · {user?.is_developer ? 'Développeur' : 'Utilisateur'}</Text>
        <Button variant="danger" icon="log-out-outline" title="Se déconnecter" onPress={doLogout} />
      </Card>
    </Screen>
  );
}

function ImageSlot({ label, uri, onPick, onClear, loading }) {
  return (
    <Card style={styles.slot}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.preview}>
        {uri ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" /> : <Text style={{ color: colors.muted }}>Aucune image</Text>}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button small style={{ flex: 1 }} variant="outline" icon="image-outline" title={uri ? 'Changer' : 'Choisir'} onPress={onPick} loading={loading} />
        {uri ? <Button small variant="danger" icon="trash-outline" onPress={onClear} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 14 },
  slot: { flex: 1, minWidth: 220 },
  preview: {
    height: 110, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10, padding: 8, backgroundColor: colors.soft,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12 },
  cell: { flexGrow: 1, flexBasis: 260 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 8 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#fff' },
  swatchActive: { borderColor: colors.gold },
});
