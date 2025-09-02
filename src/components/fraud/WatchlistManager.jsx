import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

// Simple watchlist management component with notes editing & metadata display
const WatchlistManager = () => {
  const { token } = useAdminAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // entry id (type+value)
  const [noteDraft, setNoteDraft] = useState('');
  const [query, setQuery] = useState('');
  const [newType, setNewType] = useState('user');
  const [newValue, setNewValue] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [adding, setAdding] = useState(false);

  const fetchFull = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5005/api/admin-panel/watchlist/full', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      }
    } catch (e) { console.error('Watchlist load error', e); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ fetchFull(); }, [token]);

  const startEdit = (e) => {
    setEditing(e.type+':'+e.value);
    setNoteDraft(e.notes || '');
  };
  const cancelEdit = () => { setEditing(null); setNoteDraft(''); };

  const saveNotes = async (entry) => {
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:5005/api/admin-panel/watchlist/${entry.type}/${entry.value}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: noteDraft })
      });
      if (res.ok) {
        await fetchFull();
        cancelEdit();
      }
    } catch (e) { console.error('Save notes error', e); }
    finally { setSaving(false); }
  };

  let filtered = filter==='all' ? entries : entries.filter(e => e.type === filter);
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(e =>
      e.value.toLowerCase().includes(q) ||
      (e.notes || '').toLowerCase().includes(q) ||
      (e.addedBy || '').toLowerCase().includes(q)
    );
  }

  const toggleRemove = async (e) => {
    if (!window.confirm(`Remove ${e.type} ${e.value} from watchlist?`)) return;
    // Use existing toggle endpoint (POST) to remove if exists
    try {
      const res = await fetch(`http://localhost:5005/api/admin-panel/watchlist/${e.type}/${e.value}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) {
        await fetchFull();
      }
    } catch(err){ console.error('Remove watchlist entry failed', err); }
  };

  const addEntry = async () => {
    if (!newValue.trim()) return;
    setAdding(true);
    try {
      // Use toggle POST to add if not exists, then PATCH to set notes if provided
      const postRes = await fetch(`http://localhost:5005/api/admin-panel/watchlist/${newType}/${encodeURIComponent(newValue.trim())}`, { method:'POST', headers:{ 'Authorization': `Bearer ${token}` } });
      if (postRes.ok && newNotes.trim()) {
        await fetch(`http://localhost:5005/api/admin-panel/watchlist/${newType}/${encodeURIComponent(newValue.trim())}`, {
          method:'PATCH',
          headers:{ 'Authorization': `Bearer ${token}`, 'Content-Type':'application/json' },
          body: JSON.stringify({ notes: newNotes.trim() })
        });
      }
      setNewValue(''); setNewNotes('');
      await fetchFull();
    } catch(e){ console.error('Add watchlist entry failed', e); }
    finally { setAdding(false); }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm">Watchlist Manager</h3>
        <div className="flex items-center gap-2 text-xs">
          <select value={filter} onChange={e=>setFilter(e.target.value)} className="border rounded px-2 py-1 text-xs">
            <option value="all">All Types</option>
            <option value="user">Users</option>
            <option value="vendor">Vendors</option>
            <option value="device">Devices</option>
            <option value="ip">IPs</option>
          </select>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search" className="border rounded px-2 py-1 text-xs" />
          <button onClick={fetchFull} className="px-2 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50" disabled={loading}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap gap-2 items-end bg-gray-50 p-2 rounded">
        <div className="flex flex-col">
          <label className="text-[10px] font-medium">Type</label>
          <select value={newType} onChange={e=>setNewType(e.target.value)} className="border rounded px-2 py-1 text-xs">
            <option value="user">User</option>
            <option value="vendor">Vendor</option>
            <option value="device">Device</option>
            <option value="ip">IP</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-[10px] font-medium">Value</label>
          <input value={newValue} onChange={e=>setNewValue(e.target.value)} placeholder="UID / VendorID / FP / IP" className="border rounded px-2 py-1 text-xs w-48" />
        </div>
        <div className="flex flex-col flex-1 min-w-[180px]">
          <label className="text-[10px] font-medium">Notes</label>
          <input value={newNotes} onChange={e=>setNewNotes(e.target.value)} placeholder="Reason / context" className="border rounded px-2 py-1 text-xs" />
        </div>
        <button onClick={addEntry} disabled={adding} className="px-3 py-1 bg-green-600 text-white rounded text-xs disabled:opacity-50">{adding ? 'Adding...' : 'Add'}</button>
      </div>
      {filtered.length === 0 ? (
        <div className="text-xs text-gray-500">No entries yet. Use the form above to add the first one.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-2 py-1 text-left">Type</th>
                <th className="px-2 py-1 text-left">Value</th>
                <th className="px-2 py-1 text-left">Added By</th>
                <th className="px-2 py-1 text-left">Added At</th>
                <th className="px-2 py-1 text-left">Notes</th>
                <th className="px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e,i) => {
                const id = e.type+':'+e.value;
                const isEditing = editing === id;
                return (
                  <tr key={id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-2 py-1 font-medium uppercase">{e.type}</td>
                    <td className="px-2 py-1 font-mono text-[11px]">{e.value}</td>
                    <td className="px-2 py-1">{e.addedBy || '—'}</td>
                    <td className="px-2 py-1">{e.createdAt ? new Date(e.createdAt).toLocaleString() : e.addedAt ? new Date(e.addedAt).toLocaleString() : '—'}</td>
                    <td className="px-2 py-1 w-64">
                      {isEditing ? (
                        <textarea value={noteDraft} onChange={ev=>setNoteDraft(ev.target.value)} rows={2} className="w-full border rounded p-1 text-xs" />
                      ) : (
                        <span className="block whitespace-pre-wrap break-words max-h-20 overflow-y-auto">{e.notes || <span className="text-gray-400">No notes</span>}</span>
                      )}
                    </td>
                    <td className="px-2 py-1 space-x-2">
                      {isEditing ? (
                        <>
                          <button onClick={()=>saveNotes(e)} disabled={saving} className="px-2 py-0.5 bg-green-600 text-white rounded disabled:opacity-50">Save</button>
                          <button onClick={cancelEdit} className="px-2 py-0.5 bg-gray-300 text-gray-800 rounded">Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={()=>startEdit(e)} className="px-2 py-0.5 bg-blue-500 text-white rounded">Edit</button>
                          <button onClick={()=>toggleRemove(e)} className="px-2 py-0.5 bg-red-500 text-white rounded">Remove</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WatchlistManager;
