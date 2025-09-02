import React, { useEffect, useState } from 'react';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import freshVeg from '../assets/11.jpg';
import organicFruits from '../assets/2.jpg';
import dairyProducts from '../assets/3.jpg';
import { useAdminAuth } from '../contexts/AdminAuthContext';

const slides = [
  { image: freshVeg, title: 'ক্ষুধা নয়, কৃষকের ক্ষমতা চাই', tagline: 'Empowering growers with fair market access' },
  { image: organicFruits, title: 'সিন্ডিকেটের জাল ভাঙব, কৃষকের হাল বাঁধব', tagline: 'Breaking syndicates, building resilience' },
  { image: dairyProducts, title: 'থাকবো না পিছে, যাবো এগিয়ে', tagline: 'Forward together for a better agro future' }
];

const ArrowBtn = ({ onClick, direction }) => {
  const isPrev = direction === 'prev';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrev ? 'Previous Slide' : 'Next Slide'}
      className={`group absolute top-1/2 z-30 -translate-y-1/2 rounded-full bg-white/80 hover:bg-white shadow-lg backdrop-blur flex items-center justify-center w-11 h-11 transition ${isPrev ? 'left-4' : 'right-4'}`}
    >
      <span className="inline-block text-neutral-700 group-hover:text-green-700 transition">
        {isPrev ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        )}
      </span>
    </button>
  );
};

const Indicator = ({ isSelected, onClick, index, label }) => (
  <li className="inline-flex" key={index}>
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`mx-1 h-2 rounded-full transition-all shadow ${isSelected ? 'w-6 bg-green-600' : 'w-2 bg-white/60 hover:bg-white'}`}
    />
  </li>
);

