import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "sonner";
import { CheckCircle2, Clock, ShieldCheck, Zap, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Overline } from "@/components/primitives";
import { Reveal } from "@/lib/motion";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INDUSTRIES = ["HVAC", "Roofing", "Landscaping", "Contracting / Remodeling", "Painting", "Plumbing", "Electrical", "Other Home Service"];
const BUDGETS = ["Under $1,000 / month", "$1,000 - $3,000 / month", "$3,000 - $5,000 / month", "$5,000 - $10,000 / month", "$10,000+ / month", "Not sure yet"];

function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TRUST = [
  { icon: Zap, t: "Fast turnaround", d: "Most campaigns launch within days of your audit." },
  { icon: ShieldCheck, t: "No pressure", d: "A genuine strategy session — not a hard sell." },
  { icon: Clock, t: "45 minutes", d: "A focused review of your market and opportunities." },
];

export default function Contact() {
  const [date, setDate] = useState();
  const [slots, setSlots] = useState([]);
  const [slot, setSlot] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "", business_name: "", email: "", phone: "", industry: "", budget: "", goal: "",
  });

  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const loadSlots = useCallback(async (d) => {
    setLoadingSlots(true);
    setSlot("");
    try {
      const res = await axios.get(`${API}/availability`, { params: { date: fmtDate(d) } });
      setSlots(res.data.slots || []);
    } catch (e) {
      toast.error("Could not load available times. Please try again.");
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    if (date) loadSlots(date);
  }, [date, loadSlots]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!date || !slot) {
      toast.error("Please pick a date and time for your audit.");
      return;
    }
    const required = ["name", "business_name", "email", "phone", "industry", "budget", "goal"];
    for (const k of required) {
      if (!form[k]) {
        toast.error("Please complete all fields.");
        return;
      }
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/bookings`, { ...form, date: fmtDate(date), time_slot: slot });
      setDone(true);
      toast.success("Your Growth Audit is booked! We'll be in touch shortly.");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Something went wrong. Please try again.";
      toast.error(msg);
      if (err?.response?.status === 409 && date) loadSlots(date);
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled = (d) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today || d.getDay() === 0 || d.getDay() === 6;
  };

  if (done) {
    return (
      <section className="min-h-[80vh] flex items-center pt-32 pb-24" data-testid="booking-success">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <Reveal>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-electric/15 ring-1 ring-electric/30">
              <CheckCircle2 size={32} className="text-electric" />
            </span>
            <h1 className="mt-8 font-heading font-black tracking-tighter text-4xl sm:text-5xl">You're booked in.</h1>
            <p className="mt-5 text-slate-300 text-lg">
              Thanks, {form.name.split(" ")[0]}. Your free Growth Audit for{" "}
              <span className="text-white font-semibold">{form.business_name}</span> is confirmed for{" "}
              <span className="text-electric font-semibold">{date && fmtDate(date)} at {slot}</span>.
            </p>
            <p className="mt-4 text-slate-400">
              We'll reach out at {form.email} to confirm the details. Talk soon.
            </p>
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-40 pb-28 relative" data-testid="contact-page">
      <div className="absolute inset-0 hero-glow" aria-hidden="true" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto">
            <Overline>Free Consultation</Overline>
            <h1 className="mt-5 font-heading font-black tracking-tighter text-4xl sm:text-5xl lg:text-6xl">
              Book Your Free <span className="text-gradient">Growth Audit</span>
            </h1>
            <p className="mt-6 text-slate-300 text-lg">
              Pick a time, tell us about your business, and we'll map out a plan to attract, convert,
              and track more customers.
            </p>
          </div>
        </Reveal>

        <div className="mt-16 grid lg:grid-cols-12 gap-8">
          {/* Left: trust + calendar */}
          <Reveal className="lg:col-span-5" delay={0.05}>
            <div className="space-y-4">
              {TRUST.map((t) => {
                const Icon = t.icon;
                return (
                  <div key={t.t} className="card-surface rounded-2xl p-5 flex gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-electric/10 ring-1 ring-electric/20">
                      <Icon size={18} className="text-electric" />
                    </span>
                    <div>
                      <h3 className="font-heading font-semibold">{t.t}</h3>
                      <p className="text-slate-400 text-sm">{t.d}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="card-surface rounded-2xl p-6 mt-4" data-testid="booking-calendar">
              <h3 className="font-heading font-semibold mb-3">1. Choose a date</h3>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={isDisabled}
                className="rounded-md"
              />
              <p className="mt-2 text-xs text-slate-500 font-mono">Weekdays only • Mon–Fri</p>
            </div>
          </Reveal>

          {/* Right: slots + form */}
          <Reveal className="lg:col-span-7" delay={0.1}>
            <form onSubmit={onSubmit} className="card-surface rounded-2xl p-7 sm:p-9 space-y-8" data-testid="booking-form">
              <div>
                <h3 className="font-heading font-semibold mb-3">2. Pick a time</h3>
                {!date && <p className="text-slate-500 text-sm">Select a date to see available times.</p>}
                {date && loadingSlots && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={16} className="animate-spin" /> Loading times…</div>
                )}
                {date && !loadingSlots && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5" data-testid="time-slots">
                    {slots.map((s) => (
                      <button
                        type="button"
                        key={s.time}
                        disabled={!s.available}
                        onClick={() => setSlot(s.time)}
                        data-testid={`slot-${s.time}`}
                        className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 border ${
                          slot === s.time
                            ? "bg-electric border-electric text-white"
                            : s.available
                            ? "border-white/10 text-slate-200 hover:border-electric/60 hover:bg-white/5"
                            : "border-white/5 text-slate-600 line-through cursor-not-allowed"
                        }`}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="font-heading font-semibold mb-4">3. Your details</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Name">
                    <Input data-testid="input-name" value={form.name} onChange={(e) => setField("name")(e.target.value)} placeholder="Jane Smith" className="bg-navy-900 border-white/10" />
                  </Field>
                  <Field label="Business Name">
                    <Input data-testid="input-business" value={form.business_name} onChange={(e) => setField("business_name")(e.target.value)} placeholder="Smith HVAC Co." className="bg-navy-900 border-white/10" />
                  </Field>
                  <Field label="Email">
                    <Input data-testid="input-email" type="email" value={form.email} onChange={(e) => setField("email")(e.target.value)} placeholder="jane@business.com" className="bg-navy-900 border-white/10" />
                  </Field>
                  <Field label="Phone">
                    <Input data-testid="input-phone" value={form.phone} onChange={(e) => setField("phone")(e.target.value)} placeholder="(555) 123-4567" className="bg-navy-900 border-white/10" />
                  </Field>
                  <Field label="Industry">
                    <Select value={form.industry} onValueChange={setField("industry")}>
                      <SelectTrigger data-testid="select-industry" className="bg-navy-900 border-white/10"><SelectValue placeholder="Select industry" /></SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Monthly marketing budget">
                    <Select value={form.budget} onValueChange={setField("budget")}>
                      <SelectTrigger data-testid="select-budget" className="bg-navy-900 border-white/10"><SelectValue placeholder="Select budget" /></SelectTrigger>
                      <SelectContent>
                        {BUDGETS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div className="mt-4">
                  <Field label="Main business goal">
                    <Textarea data-testid="input-goal" value={form.goal} onChange={(e) => setField("goal")(e.target.value)} placeholder="e.g. Book 20+ new installs per month" rows={3} className="bg-navy-900 border-white/10 resize-none" />
                  </Field>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                data-testid="schedule-audit-button"
                className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-electric px-7 py-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-blue-600 hover:shadow-[0_0_34px_rgba(59,130,246,0.55)] disabled:opacity-60"
              >
                {submitting ? <><Loader2 size={18} className="animate-spin" /> Scheduling…</> : "Schedule My Free Growth Audit"}
              </button>
              <p className="text-center text-xs text-slate-500">We respect your inbox. No spam — just your audit details.</p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <Label className="text-slate-300 text-sm">{label}</Label>
      {children}
    </div>
  );
}
