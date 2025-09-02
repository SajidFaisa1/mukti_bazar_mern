import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProductMiniCard from '../home/ProductMiniCard';
import ProductModal from '../ProductModal';

const StoreFront = () => {
  const { storeId } = useParams();
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [ratingSummary, setRatingSummary] = useState(null);

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const [vRes, pRes] = await Promise.all([
          fetch(`http://localhost:5005/api/vendors/store/${storeId}`),
          fetch(`http://localhost:5005/api/products/vendor/${storeId}`)
        ]);
        const vData = await vRes.json();
        const pData = await pRes.json();
        if (!cancelled) {
          if (vData.error) throw new Error(vData.error);
            setVendor(vData);
            setProducts(Array.isArray(pData) ? pData : []);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load store');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [storeId]);

  useEffect(()=>{
    if (vendor?._id) {
      fetch(`http://localhost:5005/api/feedback/vendor/${vendor._id}/summary`)
        .then(r=>r.json())
        .then(d=> setRatingSummary(d))
        .catch(()=>{});
    }
  }, [vendor?._id]);

  if (loading) return <div className="max-w-[85%] mx-auto py-16 text-center text-primary-600 font-semibold">Loading store...</div>;
  if (error) return <div className="max-w-[85%] mx-auto py-16 text-center text-rose-600 font-semibold">{error}</div>;
  if (!vendor) return <div className="max-w-[85%] mx-auto py-16 text-center text-primary-600 font-semibold">Store not found</div>;

  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-primary-50/60 to-white py-10">
      <div className="max-w-[90%] xl:max-w-[85%] mx-auto flex flex-col gap-10">
        <div className="flex flex-col md:flex-row gap-6 md:items-center">
          <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center text-3xl font-bold shadow-inner">
            {vendor.businessName?.[0] || 'V'}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent flex items-center gap-3">{vendor.businessName}
              <span className="text-[11px] font-semibold bg-primary-600 text-white px-2 py-0.5 rounded-full">Trust {vendor.trustScore}</span>
              {ratingSummary && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-400/90 text-amber-900 px-2 py-0.5 rounded-full">
                  <span>{ratingSummary.average?.toFixed ? ratingSummary.average.toFixed(1) : ratingSummary.average}</span>
                  <span className="text-[10px]">★</span>
                  <span className="text-[10px] text-primary-700/70">({ratingSummary.count})</span>
                </span>
              )}
            </h1>
            {vendor.description && <p className="mt-2 text-sm md:text-base text-primary-700/80 max-w-3xl leading-relaxed">{vendor.description}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {vendor.certifications?.slice(0,6).map(c => <span key={c} className="text-[10px] px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-medium">{c}</span>)}
            </div>
          </div>
        </div>

        <section>
          <header className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-extrabold text-primary-700 tracking-tight">Products</h2>
              <p className="text-xs text-primary-600 mt-1 font-medium">{products.length} items listed</p>
            </div>
          </header>
          {products.length === 0 ? (
            <div className="p-10 text-center text-sm text-primary-500 bg-white/70 border border-primary-100 rounded-2xl">No products yet.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {products.map(p => <ProductMiniCard key={p._id} p={p} onClick={setSelectedProduct} />)}
            </div>
          )}
        </section>
        {selectedProduct && (
          <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
        )}
      </div>
    </main>
  );
};

export default StoreFront;