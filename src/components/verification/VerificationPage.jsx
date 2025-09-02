import React, { useState, useEffect, useMemo } from 'react';
import { getAllDivision, getAllDistrict } from 'bd-divisions-to-unions';
import VerificationGate from './VerificationGate';
import VerificationUpload from './VerificationUpload';
import { useClientAuth } from '../../contexts/ClientAuthContext';

// Extended form sections config
const REQUIRED_DOCS = [
  { key: 'nid_front', label: 'NID Front', optional: false },
  { key: 'nid_back', label: 'NID Back', optional: false },
  { key: 'selfie', label: 'Selfie Holding NID', optional: false }
];

// Dedicated verification page for clients to view status & upload docs
const VerificationPage = () => {
  const { user } = useClientAuth();
  const [status, setStatus] = useState(null); // any of: unverified, required, pending, rejected, verified
  const [showUpload, setShowUpload] = useState(false);
  const [activeStep, setActiveStep] = useState(1); // 1: Profile, 2: Documents, 3: Review
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    nidNumber: '',
    addressLine: '',
    district: '', // code
    districtName: '',
    division: '', // code
    divisionName: '',
    phone: '',
    notes: ''
  });
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [docs, setDocs] = useState(REQUIRED_DOCS.map(d => ({ type: d.key, url: '', uploading:false, fileName:'' })));
  const [errors, setErrors] = useState({});
  const [submitMsg, setSubmitMsg] = useState(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('clientToken') : null;

  const updateDocUrl = (idx, url) => setDocs(prev => prev.map((d,i)=> i===idx? {...d, url}: d));
  const updateDoc = (idx, patch) => setDocs(prev => prev.map((d,i)=> i===idx? { ...d, ...patch } : d));
  const ACCEPTED_MIME = ['image/jpeg','image/png','image/webp','image/gif'];
  const MAX_FILE_MB = 7;

  const handleFileSelect = async (idx, file) => {
    if (!file) return;
    if (!ACCEPTED_MIME.includes(file.type)) { setErrors(e=>({...e, [docs[idx].type]:'Unsupported file type'})); return; }
    if (file.size > MAX_FILE_MB*1024*1024) { setErrors(e=>({...e, [docs[idx].type]:'File too large'})); return; }
    // clear error for this doc
    setErrors(e=>{ const ne={...e}; delete ne[docs[idx].type]; return ne; });
    const toBase64 = f => new Promise((res,rej)=> { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });
    try {
      updateDoc(idx,{ uploading:true });
      const b64 = await toBase64(file);
      const docType = docs[idx].type;
      const currentUserId = user?._id || user?.id; // tolerate either shape
      if (!currentUserId) throw new Error('User not loaded');
      const up = await fetch(`http://localhost:5005/api/user-moderation/${currentUserId}/verification/upload`, {
        method:'POST',
        headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ file: b64, docType })
      });
      const data = await up.json();
      if (!up.ok) {
        let msg = data.error || 'Upload failed';
        if (up.status === 403) msg = 'Permission denied (403). Re‑login and try again.';
        if (up.status === 401) msg = 'Session expired (401). Please login again.';
        throw new Error(msg);
      }
      updateDoc(idx,{ url:data.url, fileName:file.name, uploading:false });
    } catch (err) {
      console.error(err);
      updateDoc(idx,{ uploading:false });
      setErrors(e=>({...e, [docs[idx].type]: err.message || 'Upload failed'}));
    }
  };
  const updateField = (k,v) => setForm(f=>({...f,[k]:v}));

  const divisions = useMemo(() => Object.values(getAllDivision('en')), []);
  const districtMap = useMemo(() => getAllDistrict('en'), []);
  const districtOptions = form.division ? (districtMap[form.division] || []) : [];

  const validateStep = () => {
    const e = {};
    if (activeStep === 1) {
      if (!form.fullName?.trim()) e.fullName = 'Full name required';
      if (!form.nidNumber?.trim()) e.nidNumber = 'NID number required';
  else if (!/^\d{16}$/.test(form.nidNumber.trim())) e.nidNumber = 'NID must be 16 digits';
      if (!form.phone?.trim()) e.phone = 'Phone required';
      else if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(form.phone.trim())) e.phone = 'Invalid BD phone';
  // Detailed address (house/road) can be optional since division/district chosen from structured lists
      if (!form.division) e.division = 'Division required';
      if (!form.district) e.district = 'District required';
    }
    if (activeStep === 2) {
      REQUIRED_DOCS.filter(d=>!d.optional).forEach((d,i)=>{
        const entry = docs.find(x=>x.type===d.key);
        if (!entry?.url?.trim()) e[d.key] = 'Required';
      });
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const asyncFieldChecks = async () => {
    const newErrors = {};
    try {
      if (form.phone) {
        const r = await fetch(`http://localhost:5005/api/user-moderation/validation/check-phone?phone=${encodeURIComponent(form.phone)}`, { headers:{ Authorization:`Bearer ${token}` }});
        if (r.ok) {
          const data = await r.json();
            if (!data.validFormat) newErrors.phone = data.reason || 'Invalid phone';
            else if (!data.available) newErrors.phone = 'Phone already in use';
        }
      }
      if (form.nidNumber) {
        const r2 = await fetch(`http://localhost:5005/api/user-moderation/validation/check-nid?nid=${encodeURIComponent(form.nidNumber)}`, { headers:{ Authorization:`Bearer ${token}` }});
        if (r2.ok) {
          const d2 = await r2.json();
          if (!d2.validFormat) newErrors.nidNumber = d2.reason || 'Invalid NID';
        }
      }
    } catch (_) { /* ignore network */ }
    return newErrors;
  };

  const nextStep = async () => {
    if (!validateStep()) return;
    const aErr = await asyncFieldChecks();
    if (Object.keys(aErr).length) { setErrors(prev=>({...prev, ...aErr})); return; }
    setActiveStep(s=> Math.min(3,s+1));
  };
  const prevStep = () => setActiveStep(s=> Math.max(1,s-1));

  const submitAll = async () => {
  if (!validateStep()) return;
  const aErr = await asyncFieldChecks();
  if (Object.keys(aErr).length) { setErrors(prev=>({...prev, ...aErr})); return; }
    setSubmitting(true); setSubmitMsg(null);
    try {
      // Submit documents first
      const filteredDocs = docs.filter(d=> d.url.trim());
      const currentUserId = user?._id || user?.id;
      if (!currentUserId) { setSubmitMsg({ type:'error', text:'User not loaded' }); return; }
      const res = await fetch(`http://localhost:5005/api/user-moderation/${currentUserId}/submit-verification`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ documents: filteredDocs, meta: form })
      });
      const data = await res.json();
      if (res.ok) {
        setStatus(data.status || 'pending');
        setSubmitMsg({ type:'success', text:'Verification submitted. Status set to Pending.' });
        setActiveStep(3);
      } else {
        let msg = data.error || 'Submission failed';
        if (res.status === 403) msg = 'Permission denied (403). Re‑login and try again.';
        if (res.status === 401) msg = 'Session expired (401). Please login again.';
        setSubmitMsg({ type:'error', text: msg });
      }
    } catch (e) {
      console.error(e); setSubmitMsg({ type:'error', text:'Network error' });
    } finally { setSubmitting(false); }
  };

  useEffect(() => {
    if (user?.verification?.status) {
      setStatus(user.verification.status);
    } else {
      setStatus('unverified');
    }
    // preload default address
    const loadAddr = async () => {
      if (!user?.uid) return;
      try {
        setLoadingAddress(true);
        const r = await fetch(`http://localhost:5005/api/addresses/default/${user.uid}`);
        if (r.ok) {
          const addr = await r.json();
            setForm(f=>({
              ...f,
              addressLine: addr.addressLine || addr.address || f.addressLine,
              division: addr.division || addr.state || f.division,
              district: addr.district || f.district
            }));
        }
      } catch (_) { /* ignore */ }
      finally { setLoadingAddress(false); }
    };
    loadAddr();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto py-20 px-6 text-center">
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Login Required</h1>
        <p className="text-sm text-gray-600">Please login to manage verification.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Account Verification</h1>
        <p className="text-sm text-gray-500 mt-1">Submit and track your verification documents.</p>
      </header>
      <VerificationGate status={['required','rejected'].includes(status) ? status : null} onStart={() => setShowUpload(true)} />
      {status === 'verified' && (
        <div className="mb-6 p-4 rounded border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">
          <p>Your account is verified. No further action required.</p>
        </div>
      )}
      {status !== 'verified' && status !== 'pending' && (
        <div className="bg-white shadow rounded border p-4">
          <Steps current={activeStep} />
          {activeStep === 1 && (
            <div className="space-y-4 mt-4">
              <h3 className="font-medium text-sm text-gray-800">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Legal Name" error={errors.fullName} required>
                  <input className="input" value={form.fullName} onChange={e=>updateField('fullName', e.target.value)} />
                </Field>
                <Field label="NID Number" error={errors.nidNumber} required>
                  <input className="input" value={form.nidNumber} onChange={e=>updateField('nidNumber', e.target.value)} />
                </Field>
                <Field label="Phone" error={errors.phone} required>
                  <input className="input" value={form.phone} onChange={e=>updateField('phone', e.target.value)} />
                </Field>
                <Field label="Division" error={errors.division} required>
                  <select
                    className="input"
                    value={form.division}
                    onChange={e=>{
                      const code=e.target.value; const name = e.target.options[e.target.selectedIndex]?.text || '';
                      setForm(f=>({...f, division: code, divisionName: name, district:'', districtName:'' }));
                    }}
                  >
                    <option value="">Select division</option>
                    {divisions.map(d=> <option key={d.value} value={d.value}>{d.title}</option>)}
                  </select>
                </Field>
                <Field label="District" error={errors.district} required>
                  <select
                    className="input"
                    value={form.district}
                    onChange={e=>{ const code=e.target.value; const name=e.target.options[e.target.selectedIndex]?.text||''; setForm(f=>({...f, district:code, districtName:name })); }}
                    disabled={!form.division}
                  >
                    <option value="">{form.division ? 'Select district' : 'Select division first'}</option>
                    {districtOptions.map(d=> <option key={d.value} value={d.value}>{d.title}</option>)}
                  </select>
                </Field>
                <Field label="Address Details (House / Road) (optional)" error={errors.addressLine} className="md:col-span-2">
                  <div className="flex gap-2">
                    <input className="input flex-1" value={form.addressLine} onChange={e=>updateField('addressLine', e.target.value)} />
                    <button
                      type="button"
                      onClick={async()=>{
                        if (!user?.uid) return; setLoadingAddress(true);
                        try {
                          const r= await fetch(`http://localhost:5005/api/addresses/default/${user.uid}`);
                          if(r.ok){
                            const addr= await r.json();
                            setForm(f=>({...f,
                              addressLine: addr.addressLine||addr.address||f.addressLine,
                              division: addr.division||addr.state||f.division,
                              district: addr.district||f.district
                            }));
                          }
                        } catch(_){}
                        finally { setLoadingAddress(false);} 
                      }}
                      className="px-2 py-1 text-[11px] rounded border bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                      disabled={loadingAddress}
                    >{loadingAddress? '...' : 'Reload'}</button>
                  </div>
                </Field>
                <Field label="Additional Notes (optional)" className="md:col-span-2">
                  <textarea className="input h-24" value={form.notes} onChange={e=>updateField('notes', e.target.value)} />
                </Field>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={nextStep} className="px-4 py-1.5 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700">Continue</button>
              </div>
            </div>
          )}
          {activeStep === 2 && (
            <div className="space-y-4 mt-4">
              <h3 className="font-medium text-sm text-gray-800">Upload Documents</h3>
              <p className="text-xs text-gray-500">All three images are required. Use clear, unobstructed photos.</p>
              <div className="grid gap-4">
                {docs.map((d,idx)=> {
                  const conf = REQUIRED_DOCS.find(x=>x.key===d.type);
                  return (
                    <div key={d.type} className="border rounded p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700 flex items-center gap-1">{conf.label}<span className="text-red-500">*</span></span>
                        {errors[d.type] && <span className="text-[10px] text-red-600">{errors[d.type]}</span>}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className={`text-[11px] px-3 py-1.5 rounded cursor-pointer text-white ${d.uploading ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} transition`}> 
                          <input type="file" accept={ACCEPTED_MIME.join(',')} className="hidden" onChange={e=>handleFileSelect(idx, e.target.files[0])} />
                          {d.uploading ? 'Uploading…' : d.url ? 'Replace' : 'Upload'}
                        </label>
                        {d.fileName && <span className="text-[10px] text-gray-600 max-w-[160px] truncate">{d.fileName}</span>}
                        {d.url && <span className="text-[10px] text-emerald-600">Ready</span>}
                      </div>
                      {d.url && (
                        <div className="mt-2">
                          <img src={d.url} alt={conf.label} className="h-28 rounded border object-cover" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between gap-2 pt-2">
                <button onClick={prevStep} className="px-3 py-1.5 rounded border text-xs">Back</button>
                <button onClick={nextStep} className="px-4 py-1.5 rounded bg-indigo-600 text-white text-xs hover:bg-indigo-700">Review</button>
              </div>
            </div>
          )}
          {activeStep === 3 && (
            <div className="space-y-4 mt-4">
              <h3 className="font-medium text-sm text-gray-800">Review & Submit</h3>
              <div className="bg-gray-50 border rounded p-4 text-xs space-y-2">
                <div><strong>Full Name:</strong> {form.fullName || '—'}</div>
                <div><strong>NID Number:</strong> {form.nidNumber || '—'}</div>
                <div><strong>Phone:</strong> {form.phone || '—'}</div>
                <div><strong>Address:</strong> {form.addressLine || '—'}</div>
                <div><strong>Division/District:</strong> {form.divisionName || '—'} / {form.districtName || '—'}</div>
                <div><strong>Notes:</strong> {form.notes || '—'}</div>
                <div><strong>Documents:</strong>
                  <ul className="list-disc ml-5 mt-1 space-y-0.5">
                    {docs.filter(d=>d.url).map(d=> {
                      const conf = REQUIRED_DOCS.find(x=>x.key===d.type);
                      return <li key={d.type}>{conf.label}: <span className="text-indigo-600 break-all">{d.url}</span></li>;
                    })}
                  </ul>
                </div>
              </div>
              {submitMsg && <div className={`text-xs ${submitMsg.type==='success' ? 'text-green-600' : 'text-red-600'}`}>{submitMsg.text}</div>}
              <div className="flex justify-between gap-2 pt-2">
                <button onClick={prevStep} disabled={submitting} className="px-3 py-1.5 rounded border text-xs disabled:opacity-50">Back</button>
                <button onClick={submitAll} disabled={submitting} className="px-4 py-1.5 rounded bg-emerald-600 text-white text-xs disabled:opacity-50 hover:bg-emerald-700">{submitting ? 'Submitting...' : 'Submit for Review'}</button>
              </div>
            </div>
          )}
        </div>
      )}
      {status === 'pending' && (
        <div className="border rounded p-4 bg-indigo-50 text-indigo-700 text-sm mt-4">Your submission is under review. Typical approval time 24-72h. You will be notified.</div>
      )}
      <section className="mt-8 space-y-4 text-sm text-gray-600">
        <h2 className="text-sm font-semibold text-gray-800">Accepted Documents</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>National ID (front & back)</li>
          <li>Selfie clearly showing you holding the NID</li>
        </ul>
        <p className="text-xs text-gray-500">Submitting multiple documents speeds up review. Typical review time: 24-72 hours.</p>
      </section>
    </div>
  );
};

// Helper components
const Field = ({ label, children, error, required, className='' }) => (
  <label className={`flex flex-col gap-1 ${className}`}>
    <span className="text-[11px] uppercase tracking-wide font-semibold text-gray-600 flex items-center gap-1">{label}{required && <span className="text-red-500">*</span>}{error && <span className="text-red-500 font-normal">{error}</span>}</span>
    {children}
  </label>
);

const Steps = ({ current }) => {
  const steps = ['Info','Documents','Review'];
  return (
    <div className="flex items-center gap-3 text-[11px] font-medium">
      {steps.map((s,i)=>(
        <div key={s} className="flex items-center gap-1">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${current===i+1 ? 'bg-indigo-600 text-white border-indigo-600' : current>i+1 ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>{i+1}</span>
          <span className={current===i+1 ? 'text-indigo-600' : 'text-gray-500'}>{s}</span>
          {i<steps.length-1 && <span className="w-6 h-px bg-gray-300" />}
        </div>
      ))}
    </div>
  );
};

export default VerificationPage;