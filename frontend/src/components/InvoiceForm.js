import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { api, errorMessage } from '../api';
import { formatAmount, parseNumber, todayISO } from '../format';
import { colors, STATUS } from '../theme';
import { Button, Card, Chip, Input, notify, SectionTitle } from './ui';

const TVA_PRESETS = [0, 9, 18];
const emptyItem = () => ({ key: Math.random().toString(36).slice(2), designation: '', quantity: '1', unit_price: '' });

export default function InvoiceForm({ initial, company, onSubmit, submitting }) {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const currency = company?.currency_code || 'FCFA';

  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState('');
  const [form, setForm] = useState(() => ({
    date: initial?.date || todayISO(),
    status: initial?.status || 'issued',
    client: initial?.client ?? null,
    client_name: initial?.client_name || '',
    client_address: initial?.client_address || '',
    client_phone: initial?.client_phone || '',
    client_email: initial?.client_email || '',
    tva_rate: String(initial?.tva_rate != null ? Number(initial.tva_rate) : Number(company?.default_tva_rate ?? 18)),
    notes: initial?.notes || '',
  }));
  const [items, setItems] = useState(() =>
    initial?.items?.length
      ? initial.items.map((it) => ({
          key: String(it.id),
          designation: it.designation,
          quantity: String(Number(it.quantity)),
          unit_price: String(Number(it.unit_price)),
        }))
      : [emptyItem()],
  );
  const [words, setWords] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get('/clients/', { params: { search: clientSearch || undefined } })
      .then(({ data }) => setClients(data.results || data))
      .catch(() => {});
  }, [clientSearch]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  // Montant = Qté × PU, totaux recalculés en direct
  const totals = useMemo(() => {
    const ht = items.reduce((sum, it) => sum + parseNumber(it.quantity) * parseNumber(it.unit_price), 0);
    const rate = parseNumber(form.tva_rate);
    const tva = Math.round(ht * rate) / 100;
    return { ht, tva, ttc: ht + tva };
  }, [items, form.tva_rate]);

  // Montant en lettres (calculé par le serveur pour être identique au PDF)
  useEffect(() => {
    const handle = setTimeout(() => {
      api.get('/amount-in-words/', { params: { amount: totals.ttc.toFixed(2) } })
        .then(({ data }) => setWords(data.words))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(handle);
  }, [totals.ttc]);

  const pickClient = (client) => {
    setForm((f) => ({
      ...f,
      client: client.id,
      client_name: client.name,
      client_address: client.address,
      client_phone: client.phone,
      client_email: client.email,
    }));
  };

  const updateItem = (key, field, value) =>
    setItems((list) => list.map((it) => (it.key === key ? { ...it, [field]: value } : it)));

  const removeItem = (key) => setItems((list) => (list.length > 1 ? list.filter((it) => it.key !== key) : list));

  const submit = async () => {
    const nextErrors = {};
    if (!form.client_name.trim()) nextErrors.client_name = 'Indiquez le client (Doit à).';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) nextErrors.date = 'Format attendu : AAAA-MM-JJ';
    const validItems = items.filter((it) => it.designation.trim());
    if (!validItems.length) nextErrors.items = 'Ajoutez au moins une ligne avec une désignation.';
    if (validItems.some((it) => parseNumber(it.quantity) <= 0)) nextErrors.items = 'Chaque quantité doit être positive.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await onSubmit({
        ...form,
        tva_rate: parseNumber(form.tva_rate).toFixed(2),
        items: validItems.map((it, index) => ({
          position: index,
          designation: it.designation.trim(),
          quantity: parseNumber(it.quantity).toFixed(2),
          unit_price: parseNumber(it.unit_price).toFixed(2),
        })),
      });
    } catch (error) {
      notify('Enregistrement impossible', errorMessage(error));
    }
  };

  return (
    <View style={{ gap: 14 }}>
      <View style={[styles.row, !wide && { flexDirection: 'column' }]}>
        <Card style={{ flex: 1.2 }}>
          <SectionTitle>Doit à</SectionTitle>
          <Input placeholder="Rechercher un client enregistré…" value={clientSearch} onChangeText={setClientSearch} />
          <View style={styles.chips}>
            {clients.slice(0, 8).map((c) => (
              <Chip key={c.id} label={c.name} active={form.client === c.id} onPress={() => pickClient(c)} />
            ))}
          </View>
          <Input
            label="Nom / Raison sociale *"
            value={form.client_name}
            onChangeText={(v) => setForm((f) => ({ ...f, client_name: v, client: null }))}
            error={errors.client_name}
          />
          <Input label="Adresse" value={form.client_address} onChangeText={set('client_address')} />
          <View style={styles.row}>
            <Input style={{ flex: 1 }} label="Téléphone" value={form.client_phone} onChangeText={set('client_phone')} keyboardType="phone-pad" />
            <Input style={{ flex: 1 }} label="Email" value={form.client_email} onChangeText={set('client_email')} keyboardType="email-address" autoCapitalize="none" />
          </View>
        </Card>

        <Card style={{ flex: 1 }}>
          <SectionTitle>Facture</SectionTitle>
          <Input label="Facture N°" value={initial?.number || 'Attribué automatiquement'} editable={false} inputStyle={{ color: colors.muted }} />
          <Input label="Date (AAAA-MM-JJ)" value={form.date} onChangeText={set('date')} error={errors.date} />
          <Text style={styles.label}>Statut</Text>
          <View style={styles.chips}>
            {Object.entries(STATUS).map(([key, s]) => (
              <Chip key={key} label={s.label} active={form.status === key} onPress={() => set('status')(key)} />
            ))}
          </View>
          <Text style={[styles.label, { marginTop: 8 }]}>TVA (%)</Text>
          <View style={[styles.chips, { alignItems: 'center' }]}>
            {TVA_PRESETS.map((rate) => (
              <Chip key={rate} label={`${rate} %`} active={parseNumber(form.tva_rate) === rate} onPress={() => set('tva_rate')(String(rate))} />
            ))}
            <Input style={{ width: 90, marginBottom: 0 }} value={form.tva_rate} onChangeText={set('tva_rate')} keyboardType="decimal-pad" />
          </View>
        </Card>
      </View>

      <Card>
        <SectionTitle right={<Button small title="Ajouter une ligne" icon="add" variant="outline" onPress={() => setItems((l) => [...l, emptyItem()])} />}>
          Désignations
        </SectionTitle>
        {wide && (
          <View style={[styles.itemRow, styles.itemHead]}>
            <Text style={[styles.headText, { flex: 3 }]}>Désignation</Text>
            <Text style={[styles.headText, { flex: 0.9 }]}>Quantité</Text>
            <Text style={[styles.headText, { flex: 1.3 }]}>Prix unitaire</Text>
            <Text style={[styles.headText, { flex: 1.3, textAlign: 'right' }]}>Montant</Text>
            <View style={{ width: 36 }} />
          </View>
        )}
        {items.map((it, index) => {
          const amount = parseNumber(it.quantity) * parseNumber(it.unit_price);
          return (
            <View key={it.key} style={[styles.itemRow, !wide && styles.itemCard]}>
              {!wide && <Text style={styles.itemIndex}>Ligne {index + 1}</Text>}
              <Input
                style={{ flex: 3, marginBottom: wide ? 0 : 8, width: wide ? undefined : '100%' }}
                placeholder="Désignation"
                value={it.designation}
                onChangeText={(v) => updateItem(it.key, 'designation', v)}
              />
              <Input
                style={{ flex: 0.9, marginBottom: 0, minWidth: 70 }}
                placeholder="Qté"
                value={it.quantity}
                keyboardType="decimal-pad"
                onChangeText={(v) => updateItem(it.key, 'quantity', v)}
              />
              <Input
                style={{ flex: 1.3, marginBottom: 0, minWidth: 100 }}
                placeholder="Prix unitaire"
                value={it.unit_price}
                keyboardType="decimal-pad"
                onChangeText={(v) => updateItem(it.key, 'unit_price', v)}
              />
              <Text style={styles.amount}>{formatAmount(amount)}</Text>
              <Pressable onPress={() => removeItem(it.key)} style={styles.remove} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            </View>
          );
        })}
        {errors.items ? <Text style={styles.error}>{errors.items}</Text> : null}

        <View style={styles.totals}>
          <TotalLine label="Total HT" value={formatAmount(totals.ht, currency)} />
          <TotalLine label={`TVA (${parseNumber(form.tva_rate)} %)`} value={formatAmount(totals.tva, currency)} />
          <View style={styles.ttc}>
            <Text style={styles.ttcText}>NET À PAYER TTC</Text>
            <Text style={styles.ttcText}>{formatAmount(totals.ttc, currency)}</Text>
          </View>
        </View>
        <View style={styles.words}>
          <Text style={{ color: colors.ink, lineHeight: 20 }}>
            Arrêtée la présente facture à la somme de : <Text style={{ fontWeight: '800' }}>{words || '…'}</Text>
          </Text>
        </View>
      </Card>

      <Card>
        <Input label="Observations (facultatif)" value={form.notes} onChangeText={set('notes')} multiline placeholder="Conditions de paiement, délais de livraison…" />
      </Card>

      <Button title="Enregistrer la facture" icon="checkmark-circle-outline" onPress={submit} loading={submitting} />
    </View>
  );
}

function TotalLine({ label, value }) {
  return (
    <View style={styles.totalLine}>
      <Text style={{ color: colors.muted, fontWeight: '600' }}>{label}</Text>
      <Text style={{ color: colors.ink, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink, marginBottom: 6 },
  itemHead: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 8 },
  headText: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, flexWrap: 'wrap' },
  itemCard: {
    borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: colors.soft,
  },
  itemIndex: { width: '100%', fontSize: 12, fontWeight: '700', color: colors.muted },
  amount: { flex: 1.3, textAlign: 'right', fontWeight: '700', color: colors.ink, minWidth: 90 },
  remove: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, marginTop: 6 },
  totals: { marginTop: 14, alignSelf: 'flex-end', width: '100%', maxWidth: 380, gap: 4 },
  totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  ttc: {
    flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.primary,
    padding: 12, borderRadius: 8, marginTop: 4,
  },
  ttcText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  words: {
    marginTop: 14, backgroundColor: colors.soft, borderLeftWidth: 3, borderLeftColor: colors.primary, padding: 12, borderRadius: 4,
  },
});
