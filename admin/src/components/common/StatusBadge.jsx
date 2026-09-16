import React from 'react';
import { getOrderStatusConfig, getPaymentStatusConfig } from '../../utils/formatters';

export default function StatusBadge({ status, type = 'order', size = 'md' }) {
  const config = type === 'payment' ? getPaymentStatusConfig(status) : getOrderStatusConfig(status);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full border ${config.color} ${sizeClasses[size] || sizeClasses.md}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
