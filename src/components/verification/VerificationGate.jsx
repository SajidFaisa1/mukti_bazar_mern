import React from 'react';

const statusMessages = {
  required: {
    title: 'Verification Required',
    msg: 'To continue purchasing, please submit your business / identity documents.'
  },
  pending: {
    title: 'Verification Under Review',
    msg: 'Your documents are being reviewed. You will be notified once approved.'
  },
  rejected: {
    title: 'Verification Rejected',
    msg: 'Your previous submission was rejected. Please correct issues and resubmit.'
  }
};

const VerificationGate = ({ status, onStart }) => {
  if (!status || !['required','pending','rejected'].includes(status)) return null;
  const info = statusMessages[status];
  return (
    <div className="border border-amber-300 bg-amber-50 p-4 rounded mb-4">
      <h4 className="font-semibold text-amber-700 mb-1">{info.title}</h4>
      <p className="text-sm text-amber-700 mb-2">{info.msg}</p>
      {status !== 'pending' && (
        <button onClick={onStart} className="text-xs px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700">{status === 'rejected' ? 'Resubmit Documents' : 'Start Verification'}</button>
      )}
    </div>
  );
};

export default VerificationGate;
