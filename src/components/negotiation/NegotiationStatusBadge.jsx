import React from 'react';

const STATUS_STYLES = {
  active: 'bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-200',
  accepted: 'bg-green-100 text-green-700 ring-1 ring-inset ring-green-200',
  rejected: 'bg-red-100 text-red-600 ring-1 ring-inset ring-red-200',
  expired: 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200',
  cancelled: 'bg-gray-200 text-gray-600 ring-1 ring-inset ring-gray-300'
};

// label allows prettier / localized display text; falls back to status.
export default function NegotiationStatusBadge({ status, label }) {
  const cls = STATUS_STYLES[status] || 'bg-accent-100 text-accent-700 ring-1 ring-inset ring-accent-200';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase ${cls}`}>
      {label || status}
    </span>
  );
}
