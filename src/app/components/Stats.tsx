import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Crown, Medal } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { type Player, type Match } from "./data";
import { useData } from "../DataContext";
import { PlayerCard } from "./PlayerCard";

type Key = "ga" | "matches" | "goals" | "assists" | "wins" | "draws" | "losses";
type Period = "season" | "month" | "year" | "custom";

const cols: { key: Key; label: string; help: string }[] = [
  { key: "ga", label: "G+A", help: "Gols + Assistências" },
  { key: "matches", label: "PJ", help: "Partidas Jogadas" },
  { key: "goals", label: "G", help: "Gols" },
  { key: "assists", label: "A", help: "Assistências" },
  { key: "wins", label: "V", help: "Vitórias" },
  { key: "draws", label: "E", help: "Empates" },
  { key: "losses", label: "D", help: "Derrotas" },
];

type AggStats = { matches: number; goals: number; assists: number; wins: number; draws: number; losses: number };

function emptyAgg(): AggStats {
  return { matches: 0, goals: 0, assists: 0, wins: 0, draws: 0, losses: 0 };
}

function val(p: Player & AggStats, k: Key): number {
  if (k === "ga") return p.goals + p.assists;
  return (p as any)[k] as number;
}

function aggregate(matches: Match[], from: Date | null, to: Date | null): Map<string, AggStats> {
  const out = new Map<string, AggStats>();
  const get = (id: string) => {
    let v = out.get(id);
    if (!v) { v = emptyAgg(); out.set(id, v); }
    return v;
  };
  for (const m of matches) {
    const t = new Date(m.date).getTime();
    if (Number.isNaN(t)) continue;
    if (from && t < from.getTime()) continue;
    if (to && t > to.getTime()) continue;
    const redWin = m.scoreA > m.scoreB;
    const whiteWin = m.scoreB > m.scoreA;
    const seen = new Set<string>();
    const apply = (id: string, side: "red" | "white") => {
      if (!id || seen.has(id)) return;
      seen.add(id);
      const s = get(id);
      s.matches += 1;
      if ((side === "red" && redWin) || (side === "white" && whiteWin)) s.wins += 1;
      else if (!redWin && !whiteWin) s.draws += 1;
      else s.losses += 1;
    };
    for (const r of m.redRoster) apply(r.id, "red");
    for (const w of m.whiteRoster) apply(w.id, "white");
    for (const ev of m.events) {
      if (ev.type === "goal" && ev.playerId) get(ev.playerId).goals += 1;
      if (ev.type === "goal" && ev.assistId) get(ev.assistId).assists += 1;
    }
  }
  return out;
}

function startOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0); }
function endOfMonth(d: Date): Date { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }
function startOfYear(d: Date): Date { return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0); }
function endOfYear(d: Date): Date { return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999); }

