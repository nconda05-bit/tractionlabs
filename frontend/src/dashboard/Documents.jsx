import { useEffect, useState } from "react";
import { FileText, Download, Trash2, Loader2 } from "lucide-react";
import api, { pdfUrl } from "@/lib/api";
import { toast } from "sonner";

const TYPES = ["all", "proposal", "contract", "invoice"];

export default function Documents() {
  const [docs, setDocs] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    const { data } = await api.get("/documents");
    setDocs(data);
  };
  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    await api.delete(`/documents/${id}`);
    toast.success("Deleted");
    load();
  };

  const filtered = (docs || []).filter((d) => filter === "all" || d.type === filter);

  return (
    <div data-testid="documents-page">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-electric">Document Center</p>
      <h1 className="mt-2 font-heading font-black tracking-tighter text-3xl sm:text-4xl">Documents</h1>
      <p className="mt-2 text-slate-400 text-sm">All AI-generated proposals, contracts, and invoices. Generate new ones from a client's workspace.</p>

      <div className="mt-6 flex gap-2">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setFilter(t)} data-testid={`filter-${t}`}
            className={`rounded-full px-4 py-2 text-xs font-medium capitalize transition-colors ${filter === t ? "bg-electric text-white" : "border border-white/10 text-slate-400 hover:text-white"}`}>
            {t}
          </button>
        ))}
      </div>

      {!docs ? (
        <div className="mt-8 flex items-center gap-2 text-slate-400"><Loader2 className="animate-spin" size={18} /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="mt-8 card-surface rounded-2xl p-12 text-center">
          <FileText className="mx-auto text-slate-600" size={40} />
          <p className="mt-4 text-slate-400 text-sm">No documents yet. Open a client and generate a proposal, contract, or invoice.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {filtered.map((d) => (
            <div key={d.id} className="card-surface rounded-xl p-5 flex items-center justify-between gap-4" data-testid={`doc-row-${d.id}`}>
              <div className="flex items-center gap-4 min-w-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-electric/10 shrink-0"><FileText size={18} className="text-electric" /></span>
                <div className="min-w-0">
                  <p className="font-heading font-semibold truncate">{d.title}</p>
                  <p className="text-xs font-mono uppercase tracking-wider text-slate-500 mt-0.5">
                    {d.type} · {(d.client_snapshot || {}).business_name || "—"} · {(d.created_at || "").slice(0, 10)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <a href={pdfUrl(d.id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-electric hover:text-blue-400 transition-colors" data-testid={`doc-download-${d.id}`}>
                  <Download size={15} /> PDF
                </a>
                <button onClick={() => remove(d.id)} className="text-slate-500 hover:text-coral transition-colors"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
