import { useEffect, useState, useCallback } from "react";
import { Brain, Loader2, Trash2, Sparkles, MessageSquareQuote, Heart, Gift, Trophy, ShieldAlert } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const KIND_META = {
  winning_hooks: { label: "Winning hooks", icon: Sparkles, color: "text-electric", bg: "bg-electric/5", border: "border-electric/25" },
  winning_emotions: { label: "Emotions that convert", icon: Heart, color: "text-coral", bg: "bg-coral/5", border: "border-coral/25" },
  winning_offers: { label: "Offers that convert", icon: Gift, color: "text-emerald-400", bg: "bg-emerald-400/5", border: "border-emerald-400/25" },
  winning_angles: { label: "Winning angles", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-400/5", border: "border-yellow-400/25" },
  customer_language: { label: "Real customer language", icon: MessageSquareQuote, color: "text-purple-300", bg: "bg-purple-500/5", border: "border-purple-500/25" },
  objections: { label: "Objections handled", icon: ShieldAlert, color: "text-orange-400", bg: "bg-orange-400/5", border: "border-orange-400/25" },
};

export default function Intelligence() {
  const [industries, setIndustries] = useState([]);
  const [industry, setIndustry] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadIndustries = useCallback(async () => {
    const { data } = await api.get("/intelligence/industries");
    setIndustries(data.filter(Boolean));
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const q = industry ? `?industry=${encodeURIComponent(industry)}` : "";
      const { data } = await api.get(`/intelligence${q}`);
      setEntries(data);
    } catch { toast.error("Could not load intelligence"); }
    finally { setLoading(false); }
  }, [industry]);

  useEffect(() => { loadIndustries(); }, [loadIndustries]);
  useEffect(() => { loadEntries(); }, [loadEntries]);

  const remove = async (id) => {
    await api.delete(`/intelligence/${id}`);
    setEntries((all) => all.filter((e) => e.id !== id));
  };

  const grouped = entries.reduce((acc, e) => {
    (acc[e.kind] = acc[e.kind] || []).push(e);
    return acc;
  }, {});

  return (
    <div data-testid="intelligence-page">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-electric/10 ring-1 ring-electric/20 text-electric">
          <Brain size={22} />
        </div>
        <div>
          <h1 className="font-heading font-black tracking-tighter text-3xl">Traction Labs Intelligence</h1>
          <p className="mt-1 text-slate-400 text-sm max-w-2xl">
            The shared brain. Every time a campaign is marked WON, its winning hooks, emotions, offers, angles, customer language and objections are pushed here — and every AI agent (Ad Creator, Batch Spy, Ad Intel, Campaign Engine) reads from here before generating anything new. The system gets smarter with every client.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button onClick={() => setIndustry("")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${industry === "" ? "bg-electric/20 text-white ring-1 ring-electric/40" : "border border-white/10 text-slate-400 hover:text-white hover:border-white/30"}`}
          data-testid="intel-industry-all">All industries</button>
        {industries.map((ind) => (
          <button key={ind} onClick={() => setIndustry(ind)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors ${industry === ind ? "bg-electric/20 text-white ring-1 ring-electric/40" : "border border-white/10 text-slate-400 hover:text-white hover:border-white/30"}`}
            data-testid={`intel-industry-${ind}`}>{ind}</button>
        ))}
      </div>

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin" size={18} /> Loading brain…</div>
      ) : entries.length === 0 ? (
        <div className="mt-10 card-surface rounded-2xl p-10 text-center">
          <Brain size={32} className="mx-auto text-slate-600" />
          <p className="mt-3 text-slate-400 text-sm">No learnings yet. Build a campaign in the Campaign Engine and mark it "Won" to feed the brain.</p>
        </div>
      ) : (
        <div className="mt-6 grid md:grid-cols-2 gap-5">
          {Object.entries(KIND_META).map(([kind, meta]) => {
            const items = grouped[kind] || [];
            if (!items.length) return null;
            const Icon = meta.icon;
            return (
              <div key={kind} className={`rounded-2xl border ${meta.border} ${meta.bg} p-5`} data-testid={`intel-group-${kind}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon size={16} className={meta.color} />
                  <p className={`font-heading font-semibold text-sm ${meta.color}`}>{meta.label}</p>
                  <span className="text-[10px] font-mono uppercase text-slate-500 ml-1">{items.length}</span>
                </div>
                <ul className="space-y-1.5">
                  {items.map((e) => (
                    <li key={e.id} className="group flex items-start gap-2 text-sm text-slate-300" data-testid={`intel-entry-${e.id}`}>
                      <span className="mt-1 text-slate-600">·</span>
                      <span className="flex-1">{e.value}</span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">×{e.weight}</span>
                      <button onClick={() => remove(e.id)} className="text-slate-600 hover:text-coral opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
