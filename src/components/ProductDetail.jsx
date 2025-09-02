import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const ProductDetail = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const res = await fetch(`http://localhost:5005/api/products/${id}`);
        const data = await res.json();
        if (!cancelled) {
          if (data.error) throw new Error(data.error);
          setProduct(data);
          // Update recent views
          try {
            const raw = localStorage.getItem('recentProducts');
            let arr = raw ? JSON.parse(raw) : [];
            arr = arr.filter(pid => pid !== id);
            arr.push(id);
            localStorage.setItem('recentProducts', JSON.stringify(arr.slice(-40)));
          } catch(e) {}
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load product');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) return <div className="max-w-[85%] mx-auto py-16 text-center text-primary-600 font-semibold">Loading...</div>;
  if (error) return <div className="max-w-[85%] mx-auto py-16 text-center text-rose-600 font-semibold">{error}</div>;
  if (!product) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-primary-50/60 to-white py-10">
      <div className="max-w-[90%] xl:max-w-[85%] mx-auto grid md:grid-cols-2 gap-10">
        <div className="flex flex-col gap-4">
          <div className="aspect-square w-full rounded-2xl overflow-hidden border border-primary-100 bg-white/70 flex items-center justify-center">
            {product.images?.[0] ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-400">No Image</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2">
            {product.images?.slice(0,4).map((img,i) => (
              <img key={i} src={img} alt="thumb" className="h-20 w-full object-cover rounded-lg border border-primary-100" />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">{product.name}</h1>
            <p className="mt-2 text-sm text-primary-700/80 leading-relaxed whitespace-pre-line">{product.description || 'No description provided.'}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-primary-600">৳{product.offerPrice || product.unitPrice}</span>
            {product.offerPrice && <span className="line-through text-primary-400">৳{product.unitPrice}</span>}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="px-3 py-1 rounded-full bg-primary-100 text-primary-700 font-semibold">{product.category}</span>
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold">Min {product.minOrderQty} {product.unitType}</span>
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Stock {product.totalQty}</span>
          </div>
          <button className="self-start bg-gradient-to-r from-primary-600 to-primary-500 text-white px-6 py-3 rounded-xl font-semibold text-sm shadow hover:shadow-md transition">Add to Cart</button>
        </div>
      </div>
    </main>
  );
};

export default ProductDetail;
