import { useEffect, useState, useCallback } from "react";
import { Image as ImageIcon, Video, Search, Copy, Trash2, Loader2, Sparkles, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const KINDS = ["all", "image", "video"];

export default function CreativeLibrary() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");

  const load = useCallback(async () => {
    const params = {};
    if (q) params.q = q;
    if (kind !== "all") params.kind = kind;
    const { data } = await api.get("/creatives", { params });
    setItems(data);
  }, [q, kind]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const remove = async (id) => {
    await api.delete(`/creatives/${id}`);
    toast.success("Removed from library");
    load();
  };

  return (
    <div data-testid="creative-library">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-electric">Creative Library</p>
      <h1 className="mt-2 font-heading font-black tracking-tighter text-3xl sm:text-4xl">Every asset you've made</h1>
      <p className="mt-2 text-slate-400 text-sm">All AI-generated images and videos, searchable by prompt and filterable by client. Reuse them in future campaigns.</p>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search prompts… (e.g. 'roof', 'summer')" className="bg-navy-800 border-white/10 pl-10" data-testid="library-search" />
        </div>
        <div className="flex gap-2">
          {KINDS.map((k) => (
            <button key={k} onClick={() => setKind(k)} data-testid={`library-filter-${k}`}
              className={`rounded-full px-4 py-2 text-xs font-medium capitalize transition-colors ${kind === k ? "bg-electric text-white" : "border border-white/10 text-slate-400 hover:text-white"}`}>
              {k}
            </button>
          ))}
        </div>
      </div>

      {!items ? (
        <div className="mt-10 flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin" size={18} /> Loading…</div>
      ) : items.length === 0 ? (
        <div className="mt-10 card-surface rounded-2xl p-12 text-center" data-testid="library-empty">
          <Sparkles className="mx-auto text-slate-600" size={40} />
          <p className="mt-4 text-slate-300 font-heading text-lg">Your library is empty</p>
          <p className="mt-1 text-slate-500 text-sm">Generate images or videos from any client's Ad Creator tab — they'll be saved here automatically.</p>
        </div>
      ) : (
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="library-grid">
          {items.map((it) => (
            <div key={it.id} className="card-surface rounded-2xl overflow-hidden group" data-testid={`creative-${it.id}`}>
              <div className="relative bg-navy-900 aspect-square flex items-center justify-center overflow-hidden">
                {it.kind === "video"
                  ? <video src={it.media_url} controls className="w-full h-full object-cover" />
                  : <img src={it.media_url} alt={it.prompt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />}
                <span className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-white">
                  {it.kind === "video" ? <Video size={11} /> : <ImageIcon size={11} />} {it.kind}
                </span>
              </div>
              <div className="p-4">
                {it.client_name && <p className="text-xs font-mono uppercase tracking-wider text-electric">{it.client_name}</p>}
                <p className="mt-1.5 text-sm text-slate-300 line-clamp-2">{it.prompt}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">{(it.created_at || "").slice(0, 10)}</span>
                  <div className="flex items-center gap-3">
                    <a href={it.media_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-electric" title="Open"><ExternalLink size={15} /></a>
                    <button onClick={() => { navigator.clipboard?.writeText(it.media_url); toast.success("URL copied"); }} className="text-slate-500 hover:text-electric" title="Copy URL"><Copy size={15} /></button>
                    <button onClick={() => remove(it.id)} className="text-slate-500 hover:text-coral" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
