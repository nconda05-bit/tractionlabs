import { Search, Target, Sparkles, Rocket, LineChart, PenTool, MousePointerClick, BellRing } from "lucide-react";
import { Section, Overline, PrimaryButton } from "@/components/primitives";
import { Reveal } from "@/lib/motion";

const SERVICES = [
  { icon: Search, t: "Market & Competitor Research", d: "We map your local market, analyze competitor advertising, and pinpoint the customer segments with the highest revenue potential." },
  { icon: Target, t: "Offer Strategy & Positioning", d: "We engineer offers that make your ideal customers take action — the single biggest lever in profitable advertising." },
  { icon: Sparkles, t: "AI-Powered Ad Creative", d: "High-converting ads, short-form video, and image assets produced quickly and tested continuously with modern AI tooling." },
  { icon: MousePointerClick, t: "Landing Pages & Conversion", d: "Fast, mobile-first landing pages designed to turn ad clicks into booked calls and form submissions." },
  { icon: Rocket, t: "Paid Advertising Management", d: "End-to-end Facebook & Instagram campaign launch, daily management, and budget scaling toward booked jobs." },
  { icon: BellRing, t: "Lead Follow-up Systems", d: "Automated follow-up so no lead slips through the cracks between the first click and the booked appointment." },
  { icon: LineChart, t: "Tracking & Reporting", d: "Clear dashboards tying spend to leads, appointments, and revenue — so you always know what's working." },
  { icon: PenTool, t: "Ongoing Optimization", d: "We double down on winning creative and audiences, and cut what doesn't perform, to keep cost-per-lead falling." },
];

export default function Services() {
  return (
    <>
      <Section testid="services-hero" className="pt-40">
        <div className="absolute inset-0 hero-glow" aria-hidden="true" />
        <Reveal>
          <Overline>Services</Overline>
          <h1 className="mt-5 font-heading font-black tracking-tighter text-4xl sm:text-5xl lg:text-6xl max-w-3xl">
            A complete customer <span className="text-gradient">acquisition system</span>
          </h1>
          <p className="mt-6 max-w-2xl text-slate-300 text-lg">
            We don't sell "just Facebook ads." We build the connected system that attracts, converts,
            and tracks new customers for your local business.
          </p>
        </Reveal>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.t} delay={(i % 4) * 0.06}>
                <div className="card-surface rounded-2xl p-7 h-full transition-transform duration-300 hover:-translate-y-1">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-electric/10 ring-1 ring-electric/20">
                    <Icon size={20} className="text-electric" />
                  </span>
                  <h3 className="mt-4 font-heading text-lg font-semibold">{s.t}</h3>
                  <p className="mt-2 text-slate-400 text-sm leading-relaxed">{s.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={0.1}>
          <div className="mt-16 flex justify-center">
            <PrimaryButton to="/contact" testid="services-cta">Book Your Free Growth Audit</PrimaryButton>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
