import { Platform } from 'react-native';

import { API_URL, tokens } from './api';

/**
 * Ouvre (web) ou partage (mobile) le PDF d'une facture généré par Django.
 */
export async function openInvoicePdf(invoice, { download = false } = {}) {
  const { access } = await tokens.get();
  const url = `${API_URL}/invoices/${invoice.id}/pdf/`;
  const filename = `Facture-${invoice.number}.pdf`;

  if (Platform.OS === 'web') {
    // Ouvre l'onglet tout de suite pour ne pas être bloqué par le navigateur
    const tab = download ? null : window.open('', '_blank');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${access}` } });
    if (!response.ok) {
      tab?.close();
      throw new Error(`PDF indisponible (${response.status})`);
    }
    const blobUrl = URL.createObjectURL(await response.blob());
    if (tab) {
      tab.location.href = blobUrl;
    } else {
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    return;
  }

  const { File, Paths } = await import('expo-file-system');
  const Sharing = await import('expo-sharing');
  const destination = new File(Paths.cache, filename);
  if (destination.exists) destination.delete();
  const task = File.createDownloadTask(url, destination, {
    headers: { Authorization: `Bearer ${access}` },
  });
  const file = await task.downloadAsync();
  if (!file) throw new Error('Téléchargement interrompu');
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      dialogTitle: filename,
      UTI: 'com.adobe.pdf',
    });
  }
}
