import React, { useState } from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const VelocitySnapshot = ({ averages }) => {
  const [showTable, setShowTable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const { token } = useAdminAuth();

  const loadDetail = async () => {
    if (loading) return; if (!token) { setError('No auth token'); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch('http://localhost:5005/api/admin-panel/velocity/users', { headers: { 'Authorization': `Bearer ${token}` } });
      if (res.status === 401) {
        setError('Unauthorized (401). Session may have expired.');
        return;
      }
      if (!res.ok) {
        setError(`Failed (${res.status})`);
        return;
      }
      const data = await res.json();
      setRows(data.users || []);
      setShowTable(true);
    } catch (e) { console.error('Velocity detail error', e); setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-semibold">Velocity Avg Snapshot</h4>
        <button onClick={loadDetail} className="text-xs px-2 py-1 rounded bg-gray-800 text-white hover:bg-black disabled:opacity-40" disabled={loading}>{loading ? 'Loading...' : 'Drill Down'}</button>
      </div>
      {averages ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
          <div className="bg-gray-50 p-2 rounded"><div className="text-[10px] text-gray-500">5m</div><div className="font-semibold">{averages.last5m?.toFixed(2)}</div></div>
          <div className="bg-gray-50 p-2 rounded"><div className="text-[10px] text-gray-500">1h</div><div className="font-semibold">{averages.last1h?.toFixed(2)}</div></div>
          <div className="bg-gray-50 p-2 rounded"><div className="text-[10px] text-gray-500">6h</div><div className="font-semibold">{averages.last6h?.toFixed(2)}</div></div>
          <div className="bg-gray-50 p-2 rounded"><div className="text-[10px] text-gray-500">24h</div><div className="font-semibold">{averages.last24h?.toFixed(2)}</div></div>
        </div>
      ) : <div className="text-xs text-gray-400">No snapshot data</div>}

  {error && <div className="text-xs text-red-600 mt-2">{error}</div>}
  {showTable && !error && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">UID</th>
                <th className="px-2 py-1 text-left">Orders</th>
                <th className="px-2 py-1 text-left">5m</th>
                <th className="px-2 py-1 text-left">1h</th>
                <th className="px-2 py-1 text-left">6h</th>
                <th className="px-2 py-1 text-left">24h</th>
                <th className="px-2 py-1 text-left">Max Discount %</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.uid} className="odd:bg-gray-50">
                  <td className="px-2 py-1 font-mono text-[10px]">{r.uid}</td>
                  <td className="px-2 py-1">{r.orders}</td>
                  <td className="px-2 py-1">{r.vel.last5m}</td>
                  <td className="px-2 py-1">{r.vel.last1h}</td>
                  <td className="px-2 py-1">{r.vel.last6h}</td>
                  <td className="px-2 py-1">{r.vel.last24h}</td>
                  <td className="px-2 py-1">{r.maxDiscount?.toFixed(1) ?? '—'}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={7} className="px-2 py-4 text-center text-gray-400">No velocity detail loaded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default VelocitySnapshot;
