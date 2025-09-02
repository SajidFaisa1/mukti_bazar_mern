import React, { useState } from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';

// Simple component to perform moderation actions directly by user ID (ObjectId) or search result
const UserModerationPanel = ({ refreshCallback }) => {
  const { token } = useAdminAuth();
  const [userId, setUserId] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [searchUid, setSearchUid] = useState('');

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const handleAction = async (path, body) => {
    if (!userId) { setStatusMsg('UserId required'); return; }
    setLoading(true); setStatusMsg('');
    try {
      const res = await fetch(`http://localhost:5005/api/user-moderation/${userId}/${path}`, {
        method: 'POST', headers, body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg(data.message || 'Success');
        refreshCallback && refreshCallback();
      } else {
        setStatusMsg(data.error || 'Failed');
      }
    } catch (e) {
      console.error(e); setStatusMsg('Request failed');
    } finally { setLoading(false); }
  };

  const fetchUser = async () => {
    if (!searchUid) return;
    setLoading(true); setStatusMsg('');
    try {
      const res = await fetch(`http://localhost:5005/api/users/by-uid/${searchUid}`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.user) {
        setUserInfo(data.user);
        setUserId(data.user._id);
      } else {
        setStatusMsg(data.error || 'User not found');
        setUserInfo(null);
      }
    } catch (e) { console.error(e); setStatusMsg('Lookup failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-4">
      <h3 className="font-semibold text-lg">User Moderation</h3>
      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600">Search by UID</label>
          <input value={searchUid} onChange={e=>setSearchUid(e.target.value)} placeholder="Firebase UID" className="border px-2 py-1 rounded text-sm" />
        </div>
        <button onClick={fetchUser} disabled={loading || !searchUid} className="px-3 py-1 bg-blue-600 text-white text-sm rounded disabled:opacity-50">Lookup</button>
        <div>
          <label className="block text-xs font-medium text-gray-600">User ObjectId</label>
          <input value={userId} onChange={e=>setUserId(e.target.value)} placeholder="Mongo _id" className="border px-2 py-1 rounded text-sm w-52" />
        </div>
      </div>
      {userInfo && (
        <div className="text-xs bg-gray-50 p-3 rounded border">
          <p><strong>Name:</strong> {userInfo.name || `${userInfo.firstName||''} ${userInfo.lastName||''}`}</p>
          <p><strong>Email:</strong> {userInfo.email}</p>
          <p><strong>Banned:</strong> {userInfo.banned ? 'Yes' : 'No'}</p>
          <p><strong>Verification:</strong> {userInfo.verification?.status || 'unverified'}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={()=>handleAction('ban',{reason:'Manual moderation'})} disabled={loading || !userId} className="px-3 py-1 bg-red-600 text-white text-sm rounded disabled:opacity-50">Ban</button>
        <button onClick={()=>handleAction('unban')} disabled={loading || !userId} className="px-3 py-1 bg-green-600 text-white text-sm rounded disabled:opacity-50">Unban</button>
        <button onClick={()=>handleAction('require-verification')} disabled={loading || !userId} className="px-3 py-1 bg-yellow-500 text-white text-sm rounded disabled:opacity-50">Require Verification</button>
      </div>
      {statusMsg && <div className="text-xs text-gray-700">{statusMsg}</div>}
      <p className="text-[11px] text-gray-500">Note: Prevents cart add / checkout when verification status is required/pending/rejected.</p>
    </div>
  );
};

export default UserModerationPanel;
