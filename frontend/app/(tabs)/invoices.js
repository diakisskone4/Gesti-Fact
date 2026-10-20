import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { api } from '../../src/api';
import InvoiceRow from '../../src/components/InvoiceRow';
import { Button, Card, Chip, Empty, Input, Loader, Screen } from '../../src/components/ui';
import { fetchCompany, useFocusFetch } from '../../src/hooks';
import { STATUS } from '../../src/theme';

export default function Invoices() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, loading, refreshing, refresh } = useFocusFetch(async () => {
    const [list, company] = await Promise.all([
      api.get('/invoices/', { params: { search: search || undefined, status: status || undefined } }).then((r) => r.data),
      fetchCompany(),
    ]);
    return { invoices: list.results || list, company };
  }, [search, status]);

  const invoices = data?.invoices || [];

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Input style={{ flex: 1 }} placeholder="Rechercher (N° ou client)…" value={search} onChangeText={setSearch} />
        <Button icon="add" title="Nouvelle" onPress={() => router.push('/invoice/new')} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        <Chip label="Toutes" active={!status} onPress={() => setStatus('')} />
        {Object.entries(STATUS).map(([key, s]) => (
          <Chip key={key} label={s.label} active={status === key} onPress={() => setStatus(key)} />
        ))}
      </ScrollView>
      {loading && !data ? (
        <Loader />
      ) : (
        <Card padded={false}>
          {invoices.length ? (
            invoices.map((inv, i) => (
              <InvoiceRow key={inv.id} invoice={inv} currency={data.company.currency_code} last={i === invoices.length - 1} />
            ))
          ) : (
            <Empty title="Aucune facture trouvée" subtitle="Modifiez la recherche ou créez une nouvelle facture." />
          )}
        </Card>
      )}
    </Screen>
  );
}
