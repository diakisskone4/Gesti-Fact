import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAmount, formatDate } from '../format';
import { colors } from '../theme';
import { StatusBadge } from './ui';

export default function InvoiceRow({ invoice, currency = 'FCFA', last }) {
  return (
    <Pressable
      onPress={() => router.push(`/invoice/${invoice.id}`)}
      style={({ pressed }) => [styles.row, !last && styles.border, pressed && { backgroundColor: colors.soft }]}
    >
      <View style={styles.icon}>
        <Ionicons name="document-text-outline" size={20} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.number}>{invoice.number}</Text>
        <Text style={styles.client} numberOfLines={1}>{invoice.client_name}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={styles.amount}>{formatAmount(invoice.total_ttc, currency)}</Text>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <Text style={styles.date}>{formatDate(invoice.date)}</Text>
          <StatusBadge status={invoice.status} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
  border: { borderBottomWidth: 1, borderBottomColor: colors.line },
  icon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  number: { fontWeight: '800', color: colors.ink },
  client: { color: colors.muted, marginTop: 2 },
  amount: { fontWeight: '800', color: colors.ink },
  date: { fontSize: 12, color: colors.muted },
});
