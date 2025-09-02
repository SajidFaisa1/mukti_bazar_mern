import React from 'react';
import { useNavigate } from 'react-router-dom';

const VendorSpotlightCard = ({ vendor }) => {
  const navigate = useNavigate();
  if (!vendor) return null;
  const goStore = () => navigate(`/store/${vendor.storeId}`);
  return (
    <div className="relative flex flex-col md:flex-row items-start gap-5 rounded-2xl border border-primary-100 bg-white/80 backdrop-blur-sm p-5 shadow-sm">
      <button onClick={goStore} className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-xl font-bold shadow-inner focus:outline-none focus:ring-2 focus:ring-primary-500/40">
        {vendor.businessName?.[0] || 'V'}
      </button>
  <div className="flex-1 min-w-0 cursor-pointer" onClick={goStore} role="button" tabIndex={0}>
        <h3 className="text-lg font-extrabold text-primary-700 tracking-tight flex items-center gap-2">{vendor.businessName}
          <span className="text-[10px] font-semibold bg-primary-600 text-white px-2 py-0.5 rounded-full">Trust {vendor.trustScore}</span>
        </h3>
        {vendor.description && <p className="mt-1 text-sm text-primary-700/70 line-clamp-2">{vendor.description}</p>}
        {vendor.certifications?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {vendor.certifications.slice(0,4).map(c => <span key={c} className="text-[10px] px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-medium">{c}</span>)}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <button onClick={goStore} className="text-xs font-semibold bg-gradient-to-r from-primary-600 to-primary-500 text-white px-4 py-2 rounded-full shadow hover:shadow-md transition">Visit Store</button>
        <span className="text-[10px] text-primary-500">Since {new Date(vendor.createdAt).getFullYear()}</span>
      </div>
    </div>
  );
};

export default VendorSpotlightCard;
