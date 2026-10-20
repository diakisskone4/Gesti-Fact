import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { api } from '../../src/api';
import { useAuth } from '../../src/auth';
import InvoiceRow from '../../src/components/InvoiceRow';
import { Button, Card, Empty, Loader, Screen, SectionTitle, StatCard } from '../../src/components/ui';
import { formatAmount } from '../../src/format';
import { fetchCompany, useFocusFetch } from '../../src/hooks';
import { colors } from '../../src/theme';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, refreshing, refresh } = useFocusFetch(async () => {
    const [stats, company] = await Promise.all([api.get('/invoices/stats/').then((r) => r.data), fetchCompany()]);
    return { stats, company };
  });

  if (loading && !data) return <Loader />;
  const stats = data?.stats || {};
  const currency = data?.company?.currency_code || 'FCFA';

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hello}>Bonjour {user?.first_name || user?.username} 👋</Text>
          <Text style={styles.company}>{data?.company?.name}</Text>
        </View>
        <Button title="Nouvelle facture" icon="add-circle-outline" variant="gold" onPress={() => router.push('/invoice/new')} />
      </View>

      <View style={styles.stats}>
        <StatCard icon="cash-outline" label="Chiffre d'affaires" value={formatAmount(stats.total_ttc, currency)} hint={`${stats.count || 0} facture(s)`} />
        <StatCard icon="calendar-outline" label="Ce mois-ci" value={formatAmount(stats.month_total, currency)} hint={`${stats.month_count || 0} facture(s)`} accent={colors.gold} />
        <StatCard icon="checkmark-done-outline" label="Encaissé" value={formatAmount(stats.paid_total, currency)} accent={colors.success} />
        <StatCard icon="time-outline" label="En attente" value={formatAmount(stats.unpaid_total, currency)} accent={colors.warning} hint={`${stats.clients || 0} client(s)`} />
      </View>

      <SectionTitle right={<Button small variant="ghost" title="Tout voir" onPress={() => router.push('/invoices')} />}>
        Dernières factures
      </SectionTitle>
      <Card padded={false}>
        {stats.recent?.length ? (
          stats.recent.map((inv, i) => (
            <InvoiceRow key={inv.id} invoice={inv} currency={currency} last={i === stats.recent.length - 1} />
          ))
        ) : (
          <Empty
            title="Aucune facture"
            subtitle="Créez votre première facture : le numéro est attribué automatiquement."
            action={<Button title="Créer une facture" icon="add" onPress={() => router.push('/invoice/new')} />}
          />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12,
    backgroundColor: colors.primary, borderRadius: 16, padding: 18, marginBottom: 14,
    borderBottomWidth: 4, borderBottomColor: colors.gold,
  },
  hello: { color: '#C8D3E1', fontSize: 14 },
  company: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 2 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
});
