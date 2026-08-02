import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Building2, ArrowUpRight, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STATUS_STYLES = {
  active: "text-emerald-400 bg-emerald-400/10",
  onboarding: "text-electric bg-electric/10",
  paused: "text-amber-400 bg-amber-400/10",
};

export default function Clients() {
  const [clients, setClients] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ business_name: "", industry: "", contact_name: "", email: "", phone: "", monthly_fee: "" });

  const load = async () => {
    const { data } = await api.get("/clients");
    setClients(data);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.business_name) return toast.error("Business name is required");
    setSaving(true);
    try {
      await api.post("/clients", { ...form, monthly_fee: parseFloat(form.monthly_fee) || 0 });
      toast.success("Client added");
      setOpen(false);
      setForm({ business_name: "", industry: "", contact_name: "", email: "", phone: "", monthly_fee: "" });
      load();
    } catch {
      toast.error("Could not add client");
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div data-testid="clients-page">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-electric">Workspace</p>
          <h1 className="mt-2 font-heading font-black tracking-tighter text-3xl sm:text-4xl">Clients</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <button className="inline-flex items-center gap-2 rounded-full bg-electric px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-600" data-testid="add-client-btn">
              <Plus size={16} /> Add Client
            </button>
          </DialogTrigger>
          <DialogContent className="bg-navy-800 border-white/10 text-white">
            <DialogHeader><DialogTitle className="font-heading">Add a client</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <FieldRow label="Business name *"><Input data-testid="client-business" value={form.business_name} onChange={set("business_name")} className="bg-navy-900 border-white/10" /></FieldRow>
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="Industry"><Input value={form.industry} onChange={set("industry")} className="bg-navy-900 border-white/10" placeholder="HVAC" /></FieldRow>
                <FieldRow label="Monthly fee ($)"><Input type="number" value={form.monthly_fee} onChange={set("monthly_fee")} className="bg-navy-900 border-white/10" /></FieldRow>
              </div>
              <FieldRow label="Contact name"><Input value={form.contact_name} onChange={set("contact_name")} className="bg-navy-900 border-white/10" /></FieldRow>
              <div className="grid grid-cols-2 gap-4">
                <FieldRow label="Email"><Input value={form.email} onChange={set("email")} className="bg-navy-900 border-white/10" /></FieldRow>
                <FieldRow label="Phone"><Input value={form.phone} onChange={set("phone")} className="bg-navy-900 border-white/10" /></FieldRow>
              </div>
              <DialogFooter>
                <button type="submit" disabled={saving} data-testid="save-client-btn" className="inline-flex items-center gap-2 rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Save client
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!clients ? (
        <div className="mt-10 flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin" size={18} /> Loading…</div>
      ) : clients.length === 0 ? (
        <div className="mt-10 card-surface rounded-2xl p-12 text-center" data-testid="clients-empty">
          <Building2 className="mx-auto text-slate-600" size={40} />
          <p className="mt-4 text-slate-300 font-heading text-lg">No clients yet</p>
          <p className="mt-1 text-slate-500 text-sm">Add one manually, or use the Onboarding Wizard to let Claude build a strategy.</p>
          <Link to="/dashboard/onboard" className="mt-5 inline-flex items-center gap-2 text-electric text-sm">Open Onboarding Wizard <ArrowUpRight size={15} /></Link>
        </div>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Link to={`/dashboard/clients/${c.id}`} data-testid={`client-card-${c.id}`} className="group card-surface rounded-2xl p-6 block h-full transition-transform duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-electric/10 ring-1 ring-electric/20 font-heading font-bold text-electric">
                    {c.business_name?.charAt(0) || "C"}
                  </span>
                  <span className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_STYLES[c.status] || "text-slate-400 bg-white/5"}`}>{c.status}</span>
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold group-hover:text-electric transition-colors">{c.business_name}</h3>
                <p className="text-sm text-slate-500">{c.industry || "—"}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-slate-400">${(c.monthly_fee || 0).toLocaleString()}/mo</span>
                  <ArrowUpRight size={16} className="text-slate-600 group-hover:text-electric transition-colors" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, children }) {
  return <div className="space-y-2"><Label className="text-slate-300 text-sm">{label}</Label>{children}</div>;
}
