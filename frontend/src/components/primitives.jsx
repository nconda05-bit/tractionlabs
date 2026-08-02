import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export const Overline = ({ children, className = "" }) => (
  <span className={`font-mono text-xs sm:text-sm uppercase tracking-[0.22em] font-bold text-electric ${className}`}>
    {children}
  </span>
);

export const Section = ({ children, className = "", id, testid }) => (
  <section id={id} data-testid={testid} className={`relative py-24 lg:py-32 ${className}`}>
    <div className="max-w-7xl mx-auto px-6 lg:px-8">{children}</div>
  </section>
);

export const PrimaryButton = ({ to, children, onClick, className = "", testid }) => {
  const cls = `group inline-flex items-center justify-center gap-2 rounded-full bg-electric px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-blue-600 hover:shadow-[0_0_34px_rgba(59,130,246,0.55)] ${className}`;
  const inner = (
    <>
      {children}
      <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
    </>
  );
  if (to) return <Link to={to} data-testid={testid} className={cls}>{inner}</Link>;
  return <button onClick={onClick} data-testid={testid} className={cls}>{inner}</button>;
};

export const GhostButton = ({ to, children, onClick, className = "", testid }) => {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-white transition-colors duration-300 hover:border-white/40 hover:bg-white/5 ${className}`;
  if (to) return <Link to={to} data-testid={testid} className={cls}>{children}</Link>;
  return <button onClick={onClick} data-testid={testid} className={cls}>{children}</button>;
};

export const Marquee = ({ items }) => (
  <div className="relative flex overflow-hidden border-y border-white/5 py-6 bg-navy-800/40" data-testid="marquee">
    <div className="flex shrink-0 animate-marquee items-center gap-16 pr-16">
      {[...items, ...items].map((t, i) => (
        <div key={i} className="flex items-center gap-16">
          <span className="font-heading text-lg font-semibold text-slate-400 whitespace-nowrap">{t}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-electric/60" />
        </div>
      ))}
    </div>
    <div className="flex shrink-0 animate-marquee items-center gap-16 pr-16" aria-hidden="true">
      {[...items, ...items].map((t, i) => (
        <div key={i} className="flex items-center gap-16">
          <span className="font-heading text-lg font-semibold text-slate-400 whitespace-nowrap">{t}</span>
          <span className="h-1.5 w-1.5 rounded-full bg-electric/60" />
        </div>
      ))}
    </div>
  </div>
);
