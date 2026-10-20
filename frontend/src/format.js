const group = (intString) => intString.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

/** Montant à la française : 1 250 000 ou 1 250,50 */
export function formatAmount(value, currency = '') {
  const n = Math.round(Number(value || 0) * 100) / 100;
  const negative = n < 0;
  const [int, dec] = Math.abs(n).toFixed(2).split('.');
  let text = group(int);
  if (dec !== '00') text += `,${dec}`;
  return `${negative ? '-' : ''}${text}${currency ? ` ${currency}` : ''}`;
}

export function formatQuantity(value) {
  const n = Number(value || 0);
  return Number.isInteger(n) ? group(String(n)) : String(n).replace('.', ',');
}

/** Accepte « 2,5 » comme « 2.5 » */
export function parseNumber(text) {
  const n = parseFloat(String(text ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function formatDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function todayISO() {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function timeAgo(iso) {
  if (!iso) return 'jamais';
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}
