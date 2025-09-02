import React, { useEffect, useRef, useState } from 'react';
import { FaUsers, FaHandshake, FaBoxes, FaShieldAlt, FaBalanceScale, FaLock, FaChartLine, FaSatelliteDish } from 'react-icons/fa';
import { useLanguage } from '../contexts/LanguageContext';

const FeatureCards = () => {
  const { language } = useLanguage();
  const isBn = language === 'bn' || language === 'bangla' || language === 'bd';

  // Unified icon color tone (allow subtle hue shifts but within primary/amber accent scale)
  const features = [
    { icon: <FaBalanceScale className="w-8 h-8 text-primary-600" />, key: 'fairPrice', titleBn: 'স্বচ্ছ ন্যায্য মূল্য অ্যালগরিদম', titleEn: 'Transparent Fair Price Engine', descBn: 'জাতীয় বাজার, পাইকারি হাট ও আবহাওয়া ডেটা একত্রে বিশ্লেষণ করে অ্যালগরিদম কৃষকের জন্য প্রস্তাবিত ন্যায্য মূল্য দেখায়—সিন্ডিকেটের তৈরিকৃত কৃত্রিম ঘাটতি ভাঙে।', descEn: 'Algorithm blends national wholesale, local bazaar and weather data to recommend fair prices, neutralising artificial scarcity crafted by syndicates.', emoji: '⚖️' },
    { icon: <FaUsers className="w-8 h-8 text-primary-500" />, key: 'collective', titleBn: 'সমবায় শক্তি ও গ্রুপ বারগেইনিং', titleEn: 'Collective Power & Group Bargaining', descBn: 'একাধিক কৃষকের ব্যাচ লটিং ও সমবায় দর কষাকষি—একক কৃষকের দুর্বলতা কমায় ও সিন্ডিকেটের চাপে দাঁড় করায় শক্ত দেয়াল।', descEn: 'Batch lotting lets smallholders negotiate as one, shrinking fragmentation and forming a wall against cartel pressure.', emoji: '🤝' },
    { icon: <FaChartLine className="w-8 h-8 text-primary-600" />, key: 'realtime', titleBn: 'রিয়েল-টাইম বাজার সিগন্যাল', titleEn: 'Real‑Time Market Signals', descBn: 'মোবাইল-ফার্স্ট ড্যাশবোর্ডে লাইভ সরবরাহ, চাহিদা, ট্রেন্ড অ্যালার্ট—হঠাৎ অস্বাভাবিক স্টক হোল্ড বা দাম লাফালাফি সাথে সাথে চিহ্নিত।', descEn: 'Mobile-first dashboards stream live supply, demand & anomaly alerts—flagging sudden stock hoards or suspicious price spikes instantly.', emoji: '📡' },
    { icon: <FaShieldAlt className="w-8 h-8 text-primary-700" />, key: 'fraud', titleBn: 'এআই সিন্ডিকেট অস্বাভাবিকতা শনাক্তকরণ', titleEn: 'AI Syndicate Anomaly Detection', descBn: 'লেনদেন প্যাটার্ন, অঞ্চলভিত্তিক অর্ডার বিলম্ব ও অস্বাভাবিক স্টক মুভমেন্ট স্কোর করে সিন্ডিকেট সম্ভাবনা রিয়েল-টাইমে ফ্ল্যাগ করে।', descEn: 'Models score transaction clusters, regional delays & unusual stock moves to flag probable collusion in real time.', emoji: '🛡️' },
    { icon: <FaLock className="w-8 h-8 text-primary-600" />, key: 'trace', titleBn: 'ট্রেসেবল ও সুরক্ষিত লেনদেন', titleEn: 'Traceable & Secure Transactions', descBn: 'ইনভয়েস হ্যাশ, টাইমস্ট্যাম্পড ডেলিভারি লগ ও অপরিবর্তনীয় রেকর্ড—গোপন দর-কষাকষি ও কালো চেইন ভাঙার ডেটা ভিত্তি।', descEn: 'Invoice hashing and tamper‑evident delivery trails create accountability layers that erode secret side deals.', emoji: '🔐' },
    { icon: <FaBoxes className="w-8 h-8 text-primary-500" />, key: 'logistics', titleBn: 'স্মার্ট লজিস্টিক্স ও লাস্ট মাইল', titleEn: 'Smart Logistics & Last‑Mile', descBn: 'রুট অপ্টিমাইজেশন + শেয়ার্ড কোল্ডচেইন ক্ষতির হার কমায়, কৃষককে দ্রুত নগদে পৌঁছে দেয়—বাধ্যতামূলক ডিস্ট্রেস সেল কমে।', descEn: 'Route optimisation & shared cold chain cut spoilage, accelerating cash cycles and reducing distress selling leverage.', emoji: '🚚' },
    { icon: <FaHandshake className="w-8 h-8 text-primary-600" />, key: 'direct', titleBn: 'সরাসরি ক্রেতা সংযোগ', titleEn: 'Direct Buyer Connectivity', descBn: 'প্রসেসর, রিটেইলার ও রপ্তানিকারকের সাথে মধ্যস্বত্বভোগী ছাড়া ম্যাচিং—মূল্যের মধ্যবর্তী স্তর ভেঙে যায়।', descEn: 'Direct matchmaking to processors, retailers & exporters removes layers that syndicates exploit for margin stacking.', emoji: '🔗' },
    { icon: <FaSatelliteDish className="w-8 h-8 text-primary-500" />, key: 'intel', titleBn: 'গ্রামীণ মূল্য বুদ্ধিমত্তা নেটওয়ার্ক', titleEn: 'Rural Price Intelligence Network', descBn: 'এসএমএস ও ভয়েস বট গ্রাম পর্যায়ের দামের দ্রুত আপডেট সংগ্রহ করে—কোনো এলাকার কৃত্রিম দাম চাপ দ্রুত ধরা পড়ে।', descEn: 'SMS & voice bots crowdsource rural price points so artificial local suppression is surfaced fast.', emoji: '📊' }
  ];

  // NEW: Split into two groups of 4
  const groupA = features.slice(0, 4);
  const groupB = features.slice(4, 8);
  const [stage, setStage] = useState(0); // 0 = first group, 1 = second group
  const sectionRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const vh = window.innerHeight || 0;
      const sectionCenter = rect.top + rect.height / 2;
      const viewportCenter = vh / 2;
      // Hysteresis: offset so it doesn't flicker around boundary
      const hysteresis = 60; // px
      if (stage === 0 && sectionCenter < viewportCenter - hysteresis) {
        setStage(1);
      } else if (stage === 1 && sectionCenter > viewportCenter + hysteresis) {
        setStage(0);
      }
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [stage]);

  // Optional: reduce motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <div className="relative" ref={sectionRef}>
      {/* Unified subtle background using primary palette */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white via-primary-50/60 to-white" />
      <div className="absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(16,122,52,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(16,122,52,0.06)_1px,transparent_1px)] bg-[size:46px_46px]" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_20%,rgba(34,139,50,0.18),transparent_60%)]" aria-hidden="true" />
      <section className="py-20 px-6 sm:px-8 lg:px-12 xl:px-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <header className="max-w-3xl mb-16 mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-6 py-1.5 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold tracking-wide mb-6 shadow-sm ring-1 ring-primary-600/10">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              {isBn ? 'বাজার রূপান্তরের মূল স্তম্ভ' : 'Core Pillars Transforming The Market'}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent leading-tight">
              {isBn ? 'সিন্ডিকেট ভাঙতে ডেটা, এআই ও স্বচ্ছতার সমন্বয়' : 'Data, AI & Transparency Against Cartel Control'}
            </h2>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed">
              {isBn ? 'স্ক্রল করুন—প্রথম ৪টি স্তম্ভ, তারপর পরবর্তী ৪টি স্বয়ংক্রিয়ভাবে দেখাবে।' : 'Scroll to transition from the first four pillars to the next four seamlessly.'}
            </p>
          </header>

          {/* Stacked Grids */}
          <div className="relative min-h-[420px] md:min-h-[440px] lg:min-h-[460px]">
            {/* Group A */}
            <div className={`absolute inset-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6 transition-all duration-700 ease-out ${stage === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6 pointer-events-none'}`}>
              {groupA.map((f, i) => (
                <FeatureCard key={f.key} feature={f} index={i} isBn={isBn} stageActive={stage === 0} />
              ))}
            </div>
            {/* Group B */}
            <div className={`absolute inset-0 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-5 lg:gap-6 transition-all duration-700 ease-out ${stage === 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}>
              {groupB.map((f, i) => (
                <FeatureCard key={f.key} feature={f} index={i + 4} isBn={isBn} stageActive={stage === 1} />
              ))}
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="mt-14 flex items-center justify-center gap-3">
            {[0,1].map(s => (
              <span key={s} className={`h-2 rounded-full transition-all duration-500 ${stage === s ? 'w-12 bg-primary-600' : 'w-4 bg-primary-300'}`} aria-label={isBn ? `গ্রুপ ${s+1}` : `Group ${s+1}`} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

// Extracted card component for reuse
const FeatureCard = ({ feature: f, isBn, stageActive }) => {
  const title = isBn ? f.titleBn : f.titleEn;
  const desc = isBn ? f.descBn : f.descEn;
  return (
    <div className={`group relative h-full overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-primary-900/5 hover:ring-primary-500/30 hover:shadow-xl shadow-sm transition-all duration-500 ease-out ${stageActive ? 'opacity-100' : 'opacity-0'} `}>
      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition duration-500 bg-[radial-gradient(circle_at_70%_30%,rgba(16,122,52,0.16),transparent_60%)]" />
      <div className="p-5 flex flex-col h-full relative">
        <div className="flex items-start justify-between mb-4">
          <div className="relative">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-50 to-white ring-1 ring-primary-600/10 shadow-inner group-hover:shadow-md transition-transform duration-300 group-hover:scale-110">
              {f.icon}
            </div>
            <span className="absolute -top-1.5 -right-1.5 text-lg select-none drop-shadow" aria-hidden="true">{f.emoji}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wide font-semibold text-primary-700/80 bg-primary-100/70 px-2 py-1 rounded-full">{isBn ? 'স্তম্ভ' : 'Pillar'}</span>
        </div>
        <h3 className="text-[15px] font-semibold text-slate-800 group-hover:text-primary-700 leading-snug line-clamp-2">{title}</h3>
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 flex-1 line-clamp-5">{desc}</p>
        <div className="mt-4 flex items-center justify-between text-[10.5px] font-medium text-slate-500">
          <span className="inline-flex items-center gap-1 tracking-wide"><span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"/> {isBn ? 'মনিটরিং' : 'Monitoring'}</span>
          <span className="inline-flex items-center gap-1 text-primary-600 group-hover:gap-2 transition-all">{isBn ? 'আরও জানুন' : 'Learn more'}<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg></span>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-primary-400 via-primary-500 to-amber-400 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
    </div>
  );
};

export default FeatureCards;
