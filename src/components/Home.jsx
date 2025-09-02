import React, { useState, useEffect } from 'react';
import Carousel from './Carousel';
import FeaturedItems from './FeaturedItems';
import AllProducts from './AllProducts';
import FeatureCards from './FeatureCards';
import SectionShell from './home/SectionShell';
import ProductMiniCard from './home/ProductMiniCard';
import VendorSpotlightCard from './home/VendorSpotlightCard';
import NegotiationStatsBar from './home/NegotiationStatsBar';
import AIQuickPromptBar from './home/AIQuickPromptBar';
import RailSkeleton from './home/RailSkeleton';
import ProductModal from './ProductModal';
import NegotiationHighlight from './home/NegotiationHighlight';
import PlantDiseaseCTA from './home/PlantDiseaseCTA';
import ActivityTicker from './home/ActivityTicker';
import TestimonialsCarousel from './home/TestimonialsCarousel';
import RatingsDistribution from './home/RatingsDistribution';
import ComplianceBadges from './home/ComplianceBadges';


const Home = () => {
  const [filter, setFilter] = useState('all');
  const [categories, setCategories] = useState(['all']);
  const [products, setProducts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [personalized, setPersonalized] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5005/api/products')
      .then(res => res.json())
      .then(data => {
        let list = [];
        if (data.products && Array.isArray(data.products)) {
          list = data.products;
          setProducts(list);
        } else if (Array.isArray(data)) {
            list = data;
            setProducts(list);
        } else {
          console.error('Products data is not in expected format:', data);
          setProducts([]);
        }
        // Derive categories dynamically (exclude falsy, normalize to lowercase) + keep original case for display
        const catSet = new Map();
        list.forEach(p => {
          if (p.category) {
            const key = String(p.category).trim();
            if (key) catSet.set(key.toLowerCase(), key); // preserve first seen casing
          }
        });
        const uniqueCats = Array.from(catSet.values()).sort((a,b)=>a.localeCompare(b));
        setCategories(['all', ...uniqueCats]);
      })
      .catch(err => {
        console.error('Failed to fetch products', err);
        setProducts([]);
        setCategories(['all']);
      });
  }, []);

  // Fetch summary (trending, vendor spotlight, negotiation stats)
  useEffect(() => {
    fetch('http://localhost:5005/api/home/summary')
      .then(r => r.json())
      .then(d => setSummary(d))
      .catch(() => {});
  }, []);

  // Build personalized rail (simple heuristic: recently viewed + random fallback)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('recentProducts');
      let recents = [];
      if (raw) {
        recents = JSON.parse(raw).filter(Boolean).slice(-20);
      }
      // Map ids to product objects if available
      const productMap = new Map(products.map(p => [String(p._id), p]));
      const resolved = recents.map(id => productMap.get(String(id))).filter(Boolean);
      const remaining = products.filter(p => !resolved.includes(p));
      // Fill up to 8
      while (resolved.length < 8 && remaining.length) {
        const idx = Math.floor(Math.random() * remaining.length);
        resolved.push(remaining.splice(idx,1)[0]);
      }
      setPersonalized(resolved.slice(0,8));
    } catch (e) {
      setPersonalized(products.slice(0,8));
    }
  }, [products]);

  const trending = summary?.trendingProducts || [];
  const vendorSpotlight = summary?.vendorSpotlight;
  const negotiationStats = summary?.negotiationStats;
  const negotiationHighlight = summary?.negotiationHighlight;
  const activity = summary?.activity || [];
  const ratings = summary?.ratings;
  const testimonials = summary?.testimonials || [];

  const handleAIPrompt = (prompt) => {
    // Placeholder: You can integrate existing ai-chat route; for now just log
    console.log('AI prompt submitted:', prompt);
  };

  return (
    <main className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-b from-white via-primary-50/70 to-white">
      {/* global decorative layers */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(circle_at_80%_20%,rgba(34,139,50,.18),transparent_55%),radial-gradient(circle_at_15%_75%,rgba(16,122,52,.12),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(16,122,52,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,122,52,0.07)_1px,transparent_1px)] bg-[size:54px_54px]" />

      {/* Hero / Carousel (full bleed) */}
      <div className="relative shadow-sm shadow-primary-900/5"> <Carousel /> </div>

      {/* Feature Pillars */}
      <div className="mt-12 md:mt-16">
        <FeatureCards />
      </div>

      {/* Trending Rail */}
      {(() => {
        if (summary && trending.length > 0) {
          return (
            <SectionShell title="Trending Now" subtitle="Hot moving products by sales" gradient="from-primary-100/40 via-white to-primary-100/30">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
                {trending.map(p => <ProductMiniCard key={p._id} p={p} onClick={setSelectedProduct} />)}
              </div>
            </SectionShell>
          );
        }
        if (!summary) {
          return (
            <SectionShell title="Trending Now" subtitle="Hot moving products by sales" gradient="from-primary-100/40 via-white to-primary-100/30">
              <RailSkeleton />
            </SectionShell>
          );
        }
        return null;
      })()}

      {/* Personalized Rail */}
      {(() => {
        if (personalized.length > 0) {
          return (
            <SectionShell title="Just For You" subtitle="Based on recent views" gradient="from-white via-primary-50/60 to-primary-100/30" action={<button className="text-xs font-semibold text-primary-600 hover:text-primary-700">Refresh</button>}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
                {personalized.map(p => <ProductMiniCard key={p._id} p={p} onClick={setSelectedProduct} />)}
              </div>
            </SectionShell>
          );
        }
        if (products.length === 0) {
          return (
            <SectionShell title="Just For You" subtitle="Personalized picks loading" gradient="from-white via-primary-50/60 to-primary-100/30">
              <RailSkeleton />
            </SectionShell>
          );
        }
        return null;
      })()}

      {/* Vendor Spotlight + AI Prompt + Negotiation Stats */}
      {(vendorSpotlight || negotiationStats) && (
        <section className="relative mt-4">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-50/60 via-white to-primary-50/50" />
          <div className="max-w-[90%] xl:max-w-[85%] mx-auto py-8">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 flex flex-col gap-6">
                <VendorSpotlightCard vendor={vendorSpotlight} />
                <div className="rounded-2xl border border-primary-100/70 bg-white/80 backdrop-blur-sm p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-primary-700 tracking-wide uppercase">Ask Marketplace AI</h3>
                    <span className="text-[10px] text-primary-500 font-medium">beta</span>
                  </div>
                  <AIQuickPromptBar onPrompt={handleAIPrompt} />
                </div>
              </div>
              <div className="flex flex-col gap-6">
                <div className="rounded-2xl border border-primary-100/70 bg-white/80 backdrop-blur-sm p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-sm font-extrabold text-primary-700 tracking-wide uppercase">Deal Activity</h3>
                  </div>
                  <NegotiationStatsBar stats={negotiationStats} />
                  {negotiationStats?.topNegotiatedProduct && (
                    <p className="mt-4 text-[11px] text-primary-600">Top product: {negotiationStats.topNegotiatedProduct.name} ({negotiationStats.topNegotiatedProduct.count} talks)</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured Items Section */}
      <section className="relative mt-10 md:mt-16">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-100/40 via-white to-primary-100/40" />
        <div className="max-w-[90%] xl:max-w-[85%] mx-auto">
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">Featured</h2>
              <p className="mt-2 text-sm text-primary-700/70 font-medium">Curated high‑quality or limited stock picks</p>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-primary-600 bg-white/70 backdrop-blur px-4 py-2 rounded-full border border-primary-200 shadow-sm">
              <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>Live</span>
              <span className="uppercase tracking-wide font-semibold">Marketplace Snapshot</span>
            </div>
          </header>
          <div className="rounded-2xl border border-primary-100/60 bg-white/80 backdrop-blur-sm shadow-sm p-2 sm:p-4"> 
            <FeaturedItems products={products} layout="embedded" />
          </div>
        </div>
      </section>

      {/* All Products & Filters */}
      <section className="relative mt-14 md:mt-20 pb-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-primary-50/40 to-white" />
        <div className="max-w-[90%] xl:max-w-[85%] mx-auto">
          {/* Heading + Filters */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-10">
            <div className="max-w-xl">
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary-700 via-primary-600 to-primary-500 bg-clip-text text-transparent">All Products</h2>
              <p className="mt-3 text-sm md:text-base text-primary-700/70 font-medium">Browse and filter approved marketplace listings</p>
              <div className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-wide font-semibold text-primary-600/80 bg-primary-100/70 px-3 py-1 rounded-full ring-1 ring-primary-500/10 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"/>
                {products.length} items
              </div>
            </div>
            {/* Category Chips */}
            <div className="relative w-full md:w-auto">
              <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-white to-transparent" />
              <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white to-transparent" />
              <div className="flex gap-2 md:gap-3 overflow-x-auto scrollbar-thin pb-1 pl-0 pr-0 md:pl-2 md:pr-2" role="tablist" aria-label="Product categories">
                {categories.map(cat => {
                  const active = filter === cat;
                  const display = cat === 'all' ? 'All' : cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => setFilter(cat)}
                      role="tab"
                      aria-selected={active}
                      className={`relative inline-flex items-center gap-1 rounded-full px-4 py-2 text-[11px] md:text-xs font-semibold tracking-wide transition focus:outline-none focus:ring-2 focus:ring-primary-500/40 ring-offset-0 border capitalize shadow-sm ${active ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white border-primary-600 shadow-primary-600/20' : 'bg-white/80 text-primary-700 border-primary-300 hover:bg-primary-50 hover:border-primary-400'} `}
                    >
                      {display}
                      {active && <span className="absolute -bottom-px left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-amber-400" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="rounded-2xl ring-1 ring-primary-900/5 bg-white/80 backdrop-blur-sm shadow-sm p-2 sm:p-4">
            <AllProducts products={products} filter={filter} layout="embedded" />
          </div>
        </div>
      </section>
      {/* New post-products feature strip */}
      <section className="relative mt-6 md:mt-10 mb-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-primary-50/40 via-white to-primary-50/30" />
        <div className="max-w-[90%] xl:max-w-[85%] mx-auto grid gap-8 md:gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-8">
            <NegotiationHighlight highlight={negotiationHighlight} />
            <PlantDiseaseCTA />
          </div>
          <div className="flex flex-col gap-8">
            <ActivityTicker items={activity} />
            <div className="rounded-2xl border border-primary-100/70 bg-white/70 backdrop-blur-sm p-4 text-[11px] text-primary-600 font-medium">
              <p className="mb-2 font-semibold text-primary-700 text-xs uppercase tracking-wide">Why These Features?</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Real-time trust & engagement signals</li>
                <li>Actionable AI for agriculture</li>
                <li>Deal transparency & motivation</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {/* Social Proof & Credibility */}
      <section className="relative mt-2 md:mt-4 mb-32">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-primary-50/30 to-white" />
        <div className="max-w-[90%] xl:max-w-[85%] mx-auto flex flex-col gap-10">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 flex flex-col gap-8">
              <TestimonialsCarousel items={testimonials} />
              <ComplianceBadges />
            </div>
            <div className="flex flex-col gap-8">
              <RatingsDistribution ratings={ratings} />
              <div className="rounded-2xl border border-primary-100/60 bg-white/70 backdrop-blur-sm p-5 text-[11px] text-primary-600 font-medium">
                <p className="font-semibold text-primary-700 text-xs uppercase tracking-wide mb-2">Transparency</p>
                <p>Community-driven ratings help buyers trust vendors faster. Each review influences store quality signals and negotiation confidence.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </main>
  );
};

export default Home;
