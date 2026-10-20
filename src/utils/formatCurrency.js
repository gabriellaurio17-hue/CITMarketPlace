export default function formatCurrency(amount) {
  return `₱${Number(amount).toLocaleString('en-PH')}`;
}
