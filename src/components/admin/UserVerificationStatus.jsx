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
const VerificationGroup = ({ title, list, expanded, onToggle, desc }) => (
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

// Main exported component
const UserVerificationStatus = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState({ not: true, pending: true, verified: true });
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
          />
            <VerificationGroup
            title={`Pending (${buckets.pending.length})`}
            list={filtered(buckets.pending)}
            expanded={expanded.pending}
            onToggle={()=> setExpanded(e=>({...e, pending: !e.pending}))}
            desc="Documents submitted, awaiting review"
          />
          <VerificationGroup
            title={`Verified (${buckets.verified.length})`}
            list={filtered(buckets.verified)}
            expanded={expanded.verified}
            onToggle={()=> setExpanded(e=>({...e, verified: !e.verified}))}
            desc="Fully approved users"
          />
        </div>
      )}
      <p style={{margin:0, fontSize:12, color:'#555'}}>Rule: required & rejected considered Not Verified; use fraud / moderation panels to change status.</p>
    </div>
  );
};

export default UserVerificationStatus;