const CarouselComponent = () => {
  const [dynamicSlides, setDynamicSlides] = useState(slides);
  const [loading, setLoading] = useState(true);
  const [showManager, setShowManager] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', tagline: '', image: null });
  const adminAuth = useAdminAuth ? useAdminAuth() : null;
  const isAdmin = !!adminAuth?.admin;

  const fetchSlides = async () => {
    try {
      const res = await fetch('http://localhost:5005/api/admin/carousel/public');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.slides) && data.slides.length) {
          setDynamicSlides(data.slides.map(s => ({ id: s._id, image: s.imageUrl, title: s.title || '', tagline: s.tagline || '' })));
        }
      }
    } catch (e) {
      console.error('Failed to load carousel slides:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSlides(); }, []);

  const handleFileChange = (e) => {
    setForm(f => ({ ...f, image: e.target.files[0] || null }));
  };

  const handleCreateSlide = async (e) => {
    e.preventDefault();
    if (!form.image) return;
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('image', form.image);
      fd.append('title', form.title);
      fd.append('tagline', form.tagline);
      const token = adminAuth?.token;
      const res = await fetch('http://localhost:5005/api/admin/carousel', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      if (res.ok) {
        setForm({ title: '', tagline: '', image: null });
        await fetchSlides();
      } else {
        console.error('Slide upload failed', await res.text());
      }
    } catch (err) {
      console.error('Create slide error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this slide?')) return;
    try {
      const token = adminAuth?.token;
      const res = await fetch(`http://localhost:5005/api/admin/carousel/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchSlides();
      } else {
        console.error('Delete failed', await res.text());
      }
    } catch (e) {
      console.error('Delete slide error:', e);
    }
  };

  if (loading) {
    return <div className="w-full h-64 flex items-center justify-center text-green-700">Loading...</div>;
  }

  return (
    <section className="relative w-full bg-gradient-to-b from-amber-200/60 via-amber-100 to-white py-6 sm:py-10">
      {isAdmin && (
        <div className="absolute top-2 right-2 z-40 flex gap-2">
          <button onClick={() => setShowManager(m => !m)} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-green-700 hover:bg-green-800 text-white shadow">
            {showManager ? 'Close Manager' : 'Manage Slides'}
          </button>
        </div>
      )}
      {isAdmin && showManager && (
        <div className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-6 relative">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">Carousel Manager</h3>
            <form onSubmit={handleCreateSlide} className="grid gap-3 sm:grid-cols-2 mb-6">
              <input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="col-span-2 sm:col-span-1 rounded border border-green-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              <input
                type="text"
                placeholder="Tagline"
                value={form.tagline}
                onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
                className="col-span-2 sm:col-span-1 rounded border border-green-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="col-span-2 text-sm"
              />
              <div className="col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => setForm({ title: '', tagline: '', image: null })} className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-100">Reset</button>
                <button disabled={uploading || !form.image} type="submit" className="px-4 py-2 text-sm rounded bg-green-600 disabled:opacity-50 text-white font-semibold hover:bg-green-700">{uploading ? 'Uploading...' : 'Add Slide'}</button>
              </div>
            </form>
            <div className="grid gap-4 sm:grid-cols-2">
              {dynamicSlides.map(s => (
                <div key={s.id || s.image} className="relative group border rounded-lg overflow-hidden shadow">
                  <img src={s.image} alt={s.title} className="h-40 w-full object-cover" />
                  <div className="p-2">
                    <p className="text-xs font-semibold line-clamp-1">{s.title || '—'}</p>
                    <p className="text-[11px] text-gray-600 line-clamp-2">{s.tagline || ''}</p>
                  </div>
                  <button onClick={() => handleDelete(s.id)} className="absolute top-1 right-1 bg-red-600/80 hover:bg-red-700 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition">Delete</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-green-200/60 shadow-xl group">
          {/* Background accent */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.35),transparent_60%)]" />
          <Carousel
            autoPlay
            infiniteLoop
            showStatus={false}
            showThumbs={false}
            interval={5000}
            emulateTouch
            swipeable
            showIndicators={false}
            renderArrowPrev={(onClickHandler, hasPrev, label) => (
              hasPrev && <ArrowBtn onClick={onClickHandler} direction="prev" label={label} />
            )}
            renderArrowNext={(onClickHandler, hasNext, label) => (
              hasNext && <ArrowBtn onClick={onClickHandler} direction="next" label={label} />
            )}
            renderIndicators={(onClickHandler, isSelected, index, label) => (
              <Indicator
                key={index}
                isSelected={isSelected}
                onClick={onClickHandler}
                index={index}
                label={label}
              />
            )}
          >
            {dynamicSlides.map((slide, i) => (
              <div
                key={i}
                className="relative h-[60vh] sm:h-[65vh] md:h-[70vh] lg:h-[75vh] w-full select-none"
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className="h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-green-900/70 via-green-800/40 to-transparent" />
                <div className="absolute inset-0 flex flex-col items-center justify-center px-4 sm:px-8 text-center">
                  <h2 className="font-extrabold tracking-tight text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl drop-shadow-md leading-snug">{slide.title}</h2>
                  <p className="mt-4 text-white/90 text-sm sm:text-base md:text-lg max-w-2xl font-medium">{slide.tagline}</p>
                  <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <button className="rounded-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm sm:text-base font-semibold px-6 py-2.5 shadow-lg shadow-green-900/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500 transition">Explore Marketplace</button>
                    <button className="rounded-full border border-white/70 bg-white/10 hover:bg-white/20 backdrop-blur text-white text-sm sm:text-base font-semibold px-6 py-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white transition">Support Farmers</button>
                  </div>
                </div>
              </div>
            ))}
          </Carousel>
          {/* External indicators container (custom) */}
          <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center">
            <ul className="pointer-events-auto bg-black/25 backdrop-blur rounded-full px-3 py-2 flex items-center justify-center">
              {dynamicSlides.map((_, idx) => (
                <span key={idx} className="sr-only">Slide {idx + 1}</span>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CarouselComponent;
