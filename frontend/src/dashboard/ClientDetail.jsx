import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Loader2, Save, Brain, FileText, ListTodo, Sparkles, Download, Trash2,
  Plus, CheckCircle2, Circle, AlertTriangle, Megaphone, PhoneCall, BarChart3, Copy, ExternalLink, Radar, Crosshair, Rocket,
} from "lucide-react";
import api, { pdfUrl } from "@/lib/api";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdCreator, SalesCoach, ClientReports, AdIntel, BatchSpy } from "@/dashboard/ClientTools";
import CampaignEngine from "@/dashboard/CampaignEngine";

const FIELDS = [
  ["business_name", "Business name"], ["contact_name", "Contact name"], ["email", "Email"],
  ["phone", "Phone"], ["website", "Website"], ["facebook", "Facebook"], ["industry", "Industry"],
  ["budget", "Ad budget"],
];

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [docs, setDocs] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [c, t, d] = await Promise.all([
      api.get(`/clients/${id}`),
      api.get(`/tasks?client_id=${id}`),
      api.get(`/documents?client_id=${id}`),
    ]);
    setClient(c.data);
    setTasks(t.data);
    setDocs(d.data);
  }, [id]);

  useEffect(() => { load().catch(() => toast.error("Client not found")); }, [load]);

  if (!client) return <div className="flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin" size={18} /> Loading client…</div>;

  const setField = (k, v) => setClient((c) => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...client,
        monthly_fee: parseFloat(client.monthly_fee) || 0,
        services: typeof client.services === "string" ? client.services.split(",").map((s) => s.trim()).filter(Boolean) : client.services,
        target_cities: typeof client.target_cities === "string" ? client.target_cities.split(",").map((s) => s.trim()).filter(Boolean) : client.target_cities,
      };
      delete payload.ai_history; delete payload.files; delete payload.id; delete payload.created_at;
      await api.put(`/clients/${id}`, payload);
      toast.success("Client saved");
      load();
    } catch { toast.error("Save failed"); } finally { setSaving(false); }
  };

  const removeClient = async () => {
    if (!window.confirm(`Delete ${client.business_name}? This removes their tasks and documents.`)) return;
    await api.delete(`/clients/${id}`);
    toast.success("Client deleted");
    navigate("/dashboard/clients");
  };

  const setMetric = (k, v) => setClient((c) => ({ ...c, metrics: { ...(c.metrics || {}), [k]: v } }));
  const saveMetrics = async () => {
    const m = client.metrics || {};
    try {
      await api.put(`/clients/${id}/metrics`, {
        spend: parseFloat(m.spend) || 0,
        leads: parseInt(m.leads) || 0,
        appointments: parseInt(m.appointments) || 0,
        revenue: parseFloat(m.revenue) || 0,
        period: m.period || "",
      });
      toast.success("Metrics updated");
      load();
    } catch { toast.error("Could not save metrics"); }
  };

  return (
    <div data-testid="client-detail">
      <Link to="/dashboard/clients" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors" data-testid="back-to-clients">
        <ArrowLeft size={16} /> All clients
      </Link>

      <div className="mt-4 flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-electric/10 ring-1 ring-electric/20 font-heading font-black text-electric text-xl">
            {client.business_name?.charAt(0)}
          </span>
          <div>
            <h1 className="font-heading font-black tracking-tighter text-3xl">{client.business_name}</h1>
            <p className="text-slate-500 text-sm">{client.industry} · ${(client.monthly_fee || 0).toLocaleString()}/mo · {client.status}</p>
          </div>
        </div>
        <button onClick={removeClient} className="text-slate-500 hover:text-coral transition-colors flex items-center gap-2 text-sm" data-testid="delete-client-btn">
          <Trash2 size={16} /> Delete
        </button>
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList className="bg-navy-800 border border-white/5 flex-wrap h-auto">
          <TabsTrigger value="overview" data-testid="tab-overview"><ListTodo size={15} className="mr-2" />CRM</TabsTrigger>
          <TabsTrigger value="engine" data-testid="tab-engine"><Rocket size={15} className="mr-2" />Campaign Engine</TabsTrigger>
          <TabsTrigger value="brain" data-testid="tab-brain"><Brain size={15} className="mr-2" />AI Brain</TabsTrigger>
          <TabsTrigger value="ads" data-testid="tab-ads"><Megaphone size={15} className="mr-2" />Ad Creator</TabsTrigger>
          <TabsTrigger value="intel" data-testid="tab-intel"><Radar size={15} className="mr-2" />Ad Intel</TabsTrigger>
          <TabsTrigger value="batchspy" data-testid="tab-batchspy"><Crosshair size={15} className="mr-2" />Batch Spy</TabsTrigger>
          <TabsTrigger value="sales" data-testid="tab-sales"><PhoneCall size={15} className="mr-2" />Sales Coach</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports"><BarChart3 size={15} className="mr-2" />Reports</TabsTrigger>
          <TabsTrigger value="docs" data-testid="tab-docs"><FileText size={15} className="mr-2" />Documents</TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks"><CheckCircle2 size={15} className="mr-2" />Tasks</TabsTrigger>
        </TabsList>

        {/* CRM */}
        <TabsContent value="overview" className="mt-6">
          <div className="card-surface rounded-2xl p-7">
            <div className="grid sm:grid-cols-2 gap-5">
              {FIELDS.map(([k, label]) => (
                <div key={k} className="space-y-2">
                  <Label className="text-slate-300 text-sm">{label}</Label>
                  <Input value={client[k] || ""} onChange={(e) => setField(k, e.target.value)} className="bg-navy-900 border-white/10" data-testid={`field-${k}`} />
                </div>
              ))}
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Monthly fee ($)</Label>
                <Input type="number" value={client.monthly_fee || 0} onChange={(e) => setField("monthly_fee", e.target.value)} className="bg-navy-900 border-white/10" data-testid="field-monthly_fee" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Status</Label>
                <Select value={client.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger className="bg-navy-900 border-white/10" data-testid="field-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["active", "onboarding", "paused"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-slate-300 text-sm">Target cities (comma separated)</Label>
                <Input value={Array.isArray(client.target_cities) ? client.target_cities.join(", ") : client.target_cities || ""} onChange={(e) => setField("target_cities", e.target.value)} className="bg-navy-900 border-white/10" data-testid="field-cities" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-slate-300 text-sm">Services (comma separated)</Label>
                <Input value={Array.isArray(client.services) ? client.services.join(", ") : client.services || ""} onChange={(e) => setField("services", e.target.value)} className="bg-navy-900 border-white/10" data-testid="field-services" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-slate-300 text-sm">Notes / goals</Label>
                <Textarea rows={3} value={client.notes || ""} onChange={(e) => setField("notes", e.target.value)} className="bg-navy-900 border-white/10 resize-none" data-testid="field-notes" />
              </div>
            </div>
            <button onClick={save} disabled={saving} className="mt-6 inline-flex items-center gap-2 rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60" data-testid="save-client-detail">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save changes
            </button>
          </div>

          <div className="card-surface rounded-2xl p-7 mt-6" data-testid="metrics-editor">
            <div className="flex items-center gap-2 text-electric">
              <BarChart3 size={18} /><h3 className="font-heading font-semibold text-lg">Performance metrics</h3>
            </div>
            <p className="mt-1 text-slate-400 text-sm">Enter this period's numbers (Meta sync will auto-fill these once connected). Cost-per-lead is calculated for you.</p>
            <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[["spend", "Ad spend ($)"], ["leads", "Leads"], ["appointments", "Appointments"], ["revenue", "Revenue ($)"]].map(([k, label]) => (
                <div key={k} className="space-y-2">
                  <Label className="text-slate-300 text-sm">{label}</Label>
                  <Input type="number" value={(client.metrics || {})[k] ?? ""} onChange={(e) => setMetric(k, e.target.value)} className="bg-navy-900 border-white/10" data-testid={`metric-${k}`} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4">
              <button onClick={saveMetrics} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15" data-testid="save-metrics">
                <Save size={15} /> Save metrics
              </button>
              {(client.metrics || {}).cpl != null && (client.metrics || {}).leads > 0 && (
                <span className="text-sm text-slate-400">Cost / lead: <span className="text-electric font-semibold">${(client.metrics || {}).cpl}</span></span>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="brain" className="mt-6"><ClientBrain client={client} reload={load} /></TabsContent>
        <TabsContent value="engine" className="mt-6"><CampaignEngine clientId={id} /></TabsContent>
        <TabsContent value="ads" className="mt-6"><AdCreator clientId={id} /></TabsContent>
        <TabsContent value="intel" className="mt-6"><AdIntel clientId={id} /></TabsContent>
        <TabsContent value="batchspy" className="mt-6"><BatchSpy clientId={id} /></TabsContent>
        <TabsContent value="sales" className="mt-6"><SalesCoach client={client} /></TabsContent>
        <TabsContent value="reports" className="mt-6"><ClientReports clientId={id} client={client} /></TabsContent>
        <TabsContent value="docs" className="mt-6"><ClientDocs clientId={id} docs={docs} reload={load} /></TabsContent>
        <TabsContent value="tasks" className="mt-6"><ClientTasks clientId={id} tasks={tasks} reload={load} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ClientBrain({ client, reload }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const history = (client.ai_history || []).filter((h) => h.type === "analysis").slice().reverse();

  const analyze = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post(`/clients/${client.id}/analyze`, { question });
      setResult(data);
      reload();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Analysis failed");
    } finally { setLoading(false); }
  };

  const Findings = ({ data }) => (
    <div className="space-y-5">
      {data.summary && <p className="text-slate-200 leading-relaxed">{data.summary}</p>}
      {(data.findings || []).map((f, i) => (
        <div key={i} className="rounded-xl bg-white/5 p-4 border border-white/5">
          <p className="text-electric font-heading font-semibold text-sm flex items-center gap-2"><AlertTriangle size={14} />{f.area}</p>
          <p className="mt-1 text-slate-400 text-sm"><span className="text-slate-500">Issue:</span> {f.issue}</p>
          <p className="mt-1 text-slate-300 text-sm"><span className="text-slate-500">Fix:</span> {f.recommendation}</p>
        </div>
      ))}
      {(data.priority_actions || []).length > 0 && (
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-coral mb-2">Priority actions</p>
          <ul className="space-y-1.5">
            {data.priority_actions.map((a, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-300"><span className="text-electric">→</span> {a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="card-surface rounded-2xl p-7" data-testid="ai-brain">
      <div className="flex items-center gap-2 text-electric">
        <Brain size={18} /><h2 className="font-heading font-semibold text-lg">AI Client Brain</h2>
      </div>
      <p className="mt-2 text-slate-400 text-sm">Ask Claude to analyze this client's ads, landing page, offer, tracking, and audience.</p>
      <Textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Why aren't this client's ads converting?" className="mt-4 bg-navy-900 border-white/10 resize-none" data-testid="brain-question" />
      <button onClick={analyze} disabled={loading} className="mt-3 inline-flex items-center gap-2 rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60" data-testid="analyze-btn">
        {loading ? <><Loader2 size={15} className="animate-spin" /> Analyzing…</> : <><Sparkles size={15} /> Analyze with AI</>}
      </button>

      {result && <div className="mt-6" data-testid="brain-result"><Findings data={result} /></div>}

      {history.length > 0 && (
        <div className="mt-8 border-t border-white/5 pt-6">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-500 mb-4">Past analyses</p>
          <div className="space-y-6">
            {history.map((h, i) => (
              <div key={i}>
                {h.question && <p className="text-sm text-slate-500 mb-2 italic">"{h.question}"</p>}
                <Findings data={h.data} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientDocs({ clientId, docs, reload }) {
  const [gen, setGen] = useState(null);

  const generate = async (type) => {
    setGen(type);
    try {
      await api.post("/documents/generate", { client_id: clientId, type });
      toast.success(`${type} generated`);
      reload();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Generation failed");
    } finally { setGen(null); }
  };

  return (
    <div data-testid="client-docs">
      <div className="card-surface rounded-2xl p-6">
        <h2 className="font-heading font-semibold text-lg">Generate a document</h2>
        <p className="mt-1 text-slate-400 text-sm">Claude drafts branded documents from this client's data. Export as PDF.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {["proposal", "contract", "invoice"].map((t) => (
            <button key={t} onClick={() => generate(t)} disabled={!!gen} data-testid={`gen-${t}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white hover:border-electric/60 hover:bg-electric/10 transition-colors disabled:opacity-60 capitalize">
              {gen === t ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />} {t}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {docs.length === 0 ? (
          <p className="text-slate-500 text-sm">No documents yet.</p>
        ) : docs.map((d) => (
          <div key={d.id} className="card-surface rounded-xl p-5 flex items-center justify-between gap-4" data-testid={`doc-${d.id}`}>
            <div>
              <p className="font-heading font-semibold">{d.title}</p>
              <p className="text-xs font-mono uppercase tracking-wider text-slate-500 mt-1">{d.type} · {(d.created_at || "").slice(0, 10)}</p>
            </div>
            <div className="flex items-center gap-3">
              <a href={pdfUrl(d.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-electric hover:text-blue-400 transition-colors" data-testid={`download-${d.id}`}>
                <Download size={15} /> PDF
              </a>
              <button onClick={async () => { await api.delete(`/documents/${d.id}`); reload(); }} className="text-slate-500 hover:text-coral transition-colors" data-testid={`del-doc-${d.id}`}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientTasks({ clientId, tasks, reload }) {
  const [title, setTitle] = useState("");
  const add = async () => {
    if (!title.trim()) return;
    await api.post("/tasks", { title, client_id: clientId, priority: "medium" });
    setTitle("");
    reload();
  };
  const toggle = async (t) => {
    await api.put(`/tasks/${t.id}`, { status: t.status === "done" ? "todo" : "done" });
    reload();
  };
  const remove = async (id) => { await api.delete(`/tasks/${id}`); reload(); };

  return (
    <div className="card-surface rounded-2xl p-6" data-testid="client-tasks">
      <div className="flex gap-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a task…" className="bg-navy-900 border-white/10" data-testid="task-input" />
        <button onClick={add} className="inline-flex items-center gap-2 rounded-full bg-electric px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600" data-testid="add-task-btn"><Plus size={15} /></button>
      </div>
      <ul className="mt-5 space-y-2">
        {tasks.length === 0 && <p className="text-slate-500 text-sm">No tasks yet.</p>}
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 group py-1" data-testid={`task-${t.id}`}>
            <button onClick={() => toggle(t)} className={t.status === "done" ? "text-emerald-400" : "text-slate-500 hover:text-electric"}>
              {t.status === "done" ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>
            <span className={`flex-1 text-sm ${t.status === "done" ? "text-slate-600 line-through" : "text-slate-300"}`}>{t.title}</span>
            {t.priority === "high" && t.status !== "done" && <span className="text-[10px] font-mono uppercase text-coral">high</span>}
            <button onClick={() => remove(t.id)} className="text-slate-600 hover:text-coral opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}
