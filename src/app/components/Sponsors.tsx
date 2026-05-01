import { useState } from "react";
import { ExternalLink, Plus, Handshake, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore, type Sponsor } from "../store";
import { Modal, Field, inputClass } from "./Modal";

const tierConfig: Record<Sponsor["tier"], { color: string; bg: string }> = {
  Diamante: { color: "#4FC3F7", bg: "#4FC3F71A" },
  Ouro: { color: "#FFD700", bg: "#FFD7001A" },
  Prata: { color: "#C0C0C0", bg: "#C0C0C01A" },
  Bronze: { color: "#CD7F32", bg: "#CD7F321A" },
};

export function Sponsors() {
  const { sponsors, addSponsor, removeSponsor } = useStore();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Sponsor["tier"] | "Todos">("Todos");
  const [form, setForm] = useState({ name: "", tier: "Ouro" as Sponsor["tier"], category: "", since: "2026", contribution: "", url: "" });

  const filtered = filter === "Todos" ? sponsors : sponsors.filter((s) => s.tier === filter);

  const submit = () => {
    if (!form.name.trim()) { toast.error("Informe o nome do patrocinador"); return; }
    addSponsor(form);
    toast.success("Patrocinador adicionado!");
    setForm({ name: "", tier: "Ouro", category: "", since: "2026", contribution: "", url: "" });
    setOpen(false);
  };

  const handleDelete = (id: string, name: string) => {
    removeSponsor(id);
    toast(`${name} removido`, { description: "Patrocinador foi excluído da lista" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-white tracking-tight text-2xl mb-1">Patrocinadores</h1>
          <p className="text-[#858585] text-sm">Quem ajuda a nossa pelada a rolar — {sponsors.length} parceiros</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-[#007ACC] text-white text-sm hover:bg-[#1F8AD2] transition">
          <Plus className="w-4 h-4" /> Novo Patrocinador
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {(["Todos", "Diamante", "Ouro", "Prata", "Bronze"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded text-xs ${filter === t ? "bg-[#007ACC] text-white" : "bg-[#2D2D30] text-[#CCCCCC] hover:bg-[#3E3E42] border border-[#3E3E42]"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-12 text-center text-[#858585]">
          Nenhum patrocinador nesse filtro.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const tier = tierConfig[s.tier];
            return (
              <div key={s.id} className="group rounded-md border border-[#3E3E42] bg-[#252526] p-5 hover:border-[#007ACC] transition">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-md flex items-center justify-center border border-[#3E3E42] tracking-tight" style={{ background: `${s.color}1A`, color: s.color }}>
                    {s.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white tracking-tight truncate">{s.name}</div>
                    <div className="text-xs text-[#858585]">{s.category}</div>
                    <div className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest border" style={{ color: tier.color, background: tier.bg, borderColor: `${tier.color}66` }}>
                      {s.tier}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(s.id, s.name)}
                    className="opacity-0 group-hover:opacity-100 transition w-8 h-8 rounded-md bg-[#1E1E1E] border border-[#3E3E42] hover:border-[#F48771] hover:text-[#F48771] text-[#858585] flex items-center justify-center"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-[#3E3E42] space-y-2 text-sm">
                  <div className="flex items-start gap-2 text-[#CCCCCC]">
                    <Handshake className="w-4 h-4 text-[#858585] shrink-0 mt-0.5" />
                    <span>{s.contribution}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#858585]">
                    <span>Desde {s.since}</span>
                    {s.url && s.url !== "#" ? (
                      <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[#4FC3F7] hover:underline">
                        Visitar <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[#858585]">Sem link</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Novo Patrocinador">
        <div className="space-y-4">
          <Field label="Nome">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Bar do João" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Categoria">
              <input className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Bar, Vestuário..." />
            </Field>
            <Field label="Tier">
              <select className={inputClass} value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value as any })}>
                <option>Diamante</option><option>Ouro</option><option>Prata</option><option>Bronze</option>
              </select>
            </Field>
          </div>
          <Field label="Contribuição">
            <input className={inputClass} value={form.contribution} onChange={(e) => setForm({ ...form, contribution: e.target.value })} placeholder="O que oferece à liga" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Desde (ano)">
              <input className={inputClass} value={form.since} onChange={(e) => setForm({ ...form, since: e.target.value })} />
            </Field>
            <Field label="URL (opcional)">
              <input className={inputClass} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://" />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-md border border-[#3E3E42] bg-[#2D2D30] text-[#D4D4D4] text-sm hover:bg-[#3E3E42]">Cancelar</button>
            <button onClick={submit} className="px-4 py-2 rounded-md bg-[#007ACC] text-white text-sm hover:bg-[#1F8AD2]">Adicionar</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
