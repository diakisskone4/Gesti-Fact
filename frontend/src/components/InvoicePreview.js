import { Image, StyleSheet, Text, View } from 'react-native';

import { formatAmount, formatDate, formatQuantity } from '../format';
import { colors } from '../theme';

/** Aperçu à l'écran, fidèle au PDF généré par le serveur. */
export default function InvoicePreview({ invoice, company }) {
  const primary = company?.primary_color || colors.primary;
  const currency = company?.currency_code || 'FCFA';
  const items = invoice.items || [];

  return (
    <View style={s.paper}>
      <View style={[s.band, { backgroundColor: primary }]} />
      <View style={s.bandGold} />
      <View style={s.body}>
        <View style={s.header}>
          <View style={{ flex: 1.3 }}>
            {company?.logo ? <Image source={{ uri: company.logo }} style={s.logo} resizeMode="contain" /> : null}
            <Text style={s.company}>{company?.name}</Text>
            {company?.slogan ? <Text style={[s.small, { fontStyle: 'italic' }]}>{company.slogan}</Text> : null}
            {company?.address ? <Text style={s.small}>{company.address}</Text> : null}
          </View>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={[s.title, { color: primary }]}>FACTURE</Text>
            {invoice.status === 'cancelled' && <Text style={s.cancelled}>ANNULÉE</Text>}
          </View>
        </View>

        <View style={s.parties}>
          <View style={[s.doit, { borderLeftColor: primary }]}>
            <Text style={[s.label, { color: primary }]}>DOIT À</Text>
            <Text style={s.client}>{invoice.client_name}</Text>
            {invoice.client_address ? <Text style={s.text}>{invoice.client_address}</Text> : null}
          </View>
          <View style={[s.info, { borderLeftColor: primary }]}>
            {[
              ['Facture N°', invoice.number, true],
              ['Date', formatDate(invoice.date)],
              ['Téléphone', invoice.client_phone || '—'],
              ['Email', invoice.client_email || '—'],
            ].map(([k, v, bold], i) => (
              <View key={k} style={[s.infoRow, i > 0 && s.infoBorder]}>
                <Text style={s.infoKey}>{k}</Text>
                <Text style={[s.infoVal, bold && { fontWeight: '800' }]} numberOfLines={1}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={s.table}>
          <View style={[s.tr, { backgroundColor: primary }]}>
            <Text style={[s.th, s.cN]}>N°</Text>
            <Text style={[s.th, s.cD]}>Désignation</Text>
            <Text style={[s.th, s.cQ]}>Qté</Text>
            <Text style={[s.th, s.cP]}>Prix unitaire</Text>
            <Text style={[s.th, s.cM]}>Montant</Text>
          </View>
          {items.map((item, i) => (
            <View key={item.id ?? i} style={[s.tr, s.trBody, i % 2 === 1 && { backgroundColor: colors.soft }]}>
              <Text style={[s.td, s.cN, { textAlign: 'center' }]}>{i + 1}</Text>
              <Text style={[s.td, s.cD]}>{item.designation}</Text>
              <Text style={[s.td, s.cQ, { textAlign: 'center' }]}>{formatQuantity(item.quantity)}</Text>
              <Text style={[s.td, s.cP, s.right]}>{formatAmount(item.unit_price)}</Text>
              <Text style={[s.td, s.cM, s.right]}>{formatAmount(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={s.bottom}>
          <View style={{ flex: 1, minWidth: 160 }}>
            {invoice.notes ? (
              <>
                <Text style={[s.label, { color: primary }]}>OBSERVATIONS</Text>
                <Text style={s.text}>{invoice.notes}</Text>
              </>
            ) : null}
          </View>
          <View style={s.totals}>
            <TotalRow label="Total HT" value={formatAmount(invoice.total_ht, currency)} />
            <TotalRow label={`TVA (${formatQuantity(invoice.tva_rate)} %)`} value={formatAmount(invoice.tva_amount, currency)} />
            <View style={[s.totalRow, { backgroundColor: primary }]}>
              <Text style={[s.totalKey, { color: '#fff' }]}>NET À PAYER TTC</Text>
              <Text style={[s.totalVal, { color: '#fff', fontWeight: '800' }]}>{formatAmount(invoice.total_ttc, currency)}</Text>
            </View>
          </View>
        </View>

        <View style={[s.words, { borderLeftColor: primary }]}>
          <Text style={s.text}>
            Arrêtée la présente facture à la somme de :{' '}
            <Text style={{ fontWeight: '800' }}>{invoice.amount_in_words}</Text> toutes taxes comprises.
          </Text>
        </View>

        <View style={s.signature}>
          <Text style={s.signTitle}>{company?.signatory_title || 'La Direction'}</Text>
          {company?.signature ? (
            <Image source={{ uri: company.signature }} style={s.signImg} resizeMode="contain" />
          ) : (
            <View style={{ height: 56 }} />
          )}
          <Text style={s.text}>{company?.signatory_name}</Text>
        </View>
      </View>
    </View>
  );
}

function TotalRow({ label, value }) {
  return (
    <View style={[s.totalRow, s.infoBorder, { backgroundColor: colors.soft }]}>
      <Text style={s.totalKey}>{label}</Text>
      <Text style={s.totalVal}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  paper: {
    backgroundColor: '#fff', borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: colors.line,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  band: { height: 10 },
  bandGold: { height: 3, backgroundColor: colors.gold },
  body: { padding: 20 },
  header: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  logo: { width: 150, height: 60, marginBottom: 6 },
  company: { fontSize: 16, fontWeight: '800', color: colors.ink },
  small: { fontSize: 11, color: colors.muted, marginTop: 1 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: 1 },
  cancelled: { color: colors.danger, fontWeight: '800', marginTop: 4 },
  parties: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  doit: {
    flex: 1.1, minWidth: 200, backgroundColor: colors.soft, borderLeftWidth: 3, padding: 12, borderRadius: 2,
  },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  client: { fontSize: 15, fontWeight: '800', color: colors.ink, marginBottom: 2 },
  text: { fontSize: 12.5, color: colors.ink, lineHeight: 18 },
  info: { flex: 1, minWidth: 220, borderWidth: 1, borderColor: colors.line, borderLeftWidth: 3 },
  infoRow: { flexDirection: 'row' },
  infoBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  infoKey: {
    width: 88, fontSize: 12, fontWeight: '700', color: colors.ink, backgroundColor: colors.soft, padding: 7,
  },
  infoVal: { flex: 1, fontSize: 12, color: colors.ink, padding: 7, textAlign: 'right' },
  table: { borderWidth: 1, borderColor: colors.line, marginBottom: 16 },
  tr: { flexDirection: 'row' },
  trBody: { borderTopWidth: 1, borderTopColor: colors.line, minHeight: 32, alignItems: 'center' },
  th: { color: '#fff', fontWeight: '700', fontSize: 11.5, paddingVertical: 8, paddingHorizontal: 6, textAlign: 'center' },
  td: { fontSize: 12, color: colors.ink, paddingVertical: 7, paddingHorizontal: 6 },
  right: { textAlign: 'right' },
  cN: { width: 34 },
  cD: { flex: 3 },
  cQ: { flex: 0.8 },
  cP: { flex: 1.4 },
  cM: { flex: 1.5 },
  bottom: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 16 },
  totals: { minWidth: 240, flex: 1, maxWidth: 330, borderWidth: 1, borderColor: colors.line, marginLeft: 'auto' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 },
  totalKey: { fontSize: 12.5, fontWeight: '700', color: colors.ink },
  totalVal: { fontSize: 12.5, color: colors.ink },
  words: { backgroundColor: colors.soft, borderLeftWidth: 3, padding: 12, borderWidth: 1, borderColor: colors.line },
  signature: {
    alignSelf: 'flex-end', alignItems: 'center', width: 220, marginTop: 22,
    borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 6,
  },
  signTitle: { fontSize: 13, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  signImg: { width: 170, height: 70 },
});
