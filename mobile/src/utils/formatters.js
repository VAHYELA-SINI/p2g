/**
 * Formatters for currency, date, and order status visuals
 */

export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `₦${num.toLocaleString('en-NG')}`;
}

export function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTimeOnly(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getOrderStatusConfig(status) {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Order Placed',
        description: 'Awaiting payment confirmation & kitchen review',
        color: '#171717',
        bgColor: '#F2F2F7',
        borderColor: '#D4D4D4',
        badgeBg: '#FAFAFA',
        icon: '⏳',
        stepIndex: 0,
      };
    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        description: 'Payment verified & order accepted',
        color: '#FFFFFF',
        bgColor: '#000000',
        borderColor: '#000000',
        badgeBg: '#171717',
        icon: '✓',
        stepIndex: 1,
      };
    case 'PREPARING':
      return {
        label: 'In Preparation',
        description: 'Chef is freshly preparing and packing your meal',
        color: '#171717',
        bgColor: '#E5E5EA',
        borderColor: '#C7C7CC',
        badgeBg: '#F2F2F7',
        icon: '🍳',
        stepIndex: 2,
      };
    case 'READY':
      return {
        label: 'Ready for Dispatch',
        description: 'Packed and waiting for the delivery courier',
        color: '#0A0A0A',
        bgColor: '#D4D4D4',
        borderColor: '#A3A3A3',
        badgeBg: '#E5E5EA',
        icon: '📦',
        stepIndex: 3,
      };
    case 'OUT_FOR_DELIVERY':
      return {
        label: 'Out for Delivery',
        description: 'Courier is on the way to your delivery address',
        color: '#FFFFFF',
        bgColor: '#1A1A1A',
        borderColor: '#000000',
        badgeBg: '#262626',
        icon: '🛵',
        stepIndex: 4,
      };
    case 'DELIVERED':
      return {
        label: 'Delivered',
        description: 'Order successfully delivered. Enjoy your meal!',
        color: '#FFFFFF',
        bgColor: '#000000',
        borderColor: '#000000',
        badgeBg: '#0A0A0A',
        icon: '✓',
        stepIndex: 5,
      };
    case 'CANCELLED':
      return {
        label: 'Cancelled',
        description: 'This order was cancelled',
        color: '#525252',
        bgColor: '#F2F2F7',
        borderColor: '#D4D4D4',
        badgeBg: '#FAFAFA',
        icon: '✕',
        stepIndex: -1,
      };
    default:
      return {
        label: status || 'Unknown',
        description: '',
        color: '#555555',
        bgColor: '#F2F2F7',
        borderColor: '#E5E5EA',
        badgeBg: '#F8F9FA',
        icon: '📋',
        stepIndex: 0,
      };
  }
}

export function getPaymentStatusConfig(status) {
  switch (status) {
    case 'PAID':
      return {
        label: 'Paid',
        color: '#FFFFFF',
        bgColor: '#000000',
        borderColor: '#000000',
        icon: '✓',
      };
    case 'FAILED':
      return {
        label: 'Failed',
        color: '#1A1A1A',
        bgColor: '#E5E5EA',
        borderColor: '#A3A3A3',
        icon: '✕',
      };
    case 'REFUNDED':
      return {
        label: 'Refunded',
        color: '#525252',
        bgColor: '#F2F2F7',
        borderColor: '#D4D4D4',
        icon: '↩',
      };
    case 'PENDING':
    default:
      return {
        label: 'Pending',
        color: '#171717',
        bgColor: '#F2F2F7',
        borderColor: '#D4D4D4',
        icon: '⏳',
      };
  }
}
