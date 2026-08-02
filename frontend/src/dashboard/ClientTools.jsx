import { useEffect, useState } from "react";
import {
  Loader2, Sparkles, Megaphone, PhoneCall, BarChart3, Copy, Trash2, ExternalLink,
  Target, ShieldAlert, ThumbsDown, Trophy, Gauge, Image as ImageIcon, Video, AlertCircle,
  Radar, Upload, Swords, Lightbulb,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const copy = (text) => { navigator.clipboard?.writeText(text); toast.success("Copied"); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ============ AD VISUAL (Higgsfield) ============ */
function AdVisual({ prompt, clientId }) {
  const [status, setStatus] = useState("idle"); // idle | working | done | error
  const [url, setUrl] = useState(null);
  const [mediaKind, setMediaKind] = useState("image");
  const [err, setErr] = useState("");

  const run = async (kind) => {
    setStatus("working"); setUrl(null); setErr(""); setMediaKind(kind);
    try {
      const { data } = await api.post("/ads/visual", { prompt, kind, client_id: clientId });
      for (let i = 0; i < 120; i++) {
        await sleep(2500);
        const { data: job } = await api.get(`/ads/visual/${data.id}`);
        if (job.status === "completed") { setUrl(job.media_url); setStatus("done"); return; }
        if (job.status === "failed") { setErr(job.error || "Generation failed"); setStatus("error"); return; }
      }
      setErr("Generation timed out"); setStatus("error");
    } catch (e) {
      setErr(e?.response?.data?.detail || "Could not start generation"); setStatus("error");
    }
  };

  return (
    <div className="mt-3 border-t border-white/5 pt-3" data-testid="ad-visual">
      <div className="flex items-center gap-2">
        <button onClick={() => run("image")} disabled={status === "working"} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-electric/60 hover:bg-electric/10 transition-colors disabled:opacity-50" data-testid="gen-visual-image">
          <ImageIcon size={13} /> Generate image
        </button>
        <button onClick={() => run("video")} disabled={status === "working"} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-electric/60 hover:bg-electric/10 transition-colors disabled:opacity-50" data-testid="gen-visual-video">
          <Video size={13} /> Generate video
        </button>
        {status === "working" && <span className="flex items-center gap-1.5 text-xs text-slate-400"><Loader2 size={13} className="animate-spin" /> Rendering with Higgsfield…</span>}
      </div>
      {status === "error" && (
        <p className="mt-2 flex items-start gap-2 text-xs text-coral"><AlertCircle size={13} className="mt-0.5 shrink-0" />{err}</p>
      )}
      {status === "done" && url && (
        mediaKind === "video"
          ? <video src={url} controls className="mt-3 rounded-lg max-h-72 border border-white/10" data-testid="visual-video" />
          : <img src={url} alt="Generated ad creative" className="mt-3 rounded-lg max-h-72 border border-white/10" data-testid="visual-image" />
      )}
    </div>
  );
}

/* ============ AD CREATOR ============ */
export function AdCreator({ clientId }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);

  const load = async () => {
    const { data } = await api.get(`/ads?client_id=${clientId}`);
    setCampaigns(data);
  };
  useEffect(() => { load(); }, [clientId]);

  const generate = async () => {
    setLoading(true);
    try {
      await api.post("/ads/create", { client_id: clientId, prompt });
      toast.success("Campaign generated");
      setPrompt("");
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Generation failed"); }
    finally { setLoading(false); }
  };

  const remove = async (id) => { await api.delete(`/ads/${id}`); load(); };

  return (
    <div data-testid="ad-creator">
      <div className="card-surface rounded-2xl p-6">
        <div className="flex items-center gap-2 text-electric"><Megaphone size={18} /><h2 className="font-heading font-semibold text-lg">AI Ad Creator</h2></div>
        <p className="mt-1 text-slate-400 text-sm">Claude drafts a full Facebook/Instagram lead-gen campaign — hooks, copy, audiences, and budget.</p>
        <Textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Optional direction (e.g. push the summer AC tune-up offer, target homeowners)" className="mt-4 bg-navy-900 border-white/10 resize-none" data-testid="ad-prompt" />
        <button onClick={generate} disabled={loading} className="mt-3 inline-flex items-center gap-2 rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60" data-testid="ad-generate">
          {loading ? <><Loader2 size={15} className="animate-spin" /> Building campaign…</> : <><Sparkles size={15} /> Generate campaign</>}
        </button>
      </div>

      <div className="mt-6 space-y-6">
        {campaigns.map((camp) => {
          const d = camp.data || {};
          return (
            <div key={camp.id} className="card-surface rounded-2xl p-7" data-testid={`campaign-${camp.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-heading text-xl font-semibold">{d.campaign_name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{d.objective} · {d.daily_budget}/day</p>
                </div>
                <button onClick={() => remove(camp.id)} className="text-slate-500 hover:text-coral"><Trash2 size={16} /></button>
              </div>

              {(d.audiences || []).length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-mono uppercase tracking-widest text-coral mb-2">Audiences</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {d.audiences.map((a, i) => (
                      <div key={i} className="rounded-lg bg-white/5 p-3 border border-white/5">
                        <p className="text-sm font-semibold text-white">{a.name}</p>
                        <p className="text-xs text-slate-400 mt-1">{a.targeting}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5">
                <p className="text-xs font-mono uppercase tracking-widest text-coral mb-2">Ad variations</p>
                <div className="space-y-3">
                  {(d.ads || []).map((ad, i) => (
                    <div key={i} className="rounded-xl bg-white/5 p-4 border border-white/5 group">
                      <p className="text-electric text-sm font-semibold">Hook: {ad.hook}</p>
                      <p className="mt-2 font-heading font-semibold">{ad.headline}</p>
                      <p className="mt-1 text-slate-300 text-sm whitespace-pre-wrap">{ad.primary_text}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider text-slate-500">CTA: {ad.cta}</span>
                        <button onClick={() => copy(`${ad.headline}\n\n${ad.primary_text}\n\nCTA: ${ad.cta}`)} className="text-slate-500 hover:text-electric opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs"><Copy size={13} /> Copy</button>
                      </div>
                      {ad.image_prompt && <p className="mt-2 text-xs text-slate-500 italic">Visual: {ad.image_prompt}</p>}
                      <AdVisual prompt={ad.image_prompt || `${ad.headline}. ${ad.primary_text}`} clientId={clientId} />
                    </div>
                  ))}
                </div>
              </div>
              {d.notes && <p className="mt-4 text-sm text-slate-400 border-l-2 border-electric pl-4">{d.notes}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ COMPETITOR AD INTEL ============ */
export function AdIntel({ clientId }) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [imageB64, setImageB64] = useState(null);
  const [imgName, setImgName] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);

  const load = async () => {
    const { data } = await api.get(`/ads/competitor-analyses?client_id=${clientId}`);
    setItems(data);
  };
  useEffect(() => { load(); }, [clientId]);

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result);
      setImageB64(res.includes(",") ? res.split(",")[1] : res);
      setImgName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!text.trim() && !imageB64) return toast.error("Paste the competitor's ad or upload a screenshot");
    setLoading(true);
    try {
      await api.post("/ads/analyze-competitor", { client_id: clientId, competitor_name: name, competitor_text: text, image_base64: imageB64 });
      toast.success("Analysis complete");
      setName(""); setText(""); setImageB64(null); setImgName("");
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Analysis failed"); }
    finally { setLoading(false); }
  };

  const remove = async (id) => { await api.delete(`/ads/competitor-analyses/${id}`); load(); };

  return (
    <div data-testid="ad-intel">
      <div className="card-surface rounded-2xl p-6">
        <div className="flex items-center gap-2 text-electric"><Radar size={18} /><h2 className="font-heading font-semibold text-lg">Competitor Ad Intel</h2></div>
        <p className="mt-1 text-slate-400 text-sm">Paste a competitor's ad copy or upload a screenshot. Claude breaks down why it works, how to beat it, and writes a Higgsfield prompt for a stronger ad in your client's niche.</p>
        <div className="mt-4 space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Competitor name (optional)" className="bg-navy-900 border-white/10" data-testid="intel-name" />
          <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste the competitor's headline, primary text, offer, CTA…" className="bg-navy-900 border-white/10 resize-none" data-testid="intel-text" />
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:border-electric/60 cursor-pointer transition-colors" data-testid="intel-upload">
              <Upload size={15} /> {imgName || "Upload ad screenshot"}
              <input type="file" accept="image/*" onChange={onFile} className="hidden" />
            </label>
            {imageB64 && <button onClick={() => { setImageB64(null); setImgName(""); }} className="text-xs text-slate-500 hover:text-coral">remove</button>}
          </div>
          <button onClick={analyze} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60" data-testid="intel-analyze">
            {loading ? <><Loader2 size={15} className="animate-spin" /> Analyzing competitor…</> : <><Swords size={15} /> Analyze & beat it</>}
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {items.map((it) => {
          const d = it.data || {};
          const b = d.breakdown || {};
          const rc = d.recommended_copy || {};
          return (
            <div key={it.id} className="card-surface rounded-2xl p-7" data-testid={`intel-${it.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Competitor</p>
                  <h3 className="font-heading text-lg font-semibold">{it.competitor_name || "Unnamed competitor"}</h3>
                </div>
                <button onClick={() => remove(it.id)} className="text-slate-500 hover:text-coral"><Trash2 size={16} /></button>
              </div>

              <div className="mt-5 grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-electric mb-2">Their breakdown</p>
                  <ul className="space-y-1.5 text-sm text-slate-300">
                    {b.hook && <li><span className="text-slate-500">Hook:</span> {b.hook}</li>}
                    {b.offer && <li><span className="text-slate-500">Offer:</span> {b.offer}</li>}
                    {b.angle && <li><span className="text-slate-500">Angle:</span> {b.angle}</li>}
                    {b.cta && <li><span className="text-slate-500">CTA:</span> {b.cta}</li>}
                    {(b.emotional_triggers || []).length > 0 && <li><span className="text-slate-500">Triggers:</span> {(b.emotional_triggers || []).join(", ")}</li>}
                  </ul>
                </div>
                <div className="rounded-xl bg-white/5 p-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-coral mb-2 flex items-center gap-1.5"><Swords size={13} /> How we win</p>
                  <ul className="space-y-1.5 text-sm text-slate-300">
                    {(d.how_to_win || []).map((w, i) => <li key={i} className="flex gap-2"><span className="text-electric">→</span>{w}</li>)}
                  </ul>
                </div>
              </div>

              {(rc.headline || rc.primary_text) && (
                <div className="mt-4 rounded-xl border border-electric/25 bg-electric/5 p-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-electric mb-2 flex items-center gap-1.5"><Lightbulb size={13} /> Recommended ad copy</p>
                  <p className="font-heading font-semibold">{rc.headline}</p>
                  <p className="mt-1 text-sm text-slate-300 whitespace-pre-wrap">{rc.primary_text}</p>
                  {rc.cta && <p className="mt-2 text-xs font-mono uppercase tracking-wider text-slate-400">CTA: {rc.cta}</p>}
                  <button onClick={() => copy(`${rc.headline}\n\n${rc.primary_text}\n\nCTA: ${rc.cta || ""}`)} className="mt-2 inline-flex items-center gap-1.5 text-xs text-electric hover:text-blue-400"><Copy size={12} /> Copy copy</button>
                </div>
              )}

              {d.higgsfield_prompt && (
                <div className="mt-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-coral mb-2">Higgsfield prompt (better ad)</p>
                  <p className="rounded-lg bg-navy-900 border border-white/10 p-3 text-sm text-slate-300 font-mono">{d.higgsfield_prompt}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <button onClick={() => copy(d.higgsfield_prompt)} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"><Copy size={12} /> Copy prompt</button>
                  </div>
                  <AdVisual prompt={d.higgsfield_prompt} clientId={clientId} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ SALES COACH ============ */
export function SalesCoach({ client }) {
  const [tab, setTab] = useState("prep");
  const [prepLoading, setPrepLoading] = useState(false);
  const [prep, setPrep] = useState(null);
  const [context, setContext] = useState("");
  const [transcript, setTranscript] = useState("");
  const [scoreLoading, setScoreLoading] = useState(false);
  const [score, setScore] = useState(null);

  const runPrep = async () => {
    setPrepLoading(true); setPrep(null);
    try {
      const { data } = await api.post("/sales/prep", { business_name: client.business_name, industry: client.industry, context });
      setPrep(data);
    } catch (e) { toast.error(e?.response?.data?.detail || "Prep failed"); }
    finally { setPrepLoading(false); }
  };

  const runScore = async () => {
    if (!transcript.trim()) return toast.error("Paste a call transcript first");
    setScoreLoading(true); setScore(null);
    try {
      const { data } = await api.post("/sales/score", { business_name: client.business_name, transcript });
      setScore(data);
    } catch (e) { toast.error(e?.response?.data?.detail || "Scoring failed"); }
    finally { setScoreLoading(false); }
  };

  return (
    <div className="card-surface rounded-2xl p-7" data-testid="sales-coach">
      <div className="flex items-center gap-2 text-electric"><PhoneCall size={18} /><h2 className="font-heading font-semibold text-lg">AI Sales Coach</h2></div>
      <div className="mt-4 flex gap-2">
        <button onClick={() => setTab("prep")} className={`rounded-full px-4 py-2 text-sm ${tab === "prep" ? "bg-electric text-white" : "border border-white/10 text-slate-400"}`} data-testid="sales-tab-prep">Call prep</button>
        <button onClick={() => setTab("score")} className={`rounded-full px-4 py-2 text-sm ${tab === "score" ? "bg-electric text-white" : "border border-white/10 text-slate-400"}`} data-testid="sales-tab-score">Score a call</button>
      </div>

      {tab === "prep" ? (
        <div className="mt-5">
          <Label className="text-slate-300 text-sm">Anything you know about this prospect</Label>
          <Textarea rows={2} value={context} onChange={(e) => setContext(e.target.value)} placeholder="They've spent on ads before and got burned; skeptical about ROI." className="mt-2 bg-navy-900 border-white/10 resize-none" data-testid="prep-context" />
          <button onClick={runPrep} disabled={prepLoading} className="mt-3 inline-flex items-center gap-2 rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60" data-testid="prep-run">
            {prepLoading ? <><Loader2 size={15} className="animate-spin" /> Preparing…</> : <><Sparkles size={15} /> Prepare me</>}
          </button>
          {prep && (
            <div className="mt-6 space-y-5" data-testid="prep-result">
              <Block label="Their mindset" icon={Target}><p className="text-slate-200">{prep.mindset}</p></Block>
              <Block label="Talking points" icon={ThumbsDown}>
                <ul className="space-y-1.5">{(prep.talking_points || []).map((t, i) => <li key={i} className="flex gap-2 text-sm text-slate-300"><span className="text-electric">→</span>{t}</li>)}</ul>
              </Block>
              <Block label="Objections & responses" icon={ShieldAlert}>
                <div className="space-y-3">{(prep.objections || []).map((o, i) => (
                  <div key={i} className="rounded-lg bg-white/5 p-3"><p className="text-sm text-white font-medium">"{o.objection}"</p><p className="text-sm text-slate-400 mt-1">{o.response}</p></div>
                ))}</div>
              </Block>
              <Block label="Don't say" icon={ThumbsDown}>
                <ul className="space-y-1.5">{(prep.avoid || []).map((t, i) => <li key={i} className="flex gap-2 text-sm text-slate-300"><span className="text-coral">✕</span>{t}</li>)}</ul>
              </Block>
              {prep.close && <Block label="How to close" icon={Trophy}><p className="text-slate-200">{prep.close}</p></Block>}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-5">
          <Label className="text-slate-300 text-sm">Paste the call transcript</Label>
          <Textarea rows={6} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste the full transcript of your sales call…" className="mt-2 bg-navy-900 border-white/10 resize-none" data-testid="score-transcript" />
          <button onClick={runScore} disabled={scoreLoading} className="mt-3 inline-flex items-center gap-2 rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60" data-testid="score-run">
            {scoreLoading ? <><Loader2 size={15} className="animate-spin" /> Scoring…</> : <><Gauge size={15} /> Score this call</>}
          </button>
          {score && (
            <div className="mt-6 space-y-5" data-testid="score-result">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white/5 p-5 text-center"><p className="font-heading text-4xl font-black text-electric">{score.score}</p><p className="text-xs text-slate-500 mt-1">Call score</p></div>
                <div className="rounded-xl bg-white/5 p-5 text-center"><p className="font-heading text-4xl font-black text-emerald-400">{score.closing_probability}%</p><p className="text-xs text-slate-500 mt-1">Closing probability</p></div>
              </div>
              {score.summary && <p className="text-slate-300 border-l-2 border-electric pl-4">{score.summary}</p>}
              <Block label="Strengths" icon={Trophy}><ul className="space-y-1.5">{(score.strengths || []).map((t, i) => <li key={i} className="flex gap-2 text-sm text-slate-300"><span className="text-emerald-400">✓</span>{t}</li>)}</ul></Block>
              <Block label="Objections raised" icon={ShieldAlert}><ul className="space-y-1.5">{(score.objections || []).map((t, i) => <li key={i} className="flex gap-2 text-sm text-slate-300"><span className="text-coral">!</span>{t}</li>)}</ul></Block>
              <Block label="Mistakes" icon={ThumbsDown}><ul className="space-y-1.5">{(score.mistakes || []).map((t, i) => <li key={i} className="flex gap-2 text-sm text-slate-300"><span className="text-coral">✕</span>{t}</li>)}</ul></Block>
              <Block label="Better responses" icon={Sparkles}>
                <div className="space-y-3">{(score.better_responses || []).map((o, i) => (
                  <div key={i} className="rounded-lg bg-white/5 p-3"><p className="text-sm text-slate-400">{o.situation}</p><p className="text-sm text-white mt-1">{o.better_response}</p></div>
                ))}</div>
              </Block>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Block({ label, icon: Icon, children }) {
  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-widest text-coral mb-2 flex items-center gap-2">{Icon && <Icon size={13} />}{label}</p>
      {children}
    </div>
  );
}

/* ============ CLIENT REPORTS ============ */
export function ClientReports({ clientId, client }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("");

  const load = async () => {
    const { data } = await api.get(`/reports?client_id=${clientId}`);
    setReports(data);
  };
  useEffect(() => { load(); }, [clientId]);

  const generate = async () => {
    setLoading(true);
    try {
      await api.post("/reports/generate", { client_id: clientId, period });
      toast.success("Report generated");
      setPeriod("");
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Report failed"); }
    finally { setLoading(false); }
  };

  const remove = async (id) => { await api.delete(`/reports/${id}`); load(); };
  const portalUrl = (t) => `${window.location.origin}/portal/${t}`;

  return (
    <div data-testid="client-reports">
      <div className="card-surface rounded-2xl p-6">
        <div className="flex items-center gap-2 text-electric"><BarChart3 size={18} /><h2 className="font-heading font-semibold text-lg">Monthly reports & client portal</h2></div>
        <p className="mt-1 text-slate-400 text-sm">Claude writes a branded monthly report from this client's metrics. Share the portal link — clients view it live.</p>
        <div className="mt-4 flex gap-3">
          <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="Period (e.g. August 2026)" className="bg-navy-900 border-white/10" data-testid="report-period" />
          <button onClick={generate} disabled={loading} className="inline-flex items-center gap-2 rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60 whitespace-nowrap" data-testid="report-generate">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />} Generate
          </button>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {reports.length === 0 ? <p className="text-slate-500 text-sm">No reports yet.</p> : reports.map((r) => (
          <div key={r.id} className="card-surface rounded-xl p-5 flex items-center justify-between gap-4" data-testid={`report-${r.id}`}>
            <div>
              <p className="font-heading font-semibold">{r.period}</p>
              <p className="text-xs text-slate-500 mt-1">{(r.content || {}).headline}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => copy(portalUrl(r.share_token))} className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white" data-testid={`copy-link-${r.id}`}><Copy size={14} /> Link</button>
              <a href={portalUrl(r.share_token)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-electric hover:text-blue-400" data-testid={`view-portal-${r.id}`}><ExternalLink size={14} /> View</a>
              <button onClick={() => remove(r.id)} className="text-slate-500 hover:text-coral"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
