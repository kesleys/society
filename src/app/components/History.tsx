import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { useData } from "../DataContext";

function ScoreDigit({ n, win }: { n: number; win: boolean }) {
  return (
    <div
      className={`w-10 h-12 rounded flex items-center justify-center tabular-nums text-2xl border ${
        win
          ? "bg-[#007ACC] border-[#1F8AD2] text-white"
          : "bg-[#1E1E1E] border-[#3E3E42] text-[#CCCCCC]"
      }`}
    >
      {n}
    </div>
  );
}

function RosterList({ title, players, highlight }: { title: string; players: string[]; highlight: boolean }) {
  return (
    <div className="rounded-md bg-[#252526] border border-[#3E3E42] p-3">
      <div className={`text-xs uppercase tracking-widest mb-2 ${highlight ? "text-[#89D185]" : "text-[#858585]"}`}>{title}</div>
      <ul className="space-y-1">
        {players.map((p) => (
          <li key={p} className="flex items-center gap-2 text-sm text-[#D4D4D4]">
            <span className="w-1 h-1 rounded-full bg-[#3E3E42]" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MatchEventsList({ events, team }: { events: any[]; team: "Vermelho" | "Branco" }) {
  const teamEvents = events.filter((e) => e.team === team);
  if (teamEvents.length === 0) return null;

  return (
    <div className="mt-4 border-t border-[#3E3E42]/50 pt-3">
      <div className="text-xs uppercase tracking-widest text-[#858585] mb-2">Eventos da Partida</div>
      <ul className="space-y-2">
        {teamEvents.map((e, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-[#D4D4D4]">
            <span className="text-[#858585] w-10 shrink-0 tabular-nums">{e.time || ""}</span>
            <div>
              <div className="flex items-center gap-1.5">
                {e.type === "goal" && <span className="text-[#DCDCAA]">⚽</span>}
                {e.type === "own_goal" && <span className="text-red-400">⚽ (Contra)</span>}
                {e.type === "yellow_card" && <span className="text-yellow-400">🟨</span>}
                {e.type === "red_card" && <span className="text-red-500">🟥</span>}
                <span className="font-medium text-white">{e.player}</span>
              </div>
              {e.type === "goal" && e.assist && (
                <div className="text-xs text-[#858585] ml-5">Assistência: {e.assist}</div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function History() {
  const { data } = useData();
  const matches = data?.matches ?? [];

  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const allMonths = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      const d = new Date(m.date);
      if (isNaN(d.getTime())) return;
      set.add(`${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`);
    });
    return Array.from(set).sort().reverse();
  }, [matches]);

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      const d = new Date(m.date);
      const mk = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (monthFilter !== "all" && mk !== monthFilter) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        const names = [...m.redRoster, ...m.whiteRoster].map((r) => r.name);
        const inRoster = names.some((p) => p.toLowerCase().includes(q));
        const inTeams = m.teamA.toLowerCase().includes(q) || m.teamB.toLowerCase().includes(q);
        if (!inRoster && !inTeams) return false;
      }
      return true;
    });
  }, [query, monthFilter, matches]);

  const groupedByMonth = filtered.reduce<Record<string, Record<string, typeof filtered>>>((acc, m) => {
    const date = new Date(m.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
    const dayKey = m.date.slice(0, 10);
    if (!acc[monthKey]) acc[monthKey] = {};
    if (!acc[monthKey][dayKey]) acc[monthKey][dayKey] = [];
    acc[monthKey][dayKey].push(m);
    return acc;
  }, {});

  const sortedMonths = Object.keys(groupedByMonth).sort().reverse();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-white tracking-tight text-2xl mb-1">Histórico de Partidas</h1>
          <p className="text-[#858585] text-sm">Todas as peladas da turma — {filtered.length} resultado(s)</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#858585]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar jogador ou time..."
              className="pl-9 pr-3 py-2 rounded-md bg-[#3C3C3C] border border-[#3E3E42] text-sm text-[#D4D4D4] placeholder:text-[#858585] focus:outline-none focus:border-[#007ACC]"
            />
          </div>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 rounded-md bg-[#3C3C3C] border border-[#3E3E42] text-sm text-[#D4D4D4] focus:outline-none focus:border-[#007ACC]"
          >
            <option value="all">Todos os meses</option>
            {allMonths.map((mk) => {
              const [y, mo] = mk.split("-").map(Number);
              return <option key={mk} value={mk}>{monthNames[mo]} {y}</option>;
            })}
          </select>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-12 text-center text-[#858585]">
          Sem dados ainda. Configure o Firebase em src/app/firebase.ts.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-12 text-center text-[#858585]">
          Nenhuma partida encontrada com esses filtros.
        </div>
      ) : null}

      <div className="space-y-8">
        {sortedMonths.map((monthKey) => {
          const [y, mo] = monthKey.split("-").map(Number);
          const days = groupedByMonth[monthKey];
          const sortedDays = Object.keys(days).sort().reverse();

          return (
            <section key={monthKey}>
              <div className="flex items-baseline gap-3 mb-3 pb-2 border-b border-[#3E3E42]">
                <h2 className="text-white tracking-tight text-lg">{monthNames[mo]}</h2>
                <span className="text-sm text-[#858585] tabular-nums">{y}</span>
                <span className="ml-auto text-xs text-[#858585]">{Object.values(days).flat().length} partida(s)</span>
              </div>

              <div className="space-y-5">
                {sortedDays.map((day) => {
                  const [yy, mm, dd] = day.split("-").map(Number);
                  const date = new Date(yy, (mm || 1) - 1, dd || 1, 12);
                  const dayLabel = date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
                  return (
                    <div key={day}>
                      <div className="text-xs uppercase tracking-widest text-[#858585] mb-2 px-1">{dayLabel}</div>
                      <div className="space-y-2">
                        {days[day].map((mt) => {
                          const winA = mt.scoreA > mt.scoreB;
                          const winB = mt.scoreB > mt.scoreA;
                          const isOpen = open === mt.id;
                          return (
                            <div key={mt.id} className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] hover:border-[#007ACC]/60 transition">
                              <button
                                onClick={() => setOpen(isOpen ? null : mt.id)}
                                className="w-full flex items-center gap-4 p-4 text-left"
                              >
                                <div className="flex-1 flex items-center justify-center gap-3 sm:gap-5 text-sm">
                                  <span className={`text-right min-w-[90px] ${winA ? "text-white" : "text-[#858585]"}`}>{mt.teamA}</span>
                                  <div className="flex items-center gap-1">
                                    <ScoreDigit n={mt.scoreA} win={winA} />
                                    <span className="text-[#858585] mx-1">:</span>
                                    <ScoreDigit n={mt.scoreB} win={winB} />
                                  </div>
                                  <span className={`text-left min-w-[90px] ${winB ? "text-white" : "text-[#858585]"}`}>{mt.teamB}</span>
                                </div>
                                {isOpen ? <ChevronUp className="w-4 h-4 text-[#858585]" /> : <ChevronDown className="w-4 h-4 text-[#858585]" />}
                              </button>
                              {isOpen && (
                                <div className="border-t border-[#3E3E42] p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <RosterList title={mt.teamA} highlight={winA} players={mt.redRoster.map((r) => r.name)} />
                                    <MatchEventsList events={mt.events} team="Vermelho" />
                                  </div>
                                  <div>
                                    <RosterList title={mt.teamB} highlight={winB} players={mt.whiteRoster.map((r) => r.name)} />
                                    <MatchEventsList events={mt.events} team="Branco" />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
