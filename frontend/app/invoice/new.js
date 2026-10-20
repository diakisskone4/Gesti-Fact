import { router } from 'expo-router';
import { useState } from 'react';

import { api } from '../../src/api';
import InvoiceForm from '../../src/components/InvoiceForm';
import { Loader, Screen } from '../../src/components/ui';
import { fetchCompany, useFocusFetch } from '../../src/hooks';

export default function NewInvoice() {
  const { data: company, loading } = useFocusFetch(fetchCompany);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <Loader />;

  const submit = async (payload) => {
    setSubmitting(true);
    try {
      const { data } = await api.post('/invoices/', payload);
      router.replace(`/invoice/${data.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <InvoiceForm company={company} onSubmit={submit} submitting={submitting} />
    </Screen>
  );
}
