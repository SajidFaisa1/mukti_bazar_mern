import React from 'react';

const SectionShell = ({ title, subtitle, children, action, gradient = 'from-primary-100/50 via-white to-primary-50/40', className='' }) => (
  <section className={"relative " + className}>
    <div className={`absolute inset-0 -z-10 bg-gradient-to-r ${gradient}`} />
    <div className="max-w-[90%] xl:max-w-[85%] mx-auto py-6 md:py-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">{title}</h2>
          {subtitle && <p className="mt-1 text-xs md:text-sm text-primary-700/70 font-medium">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </header>
      {children}
    </div>
  </section>
);

export default SectionShell;
