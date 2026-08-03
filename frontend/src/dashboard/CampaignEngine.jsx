import { useEffect, useState, useRef, useCallback } from "react";
import {
  Loader2, Brain, Users, Swords, Sparkles, Target, Megaphone, ShieldCheck, BarChart3,
  RefreshCw, Trash2, Copy, ChevronDown, ChevronUp, Trophy, XCircle, Rocket, Plus, MessageSquareQuote,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const copy = (t) => { navigator.clipboard?.writeText(t); toast.success("Copied"); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LAYER_META = {
  reality: { label: "Reality & Psychology", agents: "Human Reality · Pain Discovery · Belief Change · Battlefield", icon: Brain, color: "text-electric" },
  creative: { label: "Creative & Attention", agents: "Attention Engine · Creative Director · Content Intelligence", icon: Megaphone, color: "text-coral" },
  conversion: { label: "Offer, Funnel & Trust", agents: "Offer Psychology · Funnel · Trust · Performance · Learning Loop", icon: Rocket, color: "text-emerald-400" },
};

export default function CampaignEngine({ clientId }) {
  const [campaigns, setCampaigns] = useState([]);
  const [active, setActive] = useState(null); // current campaign being built/viewed
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [starting, setStarting] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    const { data } = await api.get(`/campaigns?client_id=${clientId}`);
    setCampaigns(data);
    if (!active && data[0]) setActive(data[0]);
  }, [clientId, active]);

  useEffect(() => { load(); }, [load]);

  // Poll while active campaign is building or refining
  useEffect(() => {
    if (!active) return;
    if (active.build_status !== "building" && active.build_status !== "refining") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const { data } = await api.get(`/campaigns/${active.id}`);
        if (cancelled) return;
        setActive(data);
        setCampaigns((all) => all.map((c) => (c.id === data.id ? data : c)));
        if (data.build_status === "building" || data.build_status === "refining") {
          pollRef.current = setTimeout(tick, 4500);
        }
      } catch (e) { /* ignore */ }
    };
    pollRef.current = setTimeout(tick, 3000);
    return () => { cancelled = true; if (pollRef.current) clearTimeout(pollRef.current); };
  }, [active?.id, active?.build_status]);

  const build = async () => {
    setStarting(true);
    try {
      const { data } = await api.post("/campaigns/build", { client_id: clientId, goal, notes });
      toast.success("Campaign Engine started");
      setGoal(""); setNotes("");
      setActive(data);
      setCampaigns((all) => [data, ...all]);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start Campaign Engine");
    } finally { setStarting(false); }
  };

  const refine = async (layer, instructions, cascade) => {
    try {
      await api.post(`/campaigns/${active.id}/refine`, { layer, instructions, cascade });
      toast.success(`Refining ${layer}${cascade ? " (+ downstream)" : ""}…`);
      const { data } = await api.get(`/campaigns/${active.id}`);
      setActive(data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Refine failed");
    }
  };

  const markWon = async () => {
    if (!window.confirm("Mark this campaign as WON? Its winning hooks, emotions, offers, angles and customer language will be pushed to the Traction Labs Intelligence brain and reused across all future clients in this niche.")) return;
    try {
      const { data } = await api.post(`/campaigns/${active.id}/result`, { status: "won" });
      toast.success(`Won! ${data.learnings_recorded} learnings added to the brain`);
      const { data: fresh } = await api.get(`/campaigns/${active.id}`);
      setActive(fresh);
    } catch { toast.error("Could not record result"); }
  };

  const markLost = async () => {
    try {
      await api.post(`/campaigns/${active.id}/result`, { status: "lost" });
      const { data: fresh } = await api.get(`/campaigns/${active.id}`);
      setActive(fresh);
      toast.success("Marked lost");
    } catch { toast.error("Could not record result"); }
  };

  const removeCamp = async (id) => {
    if (!window.confirm("Delete this campaign?")) return;
    await api.delete(`/campaigns/${id}`);
    if (active?.id === id) setActive(null);
    load();
  };

  return (
    <div data-testid="campaign-engine">
      {/* Builder */}
      <div className="card-surface rounded-2xl p-7">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-electric/10 ring-1 ring-electric/20 text-electric">
            <Sparkles size={20} />
          </div>
          <div className="flex-1">
            <h2 className="font-heading font-semibold text-lg">Campaign Engine</h2>
            <p className="mt-1 text-slate-400 text-sm leading-relaxed">
              12 connected agents run in sequence: Human Reality → Pain → Beliefs → Battlefield → Attention → Creative → Content → Offer → Funnel → Trust → Performance → Learning. Every layer feeds the next. Every winning campaign feeds the shared Traction Labs brain.
            </p>
          </div>
        </div>

        <div className="mt-5 grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Campaign goal</Label>
            <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. book more Austin AC install estimates in July" className="bg-navy-900 border-white/10" data-testid="ce-goal" />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Extra direction (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. win on trust, not price; heat wave angle; new financing" className="bg-navy-900 border-white/10" data-testid="ce-notes" />
          </div>
        </div>
        <button onClick={build} disabled={starting} className="mt-5 inline-flex items-center gap-2 rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60" data-testid="ce-build">
          {starting ? <><Loader2 size={15} className="animate-spin" /> Starting…</> : <><Sparkles size={15} /> Build a human-first campaign</>}
        </button>
      </div>

      {/* History */}
      {campaigns.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2" data-testid="ce-history">
          {campaigns.map((c) => (
            <button key={c.id} onClick={() => setActive(c)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${active?.id === c.id ? "bg-electric/20 text-white ring-1 ring-electric/40" : "border border-white/10 text-slate-400 hover:text-white hover:border-white/30"}`}
              data-testid={`ce-camp-${c.id}`}>
              {(c.goal || "Campaign").slice(0, 40)}{(c.goal || "").length > 40 ? "…" : ""}
              <span className={`text-[10px] font-mono uppercase ${c.status === "won" ? "text-emerald-400" : c.status === "lost" ? "text-coral" : "text-slate-500"}`}>· {c.status}</span>
            </button>
          ))}
        </div>
      )}

      {active && <CampaignView campaign={active} clientId={clientId} onRefine={refine} onDelete={removeCamp} onWon={markWon} onLost={markLost} />}
    </div>
  );
}

function ProgressBar({ campaign }) {
  const steps = [
    { key: "reality", label: "Reality" },
    { key: "creative", label: "Creative" },
    { key: "conversion", label: "Conversion" },
  ];
  const stateOf = (k) => {
    if (campaign[k]) return "done";
    if (campaign.progress === k && (campaign.build_status === "building" || campaign.build_status === "refining")) return "working";
    return "pending";
  };
  return (
    <div className="mt-4 flex items-center gap-2" data-testid="ce-progress">
      {steps.map((s, i) => {
        const st = stateOf(s.key);
        return (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className={`flex-1 h-1.5 rounded-full ${st === "done" ? "bg-electric" : st === "working" ? "bg-electric/40 animate-pulse" : "bg-white/10"}`} />
            <span className={`text-[10px] font-mono uppercase ${st === "working" ? "text-electric" : st === "done" ? "text-slate-300" : "text-slate-600"}`}>
              {s.label}{st === "working" ? "…" : st === "done" ? " ✓" : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CampaignView({ campaign, clientId, onRefine, onDelete, onWon, onLost }) {
  return (
    <div className="mt-6 card-surface rounded-2xl p-7" data-testid={`ce-view-${campaign.id}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Campaign blueprint</p>
          <h3 className="font-heading text-xl font-semibold mt-0.5">{campaign.goal || "Human-first campaign"}</h3>
          {campaign.notes && <p className="text-sm text-slate-400 mt-1">{campaign.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          {campaign.status !== "won" && (
            <button onClick={onWon} className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/20" data-testid="ce-mark-won">
              <Trophy size={13} /> Mark Won
            </button>
          )}
          {campaign.status !== "lost" && campaign.status !== "won" && (
            <button onClick={onLost} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-coral/60 hover:text-coral" data-testid="ce-mark-lost">
              <XCircle size={13} /> Lost
            </button>
          )}
          <button onClick={() => onDelete(campaign.id)} className="text-slate-500 hover:text-coral" data-testid="ce-delete"><Trash2 size={16} /></button>
        </div>
      </div>

      <ProgressBar campaign={campaign} />
      {campaign.build_error && <p className="mt-3 text-sm text-coral">Build error: {campaign.build_error}</p>}

      <div className="mt-6 space-y-4">
        <RealitySection campaign={campaign} onRefine={onRefine} />
        <CreativeSection campaign={campaign} onRefine={onRefine} clientId={clientId} />
        <ConversionSection campaign={campaign} onRefine={onRefine} />
      </div>
    </div>
  );
}

function Section({ layer, campaign, children }) {
  const [open, setOpen] = useState(true);
  const [refineOpen, setRefineOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [cascade, setCascade] = useState(true);
  const meta = LAYER_META[layer];
  const Icon = meta.icon;
  const has = !!campaign[layer];
  const working = campaign.progress === layer && (campaign.build_status === "building" || campaign.build_status === "refining") && !has;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02]" data-testid={`ce-section-${layer}`}>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          <Icon size={17} className={meta.color} />
          <div>
            <p className="font-heading font-semibold text-base">{meta.label}</p>
            <p className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mt-0.5">{meta.agents}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {working && <span className="flex items-center gap-1.5 text-xs text-electric"><Loader2 size={13} className="animate-spin" /> generating…</span>}
          {has && (
            <button onClick={(e) => { e.stopPropagation(); setRefineOpen((v) => !v); }} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-slate-300 hover:border-electric/50 hover:text-white" data-testid={`ce-refine-btn-${layer}`}>
              <RefreshCw size={11} /> Refine
            </button>
          )}
          {open ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5">
          {refineOpen && has && (
            <div className="mb-4 rounded-lg bg-navy-900/60 border border-white/5 p-4" data-testid={`ce-refine-panel-${layer}`}>
              <Label className="text-slate-300 text-xs">What should be different? (optional)</Label>
              <Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. lean harder on identity pain, less on price. Try a discovery-story structure."
                className="mt-1.5 bg-navy-900 border-white/10 resize-none text-sm" data-testid={`ce-refine-input-${layer}`} />
              {layer !== "conversion" && (
                <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                  <input type="checkbox" checked={cascade} onChange={(e) => setCascade(e.target.checked)} data-testid={`ce-cascade-${layer}`} />
                  Also re-run downstream layers so the whole plan stays consistent
                </label>
              )}
              <div className="mt-3 flex gap-2">
                <button onClick={() => { onRefine(layer, instructions, layer !== "conversion" ? cascade : false); setInstructions(""); setRefineOpen(false); }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-electric px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-600" data-testid={`ce-refine-run-${layer}`}>
                  <Sparkles size={12} /> Re-run this layer
                </button>
                <button onClick={() => setRefineOpen(false)} className="text-xs text-slate-400 hover:text-white">Cancel</button>
              </div>
            </div>
          )}
          {!has ? (
            <p className="text-sm text-slate-500">{working ? "Claude is working on this layer…" : "Waiting…"}</p>
          ) : children}
        </div>
      )}
    </div>
  );
}

const Chip = ({ children, tone = "slate" }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs mr-1.5 mb-1.5 ${tone === "electric" ? "bg-electric/10 text-electric border border-electric/30" : tone === "coral" ? "bg-coral/10 text-coral border border-coral/30" : "bg-white/5 text-slate-300 border border-white/10"}`}>{children}</span>
);

function List({ items, tone }) {
  if (!items || !items.length) return null;
  return <div>{items.map((v, i) => <Chip key={i} tone={tone}>{v}</Chip>)}</div>;
}

function RealitySection({ campaign, onRefine }) {
  const r = campaign.reality;
  return (
    <Section layer="reality" campaign={campaign}>
      {r && (
        <div className="grid md:grid-cols-2 gap-5">
          <Block title="Customer reality" icon={Users}>
            {r.customer_reality?.who && <P label="Who">{r.customer_reality.who}</P>}
            {r.customer_reality?.daily_life && <P label="Daily life">{r.customer_reality.daily_life}</P>}
            {r.customer_reality?.identity && <P label="Identity">{r.customer_reality.identity}</P>}
            {r.customer_reality?.decision_process && <P label="How they decide">{r.customer_reality.decision_process}</P>}
            <PList label="Fears" items={r.customer_reality?.fears} tone="coral" />
            <PList label="Desires" items={r.customer_reality?.desires} tone="electric" />
            <PList label="Objections" items={r.customer_reality?.objections} />
            <PList label="Trust barriers" items={r.customer_reality?.trust_barriers} />
          </Block>
          <Block title="Pain hierarchy" icon={Target}>
            {r.pain_hierarchy?.surface && <P label="Surface (what they say)">{r.pain_hierarchy.surface}</P>}
            {r.pain_hierarchy?.emotional && <P label="Emotional (what they feel)">{r.pain_hierarchy.emotional}</P>}
            {r.pain_hierarchy?.identity && <P label="Identity (what it represents)">{r.pain_hierarchy.identity}</P>}
            {r.pain_hierarchy?.hidden && <P label="Hidden pain">{r.pain_hierarchy.hidden}</P>}
            {r.pain_hierarchy?.future_pain && <P label="Future pain">{r.pain_hierarchy.future_pain}</P>}
            {r.pain_hierarchy?.desired_transformation && <P label="Desired transformation" highlight>{r.pain_hierarchy.desired_transformation}</P>}
          </Block>
          <Block title="Belief ladder" icon={Brain}>
            <PList label="Current beliefs (limiting)" items={r.belief_ladder?.current_beliefs} tone="coral" />
            <PList label="Bridge beliefs" items={r.belief_ladder?.bridge_beliefs} />
            <PList label="Target beliefs (what makes them buy)" items={r.belief_ladder?.target_beliefs} tone="electric" />
          </Block>
          <Block title="Market battlefield" icon={Swords}>
            {r.battlefield?.category_fatigue && <P label="Category fatigue">{r.battlefield.category_fatigue}</P>}
            <PList label="Competitor patterns" items={r.battlefield?.competitor_patterns} />
            <PList label="Customer complaints" items={r.battlefield?.customer_complaints} tone="coral" />
            <PList label="Gaps nobody exploits" items={r.battlefield?.gaps} tone="electric" />
            <PList label="Positioning opportunities" items={r.battlefield?.positioning_opportunities} tone="electric" />
          </Block>
        </div>
      )}
    </Section>
  );
}

function CreativeSection({ campaign, onRefine, clientId }) {
  const cr = campaign.creative;
  return (
    <Section layer="creative" campaign={campaign}>
      {cr && (
        <div className="space-y-5">
          <div className="rounded-lg border border-electric/25 bg-electric/5 p-4">
            <p className="text-xs font-mono uppercase tracking-widest text-electric mb-2">Attention plan</p>
            {cr.attention_plan?.curiosity_gap && <P label="Curiosity gap">{cr.attention_plan.curiosity_gap}</P>}
            {cr.attention_plan?.pattern_interrupt && <P label="Pattern interrupt">{cr.attention_plan.pattern_interrupt}</P>}
            {cr.attention_plan?.emotional_trigger && <P label="Emotional trigger">{cr.attention_plan.emotional_trigger}</P>}
            {cr.attention_plan?.dopamine_loop && <P label="Dopamine loop">{cr.attention_plan.dopamine_loop}</P>}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {(cr.creative_concepts || []).map((concept, i) => {
              const adCopy = `${concept.headline || ""}\n\n${concept.primary_text || ""}\n\nCTA: ${concept.cta || ""}`.trim();
              return (
                <div key={i} className="rounded-xl bg-white/5 border border-white/5 p-4" data-testid={`ce-concept-${i}`}>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-coral">{concept.content_structure}</p>
                  <p className="font-heading font-semibold text-white mt-0.5">{concept.name}</p>
                  <p className="mt-3 text-electric text-sm">Hook: {concept.hook}</p>
                  {concept.script && (
                    <div className="mt-3">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Script</p>
                      <ul className="mt-1 space-y-1">
                        {concept.script.map((line, j) => (
                          <li key={j} className="text-xs text-slate-300 flex gap-1.5"><span className="text-electric">·</span>{line}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {concept.storyboard && (
                    <div className="mt-3">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Storyboard</p>
                      <ol className="mt-1 space-y-1">
                        {concept.storyboard.map((shot, j) => (
                          <li key={j} className="text-xs text-slate-400"><span className="text-slate-600 mr-1">{j + 1}.</span>{shot}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="font-heading font-semibold text-white text-sm">{concept.headline}</p>
                    <p className="mt-1 text-slate-300 text-xs whitespace-pre-wrap">{concept.primary_text}</p>
                    <p className="mt-1 text-[10px] font-mono uppercase text-slate-500">CTA: {concept.cta}</p>
                  </div>
                  {concept.why_it_works && (
                    <p className="mt-3 text-xs text-slate-400 italic border-l-2 border-electric/40 pl-2">Why it works: {concept.why_it_works}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => copy(adCopy)} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-200 hover:border-electric/50" data-testid={`ce-copy-ad-${i}`}>
                      <Copy size={11} /> Copy ad copy
                    </button>
                    {concept.image_prompt && (
                      <button onClick={() => copy(concept.image_prompt)} className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-200 hover:border-coral/50" data-testid={`ce-copy-prompt-${i}`}>
                        <Copy size={11} /> Copy Higgsfield prompt
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Section>
  );
}

function ConversionSection({ campaign, onRefine }) {
  const co = campaign.conversion;
  return (
    <Section layer="conversion" campaign={campaign}>
      {co && (
        <div className="space-y-5">
          {co.offer && (
            <Block title="Offer" icon={Sparkles}>
              {co.offer.headline && <P label="Headline" highlight>{co.offer.headline}</P>}
              {co.offer.transformation && <P label="Transformation">{co.offer.transformation}</P>}
              {co.offer.risk_reversal && <P label="Risk reversal">{co.offer.risk_reversal}</P>}
              {co.offer.urgency && <P label="Urgency">{co.offer.urgency}</P>}
              {co.offer.price_positioning && <P label="Price positioning">{co.offer.price_positioning}</P>}
              <PList label="Bonuses" items={co.offer.bonuses} tone="electric" />
            </Block>
          )}
          {co.funnel && (
            <Block title="Funnel journey" icon={Rocket}>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {["cold", "interested", "warm", "ready"].map((k) => co.funnel[k] && (
                  <div key={k} className="rounded-lg bg-white/5 border border-white/5 p-3">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-coral">{k}</p>
                    <p className="mt-1 font-semibold text-white text-sm">{co.funnel[k].objective}</p>
                    <p className="mt-1 text-xs text-slate-400"><span className="text-slate-500">Asset:</span> {co.funnel[k].asset}</p>
                    <p className="mt-1 text-xs text-slate-300">{co.funnel[k].message}</p>
                  </div>
                ))}
              </div>
              {co.funnel.landing_page && (
                <div className="mt-4 rounded-lg border border-electric/25 bg-electric/5 p-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-electric mb-2">Landing page</p>
                  <p className="font-heading font-semibold text-white">{co.funnel.landing_page.hero_headline}</p>
                  <p className="text-sm text-slate-300 mt-0.5">{co.funnel.landing_page.subheadline}</p>
                  <p className="text-sm text-slate-400 mt-2 whitespace-pre-wrap">{co.funnel.landing_page.hero_copy}</p>
                  <p className="mt-2 text-[10px] font-mono uppercase text-slate-500">CTA: {co.funnel.landing_page.cta}</p>
                  <PList label="Sections" items={co.funnel.landing_page.sections} />
                  <button onClick={() => copy(`${co.funnel.landing_page.hero_headline}\n${co.funnel.landing_page.subheadline}\n\n${co.funnel.landing_page.hero_copy}\n\nCTA: ${co.funnel.landing_page.cta}`)} className="mt-2 inline-flex items-center gap-1 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-200 hover:border-electric/50" data-testid="ce-copy-lp">
                    <Copy size={11} /> Copy landing page copy
                  </button>
                </div>
              )}
              {co.funnel.email_sequence?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">Email sequence</p>
                  <ol className="space-y-1.5">
                    {co.funnel.email_sequence.map((e, i) => (
                      <li key={i} className="text-sm text-slate-300"><span className="text-slate-500 mr-2">Day {e.day}:</span><span className="font-semibold text-white">{e.subject}</span> <span className="text-slate-500">— {e.angle}</span></li>
                    ))}
                  </ol>
                </div>
              )}
              {co.funnel.sms_sequence?.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-2">SMS sequence</p>
                  <ol className="space-y-1.5">
                    {co.funnel.sms_sequence.map((s, i) => (
                      <li key={i} className="text-sm text-slate-300"><span className="text-slate-500 mr-2">Day {s.day}:</span>{s.message}</li>
                    ))}
                  </ol>
                </div>
              )}
              <PList label="Retargeting" items={co.funnel.retargeting} />
            </Block>
          )}
          {co.trust_plan && (
            <Block title="Trust plan" icon={ShieldCheck}>
              <PList label="Proof assets" items={co.trust_plan.proof_assets} tone="electric" />
              <PList label="Testimonials to capture" items={co.trust_plan.testimonial_targets} />
              <PList label="Authority content" items={co.trust_plan.authority_content} />
              <PList label="Transparency moves" items={co.trust_plan.transparency_moves} />
            </Block>
          )}
          {co.testing_and_optimization && (
            <Block title="Testing & performance science" icon={BarChart3}>
              {co.testing_and_optimization.primary_hypothesis && <P label="Primary hypothesis" highlight>{co.testing_and_optimization.primary_hypothesis}</P>}
              <PList label="Human metrics (why)" items={co.testing_and_optimization.human_metrics} tone="electric" />
              <PList label="Platform metrics (what)" items={co.testing_and_optimization.platform_metrics} />
              {(co.testing_and_optimization.tests || []).length > 0 && (
                <div className="mt-2 space-y-2">
                  {co.testing_and_optimization.tests.map((t, i) => (
                    <div key={i} className="rounded-lg bg-white/5 border border-white/5 p-3 text-sm">
                      <p className="font-semibold text-white">Test {i + 1}: {t.variable}</p>
                      <p className="text-slate-400 text-xs mt-0.5">Variants: {(t.variants || []).join(" · ")}</p>
                      {t.kill_criteria && <p className="text-xs text-coral mt-1">Kill if: {t.kill_criteria}</p>}
                    </div>
                  ))}
                </div>
              )}
              {co.testing_and_optimization.stop_loss && <P label="Stop-loss">{co.testing_and_optimization.stop_loss}</P>}
              {co.testing_and_optimization.scale_signal && <P label="Scale signal">{co.testing_and_optimization.scale_signal}</P>}
            </Block>
          )}
          {co.learning_tags && (
            <Block title="Learning loop preview" icon={MessageSquareQuote}>
              <p className="text-xs text-slate-500 mb-2">If you mark this campaign WON, these get pushed to the shared Traction Labs Intelligence brain.</p>
              <PList label="Predicted winning hooks" items={co.learning_tags.predicted_winning_hooks} tone="electric" />
              <PList label="Winning emotions" items={co.learning_tags.predicted_winning_emotions} tone="electric" />
              <PList label="Winning offers" items={co.learning_tags.predicted_winning_offers} tone="electric" />
              <PList label="Customer language captured" items={co.learning_tags.customer_language_captured} />
              <PList label="Objections addressed" items={co.learning_tags.objections_addressed} />
            </Block>
          )}
        </div>
      )}
    </Section>
  );
}

const P = ({ label, children, highlight }) => (
  <p className={`mt-1.5 text-sm ${highlight ? "text-electric font-semibold" : "text-slate-300"}`}>
    <span className="text-slate-500 mr-1">{label}:</span>{children}
  </p>
);

const PList = ({ label, items, tone }) => {
  if (!items || !items.length) return null;
  return (
    <div className="mt-2">
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-1.5">{label}</p>
      <List items={items} tone={tone} />
    </div>
  );
};

const Block = ({ title, icon: Icon, children }) => (
  <div className="rounded-lg bg-white/[0.02] border border-white/5 p-4">
    <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5"><Icon size={12} className="text-electric" /> {title}</p>
    {children}
  </div>
);
