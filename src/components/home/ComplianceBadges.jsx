import React from 'react';
import { ShieldCheck, CheckCircle2, Award, ScanBarcode } from 'lucide-react';

const badges = [
  { icon: ShieldCheck, label: 'Verified Vendors', color: 'from-emerald-600 to-green-500' },
  { icon: Award, label: 'Quality Assured', color: 'from-amber-500 to-amber-400' },
  { icon: ScanBarcode, label: 'Traceable Lots', color: 'from-indigo-600 to-indigo-500' },
  { icon: CheckCircle2, label: 'Safe Payments', color: 'from-primary-600 to-primary-500' }
];

const ComplianceBadges = () => {
  return (
    <div className="rounded-2xl border border-primary-100/60 bg-white/80 backdrop-blur-sm p-5 flex flex-wrap items-center gap-4 justify-between">
      {badges.map(b => {
        const Icon = b.icon;
        return (
          <div key={b.label} className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${b.color} text-white flex items-center justify-center shadow-sm`}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-primary-700 uppercase tracking-wide">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ComplianceBadges;
