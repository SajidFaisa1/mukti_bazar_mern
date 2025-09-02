import React from 'react';
import { Leaf, Camera, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PlantDiseaseCTA = () => {
  const navigate = useNavigate();
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-emerald-100 p-6 flex flex-col gap-4 shadow-sm">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-300/20 rounded-full blur-2xl" />
      <div className="absolute bottom-0 right-0 w-56 h-56 bg-emerald-400/10 rounded-full blur-3xl" />
      <header className="relative z-10 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 to-green-500 flex items-center justify-center shadow-inner ring-2 ring-white/40">
          <Leaf className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-base font-extrabold tracking-tight bg-gradient-to-r from-emerald-700 to-green-600 bg-clip-text text-transparent">AI Plant Health</h3>
          <p className="text-[11px] font-medium text-emerald-700/70 uppercase tracking-wide">Early Disease Detection</p>
        </div>
      </header>
      <p className="relative z-10 text-xs text-emerald-800 leading-relaxed font-medium">
        Snap or upload a leaf photo and get instant AI diagnosis with actionable treatment tips to save your crops before it's too late.
      </p>
      <ul className="relative z-10 text-[11px] text-emerald-700/80 font-medium grid grid-cols-2 gap-2">
        <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 40+ disease classes</li>
        <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Offline prep guide</li>
        <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Bengali + English</li>
        <li className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Free beta</li>
      </ul>
      <div className="relative z-10 mt-2 flex flex-wrap items-center gap-3">
        <button onClick={() => navigate('/plant-disease')} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-semibold tracking-wide bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition focus:outline-none focus:ring-4 focus:ring-emerald-300">
          <Camera className="w-4 h-4" /> Try Diagnostic Tool
        </button>
        <button onClick={() => navigate('/plant-disease')} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700/80 hover:text-emerald-700 group">
          <Sparkles className="w-4 h-4 text-emerald-500 group-hover:rotate-12 transition" /> How it works
        </button>
      </div>
    </div>
  );
};

export default PlantDiseaseCTA;
