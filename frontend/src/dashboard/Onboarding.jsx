import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, ArrowRight, ArrowLeft, CheckCircle2, Rocket } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STEPS = [
  { title: "The Business", fields: [
    ["business_name", "Business name *", "ABC HVAC"],
    ["industry", "Industry", "HVAC"],
    ["website", "Website", "abchvac.com"],
    ["facebook", "Facebook page", "facebook.com/abchvac"],
  ]},
  { title: "The Marketing", fields: [
    ["offer", "Current offer", "Free AC tune-up for new customers"],
    ["service_area", "Service area (cities, comma sep)", "Dallas, Plano, Frisco"],
    ["monthly_budget", "Monthly ad budget", "$2,000"],
    ["ideal_customer", "Ideal customer", "Homeowners 35-65 with older AC units"],
    ["goals", "Goals", "Book 20+ installs per month"],
  ]},
  { title: "The Engagement", fields: [
    ["contact_name", "Contact name", "Jane Smith"],
    ["email", "Email", "jane@abchvac.com"],
    ["phone", "Phone", "(555) 123-4567"],
    ["monthly_fee", "Your monthly fee ($)", "1500"],
  ]},
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const next = () => {
    if (step === 0 && !form.business_name) return toast.error("Business name is required");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const submit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/onboarding", { ...form, monthly_fee: parseFloat(form.monthly_fee) || 0 });
      setResult(data);
      toast.success(`${form.business_name} onboarded — ${data.tasks_created} tasks created`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Onboarding failed");
    } finally { setLoading(false); }
  };

  if (result) return <Result result={result} navigate={navigate} />;

  const s = STEPS[step];

  return (
    <div className="max-w-2xl mx-auto" data-testid="onboarding-wizard">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-electric">Onboarding Wizard</p>
      <h1 className="mt-2 font-heading font-black tracking-tighter text-3xl sm:text-4xl">Sign a new client</h1>
      <p className="mt-2 text-slate-400 text-sm">Answer a few questions — Claude builds the strategy, client record, and task checklist automatically.</p>

      {/* progress */}
      <div className="mt-8 flex items-center gap-2">
        {STEPS.map((st, i) => (
          <div key={i} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors duration-300 ${i <= step ? "bg-electric" : "bg-white/10"}`} />
            <p className={`mt-2 text-xs ${i === step ? "text-white" : "text-slate-500"}`}>{st.title}</p>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
          className="mt-8 card-surface rounded-2xl p-7 space-y-5">
          {s.fields.map(([k, label, ph]) => {
            const isLong = ["offer", "ideal_customer", "goals"].includes(k);
            return (
              <div key={k} className="space-y-2">
                <Label className="text-slate-300 text-sm">{label}</Label>
                {isLong ? (
                  <Textarea rows={2} value={form[k] || ""} onChange={set(k)} placeholder={ph} className="bg-navy-900 border-white/10 resize-none" data-testid={`ob-${k}`} />
                ) : (
                  <Input value={form[k] || ""} onChange={set(k)} placeholder={ph} className="bg-navy-900 border-white/10" data-testid={`ob-${k}`} />
                )}
              </div>
            );
          })}
        </motion.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-colors" data-testid="ob-back">
          <ArrowLeft size={16} /> Back
        </button>
        {step < STEPS.length - 1 ? (
          <button onClick={next} className="group inline-flex items-center gap-2 rounded-full bg-electric px-6 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-all" data-testid="ob-next">
            Continue <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <button onClick={submit} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-electric px-7 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60 transition-all" data-testid="ob-submit">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Building strategy…</> : <><Sparkles size={16} /> Create client with AI</>}
          </button>
        )}
      </div>
    </div>
  );
}

function Result({ result, navigate }) {
  const s = result.strategy || {};
  const List = ({ title, items }) => items?.length ? (
    <div>
      <p className="text-xs font-mono uppercase tracking-widest text-coral mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((it, i) => <li key={i} className="flex gap-2 text-sm text-slate-300"><span className="text-electric">→</span> {it}</li>)}
      </ul>
    </div>
  ) : null;

  return (
    <div className="max-w-2xl mx-auto" data-testid="onboarding-result">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-electric/15 ring-1 ring-electric/30"><Rocket className="text-electric" size={22} /></span>
        <div>
          <h1 className="font-heading font-black tracking-tighter text-3xl">{result.client.business_name} is live</h1>
          <p className="text-slate-400 text-sm">{result.tasks_created} onboarding tasks created automatically.</p>
        </div>
      </div>

      {s && Object.keys(s).length > 0 ? (
        <div className="mt-8 card-surface rounded-2xl p-7 space-y-6">
          <div className="flex items-center gap-2 text-electric"><Sparkles size={18} /><h2 className="font-heading font-semibold text-lg">AI Strategy</h2></div>
          {s.positioning && <Section label="Positioning" text={s.positioning} />}
          {s.target_audience && <Section label="Target audience" text={s.target_audience} />}
          {s.recommended_offer && <Section label="Recommended offer" text={s.recommended_offer} />}
          <List title="Channel plan" items={s.channel_plan} />
          <List title="First 30 days" items={s.first_30_days} />
          <List title="Onboarding checklist" items={s.onboarding_checklist} />
        </div>
      ) : (
        <div className="mt-8 card-surface rounded-2xl p-7 text-slate-400 text-sm">Client created. AI strategy was unavailable — you can run AI Client Brain from the client workspace.</div>
      )}

      <div className="mt-6 flex gap-3">
        <button onClick={() => navigate(`/dashboard/clients/${result.client.id}`)} className="inline-flex items-center gap-2 rounded-full bg-electric px-6 py-3 text-sm font-semibold text-white hover:bg-blue-600" data-testid="goto-client">
          Open client workspace <ArrowRight size={16} />
        </button>
        <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/5">
          Onboard another
        </button>
      </div>
    </div>
  );
}

function Section({ label, text }) {
  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-1">{label}</p>
      <p className="text-slate-200 leading-relaxed flex gap-2"><CheckCircle2 size={16} className="text-electric mt-1 shrink-0" />{text}</p>
    </div>
  );
}
