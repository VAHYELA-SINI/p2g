/**
 * Formatters for currency, dates, times, and status visuals
 */

export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `₦${num.toLocaleString('en-NG')}`;
}

export function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
];

export function getOrderStatusConfig(status) {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Pending',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        dot: 'bg-amber-500',
      };
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        color: 'text-blue-700 bg-blue-50 border-blue-200',
        dot: 'bg-blue-500',
      };
    case 'PREPARING':
      return {
        label: 'Preparing',
        color: 'text-purple-700 bg-purple-50 border-purple-200',
        dot: 'bg-purple-500',
      };
    case 'READY':
      return {
        label: 'Ready for Pickup',
        color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
        dot: 'bg-cyan-500',
      };
    case 'OUT_FOR_DELIVERY':
      return {
        label: 'Out for Delivery',
        color: 'text-orange-700 bg-orange-50 border-orange-200',
        dot: 'bg-orange-500',
      };
    case 'DELIVERED':
      return {
        label: 'Delivered',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        dot: 'bg-rose-500',
      };
    default:
      return {
        label: status || 'Unknown',
        color: 'text-slate-700 bg-slate-50 border-slate-200',
        dot: 'bg-slate-500',
      };
  }
}

export function getPaymentStatusConfig(status) {
  switch (status) {
    case 'PAID':
      return {
        label: 'Paid',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    case 'FAILED':
      return {
        label: 'Failed',
        color: 'text-rose-700 bg-rose-50 border-rose-200',
        dot: 'bg-rose-500',
      };
    case 'REFUNDED':
      return {
        label: 'Refunded',
        color: 'text-slate-700 bg-slate-100 border-slate-300',
        dot: 'bg-slate-500',
      };
    case 'PENDING':
    default:
      return {
        label: 'Pending',
        color: 'text-amber-700 bg-amber-50 border-amber-200',
        dot: 'bg-amber-500',
      };
  }
}
