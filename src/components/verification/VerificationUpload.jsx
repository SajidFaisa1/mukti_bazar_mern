import React, { useState } from 'react';
import { useClientAuth } from '../../contexts/ClientAuthContext';

// Supported document types (only required set)
const docTypes = [
  { key: 'nid_front', label: 'NID Front', optional: false },
  { key: 'nid_back', label: 'NID Back', optional: false },
  { key: 'selfie', label: 'Selfie Holding NID', optional: false }
];

const MAX_FILE_MB = 7;
const ACCEPTED_MIME = ['image/jpeg','image/png','image/webp','image/gif'];

const VerificationUpload = ({ onClose, onSubmitted }) => {
  const { user } = useClientAuth();
  const token = localStorage.getItem('clientToken');
  const [entries, setEntries] = useState(docTypes.map(d => ({ type:d.key, url:'', uploading:false, fileName:'' })));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateEntry = (idx, patch) => setEntries(prev => prev.map((e,i)=> i===idx? { ...e, ...patch } : e));

  const handleFileSelect = async (idx, file) => {
    if (!file) return;
    if (!ACCEPTED_MIME.includes(file.type)) { setError('Unsupported file type'); return; }
    if (file.size > MAX_FILE_MB*1024*1024) { setError(`File too large. Max ${MAX_FILE_MB}MB`); return; }
    setError('');
    // Convert to base64
    const toBase64 = f => new Promise((res,rej)=> { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });
    try {
      updateEntry(idx,{ uploading:true });
      const b64 = await toBase64(file);
      const docType = entries[idx].type;
      const res = await fetch(`http://localhost:5005/api/user-moderation/${user._id}/verification/upload`, {
        method:'POST',
        headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ file: b64, docType })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      updateEntry(idx,{ url:data.url, uploading:false, fileName:file.name });
    } catch (e) {
      console.error(e); setError(e.message || 'Upload failed'); updateEntry(idx,{ uploading:false });
    }
  };

  const submit = async () => {
    setSubmitting(true); setError(''); setSuccess('');
    try {
      // Require all non-optional docs
      for (const d of docTypes.filter(d=>!d.optional)) {
        const ent = entries.find(e=>e.type===d.key);
        if (!ent?.url) { setError('Please upload all required documents'); setSubmitting(false); return; }
      }
      const docs = entries.filter(e=> e.url).map(e=> ({ type:e.type, url:e.url }));
      const res = await fetch(`http://localhost:5005/api/user-moderation/${user._id}/submit-verification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ documents: docs })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Submitted successfully');
        onSubmitted && onSubmitted(data.status);
        setTimeout(()=> { onClose(); }, 800);
      } else {
        setError(data.error || 'Submission failed');
      }
    } catch (e) { console.error(e); setError('Network error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-lg rounded shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">Submit Verification Documents</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <p className="text-xs text-gray-600 mb-4">Upload clear images or PDFs. Required items marked *.</p>
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {entries.map((e,idx)=>{
            const meta = docTypes.find(d=>d.key===e.type);
            return (
              <div key={e.type} className="border rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium">{meta.label}{!meta.optional && <span className="text-red-500 ml-0.5">*</span>}</span>
                  {e.url && <span className="text-[10px] text-emerald-600">Uploaded</span>}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="text-[10px] px-3 py-1.5 bg-indigo-600 text-white rounded cursor-pointer hover:bg-indigo-700 disabled:opacity-50 border border-indigo-600">
                    <input type="file" accept={ACCEPTED_MIME.concat(['image/*']).join(',')} className="hidden" onChange={ev=>handleFileSelect(idx, ev.target.files[0])} />
                    {e.uploading? 'Uploading...' : (e.url ? 'Replace Image' : 'Choose Image')}
                  </label>
                  {!e.url && !e.uploading && <span className="text-[10px] text-gray-500">No file selected</span>}
                  {e.url && (
                    <span className="text-[10px] text-emerald-600 font-medium">Uploaded</span>
                  )}
                  {e.fileName && <span className="text-[10px] text-gray-500 truncate max-w-[140px]">{e.fileName}</span>}
                </div>
                {e.url && <div className="mt-2"><img src={e.url} alt={meta.label} className="h-20 rounded border object-cover" /></div>}
              </div>
            );
          })}
        </div>
        {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
        {success && <div className="mt-3 text-xs text-green-600">{success}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 text-xs rounded border">Cancel</button>
          <button disabled={submitting} onClick={submit} className="px-4 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-50">{submitting ? 'Submitting...' : 'Submit'}</button>
        </div>
      </div>
    </div>
  );
};

export default VerificationUpload;
