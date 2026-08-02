import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Send, Loader2, User } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

const SUGGESTIONS = [
  "What should I work on today?",
  "Which client is most likely to cancel?",
  "Who should I upsell next?",
  "What should I automate next?",
];

export default function AICoo() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    api.get("/ai/coo/history").then((r) => setMessages(r.data.messages || [])).catch(() => {});
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (q) => {
    const question = (q ?? input).trim();
    if (!question || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: question }]);
    setLoading(true);
    try {
      const { data } = await api.post("/ai/coo", { question });
      setMessages((m) => [...m, { role: "assistant", content: data.answer }]);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI COO failed");
      setMessages((m) => [...m, { role: "assistant", content: "Sorry — I couldn't process that. Please check the AI connection and try again." }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]" data-testid="ai-coo-page">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-electric/15 ring-1 ring-electric/30"><Bot className="text-electric" size={22} /></span>
        <div>
          <h1 className="font-heading font-black tracking-tighter text-2xl sm:text-3xl">AI COO</h1>
          <p className="text-slate-500 text-sm">Your chief operating officer, powered by Claude.</p>
        </div>
      </div>

      <div className="mt-6 flex-1 overflow-y-auto card-surface rounded-2xl p-5 sm:p-7 space-y-6" data-testid="coo-messages">
        {messages.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <Bot className="text-slate-700" size={44} />
            <p className="mt-4 text-slate-400">Ask me anything about running your agency.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300 hover:border-electric/50 hover:bg-electric/10 transition-colors" data-testid="coo-suggestion">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
            {m.role === "assistant" && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-electric/15"><Bot size={16} className="text-electric" /></span>}
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-electric text-white" : "bg-white/5 text-slate-200 border border-white/5"}`}>
              {m.content}
            </div>
            {m.role === "user" && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10"><User size={16} className="text-slate-300" /></span>}
          </motion.div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-electric/15"><Bot size={16} className="text-electric" /></span>
            <div className="rounded-2xl px-4 py-3 bg-white/5 border border-white/5 text-slate-400 text-sm flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Thinking…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="mt-4 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask your AI COO…"
          data-testid="coo-input"
          className="flex-1 rounded-full bg-navy-800 border border-white/10 px-5 py-3.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-electric/50"
        />
        <button onClick={() => send()} disabled={loading} className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-electric text-white hover:bg-blue-600 disabled:opacity-60 transition-colors" data-testid="coo-send">
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}
