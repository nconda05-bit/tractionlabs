import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Search, Target, Sparkles, Rocket, LineChart,
  Wind, Home as HomeIcon, Trees, HardHat, Wrench,
  Brain, Database, Layers, Star, ArrowRight,
} from "lucide-react";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Section, Overline, PrimaryButton, GhostButton, Marquee } from "@/components/primitives";
import { Reveal, easeOut } from "@/lib/motion";

const IMG = {
  dashboard: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=srgb&fm=jpg&q=85&w=1400",
  abstract: "https://images.unsplash.com/photo-1762279388956-1c098163a2a8?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200",
  hvac: "https://images.unsplash.com/photo-1660330589827-da8ab7dd3c02?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
  contractor: "https://images.unsplash.com/photo-1530983822321-fcac2d3c0f06?crop=entropy&cs=srgb&fm=jpg&q=85&w=900",
};

const HEADLINE = ["Turn Local Businesses", "Into Lead-Generating", "Machines."];

function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  return (
    <section ref={ref} className="relative min-h-[100svh] flex items-center pt-28 pb-16 overflow-hidden" data-testid="hero">
      <div className="absolute inset-0 hero-glow" aria-hidden="true" />
      <motion.img
        src={IMG.abstract}
        alt=""
        aria-hidden="true"
        style={{ y, scale }}
        className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-20 pointer-events-none [mask-image:linear-gradient(to_left,black,transparent)]"
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 grid lg:grid-cols-12 gap-12 items-center w-full">
        <div className="lg:col-span-7">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Overline>AI-Powered Customer Acquisition</Overline>
          </motion.div>

          <h1 className="mt-6 font-heading font-black tracking-tighter text-4xl sm:text-6xl lg:text-7xl leading-[0.98]">
            {HEADLINE.map((line, i) => (
              <span key={i} className="block overflow-hidden">
                <motion.span
                  className="block"
                  initial={{ y: "110%" }}
                  animate={{ y: "0%" }}
                  transition={{ duration: 0.9, ease: easeOut, delay: 0.15 + i * 0.12 }}
                >
                  {i === 2 ? <span className="text-gradient">{line}</span> : line}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            className="mt-7 max-w-xl text-base sm:text-lg leading-relaxed text-slate-300"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
          >
            Traction Labs combines AI, paid advertising, and conversion systems to help service
            businesses attract more customers and grow revenue.
          </motion.p>

          <motion.div
            className="mt-9 flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.75 }}
          >
            <PrimaryButton to="/contact" testid="hero-primary-cta">Book Your Free Growth Audit</PrimaryButton>
            <GhostButton to="/process" testid="hero-secondary-cta">Learn Our Process</GhostButton>
          </motion.div>

          <motion.div
            className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-400"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
          >
            {["No long-term contracts", "Full tracking & reporting", "Built for local services"].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-electric" /> {t}
              </span>
            ))}
          </motion.div>
        </div>

        {/* Dashboard visual */}
        <motion.div
          className="lg:col-span-5"
          initial={{ opacity: 0, y: 40, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, ease: easeOut, delay: 0.4 }}
        >
          <div className="relative card-surface rounded-2xl p-3 shadow-[0_20px_80px_rgba(0,0,0,0.55)]">
            <div className="absolute -inset-0.5 rounded-2xl bg-electric/20 blur-2xl -z-10" />
            <div className="flex items-center gap-1.5 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-coral/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 font-mono text-[11px] text-slate-500">traction.dashboard</span>
            </div>
            <img src={IMG.dashboard} alt="AI marketing analytics dashboard" className="w-full rounded-xl object-cover aspect-[4/3]" />
            <div className="grid grid-cols-3 gap-3 p-3">
              {[["Leads", "+312%"], ["Cost / Lead", "-41%"], ["Booked Jobs", "+184%"]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-white/5 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{k}</p>
                  <p className="mt-1 font-heading text-lg font-bold text-electric">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const PROBLEMS = [
  { n: "01", t: "Relying only on word of mouth", d: "Referrals are unpredictable. When they slow down, so does your revenue — with no way to turn the tap back on." },
  { n: "02", t: "Wasting money on ineffective ads", d: "Boosted posts and untracked campaigns burn budget without producing booked jobs you can actually count." },
  { n: "03", t: "No way to track where customers come from", d: "Without attribution you can't tell what's working, so you can't confidently scale what actually drives growth." },
];

function Problem() {
  return (
    <Section testid="problem-section">
      <Reveal>
        <Overline>The Problem</Overline>
        <h2 className="mt-4 font-heading font-black tracking-tighter text-3xl sm:text-4xl lg:text-5xl max-w-2xl">
          Stop Guessing. <span className="text-gradient">Start Growing.</span>
        </h2>
        <p className="mt-5 max-w-2xl text-slate-300 text-base sm:text-lg">
          Most local service businesses struggle to grow for the same three reasons. Traction Labs
          replaces the guesswork with a predictable customer acquisition system.
        </p>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {PROBLEMS.map((p, i) => (
          <Reveal key={p.n} delay={i * 0.1}>
            <div className="card-surface rounded-2xl p-8 h-full transition-transform duration-300 hover:-translate-y-1">
              <span className="font-mono text-4xl font-bold text-white/10">{p.n}</span>
              <h3 className="mt-4 font-heading text-xl font-semibold">{p.t}</h3>
              <p className="mt-3 text-slate-400 leading-relaxed text-sm">{p.d}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const STEPS = [
  { icon: Search, t: "Market Research", d: "Analyze competitors, customer behavior, and untapped opportunities in your local market." },
  { icon: Target, t: "Offer Strategy", d: "Craft irresistible offers that make customers want to take action right now." },
  { icon: Sparkles, t: "AI-Powered Creative", d: "Produce high-quality ads, videos, and marketing assets at scale with modern AI tools." },
  { icon: Rocket, t: "Campaign Launch", d: "Launch and manage precision Facebook & Instagram advertising campaigns." },
  { icon: LineChart, t: "Optimization & Reporting", d: "Track leads, improve performance, and scale exactly what works." },
];

function GrowthSystem() {
  return (
    <Section testid="growth-system" className="bg-navy-800/40 border-y border-white/5">
      <Reveal>
        <Overline>Our Growth System</Overline>
        <h2 className="mt-4 font-heading font-black tracking-tighter text-3xl sm:text-4xl lg:text-5xl max-w-2xl">
          A repeatable engine for new customers
        </h2>
      </Reveal>
      <div className="mt-16 relative">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-electric/60 via-electric/20 to-transparent hidden md:block" />
        <div className="space-y-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.t} delay={i * 0.06}>
                <div className="group relative flex gap-6 md:pl-0">
                  <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-navy-900 ring-1 ring-white/10 group-hover:ring-electric/60 transition-colors duration-300">
                    <Icon size={20} className="text-electric" />
                  </div>
                  <div className="card-surface flex-1 rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center gap-3 transition-transform duration-300 group-hover:translate-x-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-electric">0{i + 1}</span>
                        <h3 className="font-heading text-xl font-semibold">{s.t}</h3>
                      </div>
                      <p className="mt-2 text-slate-400 text-sm leading-relaxed">{s.d}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

const INDUSTRIES = [
  { icon: Wind, t: "HVAC Companies", d: "Fill your calendar with installs and service calls — more leads mean more booked jobs year-round.", img: IMG.hvac, big: true },
  { icon: HardHat, t: "Roofers", d: "Turn storm season into a steady pipeline of qualified roof inspections and replacements." },
  { icon: Trees, t: "Landscapers", d: "Book more design, install, and maintenance contracts from your ideal neighborhoods." },
  { icon: Wrench, t: "Contractors", d: "Attract high-value remodel and build projects with tracked, conversion-ready campaigns." },
  { icon: HomeIcon, t: "Home Service Businesses", d: "Any local service business can turn ad spend into a predictable stream of booked jobs." },
];

function WhoWeHelp() {
  return (
    <Section testid="who-we-help">
      <Reveal>
        <Overline>Who We Help</Overline>
        <h2 className="mt-4 font-heading font-black tracking-tighter text-3xl sm:text-4xl lg:text-5xl max-w-2xl">
          Built for local service businesses
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-3 md:auto-rows-[1fr]">
        {INDUSTRIES.map((c, i) => {
          const Icon = c.icon;
          return (
            <Reveal key={c.t} delay={i * 0.06} className={c.big ? "md:col-span-1 md:row-span-2" : ""}>
              <div
                data-testid="industry-card"
                className={`group card-surface rounded-2xl overflow-hidden h-full flex flex-col transition-transform duration-300 hover:-translate-y-1 ${c.big ? "min-h-[420px]" : ""}`}
              >
                {c.img && (
                  <div className="relative overflow-hidden">
                    <img src={c.img} alt={c.t} className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-700 to-transparent" />
                  </div>
                )}
                <div className="p-7 flex-1 flex flex-col">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-electric/10 ring-1 ring-electric/20">
                    <Icon size={20} className="text-electric" />
                  </span>
                  <h3 className="mt-4 font-heading text-xl font-semibold">{c.t}</h3>
                  <p className="mt-2 text-slate-400 text-sm leading-relaxed">{c.d}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

const DIFF = [
  { icon: Brain, t: "AI-Powered Systems", d: "We use modern AI tools to research, create, analyze, and optimize campaigns — faster and sharper than a traditional agency." },
  { icon: Database, t: "Data-Driven Decisions", d: "We focus on leads, appointments, and revenue — not vanity metrics like likes and impressions." },
  { icon: Layers, t: "Full Acquisition System", d: "Ads, landing pages, tracking, and follow-up working together as one connected growth machine." },
];

function Different() {
  return (
    <Section testid="differentiators" className="bg-navy-800/40 border-y border-white/5">
      <Reveal>
        <Overline>Why Traction Labs</Overline>
        <h2 className="mt-4 font-heading font-black tracking-tighter text-3xl sm:text-4xl lg:text-5xl max-w-2xl">
          What makes us different
        </h2>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {DIFF.map((d, i) => {
          const Icon = d.icon;
          return (
            <Reveal key={d.t} delay={i * 0.08}>
              <div className="relative card-surface rounded-2xl p-8 h-full overflow-hidden group">
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-electric/10 blur-2xl group-hover:bg-electric/20 transition-colors duration-500" />
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-electric/10 ring-1 ring-electric/20">
                  <Icon size={22} className="text-electric" />
                </span>
                <h3 className="mt-5 font-heading text-xl font-semibold">{d.t}</h3>
                <p className="mt-3 text-slate-400 text-sm leading-relaxed">{d.d}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

function Pricing() {
  return (
    <Section testid="pricing-philosophy">
      <div className="relative card-surface rounded-3xl p-10 sm:p-16 overflow-hidden text-center">
        <div className="absolute inset-0 hero-glow opacity-60" aria-hidden="true" />
        <div className="relative">
          <Overline className="text-coral">Simple Pricing Philosophy</Overline>
          <h2 className="mt-5 mx-auto max-w-3xl font-heading font-black tracking-tighter text-3xl sm:text-4xl lg:text-5xl">
            Every business has different growth opportunities.
          </h2>
          <p className="mt-6 mx-auto max-w-2xl text-slate-300 text-base sm:text-lg">
            We don't believe in one-size-fits-all packages. We create a strategy based on your goals,
            your market, and your budget — so every dollar works toward booked jobs.
          </p>
          <div className="mt-9 flex justify-center">
            <PrimaryButton to="/contact" testid="pricing-cta" className="!bg-coral hover:!bg-[#e64a2e] hover:!shadow-[0_0_34px_rgba(255,90,60,0.5)]">
              Book Your Growth Audit
            </PrimaryButton>
          </div>
        </div>
      </div>
    </Section>
  );
}

const TESTIMONIALS = [
  { name: "Client Name", role: "Owner, HVAC Company", quote: "Placeholder testimonial — replace with a real client story. Describe the leads, booked jobs, and revenue growth achieved with Traction Labs." },
  { name: "Client Name", role: "Founder, Roofing Co.", quote: "Placeholder testimonial — replace with a real client story about how tracking and optimization changed their marketing." },
  { name: "Client Name", role: "GM, Landscaping", quote: "Placeholder testimonial — replace with a real client quote highlighting predictable lead flow and clear reporting." },
];

function Testimonials() {
  return (
    <Section testid="testimonials" className="bg-navy-800/40 border-y border-white/5">
      <Reveal>
        <Overline>Social Proof</Overline>
        <h2 className="mt-4 font-heading font-black tracking-tighter text-3xl sm:text-4xl lg:text-5xl max-w-2xl">
          Trusted by growth-focused owners
        </h2>
        <p className="mt-4 text-slate-400 text-sm">Placeholder reviews — ready to swap for real case studies.</p>
      </Reveal>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <Reveal key={i} delay={i * 0.08}>
            <figure className="card-surface rounded-2xl p-8 h-full flex flex-col">
              <div className="flex gap-1 text-electric">
                {Array.from({ length: 5 }).map((_, s) => <Star key={s} size={15} fill="currentColor" />)}
              </div>
              <blockquote className="mt-5 text-slate-200 leading-relaxed text-[15px] flex-1">"{t.quote}"</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-electric/15 font-heading font-bold text-electric">
                  {t.name.charAt(0)}
                </span>
                <div>
                  <p className="font-heading font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.role}</p>
                </div>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

const FAQS = [
  { q: "What industries do you work with?", a: "We specialize in local service businesses — HVAC companies, roofers, landscapers, contractors, painters, and other home service businesses that rely on booked jobs to grow." },
  { q: "How quickly can I start getting leads?", a: "Most campaigns can launch within days of your growth audit. Once live, you typically start seeing lead activity in the first weeks, then we optimize toward lower cost-per-lead over time." },
  { q: "Do I need a big advertising budget?", a: "No. We build a strategy around your goals and budget. We'd rather start lean, prove the system works, and scale spend as booked jobs increase." },
  { q: "Do you manage everything?", a: "Yes. We handle research, offers, AI-powered creative, campaign launch and management, tracking, and reporting — a full customer acquisition system, not just ads." },
  { q: "How do I get started?", a: "Book your free Growth Audit. We'll review your market and opportunities, then map out a customer acquisition plan tailored to your business." },
];

function FAQ() {
  return (
    <Section testid="faq-section">
      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <Reveal>
            <Overline>FAQ</Overline>
            <h2 className="mt-4 font-heading font-black tracking-tighter text-3xl sm:text-4xl lg:text-5xl">
              Questions, answered
            </h2>
            <p className="mt-5 text-slate-300">Still curious? Book a free audit and we'll answer everything specific to your business.</p>
            <PrimaryButton to="/contact" testid="faq-cta" className="mt-7">Book Your Free Growth Audit</PrimaryButton>
          </Reveal>
        </div>
        <div className="lg:col-span-7">
          <Reveal delay={0.1}>
            <Accordion type="single" collapsible className="w-full" data-testid="faq-accordion">
              {FAQS.map((f, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-white/10">
                  <AccordionTrigger className="text-left font-heading text-lg hover:no-underline hover:text-electric py-5" data-testid={`faq-trigger-${i}`}>
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-slate-400 text-[15px] leading-relaxed pb-5">
                    {f.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}

function FinalCTA() {
  return (
    <Section testid="final-cta">
      <div className="relative overflow-hidden rounded-3xl bg-electric px-8 py-16 sm:px-16 sm:py-20 text-center">
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px)] [background-size:24px_24px]" />
        <div className="relative">
          <h2 className="mx-auto max-w-3xl font-heading font-black tracking-tighter text-3xl sm:text-4xl lg:text-5xl text-white">
            Ready to build your lead-generating machine?
          </h2>
          <p className="mt-5 mx-auto max-w-xl text-blue-50/90">
            Book a free Growth Audit and get a clear plan to attract, convert, and track more customers.
          </p>
          <div className="mt-9 flex justify-center">
            <GhostButton to="/contact" testid="final-cta-button" className="!bg-white !text-navy-900 !border-white hover:!bg-blue-50">
              Book Your Free Growth Audit <ArrowRight size={17} />
            </GhostButton>
          </div>
        </div>
      </div>
    </Section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee items={["Market Research", "AI Creative", "Paid Advertising", "Conversion Systems", "Lead Tracking", "Revenue Growth"]} />
      <Problem />
      <GrowthSystem />
      <WhoWeHelp />
      <Different />
      <Pricing />
      <Testimonials />
      <FAQ />
      <FinalCTA />
    </>
  );
}
