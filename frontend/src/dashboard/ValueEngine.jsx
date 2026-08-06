import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Calculator, Loader2, Copy, Download, Trash2, Sparkles, TrendingUp,
  DollarSign, Users, Target, Percent, Building2, PhoneCall, Zap, RefreshCw,
} from "lucide-react";
import api, { valueEnginePdfUrl } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const copy = (t) => { navigator.clipboard?.writeText(t); toast.success("Copied"); };
const money = (v) => {
  const n = Number(v);
  if (!isFinite(n)) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
};
const pct = (v) => `${Number(v || 0).toFixed(0)}%`;

const EMPTY_INPUTS = {
  business_name: "", contact_name: "", email: "", city: "",
  industry: "hvac",
  avg_ticket: 0, gross_margin_pct: 0, close_rate_pct: 0,
  current_leads: 0, ad_spend: 0,
  proposed_fee: 1500, target_cpl: 50, capacity_monthly: 999999,
  notes: "",
};

export default function ValueEngine() {
  const [templates, setTemplates] = useState({});
  const [inputs, setInputs] = useState(EMPTY_INPUTS);
  const [calc, setCalc] = useState(null);
  const [script, setScript] = useState(null);
  const [runId, setRunId] = useState(null);
  const [runs, setRuns] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadTemplates = useCallback(async () => {
    const { data } = await api.get("/value-engine/templates");
    setTemplates(data);
  }, []);
  const loadRuns = useCallback(async () => {
    const { data } = await api.get("/value-engine/runs");
    setRuns(data);
  }, []);
  useEffect(() => { loadTemplates(); loadRuns(); }, [loadTemplates, loadRuns]);

  // Apply industry template (only prefill fields that user hasn't set to non-zero)
  const applyTemplate = (industry) => {
    const tpl = templates[industry];
    setInputs((prev) => ({
      ...prev,
      industry,
      avg_ticket: prev.avg_ticket || tpl?.avg_ticket || 0,
      gross_margin_pct: prev.gross_margin_pct || tpl?.gross_margin_pct || 0,
      close_rate_pct: prev.close_rate_pct || tpl?.close_rate_pct || 0,
      target_cpl: prev.target_cpl || tpl?.target_cpl || 50,
      current_leads: prev.current_leads || tpl?.monthly_leads_typical || 0,
      capacity_monthly: prev.capacity_monthly && prev.capacity_monthly !== 999999 ? prev.capacity_monthly : (tpl?.capacity_monthly || 999999),
    }));
  };

  const set = (k, v) => setInputs((prev) => ({ ...prev, [k]: v }));

  // Live math (client-side mirror of backend calc for instant feedback)
  const liveCalc = useMemo(() => {
    const n = (v, d = 0) => { const x = Number(v); return isFinite(x) ? x : d; };
    const at = n(inputs.avg_ticket), gm = n(inputs.gross_margin_pct);
    const cr = n(inputs.close_rate_pct), spend = n(inputs.ad_spend);
    const fee = n(inputs.proposed_fee), cpl = Math.max(n(inputs.target_cpl, 50), 1);
    const cap = n(inputs.capacity_monthly, 999999) || 999999;
    const cur = n(inputs.current_leads);
    const ppc = at * (gm / 100);
    const scen = (thisCpl) => {
      const c = Math.max(thisCpl, 1);
      const leads = spend > 0 ? spend / c : cur;
      const cust = Math.min(leads * (cr / 100), cap);
      const rev = cust * at, prof = cust * ppc;
      const net = prof - fee - spend;
      const roi = fee > 0 ? (net / fee) * 100 : 0;
      return { cpl: c, projected_leads: leads, new_customers: cust, new_revenue: rev, new_profit: prof, net_profit_after_fee: net, roi_pct: roi };
    };
    const target = scen(cpl);
    return {
      profit_per_customer: ppc,
      baseline: { leads: cur, customers: cur * (cr / 100), profit: cur * (cr / 100) * ppc },
      scenarios: {
        conservative: scen(cpl * 1.5),
        target,
        stretch: scen(cpl * 0.75),
      },
      breakeven: {
        customers: ppc > 0 ? (fee + spend) / ppc : 0,
        leads: (ppc > 0 && cr > 0) ? ((fee + spend) / ppc) / (cr / 100) : 0,
      },
      twelve_month_target_profit: target.new_profit * 12,
    };
  }, [inputs]);

  const build = async () => {
    setBusy(true); setScript(null);
    try {
      const { data } = await api.post("/value-engine/build", { inputs, include_script: true });
      toast.success("Sales pack ready");
      setCalc(data.calc); setScript(data.script); setRunId(data.id);
      loadRuns();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not build sales pack");
    } finally { setBusy(false); }
  };

  const loadRun = async (id) => {
    const { data } = await api.get(`/value-engine/runs/${id}`);
    setInputs({ ...EMPTY_INPUTS, ...data.inputs });
    setCalc(data.calc); setScript(data.script); setRunId(data.id);
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this saved run?")) return;
    await api.delete(`/value-engine/runs/${id}`);
    if (runId === id) { setRunId(null); setScript(null); setCalc(null); }
    loadRuns();
  };
  const reset = () => { setInputs(EMPTY_INPUTS); setCalc(null); setScript(null); setRunId(null); };

  const shown = calc || liveCalc;
  const t = shown?.scenarios?.target;

  return (
    <div data-testid="value-engine-page">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-electric/10 ring-1 ring-electric/20 text-electric">
          <Calculator size={22} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h1 className="font-heading font-black tracking-tighter text-3xl">Value Engine</h1>
            <button onClick={reset} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white" data-testid="ve-reset">
              <RefreshCw size={12} /> New prospect
            </button>
          </div>
          <p className="mt-1 text-slate-400 text-sm max-w-2xl">
            Sales prep for your next call. Pick an industry template, plug in the prospect&rsquo;s numbers, and get a live ROI breakdown, a personalized sales script, and a branded PDF proposal — all built on their own math.
          </p>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6">
        {/* LEFT — Inputs + Results */}
        <div className="space-y-6">
          {/* Prospect card */}
          <div className="card-surface rounded-2xl p-6">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5"><Building2 size={12} className="text-electric" /> Prospect</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <F label="Business name"><Input value={inputs.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Austin Cool Pros" data-testid="ve-business" className="bg-navy-900 border-white/10" /></F>
              <F label="Contact name"><Input value={inputs.contact_name} onChange={(e) => set("contact_name", e.target.value)} placeholder="Mike" data-testid="ve-contact" className="bg-navy-900 border-white/10" /></F>
              <F label="City / market"><Input value={inputs.city} onChange={(e) => set("city", e.target.value)} placeholder="Austin, TX" data-testid="ve-city" className="bg-navy-900 border-white/10" /></F>
              <F label="Industry template">
                <Select value={inputs.industry} onValueChange={(v) => { set("industry", v); applyTemplate(v); }}>
                  <SelectTrigger className="bg-navy-900 border-white/10" data-testid="ve-industry"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-navy-900 border-white/10">
                    {Object.entries(templates).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </F>
            </div>
            <button onClick={() => applyTemplate(inputs.industry)} className="mt-3 inline-flex items-center gap-1.5 text-xs text-electric hover:underline" data-testid="ve-apply-tpl">
              <Zap size={12} /> Prefill from {templates[inputs.industry]?.label || "template"}
            </button>
          </div>

          {/* Numbers card */}
          <div className="card-surface rounded-2xl p-6">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5"><DollarSign size={12} className="text-electric" /> Their numbers</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              <NumField label="Avg ticket ($)" v={inputs.avg_ticket} onC={(x) => set("avg_ticket", x)} testid="ve-ticket" />
              <NumField label="Gross margin (%)" v={inputs.gross_margin_pct} onC={(x) => set("gross_margin_pct", x)} testid="ve-margin" />
              <NumField label="Close rate (%)" v={inputs.close_rate_pct} onC={(x) => set("close_rate_pct", x)} testid="ve-close" />
              <NumField label="Current leads / mo" v={inputs.current_leads} onC={(x) => set("current_leads", x)} testid="ve-leads" />
              <NumField label="Current ad spend ($)" v={inputs.ad_spend} onC={(x) => set("ad_spend", x)} testid="ve-spend" />
              <NumField label="Monthly capacity" v={inputs.capacity_monthly} onC={(x) => set("capacity_monthly", x)} testid="ve-capacity" />
            </div>
          </div>

          {/* Offer card */}
          <div className="card-surface rounded-2xl p-6">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-1.5"><Target size={12} className="text-electric" /> Your offer</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <NumField label="Traction Labs fee ($/mo)" v={inputs.proposed_fee} onC={(x) => set("proposed_fee", x)} testid="ve-fee" />
              <NumField label="Target CPL ($)" v={inputs.target_cpl} onC={(x) => set("target_cpl", x)} testid="ve-cpl" />
            </div>
            <F label="Notes for the call (optional)" className="mt-4">
              <Textarea rows={2} value={inputs.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Family-run 12 years, burned by Google Ads, wants trust more than volume" className="bg-navy-900 border-white/10 resize-none" data-testid="ve-notes" />
            </F>
            <button onClick={build} disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60" data-testid="ve-build">
              {busy ? <><Loader2 size={15} className="animate-spin" /> Generating…</> : <><Sparkles size={15} /> Generate sales pack</>}
            </button>
          </div>

          {/* Numbers dashboard (LIVE) */}
          <div className="grid md:grid-cols-2 gap-4" data-testid="ve-dashboard">
            <StatCard tone="electric" icon={Users} title="Projected customers / mo (target CPL)" value={t ? t.new_customers.toFixed(1) : "—"} sub={`at ${money(inputs.target_cpl)} CPL`} />
            <StatCard tone="emerald" icon={DollarSign} title="Extra profit / mo (net of fee)" value={t ? money(t.net_profit_after_fee) : "—"} sub={t ? `${money(t.new_profit)} gross new profit` : ""} />
            <StatCard tone="coral" icon={Percent} title="ROI on Traction Labs fee" value={t ? `${t.roi_pct.toFixed(0)}%` : "—"} sub={`fee ${money(inputs.proposed_fee)}`} />
            <StatCard tone="slate" icon={TrendingUp} title="Break-even" value={shown ? `${shown.breakeven.customers.toFixed(1)} customers` : "—"} sub={shown ? `≈ ${shown.breakeven.leads.toFixed(0)} leads` : ""} />
          </div>

          {/* Scenarios */}
          <div className="card-surface rounded-2xl p-6">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-1.5"><TrendingUp size={12} className="text-electric" /> Range of outcomes</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <ScenBlock label="Conservative" tone="slate" s={shown?.scenarios?.conservative} fee={inputs.proposed_fee} />
              <ScenBlock label="Target" tone="electric" s={shown?.scenarios?.target} fee={inputs.proposed_fee} />
              <ScenBlock label="Stretch" tone="emerald" s={shown?.scenarios?.stretch} fee={inputs.proposed_fee} />
            </div>
            {shown && (
              <p className="mt-4 text-sm text-slate-300">
                <span className="text-slate-500">12-month target profit:</span> <span className="font-semibold text-electric">{money(shown.twelve_month_target_profit)}</span>
              </p>
            )}
          </div>

          {/* AI script */}
          {script && (
            <div className="card-surface rounded-2xl p-6" data-testid="ve-script">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-1.5"><PhoneCall size={12} className="text-electric" /> AI-generated sales pack</p>
                  <h2 className="font-heading font-semibold text-xl">Talking points for your call</h2>
                </div>
                {runId && (
                  <a href={valueEnginePdfUrl(runId)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-electric px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-600" data-testid="ve-pdf">
                    <Download size={13} /> Download PDF proposal
                  </a>
                )}
              </div>

              <ScriptBlock label="Opening hook (first 30 seconds)" text={script.opening_hook} testid="ve-hook" />
              <ScriptBlock label="Pain diagnosis" text={script.pain_diagnosis} testid="ve-pain" />
              <ScriptBlock label="Value pitch (built on their numbers)" text={script.value_pitch} testid="ve-value" />

              {script.differentiators?.length > 0 && (
                <ScriptList label="Why Traction Labs is different" items={script.differentiators} testid="ve-diff" />
              )}

              {script.objection_playbook?.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-coral">Objection playbook</p>
                    <button onClick={() => copy((script.objection_playbook || []).map(o => `${o.objection}\n→ ${o.reframe}\n(one-liner: ${o.one_liner || ""})`).join("\n\n"))} className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1"><Copy size={11} /> Copy all</button>
                  </div>
                  <div className="space-y-2">
                    {script.objection_playbook.map((o, i) => (
                      <div key={i} className="rounded-lg bg-white/5 border border-white/5 p-3" data-testid={`ve-obj-${i}`}>
                        <p className="font-semibold text-white text-sm">{o.objection}</p>
                        <p className="mt-1 text-slate-300 text-sm">{o.reframe}</p>
                        {o.one_liner && <p className="mt-1 text-xs text-electric italic">One-liner: {o.one_liner}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ScriptBlock label="Close" text={script.close} testid="ve-close" highlight />
              {script.fallback_offers?.length > 0 && <ScriptList label="Fallback offers if they hesitate" items={script.fallback_offers} testid="ve-fallback" />}
              {script.one_page_summary && (
                <div className="mt-5 rounded-lg border border-electric/25 bg-electric/5 p-4" data-testid="ve-summary">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-electric mb-1">60-second summary (read verbatim)</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{script.one_page_summary}</p>
                  <button onClick={() => copy(script.one_page_summary)} className="mt-2 inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white"><Copy size={11} /> Copy</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — History */}
        <div className="lg:sticky lg:top-6 self-start">
          <div className="card-surface rounded-2xl p-5">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-3">Saved runs</p>
            {runs.length === 0 && <p className="text-sm text-slate-500">Nothing saved yet.</p>}
            <ul className="space-y-2">
              {runs.map((r) => (
                <li key={r.id} className={`group rounded-lg border p-3 transition-colors ${runId === r.id ? "border-electric/50 bg-electric/5" : "border-white/5 hover:border-white/20 bg-white/[0.02]"}`} data-testid={`ve-run-${r.id}`}>
                  <button onClick={() => loadRun(r.id)} className="w-full text-left">
                    <p className="text-sm font-semibold text-white truncate">{r.business_name || "Untitled prospect"}</p>
                    <p className="text-[10px] font-mono uppercase text-slate-500 mt-0.5">{r.industry} · {(r.created_at || "").slice(0, 10)}</p>
                    {r.calc?.scenarios?.target?.net_profit_after_fee != null && (
                      <p className="mt-1 text-xs text-emerald-400">{money(r.calc.scenarios.target.net_profit_after_fee)} net / mo</p>
                    )}
                  </button>
                  <button onClick={() => remove(r.id)} className="mt-1 text-slate-600 hover:text-coral text-xs inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={11} /> Delete</button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- helpers -------- */
const F = ({ label, className = "", children }) => (
  <div className={className}>
    <Label className="text-slate-300 text-sm">{label}</Label>
    <div className="mt-1.5">{children}</div>
  </div>
);

const NumField = ({ label, v, onC, testid }) => (
  <F label={label}>
    <Input type="number" value={v} onChange={(e) => onC(e.target.value === "" ? 0 : Number(e.target.value))} className="bg-navy-900 border-white/10" data-testid={testid} />
  </F>
);

const StatCard = ({ icon: Icon, title, value, sub, tone }) => {
  const map = {
    electric: "text-electric border-electric/25 bg-electric/5",
    emerald: "text-emerald-400 border-emerald-400/25 bg-emerald-400/5",
    coral: "text-coral border-coral/25 bg-coral/5",
    slate: "text-slate-300 border-white/10 bg-white/5",
  };
  return (
    <div className={`rounded-2xl border p-5 ${map[tone] || map.slate}`}>
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest opacity-80"><Icon size={13} /> {title}</div>
      <p className="mt-2 font-heading font-black tracking-tighter text-3xl">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-70">{sub}</p>}
    </div>
  );
};

const ScenBlock = ({ label, s, fee, tone }) => {
  const border = tone === "electric" ? "border-electric/40 bg-electric/5" : tone === "emerald" ? "border-emerald-400/30 bg-emerald-400/5" : "border-white/10 bg-white/[0.03]";
  const accent = tone === "electric" ? "text-electric" : tone === "emerald" ? "text-emerald-400" : "text-slate-300";
  if (!s) return null;
  return (
    <div className={`rounded-lg border ${border} p-4`}>
      <p className={`text-[10px] font-mono uppercase tracking-widest ${accent} mb-2`}>{label}</p>
      <p className="text-sm text-slate-300">{s.new_customers?.toFixed(1)} customers</p>
      <p className="text-sm text-slate-300">{money(s.new_profit)} gross</p>
      <p className={`text-sm font-semibold ${accent}`}>{money(s.net_profit_after_fee)} net</p>
      <p className="text-[11px] text-slate-500 mt-1">ROI {s.roi_pct?.toFixed(0)}%</p>
      <p className="text-[11px] text-slate-500">CPL {money(s.cpl)}</p>
    </div>
  );
};

const ScriptBlock = ({ label, text, testid, highlight }) => {
  if (!text) return null;
  return (
    <div className="mt-5" data-testid={testid}>
      <div className="flex items-center justify-between mb-1">
        <p className={`text-[10px] font-mono uppercase tracking-widest ${highlight ? "text-electric" : "text-slate-500"}`}>{label}</p>
        <button onClick={() => copy(text)} className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1"><Copy size={11} /> Copy</button>
      </div>
      <p className={`text-sm ${highlight ? "text-electric font-medium" : "text-slate-200"} whitespace-pre-wrap leading-relaxed`}>{text}</p>
    </div>
  );
};

const ScriptList = ({ label, items, testid }) => (
  <div className="mt-5" data-testid={testid}>
    <div className="flex items-center justify-between mb-1">
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">{label}</p>
      <button onClick={() => copy(items.join("\n"))} className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1"><Copy size={11} /> Copy</button>
    </div>
    <ul className="space-y-1.5">
      {items.map((v, i) => <li key={i} className="text-sm text-slate-200 flex gap-2"><span className="text-electric shrink-0">·</span>{v}</li>)}
    </ul>
  </div>
);
