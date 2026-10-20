import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { api, errorMessage } from '../../../src/api';
import InvoicePreview from '../../../src/components/InvoicePreview';
import { Button, Chip, confirm, Empty, Loader, notify, Screen } from '../../../src/components/ui';
import { fetchCompany, useFocusFetch } from '../../../src/hooks';
import { openInvoicePdf } from '../../../src/pdf';
import { STATUS } from '../../../src/theme';

export default function InvoiceDetail() {
  const { id } = useLocalSearchParams();
  const [pdfLoading, setPdfLoading] = useState('');
  const { data, setData, loading, error } = useFocusFetch(async () => {
    const [invoice, company] = await Promise.all([api.get(`/invoices/${id}/`).then((r) => r.data), fetchCompany()]);
    return { invoice, company };
  }, [id]);

  if (loading && !data) return <Loader />;
  if (error && !data) return <Empty icon="warning-outline" title="Facture introuvable" subtitle={errorMessage(error)} />;
  const { invoice, company } = data;

  const pdf = async (download) => {
    setPdfLoading(download ? 'download' : 'open');
    try {
      await openInvoicePdf(invoice, { download });
    } catch (e) {
      notify('PDF indisponible', e.message);
    } finally {
      setPdfLoading('');
    }
  };

  const setStatus = async (status) => {
    const { data: updated } = await api.patch(`/invoices/${id}/`, { status });
    setData({ company, invoice: updated });
  };

  const remove = async () => {
    if (!(await confirm('Supprimer la facture ?', `La facture ${invoice.number} sera définitivement supprimée.`, 'Supprimer'))) return;
    await api.delete(`/invoices/${id}/`);
    router.back();
  };

  return (
    <Screen maxWidth={860}>
      <Stack.Screen options={{ title: invoice.number }} />
      <View style={styles.actions}>
        <Button
          title={Platform.OS === 'web' ? 'Ouvrir le PDF' : 'PDF / Partager'}
          icon="document-outline"
          onPress={() => pdf(false)}
          loading={pdfLoading === 'open'}
        />
        {Platform.OS === 'web' && (
          <Button title="Télécharger" variant="outline" icon="download-outline" onPress={() => pdf(true)} loading={pdfLoading === 'download'} />
        )}
        <Button title="Modifier" variant="outline" icon="create-outline" onPress={() => router.push(`/invoice/${id}/edit`)} />
        <Button title="Supprimer" variant="danger" icon="trash-outline" onPress={remove} />
      </View>
      <View style={styles.status}>
        {Object.entries(STATUS).map(([key, s]) => (
          <Chip key={key} label={s.label} active={invoice.status === key} onPress={() => setStatus(key)} />
        ))}
      </View>
      <InvoicePreview invoice={invoice} company={company} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  status: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
});
