export const labels = {count:'Cheques issued', amount:'Cheque value', share:'Share of payment count', valueShare:'Share of payment value'};
export function metric(row, key) {
  if (!row) return null;
  const [, , , total, totalCents, , , , , , , count, cents] = row;
  if (key === 'count') return count;
  if (key === 'amount') return cents / 100;
  if (key === 'share') return total ? 100 * count / total : null;
  if (key === 'valueShare') return totalCents ? 100 * cents / totalCents : null;
  throw new Error('Unknown measure');
}
export function format(value, key) {
  if (value === null) return 'Unavailable';
  if (key === 'amount') return new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(value);
  if (key === 'share' || key === 'valueShare') return value.toFixed(2) + '%';
  return value.toLocaleString('en-CA');
}
export function monthsUntil(months, period, window) {
  const available = months.filter(month => month <= period);
  return window === 'all' ? available : available.slice(-Number(window));
}
export function csvCell(value) {
  return '"' + String(value ?? '').replaceAll('"','""') + '"';
}