export function Stats() {
  const { data } = useData();
  const players = data?.players ?? [];
  const matches = data?.matches ?? [];
  const [sortKey, setSortKey] = useState<Key>("ga");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [period, setPeriod] = useState<Period>("season");
  const [customFrom, setCustomFrom] = useState("2026-01-01");
  const [customTo, setCustomTo] = useState("2026-12-31");
  const [selected, setSelected] = useState<Player | null>(null);

  const range = useMemo<{ from: Date | null; to: Date | null }>(() => {
    const now = new Date();
    if (period === "season") return { from: null, to: null };
    if (period === "month") return { from: startOfMonth(now), to: endOfMonth(now) };
    if (period === "year") return { from: startOfYear(now), to: endOfYear(now) };
    const [fy, fm, fd] = customFrom.split("-").map(Number);
    const [ty, tm, td] = customTo.split("-").map(Number);
    return {
      from: new Date(fy, (fm || 1) - 1, fd || 1, 0, 0, 0, 0),
      to: new Date(ty, (tm || 1) - 1, td || 1, 23, 59, 59, 999),
    };
  }, [period, customFrom, customTo]);

  const merged = useMemo<(Player & AggStats)[]>(() => {
    if (period === "season") {
      return players.map((p) => ({ ...p, matches: p.matches, goals: p.goals, assists: p.assists, wins: p.wins, draws: p.draws, losses: p.losses }));
    }
    const agg = aggregate(matches, range.from, range.to);
    return players
      .map((p) => ({ ...p, ...(agg.get(p.id) ?? emptyAgg()) }))
      .filter((p) => p.matches > 0);
  }, [players, matches, range, period]);

  const sorted = useMemo(() => {
    const arr = [...merged].sort((a, b) => {
      const va = val(a, sortKey);
      const vb = val(b, sortKey);
      return sortDir === "desc" ? vb - va : va - vb;
    });
    return arr;
  }, [sortKey, sortDir, merged]);

  const top3 = useMemo(
    () => [...merged].sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists)).slice(0, 3),
    [merged],
  );

  const onSort = (k: Key) => {
    if (sortKey === k) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(k); setSortDir("desc"); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-white tracking-tight text-2xl mb-1">Estatísticas</h1>
        <p className="text-[#858585] text-sm">Classificação geral e desempenho da turma</p>
      </div>

      {players.length === 0 && (
        <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-12 text-center text-[#858585]">
          Sem dados ainda. Configure o Firebase em src/app/firebase.ts.
        </div>
      )}

      <section className="rounded-md border border-[#3E3E42] bg-[#252526] overflow-hidden">
        <div className="p-5 border-b border-[#3E3E42] flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h2 className="text-white tracking-tight text-lg">Classificação Geral</h2>
            <p className="text-xs text-[#858585] mt-0.5">Clique nas legendas para ordenar</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>
        </div>
        {period === "custom" && (
          <div className="px-5 py-3 border-b border-[#3E3E42] bg-[#1E1E1E] flex flex-wrap gap-3 items-center">
            <span className="text-[10px] uppercase tracking-widest text-[#858585]">Período</span>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="px-2 py-1 rounded bg-[#252526] border border-[#3E3E42] text-xs text-[#D4D4D4] focus:outline-none focus:border-[#007ACC]" />
            <span className="text-xs text-[#858585]">até</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="px-2 py-1 rounded bg-[#252526] border border-[#3E3E42] text-xs text-[#D4D4D4] focus:outline-none focus:border-[#007ACC]" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[#858585] text-xs uppercase tracking-widest border-b border-[#3E3E42] bg-[#2D2D30]">
                <th className="px-5 py-3 w-12">#</th>
                <th className="py-3">Jogador</th>
                {cols.map((c) => (
                  <th key={c.key} className="py-3 text-center">
                    <button
                      onClick={() => onSort(c.key)}
                      title={c.help}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded hover:text-white transition ${sortKey === c.key ? "text-[#4FC3F7]" : ""}`}
                    >
                      {c.label}
                      {sortKey === c.key
                        ? (sortDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />)
                        : <ArrowUpDown className="w-3 h-3 opacity-40" />}
                    </button>
                  </th>
                ))}
                <th className="px-5 py-3 text-right">Rating</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="border-b border-[#3E3E42] last:border-b-0 hover:bg-[#2A2D2E] transition cursor-pointer"
                >
                  <td className="px-5 py-3 text-[#858585] tabular-nums">{i + 1}</td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <ImageWithFallback src={p.avatar} alt={p.name} className="w-8 h-8 rounded-md object-cover border border-[#3E3E42]" />
                      <span className="text-[#D4D4D4]">{p.name}</span>
                    </div>
                  </td>
                  {cols.map((c) => {
                    const v = val(p, c.key);
                    const isSorted = sortKey === c.key;
                    return (
                      <td key={c.key} className={`py-3 text-center tabular-nums ${isSorted ? "text-white" : "text-[#CCCCCC]"}`}>
                        {v}
                      </td>
                    );
                  })}
                  <td className="px-5 py-3 text-right">
                    <span className="inline-block px-2.5 py-1 rounded bg-[#1E1E1E] border border-[#3E3E42] text-[#89D185] tabular-nums">{p.rating}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white tracking-tight text-lg">Pódio · Top 3 (G+A)</h2>
          <span className="text-xs text-[#858585]">Temporada</span>
        </div>
        <Podium players={top3} onSelect={setSelected} />
      </section>

      {selected && <PlayerCard player={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function PeriodFilter({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const opts: { id: Period; label: string }[] = [
    { id: "month", label: "Mês" },
    { id: "season", label: "Temporada" },
    { id: "year", label: "Ano" },
    { id: "custom", label: "Personalizado" },
  ];
  return (
    <div className="flex items-center bg-[#1E1E1E] border border-[#3E3E42] rounded-md p-0.5">
      {opts.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1 rounded text-xs ${value === o.id ? "bg-[#007ACC] text-white" : "text-[#CCCCCC] hover:text-white"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Podium({ players, onSelect }: { players: (Player & AggStats)[]; onSelect: (p: Player) => void }) {
  // ordering for visual podium: 2nd, 1st, 3rd
  const order = [players[1], players[0], players[2]].filter(Boolean);
  const heights = ["h-32", "h-44", "h-24"];
  const places = [2, 1, 3];
  const colors = ["#C0C0C0", "#FFD700", "#CD7F32"];

  return (
    <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-8">
      <div className="grid grid-cols-3 gap-4 items-end max-w-3xl mx-auto">
        {order.map((p, idx) => {
          const place = places[idx];
          const color = colors[idx];
          return (
            <button key={p.id} onClick={() => onSelect(p)} className="flex flex-col items-center group">
              <div className="relative">
                {place === 1 && <Crown className="absolute -top-7 left-1/2 -translate-x-1/2 w-7 h-7" style={{ color }} fill="currentColor" />}
                {place !== 1 && <Medal className="absolute -top-2 -right-2 w-6 h-6" style={{ color }} fill="currentColor" />}
                <ImageWithFallback
                  src={p.avatar}
                  alt={p.name}
                  className={`rounded-md object-cover border-2 group-hover:opacity-90 transition ${place === 1 ? "w-28 h-28" : "w-20 h-20"}`}
                  style={{ borderColor: color }}
                />
              </div>
              <div className="mt-3 text-center">
                <div className="text-white tracking-tight">{p.name}</div>
                <div className="text-xs text-[#858585]">G+A</div>
                <div className="text-[#89D185] text-xl tabular-nums">{p.goals + p.assists}</div>
              </div>
              <div
                className={`mt-3 w-full ${heights[idx]} rounded-t-md border border-b-0 border-[#3E3E42] flex items-start justify-center pt-3`}
                style={{ background: `linear-gradient(180deg, ${color}22, transparent)` }}
              >
                <span className="text-3xl tracking-tight" style={{ color }}>{place}º</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
