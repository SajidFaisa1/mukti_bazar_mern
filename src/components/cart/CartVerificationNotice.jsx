import React from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const messages = {
  required: {
    title: 'Verification Required',
    body: 'Please verify your account to continue checking out. This helps us keep the marketplace safe.',
    cta: 'Start Verification'
  },
  pending: {
    title: 'Verification Under Review',
    body: 'Your documents are being reviewed. You will be able to checkout once approved.',
    cta: null
  },
  rejected: {
    title: 'Verification Rejected',
    body: 'Your previous submission was rejected. Please correct issues and resubmit to continue purchasing.',
    cta: 'Resubmit Documents'
  }
};

const CartVerificationNotice = ({ status, onOpenUpload }) => {
  const navigate = useNavigate();
  if (!status || !['required','pending','rejected'].includes(status)) return null;
  const m = messages[status];
  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50/70 px-5 py-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
      <div className="flex items-start gap-3 flex-1">
        {status === 'pending' ? 
          <ShieldCheck className="text-amber-600 flex-shrink-0 mt-0.5" size={22} /> :
          <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={22} />}
        <div>
          <h4 className="text-sm font-semibold text-amber-800 tracking-tight mb-1">{m.title}</h4>
          <p className="text-xs text-amber-700 leading-relaxed max-w-prose">{m.body}</p>
        </div>
      </div>
      {m.cta && (
        <div className="flex gap-2">
          <button
            onClick={() => (status === 'required' ? onOpenUpload() : onOpenUpload())}
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium px-4 py-2 shadow-sm transition"
          >{m.cta}</button>
          <button
            onClick={() => navigate('/account/verification')}
            className="inline-flex items-center justify-center rounded-lg border border-amber-400 text-amber-700 bg-white/50 hover:bg-white text-xs font-medium px-4 py-2 transition"
          >Details</button>
        </div>
      )}
    </div>
  );
};

export default CartVerificationNotice;