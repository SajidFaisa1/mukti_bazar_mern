import React, { useEffect, useState } from 'react';
import { FaStar } from 'react-icons/fa';

// Simple admin moderation panel for feedback
// Requires admin auth token (reuse vendor/client auth context if admin role embedded)

const AdminFeedbackModeration = ({ token }) => {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [reportedOnly, setReportedOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const qs = new URLSearchParams();
      if (filter) qs.set('status', filter);
      if (reportedOnly) qs.set('reported', 'true');
      const res = await fetch(`http://localhost:5005/api/feedback/moderate/list?${qs.toString()}`, { headers: { Authorization: `Bearer ${token}` }});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Load failed');
      setItems(data.items || []);
    } catch(e){ setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ if (token) load(); }, [token, filter, reportedOnly]);

  const act = async (id, action, body={}) => {
    try {
      const res = await fetch(`http://localhost:5005/api/feedback/moderate/${action}/${id}`, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      await res.json();
      load();
    } catch(e){ console.error(action, e); }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Feedback Moderation</h1>
      <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
        <select value={filter} onChange={e=>setFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="pending">Pending</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={reportedOnly} onChange={e=>setReportedOnly(e.target.checked)} /> Reported only
        </label>
        <button onClick={load} className="px-3 py-1 rounded bg-primary-600 text-white text-xs font-semibold">Refresh</button>
      </div>
      {loading && <div className="text-sm">Loading...</div>}
      {error && <div className="text-sm text-rose-600">{error}</div>}
      <ul className="space-y-3">
        {items.map(f => (
          <li key={f._id} className="border rounded-lg bg-white p-3 text-xs shadow-sm">
            <div className="flex items-center gap-1 mb-1">
              {Array.from({length:5}).map((_,i)=>(<FaStar key={i} className={`h-3 w-3 ${i < f.rating ? 'text-amber-400':'text-slate-300'}`} />))}
              <span className="ml-2 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{f.moderationStatus}</span>
              {f.reported && <span className="ml-1 text-[10px] font-semibold text-rose-600">REPORTED</span>}
              {f.helpfulVotes>0 && <span className="ml-1 text-[10px] font-semibold text-emerald-600">{f.helpfulVotes} helpful</span>}
            </div>
            <p className="text-slate-700 mb-2 whitespace-pre-line">{f.comment || '(No comment)'}</p>
            {f.reportReasons?.length>0 && (
              <div className="mb-2 flex flex-wrap gap-1">{f.reportReasons.map(r=> <span key={r} className="text-[9px] px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">{r}</span>)}</div>
            )}
            <div className="flex flex-wrap gap-2">
              {f.moderationStatus!== 'hidden' && (
                <button onClick={()=>act(f._id,'hide')} className="px-2 py-1 rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100">Hide</button>
              )}
              {f.moderationStatus === 'hidden' && (
                <button onClick={()=>act(f._id,'unhide')} className="px-2 py-1 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100">Unhide</button>
              )}
              {f.moderationStatus !== 'visible' && (
                <button onClick={()=>act(f._id,'approve',{ clearReports: true })} className="px-2 py-1 rounded bg-primary-600 text-white">Approve</button>
              )}
            </div>
          </li>
        ))}
        {(!loading && items.length===0) && <li className="text-xs text-slate-500">No feedback found.</li>}
      </ul>
    </div>
  );
};

export default AdminFeedbackModeration;
