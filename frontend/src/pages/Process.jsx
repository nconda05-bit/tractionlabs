import { Section, Overline, PrimaryButton } from "@/components/primitives";
import { Reveal } from "@/lib/motion";

const STEPS = [
  { n: "01", t: "Market Research", d: "We analyze competitors, customer behavior, and local opportunities to find where the most profitable demand lives." },
  { n: "02", t: "Offer Strategy", d: "We create offers that make customers want to take action — the foundation of every high-performing campaign." },
  { n: "03", t: "AI-Powered Creative", d: "We produce high-quality ads, videos, and marketing assets designed to stop the scroll and drive clicks." },
  { n: "04", t: "Campaign Launch", d: "We launch and manage Facebook and Instagram advertising campaigns with precise targeting and tracking." },
  { n: "05", t: "Optimization & Reporting", d: "We track leads, improve performance, and scale what works — turning data into booked jobs and revenue." },
];

export default function Process() {
  return (
    <Section testid="process-hero" className="pt-40">
      <div className="absolute inset-0 hero-glow" aria-hidden="true" />
      <Reveal>
        <Overline>Our Process</Overline>
        <h1 className="mt-5 font-heading font-black tracking-tighter text-4xl sm:text-5xl lg:text-6xl max-w-3xl">
          The 5-step growth system
        </h1>
        <p className="mt-6 max-w-2xl text-slate-300 text-lg">
          A predictable, repeatable engine that replaces guesswork with a clear path from ad spend to
          booked customers.
        </p>
      </Reveal>

      <div className="mt-16 space-y-6">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.06}>
            <div className="group card-surface rounded-2xl p-8 sm:p-10 grid sm:grid-cols-12 gap-6 items-center transition-transform duration-300 hover:-translate-x-1">
              <div className="sm:col-span-2">
                <span className="font-mono text-5xl font-bold text-electric/30 group-hover:text-electric/60 transition-colors duration-300">{s.n}</span>
              </div>
              <div className="sm:col-span-10">
                <h3 className="font-heading text-2xl font-semibold">{s.t}</h3>
                <p className="mt-3 text-slate-400 leading-relaxed">{s.d}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.1}>
        <div className="mt-16 flex justify-center">
          <PrimaryButton to="/contact" testid="process-cta">Book Your Free Growth Audit</PrimaryButton>
        </div>
      </Reveal>
    </Section>
  );
}
