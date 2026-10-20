import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { api, errorMessage } from '../../src/api';
import { Button, Card, confirm, Empty, Input, Loader, notify, Screen, SectionTitle } from '../../src/components/ui';
import { useFocusFetch } from '../../src/hooks';
import { colors } from '../../src/theme';

const EMPTY = { name: '', address: '', phone: '', email: '' };

export default function Clients() {
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null); // null = formulaire fermé
  const [saving, setSaving] = useState(false);

  const { data, loading, refreshing, refresh, reload } = useFocusFetch(
    () => api.get('/clients/', { params: { search: search || undefined } }).then((r) => r.data.results || r.data),
    [search],
  );

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const save = async () => {
    if (!form.name.trim()) return notify('Le nom du client est obligatoire.');
    setSaving(true);
    try {
      if (form.id) await api.put(`/clients/${form.id}/`, form);
      else await api.post('/clients/', form);
      setForm(null);
      reload();
    } catch (e) {
      notify('Erreur', errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (client) => {
    if (!(await confirm('Supprimer ce client ?', `${client.name} sera supprimé. Ses factures sont conservées.`, 'Supprimer'))) return;
    await api.delete(`/clients/${client.id}/`);
    reload();
  };

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Input style={{ flex: 1 }} placeholder="Rechercher un client…" value={search} onChangeText={setSearch} />
        <Button icon="person-add-outline" title="Ajouter" onPress={() => setForm({ ...EMPTY })} />
      </View>

      {form && (
        <Card style={{ marginBottom: 14 }}>
          <SectionTitle>{form.id ? 'Modifier le client' : 'Nouveau client'}</SectionTitle>
          <Input label="Nom / Raison sociale *" value={form.name} onChangeText={set('name')} />
          <Input label="Adresse" value={form.address} onChangeText={set('address')} />
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Input style={{ flex: 1, minWidth: 180 }} label="Téléphone" value={form.phone} onChangeText={set('phone')} keyboardType="phone-pad" />
            <Input style={{ flex: 1, minWidth: 180 }} label="Email" value={form.email} onChangeText={set('email')} autoCapitalize="none" keyboardType="email-address" />
          </View>
          <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
            <Button variant="outline" title="Annuler" onPress={() => setForm(null)} />
            <Button title="Enregistrer" icon="checkmark" onPress={save} loading={saving} />
          </View>
        </Card>
      )}

      {loading && !data ? (
        <Loader />
      ) : (
        <Card padded={false}>
          {data?.length ? (
            data.map((c, i) => (
              <View key={c.id} style={[styles.row, i < data.length - 1 && styles.border]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{c.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[c.phone, c.email, c.address].filter(Boolean).join(' · ') || '—'}
                  </Text>
                  <Text style={styles.meta}>{c.invoice_count} facture(s)</Text>
                </View>
                <Pressable onPress={() => setForm({ ...c })} hitSlop={8} style={styles.action}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => remove(c)} hitSlop={8} style={styles.action}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))
          ) : (
            <Empty icon="people-outline" title="Aucun client" subtitle="Enregistrez vos clients pour remplir « Doit à » en un clic." />
          )}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.line },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontWeight: '800' },
  name: { fontWeight: '800', color: colors.ink },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  action: { padding: 6 },
});
