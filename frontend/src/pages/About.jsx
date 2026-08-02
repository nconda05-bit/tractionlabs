import { Section, Overline, PrimaryButton } from "@/components/primitives";
import { Reveal } from "@/lib/motion";
import { Compass, ShieldCheck, TrendingUp } from "lucide-react";

const VALUES = [
  { icon: TrendingUp, t: "Results-focused", d: "We measure success in leads, booked jobs, and revenue — not likes or impressions." },
  { icon: ShieldCheck, t: "Trustworthy", d: "Full transparency with clear tracking and honest reporting. No fake claims, ever." },
  { icon: Compass, t: "Data-driven", d: "Every decision is guided by real performance data and continuous optimization." },
];

export default function About() {
  return (
    <Section testid="about-hero" className="pt-40">
      <div className="absolute inset-0 hero-glow" aria-hidden="true" />
      <div className="grid lg:grid-cols-12 gap-12 items-start">
        <div className="lg:col-span-7">
          <Reveal>
            <Overline>About Traction Labs</Overline>
            <h1 className="mt-5 font-heading font-black tracking-tighter text-4xl sm:text-5xl lg:text-6xl">
              A serious growth partner for local business
            </h1>
            <p className="mt-6 text-slate-300 text-lg leading-relaxed">
              Traction Labs helps local service businesses generate more qualified leads and grow
              revenue using AI-powered advertising systems. We combine artificial intelligence, paid
              advertising, and conversion systems into one connected customer acquisition engine.
            </p>
            <p className="mt-4 text-slate-400 leading-relaxed">
              We're not a generic marketing agency. We build customer acquisition systems that help
              local businesses attract, convert, and track new customers — with the sophistication of
              a modern technology company and the accountability of a true growth partner.
            </p>
          </Reveal>
        </div>
        <div className="lg:col-span-5 space-y-4">
          {VALUES.map((v, i) => {
            const Icon = v.icon;
            return (
              <Reveal key={v.t} delay={i * 0.08}>
                <div className="card-surface rounded-2xl p-6 flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-electric/10 ring-1 ring-electric/20">
                    <Icon size={20} className="text-electric" />
                  </span>
                  <div>
                    <h3 className="font-heading text-lg font-semibold">{v.t}</h3>
                    <p className="mt-1 text-slate-400 text-sm leading-relaxed">{v.d}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>

      <Reveal delay={0.1}>
        <div className="mt-16 card-surface rounded-3xl p-10 sm:p-14 text-center">
          <h2 className="font-heading font-black tracking-tighter text-3xl sm:text-4xl">
            Let's build your growth machine
          </h2>
          <p className="mt-4 mx-auto max-w-xl text-slate-300">
            Book a free Growth Audit and get a tailored plan for attracting more customers.
          </p>
          <div className="mt-8 flex justify-center">
            <PrimaryButton to="/contact" testid="about-cta">Book Your Free Growth Audit</PrimaryButton>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
