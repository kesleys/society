import { useState, useMemo } from "react";
import { Shield, Search } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { type Player } from "./data";
import { useData } from "../DataContext";
import { PlayerCard } from "./PlayerCard";

type Sort = "rating" | "goals" | "assists" | "matches" | "name";

export function Members() {
  const { data } = useData();
  const players = data?.players ?? [];
  const [selected, setSelected] = useState<Player | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("rating");

  const list = useMemo(() => {
    let arr = [...players];
    if (query.trim()) arr = arr.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
    arr.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      return (b as any)[sort] - (a as any)[sort];
    });
    return arr;
  }, [query, sort, players]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-white tracking-tight text-2xl mb-1">Plantel</h1>
          <p className="text-[#858585] text-sm">{list.length} de {players.length} jogadores</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#858585]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar jogador..."
              className="pl-9 pr-3 py-2 rounded-md bg-[#3C3C3C] border border-[#3E3E42] text-sm text-[#D4D4D4] placeholder:text-[#858585] focus:outline-none focus:border-[#007ACC]"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="px-3 py-2 rounded-md bg-[#3C3C3C] border border-[#3E3E42] text-sm text-[#D4D4D4] focus:outline-none focus:border-[#007ACC]"
          >
            <option value="rating">Ordenar: Rating</option>
            <option value="goals">Ordenar: Gols</option>
            <option value="assists">Ordenar: Assistências</option>
            <option value="matches">Ordenar: Partidas</option>
            <option value="name">Ordenar: Nome</option>
          </select>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-12 text-center text-[#858585]">
          Sem dados ainda. Configure o Firebase em src/app/firebase.ts.
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-12 text-center text-[#858585]">
          Nenhum jogador encontrado para "{query}".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="text-left rounded-md border border-[#3E3E42] bg-[#252526] p-5 hover:border-[#007ACC] transition-colors"
            >
              <div className="flex items-start justify-between">
                <ImageWithFallback src={p.avatar} alt={p.name} className="w-16 h-16 rounded-md object-cover border border-[#3E3E42]" />
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#1E1E1E] border border-[#3E3E42]">
                  <Shield className="w-3 h-3 text-[#89D185]" />
                  <span className="text-[#89D185] text-xs tabular-nums">{p.rating}</span>
                </div>
              </div>
              <div className="mt-4 text-white tracking-tight">{p.name}</div>
              <div className="text-[10px] uppercase tracking-widest text-[#858585] mt-0.5">#{p.id}</div>
              <div className="mt-4 pt-4 border-t border-[#3E3E42] grid grid-cols-3 gap-2 text-center">
                <div><div className="text-[#D4D4D4] tabular-nums">{p.matches}</div><div className="text-[10px] text-[#858585] uppercase tracking-widest">PJ</div></div>
                <div><div className="text-[#D4D4D4] tabular-nums">{p.goals}</div><div className="text-[10px] text-[#858585] uppercase tracking-widest">Gols</div></div>
                <div><div className="text-[#D4D4D4] tabular-nums">{p.assists}</div><div className="text-[10px] text-[#858585] uppercase tracking-widest">Assist.</div></div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <PlayerCard player={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
