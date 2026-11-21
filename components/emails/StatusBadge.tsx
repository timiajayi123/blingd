import React from 'react';
import { Text } from '@react-email/components';

type StatusBadgeVariant = 'paid' | 'pending' | 'failed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered';

interface StatusBadgeProps {
  status: StatusBadgeVariant;
  label: string;
}

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  const styles: Record<StatusBadgeVariant, string> = {
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    failed: 'bg-red-100 text-red-700',
    processing: 'bg-blue-100 text-blue-700',
    shipped: 'bg-purple-100 text-purple-700',
    out_for_delivery: 'bg-cyan-100 text-cyan-700',
    delivered: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <Text
      className={`inline-block px-4 py-2 rounded-full text-xs font-bold tracking-wide uppercase ${styles[status]}`}
    >
      {label}
    </Text>
  );
};
