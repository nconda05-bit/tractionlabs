import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, CheckCircle2, Target, DollarSign, CalendarCheck, Wallet } from "lucide-react";
import { LogoMark } from "@/components/Logo";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Portal() {
  const { token } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    axios.get(`${API}/portal/${token}`)
      .then((r) => setReport(r.data))
      .catch(() => setError(true));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center px-6" data-testid="portal-error">
        <div>
          <LogoMark size={56} className="mx-auto" />
          <h1 className="mt-6 font-heading font-bold text-2xl">Report not found</h1>
          <p className="mt-2 text-slate-400">This report link may have expired or is incorrect.</p>
        </div>
      </div>
    );
  }
  if (!report) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-electric" size={28} /></div>;
  }

  const c = report.content || {};
  const m = report.metrics || {};
  const METRICS = [
    { label: "Ad Spend", value: `$${(m.spend || 0).toLocaleString()}`, icon: Wallet },
    { label: "Leads", value: m.leads || 0, icon: Target },
    { label: "Cost / Lead", value: `$${m.cpl || 0}`, icon: DollarSign },
    { label: "Appointments", value: m.appointments || 0, icon: CalendarCheck },
    { label: "Revenue", value: `$${(m.revenue || 0).toLocaleString()}`, icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen relative" data-testid="portal-page">
      <div className="grain" aria-hidden="true" />
      <div className="absolute inset-0 hero-glow" aria-hidden="true" />
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-14">
        {/* header */}
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-8">
          <div className="flex items-center gap-3">
            <LogoMark size={44} />
            <div>
              <p className="font-heading font-extrabold">Traction <span className="text-electric">Labs</span></p>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Performance Report</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-heading font-bold text-lg">{report.client_name}</p>
            <p className="text-sm text-slate-500">{report.period}</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-electric">{report.period}</p>
          <h1 className="mt-3 font-heading font-black tracking-tighter text-3xl sm:text-4xl lg:text-5xl">{c.headline}</h1>
          <p className="mt-5 text-slate-300 text-lg leading-relaxed max-w-3xl">{c.summary}</p>
        </motion.div>

        {/* metrics */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-4">
          {METRICS.map((mt, i) => {
            const Icon = mt.icon;
            return (
              <motion.div key={mt.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                className="card-surface rounded-2xl p-5">
                <Icon size={16} className="text-electric" />
                <p className="mt-3 font-heading text-2xl font-bold">{mt.value}</p>
                <p className="mt-1 text-xs text-slate-500">{mt.label}</p>
              </motion.div>
            );
          })}
        </div>

        {c.metrics_narrative && (
          <p className="mt-8 text-slate-300 leading-relaxed border-l-2 border-electric pl-5">{c.metrics_narrative}</p>
        )}

        {/* wins */}
        <div className="mt-12 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="font-heading font-semibold text-xl">This month's wins</h2>
            <ul className="mt-4 space-y-3">
              {(c.wins || []).map((w, i) => (
                <li key={i} className="flex gap-3 text-slate-300"><CheckCircle2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />{w}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-heading font-semibold text-xl">Focus for next month</h2>
            <ul className="mt-4 space-y-3">
              {(c.next_month || []).map((w, i) => (
                <li key={i} className="flex gap-3 text-slate-300"><span className="text-electric mt-0.5">→</span>{w}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/5 text-center text-xs text-slate-500 font-mono">
          Prepared by Traction Labs · AI-powered customer acquisition
        </div>
      </div>
    </div>
  );
}
