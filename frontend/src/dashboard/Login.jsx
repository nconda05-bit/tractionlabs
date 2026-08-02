import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { LogoMark } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function formatErr(detail) {
  if (!detail) return "Something went wrong.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  return String(detail);
}

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect once auth state is committed (avoids navigate/setState race)
  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      // redirect handled by the effect above
    } catch (err) {
      toast.error(formatErr(err?.response?.data?.detail));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden" data-testid="login-page">
      <div className="absolute inset-0 hero-glow" aria-hidden="true" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="flex flex-col items-center text-center mb-8">
          <LogoMark size={56} />
          <h1 className="mt-5 font-heading font-black tracking-tighter text-3xl">
            Agency <span className="text-electric">OS</span>
          </h1>
          <p className="mt-2 text-slate-400 text-sm">Sign in to your Traction Labs control center.</p>
        </div>

        <form onSubmit={onSubmit} className="card-surface rounded-2xl p-8 space-y-5">
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Email</Label>
            <Input data-testid="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                   placeholder="you@tractionlabs.com" className="bg-navy-900 border-white/10" required />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Password</Label>
            <Input data-testid="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                   placeholder="••••••••" className="bg-navy-900 border-white/10" required />
          </div>
          <button
            type="submit"
            disabled={loading}
            data-testid="login-submit"
            className="group w-full inline-flex items-center justify-center gap-2 rounded-full bg-electric px-7 py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-blue-600 hover:shadow-[0_0_28px_rgba(59,130,246,0.5)] disabled:opacity-60"
          >
            {loading ? <><Loader2 size={17} className="animate-spin" /> Signing in…</> : <>Sign In <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></>}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-500">
          Protected area. Traction Labs staff only.
        </p>
      </motion.div>
    </div>
  );
}
