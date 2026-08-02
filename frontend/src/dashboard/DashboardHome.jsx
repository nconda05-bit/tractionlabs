import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, UserPlus, ListTodo, DollarSign, Inbox, Sparkles, Loader2, CheckCircle2, Zap, ArrowRight,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const STAT_CARDS = [
  { key: "mrr", label: "Monthly Recurring", icon: DollarSign, fmt: (v) => `$${(v || 0).toLocaleString()}`, accent: "text-electric" },
  { key: "active_clients", label: "Active Clients", icon: Users, accent: "text-white" },
  { key: "onboarding_clients", label: "Onboarding", icon: UserPlus, accent: "text-white" },
  { key: "open_tasks", label: "Open Tasks", icon: ListTodo, accent: "text-white" },
  { key: "new_leads", label: "New Leads", icon: Inbox, accent: "text-coral" },
];

export default function DashboardHome() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get("/dashboard");
    setData(data);
  };

  useEffect(() => {
    load();
    api.get("/ai/briefing")
      .then((r) => setBriefing(r.data))
      .catch(() => setBriefing(null))
      .finally(() => setBriefingLoading(false));
  }, []);

  const completeTask = async (id) => {
    await api.put(`/tasks/${id}`, { status: "done" });
    toast.success("Task completed");
    load();
  };

  const stats = data?.stats || {};

  return (
    <div data-testid="dashboard-home">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-electric">Command Center</p>
          <h1 className="mt-2 font-heading font-black tracking-tighter text-3xl sm:text-4xl">
            Welcome back, {user?.name || "Nasir"}.
          </h1>
        </div>
        <Link to="/dashboard/onboard" className="group inline-flex items-center gap-2 rounded-full bg-electric px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-600 hover:shadow-[0_0_24px_rgba(59,130,246,0.4)]" data-testid="quick-onboard">
          <UserPlus size={16} /> Onboard a client
        </Link>
      </div>

      {/* Stat cards */}
      <div className="mt-8 grid grid-cols-2 lg:grid-cols-5 gap-4">
        {STAT_CARDS.map((c, i) => {
          const Icon = c.icon;
          const val = c.fmt ? c.fmt(stats[c.key]) : stats[c.key] ?? "—";
          return (
            <motion.div
              key={c.key}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="card-surface rounded-2xl p-5"
              data-testid={`stat-${c.key}`}
            >
              <div className="flex items-center justify-between">
                <Icon size={18} className="text-slate-500" />
              </div>
              <p className={`mt-3 font-heading text-2xl font-bold ${c.accent}`}>{val}</p>
              <p className="mt-1 text-xs text-slate-500">{c.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        {/* AI Briefing */}
        <div className="lg:col-span-2 card-surface rounded-2xl p-7" data-testid="ai-briefing">
          <div className="flex items-center gap-2 text-electric">
            <Sparkles size={18} />
            <h2 className="font-heading font-semibold text-lg">AI Briefing</h2>
          </div>
          {briefingLoading ? (
            <div className="mt-6 flex items-center gap-2 text-slate-400 text-sm"><Loader2 size={16} className="animate-spin" /> Claude is reviewing your agency…</div>
          ) : briefing ? (
            <>
              <p className="mt-5 text-lg text-white font-heading">{briefing.greeting}</p>
              <ul className="mt-4 space-y-2.5">
                {(briefing.highlights || []).map((h, i) => (
                  <li key={i} className="flex gap-3 text-slate-300 text-sm">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-electric shrink-0" /> {h}
                  </li>
                ))}
              </ul>
              {briefing.next_best_action && (
                <div className="mt-6 rounded-xl border border-coral/30 bg-coral/5 p-5" data-testid="next-best-action">
                  <div className="flex items-center gap-2 text-coral text-xs font-mono uppercase tracking-widest">
                    <Zap size={14} /> Next Best Action
                  </div>
                  <p className="mt-2 font-heading font-semibold text-lg">{briefing.next_best_action.title}</p>
                  <p className="mt-1 text-slate-400 text-sm">{briefing.next_best_action.reason}</p>
                </div>
              )}
            </>
          ) : (
            <p className="mt-6 text-slate-400 text-sm">Briefing unavailable right now.</p>
          )}
          <Link to="/dashboard/coo" className="mt-6 inline-flex items-center gap-2 text-sm text-electric hover:gap-3 transition-all" data-testid="ask-coo-link">
            Ask the AI COO anything <ArrowRight size={15} />
          </Link>
        </div>

        {/* Today's tasks */}
        <div className="card-surface rounded-2xl p-7" data-testid="tasks-today">
          <h2 className="font-heading font-semibold text-lg">Today's Tasks</h2>
          {!data ? (
            <div className="mt-4 text-slate-500 text-sm">Loading…</div>
          ) : (data.tasks_today || []).length === 0 ? (
            <p className="mt-4 text-slate-500 text-sm">Nothing due today. You're clear. 🎯</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.tasks_today.map((t) => (
                <li key={t.id} className="flex items-start gap-3 group">
                  <button onClick={() => completeTask(t.id)} className="mt-0.5 text-slate-500 hover:text-electric transition-colors" data-testid={`complete-task-${t.id}`}>
                    <CheckCircle2 size={18} />
                  </button>
                  <span className="text-sm text-slate-300">{t.title}
                    {t.priority === "high" && <span className="ml-2 text-[10px] font-mono uppercase text-coral">high</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
