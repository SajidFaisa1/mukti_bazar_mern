import React, { useEffect, useState } from 'react';
import { FaStar, FaStore } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const DiscoverStores = ({ limit=8 }) => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true); setError(null);
      try {
  const res = await fetch(`http://localhost:5005/api/vendors/discover?limit=all`);
        const data = await res.json();
        if (!cancelled) {
          if (!res.ok) throw new Error(data.error||'Failed');
          setVendors(data.vendors||[]);
        }
      } catch(e){ if(!cancelled) setError(e.message); }
      finally { if(!cancelled) setLoading(false); }
    })();
    return ()=>{ cancelled=true; };
  }, [limit]);

  if (loading) return <div className="p-4 text-xs text-slate-500">Loading stores...</div>;
  if (error) return <div className="p-4 text-xs text-rose-600">{error}</div>;
  if (!vendors.length) return null;

  return (
    <section className="mt-10">
      <header className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FaStore className="text-primary-500" /> Discover Stores</h2>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {vendors.map(v => (
          <button key={v.storeId} onClick={()=>navigate(`/store/${v.storeId}`)} className="group flex flex-col items-stretch rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition overflow-hidden text-left">
            <div className="h-20 w-full bg-gradient-to-br from-primary-50 to-white flex items-center justify-center text-primary-600 text-xl font-bold">
              {v.shopLogo?.url ? <img src={v.shopLogo.url} alt={v.businessName} className="h-full w-full object-cover" /> : v.businessName?.[0]}
            </div>
            <div className="p-3 flex flex-col gap-1">
              <h3 className="text-[12px] font-semibold text-slate-800 line-clamp-2">{v.businessName}</h3>
              {v.storeRatingCount>0 && (
                <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                  <FaStar className="text-amber-400" /> {v.storeRatingAvg?.toFixed?.(1) || v.storeRatingAvg}
                  <span className="text-slate-400">({v.storeRatingCount})</span>
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {v.certifications?.slice(0,2).map(c=> <span key={c} className="text-[8px] px-1.5 py-0.5 rounded bg-primary-100 text-primary-600 font-medium">{c}</span>)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default DiscoverStores;
