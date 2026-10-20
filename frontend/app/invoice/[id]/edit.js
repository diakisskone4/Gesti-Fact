import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { api } from '../../../src/api';
import InvoiceForm from '../../../src/components/InvoiceForm';
import { Loader, Screen } from '../../../src/components/ui';
import { fetchCompany, useFocusFetch } from '../../../src/hooks';

export default function EditInvoice() {
  const { id } = useLocalSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const { data, loading } = useFocusFetch(async () => {
    const [invoice, company] = await Promise.all([api.get(`/invoices/${id}/`).then((r) => r.data), fetchCompany()]);
    return { invoice, company };
  }, [id]);

  if (loading || !data) return <Loader />;

  const submit = async (payload) => {
    setSubmitting(true);
    try {
      await api.put(`/invoices/${id}/`, payload);
      router.back();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <InvoiceForm initial={data.invoice} company={data.company} onSubmit={submit} submitting={submitting} />
    </Screen>
  );
}
