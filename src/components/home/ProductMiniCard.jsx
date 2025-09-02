import React from 'react';
import { FaStar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const ProductMiniCard = ({ p, onClick }) => {
  const navigate = useNavigate();
  return (
    <div
      className="group relative flex flex-col rounded-xl border border-primary-100/60 bg-white/80 backdrop-blur-sm shadow-sm hover:shadow-md transition overflow-hidden cursor-pointer"
      onClick={() => onClick ? onClick(p) : navigate(`/product/${p._id}`)}
    >
      <div className="aspect-square w-full bg-gradient-to-br from-primary-50 to-white flex items-center justify-center overflow-hidden">
        {p.images?.[0] ? (
          <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition" />
        ) : (
          <span className="text-primary-400 text-xs">No Image</span>
        )}
        {p.soldQty > 0 && <span className="absolute top-1.5 left-1.5 rounded-full bg-amber-500/90 text-[10px] font-semibold text-white px-2 py-0.5 shadow">{p.soldQty} sold</span>}
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <h3 className="text-[13px] font-semibold text-primary-800 line-clamp-2 leading-snug">{p.name}</h3>
        {typeof p.avgRating === 'number' && p.ratingCount > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
            <span className="flex items-center">
              {Array.from({length:5}).map((_,i)=>(
                <FaStar key={i} className={`h-3 w-3 ${i < Math.round(p.avgRating) ? 'text-amber-400' : 'text-slate-300'}`} />
              ))}
            </span>
            <span>{p.avgRating.toFixed(1)}</span>
            <span className="text-[9px] text-slate-400">({p.ratingCount})</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-primary-600 font-bold text-sm">৳{p.offerPrice || p.unitPrice}</span>
          {p.offerPrice && <span className="line-through text-[11px] text-primary-400">৳{p.unitPrice}</span>}
        </div>
        <span className="text-[10px] uppercase tracking-wide text-primary-500 font-medium">{p.category}</span>
      </div>
    </div>
  );
};

export default ProductMiniCard;
