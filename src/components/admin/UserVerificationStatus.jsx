import React, { useEffect, useState, useMemo } from 'react';

// Summary badge small card
const SummaryBadge = ({ label, value, tone }) => {
  const toneStyles = {
    warn: { bg:'#fff7ed', border:'#fed7aa' },
    pending: { bg:'#eef2ff', border:'#c7d2fe' },
    ok: { bg:'#ecfdf5', border:'#a7f3d0' },
    danger: { bg:'#fef2f2', border:'#fecaca' }
  }[tone] || { bg:'#f9fafb', border:'#e5e7eb' };
  return (
    <div style={{background:toneStyles.bg, border:`1px solid ${toneStyles.border}`, padding:'10px 14px', borderRadius:8, minWidth:140}}>
      <div style={{fontSize:11, textTransform:'uppercase', letterSpacing:'.5px', color:'#555'}}>{label}</div>
      <div style={{fontSize:22, fontWeight:600}}>{value}</div>
    </div>
  );
};

// Collapsible group listing users by status bucket
const VerificationGroup = ({ title, list, expanded, onToggle, desc, onSelect }) => {
  return (
    <div style={{background:'#fff', border:'1px solid #e5e7eb', borderRadius:8}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', cursor:'pointer'}} onClick={onToggle}>
        <div>
          <div style={{fontWeight:600}}>{title}</div>
          <div style={{fontSize:11, color:'#666'}}>{desc}</div>
        </div>
        <button style={{background:'#f3f4f6', border:'1px solid #d1d5db', fontSize:12, padding:'4px 8px', borderRadius:4}}>{expanded ? 'Hide' : 'Show'}</button>
      </div>
      {expanded && (
        <div style={{maxHeight:300, overflowY:'auto'}}>
          {list.length === 0 ? (
            <div style={{padding:'12px 16px', fontSize:12, color:'#666'}}>No users</div>
          ) : (
            <table style={{width:'100%', fontSize:12}}>
              <thead style={{background:'#f9fafb', position:'sticky', top:0}}>
                <tr>
                  <th style={{textAlign:'left', padding:'6px 10px'}}>Email</th>
                  <th style={{textAlign:'left', padding:'6px 10px'}}>Name</th>
                  <th style={{textAlign:'left', padding:'6px 10px'}}>UID</th>
                  <th style={{textAlign:'left', padding:'6px 10px'}}>Status</th>
                  <th style={{textAlign:'left', padding:'6px 10px'}}>Updated</th>
                  <th style={{textAlign:'left', padding:'6px 10px'}}>Action</th>
                </tr>
              </thead>
              <tbody>
                {list.map(u => {
                  const st = u.verification?.status || 'unverified';
                  const bg = st === 'verified' ? '#d1fae5' : st === 'pending' ? '#e0e7ff' : st === 'required' ? '#fefce8' : st === 'rejected' ? '#fee2e2' : '#f3f4f6';
                  return (
                    <tr key={u._id} style={{borderTop:'1px solid #f1f5f9'}}>
                      <td style={{padding:'6px 10px'}}>{u.email}</td>
                      <td style={{padding:'6px 10px'}}>{u.name || `${u.firstName||''} ${u.lastName||''}`.trim()}</td>
                      <td style={{padding:'6px 10px'}}>{u.uid || '—'}</td>
                      <td style={{padding:'6px 10px'}}>
                        <span style={{background:bg, color:'#111827', padding:'2px 6px', borderRadius:4, fontSize:11, textTransform:'uppercase', letterSpacing:'0.5px'}}>{st}</span>
                      </td>
                      <td style={{padding:'6px 10px'}}>{u.updatedAt ? new Date(u.updatedAt).toLocaleDateString() : '—'}</td>
                      <td style={{padding:'6px 10px'}}>
                        <button onClick={()=>onSelect(u)} style={{fontSize:11, padding:'4px 8px', background:'#2563eb', color:'#fff', border:'1px solid #1d4ed8', borderRadius:4}}>View</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

const PendingReviewDrawer = ({ user, token, onClose, onUpdated }) => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [rejectReason, setRejectReason] = React.useState('Documents not clear');
  const [zoomSrc, setZoomSrc] = React.useState(null);
  const [copied, setCopied] = React.useState(null);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = (val, label) => {
    if (!val) return; navigator.clipboard.writeText(val).catch(()=>{}); setCopied(label); setTimeout(()=> setCopied(null),1200);
  };

  if (!user) return null;
  const docs = (user.verification?.documents)||[];
  const status = user.verification?.status;

  const act = async (approve) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`http://localhost:5005/api/user-moderation/${user._id}/review-verification`, {
        method:'POST',
        headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ approve, rejectionReason: approve? undefined : rejectReason })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Action failed');
      onUpdated && onUpdated(user._id, data.status);
    } catch(e){ setError(e.message); } finally { setLoading(false); }
  };
  const banUser = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`http://localhost:5005/api/user-moderation/${user._id}/ban`, { method:'POST', headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' }, body: JSON.stringify({ reason:'Verification fraud' }) });
      const data = await res.json(); if(!res.ok) throw new Error(data.error||'Ban failed'); onUpdated && onUpdated(user._id, 'banned');
    } catch(e){ setError(e.message);} finally { setLoading(false);} }
  const unbanUser = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`http://localhost:5005/api/user-moderation/${user._id}/unban`, { method:'POST', headers:{ 'Authorization':`Bearer ${token}`, 'Content-Type':'application/json' } });
      const data = await res.json(); if(!res.ok) throw new Error(data.error||'Unban failed'); onUpdated && onUpdated(user._id, user.verification?.status || 'unverified', { unbanned:true });
    } catch(e){ setError(e.message);} finally { setLoading(false);} }

  // status badge styles
  const statusTone = {
    pending: 'bg-indigo-100 text-indigo-700 ring-indigo-200',
    verified: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
    rejected: 'bg-rose-100 text-rose-700 ring-rose-200',
    required: 'bg-amber-100 text-amber-700 ring-amber-200',
    unverified: 'bg-gray-100 text-gray-600 ring-gray-200'
  }[status] || 'bg-gray-100 text-gray-600 ring-gray-200';

  return (
    <div className="fixed inset-0 z-[2000] flex">
      <div onClick={onClose} className="flex-1 bg-black/50 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-[440px] max-w-full h-full bg-white border-l border-gray-200 shadow-2xl flex flex-col animate-slide-in">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-indigo-600 via-indigo-500 to-indigo-600 text-white">
          <div className="flex flex-col">
            <h3 className="text-sm font-semibold tracking-wide">User Verification Review</h3>
            <span className="text-[11px] opacity-80">Moderate submitted identity documents</span>
          </div>
          <button onClick={onClose} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-medium">Close</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 text-[13px]">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="font-medium break-all flex items-center gap-2">
                {user.email}
                <button onClick={()=>copy(user.email,'email')} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 hover:bg-gray-300">Copy</button>
              </div>
              <div className="text-gray-600">{user.name || `${user.firstName||''} ${user.lastName||''}`.trim() || '—'}</div>
              <div className="text-[11px] text-gray-500 flex items-center gap-2">UID: {user.uid || '—'} {user.uid && <button onClick={()=>copy(user.uid,'uid')} className="text-[10px] px-1 py-0.5 rounded bg-gray-100 hover:bg-gray-200">Copy</button>}</div>
            </div>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold ring-1 ring-inset ${statusTone}`}>{status}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded border bg-gray-50">
              <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Ban Status</div>
              <div className="text-sm flex items-center gap-2">{user.banned ? <span className="text-rose-600 font-medium">Banned</span> : <span className="text-emerald-600 font-medium">Active</span>}
                {user.banned && user.bannedReason && <span className="text-[11px] text-rose-500 truncate">({user.bannedReason})</span>}
              </div>
            </div>
            <div className="p-3 rounded border bg-gray-50">
              <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Copy Status</div>
              <div className="text-[11px] text-gray-600">{copied ? `Copied ${copied}` : 'Click copy buttons to copy values'}</div>
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500 mb-1">Audit Trail</div>
            <ul className="space-y-1 text-[12px] text-gray-700">
              {user.verification?.requiredAt && <li><span className="font-medium text-gray-600">Required:</span> {new Date(user.verification.requiredAt).toLocaleString()}</li>}
              {user.verification?.submittedAt && <li><span className="font-medium text-gray-600">Submitted:</span> {new Date(user.verification.submittedAt).toLocaleString()}</li>}
              {user.verification?.reviewedAt && <li><span className="font-medium text-gray-600">Reviewed:</span> {new Date(user.verification.reviewedAt).toLocaleString()} {user.verification?.reviewedBy && <span className="text-gray-500">(by {user.verification.reviewedBy})</span>}</li>}
              {user.verification?.rejectionReason && <li><span className="font-medium text-gray-600">Rejection Reason:</span> {user.verification.rejectionReason}</li>}
              {!user.verification?.requiredAt && !user.verification?.submittedAt && <li className="text-gray-500">No events</li>}
            </ul>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wide font-semibold text-gray-500">Documents ({docs.length})</div>
            </div>
            {docs.length === 0 && <div className="text-[12px] text-gray-500">No documents uploaded</div>}
            <div className="grid grid-cols-2 gap-3">
              {docs.map(d => (
                <div key={d._id || d.url} className="group relative border rounded-lg overflow-hidden bg-white shadow-sm">
                  <div className="absolute top-1 left-1 z-10 text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white font-medium backdrop-blur-sm capitalize">{d.type.replace(/_/g,' ')}</div>
                  <img onClick={()=>setZoomSrc(d.url)} src={d.url} alt={d.type} className="h-32 w-full object-cover transition-transform duration-300 group-hover:scale-[1.06] cursor-zoom-in" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-black/40 flex items-center justify-center gap-2">
                    <button onClick={()=>setZoomSrc(d.url)} className="text-[10px] px-2 py-1 rounded bg-white/90 hover:bg-white shadow">Zoom</button>
                    <a href={d.url} target="_blank" rel="noreferrer" className="text-[10px] px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 shadow">Open</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {status === 'pending' && (
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-600">
                <span>Rejection Reason</span>
                <input value={rejectReason} onChange={e=>setRejectReason(e.target.value)} className="border rounded px-3 py-2 text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/40" placeholder="Reason if rejecting" />
              </label>
            </div>
          )}
          {error && <div className="text-[12px] text-rose-600 font-medium">{error}</div>}
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-wrap gap-2 justify-between">
          <div className="flex gap-2">
            {status === 'pending' && <>
              <button disabled={loading} onClick={()=>act(true)} className="px-4 py-2 rounded bg-emerald-600 text-white text-[12px] font-medium hover:bg-emerald-700 disabled:opacity-50">{loading? '...' : 'Approve'}</button>
              <button disabled={loading} onClick={()=>act(false)} className="px-4 py-2 rounded bg-rose-600 text-white text-[12px] font-medium hover:bg-rose-700 disabled:opacity-50">{loading? '...' : 'Reject'}</button>
            </>}
          </div>
          <div className="flex gap-2">
            {!user.banned && <button disabled={loading} onClick={banUser} className="px-3 py-2 rounded bg-gray-900 text-white text-[12px] font-medium hover:bg-black disabled:opacity-50">{loading? '...' : 'Ban'}</button>}
            {user.banned && <button disabled={loading} onClick={unbanUser} className="px-3 py-2 rounded bg-slate-600 text-white text-[12px] font-medium hover:bg-slate-700 disabled:opacity-50">{loading? '...' : 'Unban'}</button>}
            <button onClick={onClose} className="px-3 py-2 rounded border border-gray-300 text-[12px] font-medium bg-white hover:bg-gray-100">Close</button>
          </div>
        </div>
        {loading && <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center text-xs font-medium text-gray-600">Processing...</div>}
        {zoomSrc && (
          <div onClick={()=>setZoomSrc(null)} className="fixed inset-0 z-[2100] bg-black/80 flex items-center justify-center cursor-zoom-out">
            <img src={zoomSrc} alt="zoom" className="max-h-[90%] max-w-[90%] rounded-lg shadow-2xl ring-1 ring-white/10" />
          </div>
        )}
      </div>
    </div>
  );
};

// Main exported component
const UserVerificationStatus = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({ not: true, pending: true, verified: true });
  const [selected, setSelected] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!token) return;
    const fetchUsers = async () => {
      setLoading(true); setError('');
      try {
        const res = await fetch('http://localhost:5005/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (Array.isArray(data.users) ? data.users : []);
        setUsers(arr);
        setLastUpdated(new Date());
      } catch (e) {
        console.error(e); setError('Failed to load users');
      } finally { setLoading(false); }
    };
    fetchUsers();
  }, [token]);

  // Classification rules:
  // Not Verified bucket: status absent, 'unverified', 'required', 'rejected'
  // Pending bucket: status === 'pending'
  // Verified bucket: status === 'verified'
  const buckets = useMemo(() => {
    const initial = { not: [], pending: [], verified: [] };
    users.forEach(u => {
      const st = u.verification?.status || 'unverified';
      if (st === 'verified') initial.verified.push(u); else if (st === 'pending') initial.pending.push(u); else initial.not.push(u);
    });
    return initial;
  }, [users]);

  const filtered = (list) => {
    if (!query) return list;
    const q = query.toLowerCase();
    return list.filter(u => (u.email||'').toLowerCase().includes(q) || (u.name||'').toLowerCase().includes(q) || (u.uid||'').toLowerCase().includes(q));
  };

  return (
    <div style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
      <h2 style={{margin:0}}>User Verification Status</h2>
      <div style={{display:'flex', gap:'1rem', flexWrap:'wrap'}}>
        <SummaryBadge label="Not Verified" value={buckets.not.length} tone="warn" />
        <SummaryBadge label="Pending" value={buckets.pending.length} tone="pending" />
        <SummaryBadge label="Verified" value={buckets.verified.length} tone="ok" />
      </div>
      <div style={{display:'flex', gap:'0.75rem', alignItems:'center'}}>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search email / name / uid" style={{padding:'6px 10px', border:'1px solid #d1d5db', borderRadius:4, width:260}} />
        {lastUpdated && <span style={{fontSize:11, color:'#666'}}>Updated {lastUpdated.toLocaleTimeString()}</span>}
      </div>
      {loading && <div>Loading users...</div>}
      {error && <div style={{color:'#dc2626'}}>{error}</div>}
      {!loading && !error && (
        <div style={{display:'grid', gap:'1.25rem'}}>
          <VerificationGroup
            title={`Not Verified (${buckets.not.length})`}
            list={filtered(buckets.not)}
            expanded={expanded.not}
            onToggle={()=> setExpanded(e=>({...e, not: !e.not}))}
            desc="Includes unverified, required & rejected"
            onSelect={setSelected}
          />
            <VerificationGroup
            title={`Pending (${buckets.pending.length})`}
            list={filtered(buckets.pending)}
            expanded={expanded.pending}
            onToggle={()=> setExpanded(e=>({...e, pending: !e.pending}))}
            desc="Documents submitted, awaiting review"
            onSelect={setSelected}
          />
          <VerificationGroup
            title={`Verified (${buckets.verified.length})`}
            list={filtered(buckets.verified)}
            expanded={expanded.verified}
            onToggle={()=> setExpanded(e=>({...e, verified: !e.verified}))}
            desc="Fully approved users"
            onSelect={setSelected}
          />
        </div>
      )}
      {selected && <PendingReviewDrawer user={selected} token={token} onClose={()=> setSelected(null)} onUpdated={(id,newStatus)=> {
        setUsers(us=> us.map(u=> u._id===id ? { ...u, verification: { ...(u.verification||{}), status: newStatus } } : u));
        setSelected(null);
      }} />}
      <p style={{margin:0, fontSize:12, color:'#555'}}>Rule: required & rejected considered Not Verified; use fraud / moderation panels to change status.</p>
    </div>
  );
};

export default UserVerificationStatus;