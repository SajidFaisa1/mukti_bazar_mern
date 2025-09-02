import React, { useState, useEffect } from 'react';
import { useVendorAuth } from '../../contexts/VendorAuthContext';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import negotiationService from '../../services/negotiationService';
import NegotiationCard from './NegotiationCard';

const NegotiationDashboard = () => {
  // Dashboard mount
  const { user: vendorUser } = useVendorAuth();
  const { user: clientUser } = useClientAuth();
  const currentUser = vendorUser || clientUser;
  const currentRole = vendorUser ? 'vendor' : 'client';

  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [allNegotiations, setAllNegotiations] = useState([]);
  const [allError, setAllError] = useState('');

  useEffect(() => {
    if (!currentUser) return; // nothing to fetch
    const fetchNegotiations = async () => {
      try {
        setLoading(true);
        setError('');
  const response = await negotiationService.getNegotiations(currentUser.uid, currentRole, activeTab);
  const ordersSummary = response.ordersSummary || {};
  const enriched = (response.negotiations||[]).map(n => ({...n, __ord: ordersSummary[n._id]}));
  setNegotiations(enriched);
      } catch (e) {
        console.error('Error fetching negotiations:', e);
        setError('Failed to load negotiations');
      } finally {
        setLoading(false);
      }
    };
    fetchNegotiations();
  }, [currentUser, currentRole, activeTab, refreshTrigger]);

  useEffect(() => {
    if (!currentUser) return;
    const fetchAll = async () => {
      try {
        setAllError('');
  const response = await negotiationService.getNegotiations(currentUser.uid, currentRole, 'all');
  const ordersSummary = response.ordersSummary || {};
  const enriched = (response.negotiations||[]).map(n => ({...n, __ord: ordersSummary[n._id]}));
  setAllNegotiations(enriched);
      } catch (e) {
        console.error('Error fetching all negotiations:', e);
        setAllError('Some statistics may be incomplete');
      }
    };
    fetchAll();
  }, [currentUser, currentRole, refreshTrigger]);

  const handleNegotiationUpdate = (updatedNegotiation) => {
    setNegotiations(prev => prev.map(n => n._id === updatedNegotiation._id ? updatedNegotiation : n));
    setRefreshTrigger(p => p + 1);
  };
  const handleNegotiationRemove = (id) => setNegotiations(prev => prev.filter(n => n._id !== id));

  const getTabCount = (status) => {
    if (status === 'active') return allNegotiations.filter(n => n.status === 'active').length;
    if (status === 'accepted') return allNegotiations.filter(n => n.status === 'accepted').length;
    if (status === 'paid') return allNegotiations.filter(n => n.__ord && n.__ord.paymentMethod !== 'cod').length;
    if (status === 'cod') return allNegotiations.filter(n => n.__ord && n.__ord.paymentMethod === 'cod').length;
    if (status === 'expired') return allNegotiations.filter(n => n.status === 'expired').length;
    if (status === 'cancelled') return allNegotiations.filter(n => n.status === 'cancelled').length;
    return allNegotiations.length;
  };

  const filteredNegotiations = negotiations; // backend already filtered by status

  if (!currentUser) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-10 text-center space-y-4">
          <h3 className="text-lg font-semibold text-slate-700">Please log in to view your negotiations</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-800">My Negotiations</h2>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={() => setRefreshTrigger(p => p + 1)}
          disabled={loading}
        >🔄 Refresh</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-2">
  {[{key:'active',label:'Active'},{key:'accepted',label:'Accepted'},{key:'paid',label:'Paid'},{key:'cod',label:'COD'},{key:'expired',label:'Expired'},{key:'cancelled',label:'Cancelled'},{key:'all',label:'All'}].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-4 py-2 text-xs font-semibold rounded-full transition border ${activeTab === tab.key ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
          >{tab.label} (<span className={activeTab === tab.key ? 'text-white' : 'text-slate-800 font-bold'}>{getTabCount(tab.key)}</span>)</button>
        ))}
      </div>
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center"><div className="flex flex-col items-center gap-3 text-slate-500"><div className="h-10 w-10 rounded-full border-4 border-blue-500/20 border-t-blue-600 animate-spin" /><p className="text-sm font-medium">Loading negotiations...</p></div></div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex flex-col items-center text-center max-w-md mx-auto"><p className="text-sm text-red-600 mb-4">{error}</p><button onClick={() => setRefreshTrigger(p => p + 1)} className="inline-flex items-center rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-4 py-2">Try Again</button></div>
      ) : filteredNegotiations.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-12 text-center max-w-2xl mx-auto"><div className="mx-auto mb-6 h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl">💰</div><h3 className="text-lg font-semibold text-slate-700 mb-2">No negotiations found</h3><p className="text-sm text-slate-500">{activeTab === 'active' ? "You don't have any active negotiations. Start negotiating on products to see them here!" : `No ${activeTab} negotiations found.`}</p></div>
      ) : (
        <div className="grid gap-5 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">{filteredNegotiations.map(n => (<NegotiationCard key={n._id} negotiation={n} currentUser={currentUser} currentRole={currentRole} onUpdate={handleNegotiationUpdate} onRemove={handleNegotiationRemove} />))}</div>
      )}
    {allNegotiations.length > 0 && (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-2xl font-bold text-slate-800 mb-1">{getTabCount('active')}</div><div className="text-xs font-medium uppercase tracking-wide text-slate-500">Active</div></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-2xl font-bold text-slate-800 mb-1">{getTabCount('accepted')}</div><div className="text-xs font-medium uppercase tracking-wide text-slate-500">Accepted</div></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-2xl font-bold text-slate-800 mb-1">{getTabCount('paid')}</div><div className="text-xs font-medium uppercase tracking-wide text-slate-500">Paid</div></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-2xl font-bold text-slate-800 mb-1">{getTabCount('cod')}</div><div className="text-xs font-medium uppercase tracking-wide text-slate-500">COD</div></div>
        </div>
      )}
      {allError && (
        <div className="mt-4 max-w-lg mx-auto rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-[11px] text-amber-800 font-medium text-center">{allError}</div>
      )}
    </div>
  );
};

export default NegotiationDashboard;
