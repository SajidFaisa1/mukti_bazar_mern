import React from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';

const MESSAGES = {
  required: {
    title: 'Verification Required',
    body: 'Please verify your account to continue. Verification helps keep the marketplace safe.',
    cta: 'Start Verification'
  },
  pending: {
    title: 'Verification Under Review',
    body: 'Your documents are being reviewed. You can view negotiations but cannot act until approval.',
    cta: null
  },
  rejected: {
    title: 'Verification Rejected',
    body: 'Your submission was rejected. Please correct issues and resubmit to continue.',
    cta: 'Resubmit Documents'
  }
};

export default function VerificationNotice({ status, onAction, onDetails }) {
  if (!status || !['required','pending','rejected'].includes(status)) return null;
  const m = MESSAGES[status];
  const Icon = status === 'pending' ? ShieldCheck : AlertCircle;
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50/70 px-4 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
      <div className="flex items-start gap-3 flex-1">
        <Icon className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <h4 className="text-[13px] font-semibold text-amber-800 tracking-tight mb-1">{m.title}</h4>
          <p className="text-[11px] text-amber-700 leading-relaxed max-w-prose">{m.body}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {m.cta && (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center justify-center rounded-md bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium px-3 py-1.5 shadow-sm transition"
          >{m.cta}</button>
        )}
        <button
          type="button"
          onClick={onDetails}
          className="inline-flex items-center justify-center rounded-md border border-amber-400 text-amber-700 bg-white/60 hover:bg-white text-[11px] font-medium px-3 py-1.5 transition"
        >Details</button>
      </div>
    </div>
  );
}
