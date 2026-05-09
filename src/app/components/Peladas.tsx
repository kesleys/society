import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Search, Calendar as CalendarIcon, Users, Trophy } from "lucide-react";
import { useData } from "../DataContext";
import { Modal } from "./Modal";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

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

export function Peladas() {
  const { data } = useData();
  const sessions = data?.sessions ?? [];
  const matches = data?.matches ?? [];

  const [query, setQuery] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [openMatchId, setOpenMatchId] = useState<string | null>(null);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (query.trim()) {
        const q = query.toLowerCase();
        if (s.title.toLowerCase().includes(q) || s.date.toLowerCase().includes(q)) return true;
        // Search inside session matches
        const sessionMatches = matches.filter(m => m.sessionId === s.id);
        const hasMatch = sessionMatches.some(m => {
          const inTeams = m.teamA.toLowerCase().includes(q) || m.teamB.toLowerCase().includes(q);
          const names = [...m.redRoster, ...m.whiteRoster].map((r) => r.name);
          const inRoster = names.some((p) => p.toLowerCase().includes(q));
          return inTeams || inRoster;
        });
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [query, sessions, matches]);

  const selectedSessionMatches = useMemo(() => {
    if (!selectedSessionId) return [];
    return matches.filter(m => m.sessionId === selectedSessionId);
  }, [selectedSessionId, matches]);

  // Chart 1: Evolução (LineChart)
  const evolutionData = useMemo(() => {
    return [...sessions].reverse().map(s => {
      let goals = (s as any).avgGoals;
      if (goals === undefined) {
        const sessionMatches = matches.filter(m => m.sessionId === s.id);
        const totalGoals = sessionMatches.reduce((acc, m) => acc + m.scoreA + m.scoreB, 0);
        goals = sessionMatches.length ? totalGoals / sessionMatches.length : 0;
      }
      return {
        name: s.date.slice(0, 5), // DD/MM
        "Média de Gols": goals ? Number(Number(goals).toFixed(1)) : 0,
        "Nota Média": (s as any).avgRating ? Number(Number((s as any).avgRating).toFixed(1)) : 0
      };
    }).filter(d => d["Nota Média"] > 0 || d["Média de Gols"] > 0);
  }, [sessions, matches]);

  // Chart 2: Goal Frequency (BarChart)
  const goalFrequencyData = useMemo(() => {
    const buckets = [
      { name: "0-2'", count: 0 },
      { name: "2-4'", count: 0 },
      { name: "4-6'", count: 0 },
      { name: "6-8'", count: 0 },
      { name: "8-10'", count: 0 },
      { name: "10+'", count: 0 },
    ];
    matches.forEach(m => {
      m.events.forEach(e => {
        if (e.type === "goal" && e.time) {
          const minStr = e.time.split(":")[0];
          const min = parseInt(minStr, 10);
          if (!isNaN(min)) {
            if (min < 2) buckets[0].count++;
            else if (min < 4) buckets[1].count++;
            else if (min < 6) buckets[2].count++;
            else if (min < 8) buckets[3].count++;
            else if (min < 10) buckets[4].count++;
            else buckets[5].count++;
          }
        }
      });
    });
    return buckets;
  }, [matches]);

  const globalStats = useMemo(() => {
    if (sessions.length === 0) return { avgGoals: 0, avgPlayers: 0 };
    let totalGoals = 0;
    let totalMatches = 0;
    let totalPlayers = 0;
    sessions.forEach(s => {
      const sessionMatches = matches.filter(m => m.sessionId === s.id);
      totalGoals += sessionMatches.reduce((acc, m) => acc + m.scoreA + m.scoreB, 0);
      totalMatches += sessionMatches.length;
      totalPlayers += s.jogadores || 0;
    });
    return {
      avgGoals: totalMatches ? (totalGoals / totalMatches).toFixed(1) : "0.0",
      avgPlayers: sessions.length ? Math.round(totalPlayers / sessions.length) : 0,
    };
  }, [sessions, matches]);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-white tracking-tight text-2xl mb-1">Peladas</h1>
          <p className="text-[#858585] text-sm">Resumo de estatísticas e sessões anteriores</p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#858585]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por data, jogador..."
            className="w-full pl-9 pr-3 py-2 rounded-md bg-[#3C3C3C] border border-[#3E3E42] text-sm text-[#D4D4D4] placeholder:text-[#858585] focus:outline-none focus:border-[#007ACC]"
          />
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-12 text-center text-[#858585]">
          Sem dados ainda. Configure o Firebase em src/app/firebase.ts.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-5">
              <h3 className="text-white text-sm font-medium mb-4">Evolução Geral da Pelada</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3E3E42" vertical={false} />
                    <XAxis dataKey="name" stroke="#858585" fontSize={11} tickMargin={10} />
                    <YAxis yAxisId="left" stroke="#89D185" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#4FC3F7" fontSize={11} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#3E3E42', color: '#D4D4D4', fontSize: '12px' }}
                      itemStyle={{ color: '#D4D4D4' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px', marginTop: '10px' }} />
                    <Line yAxisId="left" type="monotone" dataKey="Nota Média" stroke="#89D185" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    <Line yAxisId="right" type="monotone" dataKey="Média de Gols" stroke="#4FC3F7" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-5">
              <h3 className="text-white text-sm font-medium mb-4">Frequência de Gols (por minuto)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={goalFrequencyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3E3E42" vertical={false} />
                    <XAxis dataKey="name" stroke="#858585" fontSize={11} tickMargin={10} />
                    <YAxis stroke="#858585" fontSize={11} />
                    <RechartsTooltip 
                      cursor={{ fill: '#3E3E42', opacity: 0.4 }}
                      contentStyle={{ backgroundColor: '#1E1E1E', borderColor: '#3E3E42', color: '#D4D4D4', fontSize: '12px' }}
                    />
                    <Bar dataKey="count" name="Gols" fill="#DCDCAA" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-4 flex items-center gap-3">
               <div className="p-2 rounded bg-[#007ACC]/20 text-[#4FC3F7]"><Trophy className="w-5 h-5" /></div>
               <div>
                 <div className="text-[10px] text-[#858585] uppercase tracking-widest">Média Gols / Partida</div>
                 <div className="text-white text-lg font-semibold">{globalStats.avgGoals}</div>
               </div>
             </div>
             <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-4 flex items-center gap-3">
               <div className="p-2 rounded bg-[#89D185]/20 text-[#89D185]"><Users className="w-5 h-5" /></div>
               <div>
                 <div className="text-[10px] text-[#858585] uppercase tracking-widest">Média Jogadores</div>
                 <div className="text-white text-lg font-semibold">{globalStats.avgPlayers}</div>
               </div>
             </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-white tracking-tight text-lg border-b border-[#3E3E42] pb-2">Sessões Anteriores</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSessions.map((s) => {
                const sessionMatches = matches.filter(m => m.sessionId === s.id);
                let totalGoals = 0;
                sessionMatches.forEach(m => totalGoals += m.scoreA + m.scoreB);
                const avg = sessionMatches.length ? (totalGoals / sessionMatches.length).toFixed(1) : "0.0";
                
                return (
                  <button 
                    key={s.id} 
                    onClick={() => { setSelectedSessionId(s.id); setOpenMatchId(null); }}
                    className="flex flex-col text-left rounded-md bg-[#252526] border border-[#3E3E42] hover:border-[#007ACC]/60 transition p-4 group"
                  >
                    <div className="flex items-start justify-between w-full mb-3">
                      <div>
                        <div className="text-white font-medium group-hover:text-[#4FC3F7] transition-colors">{s.title}</div>
                        <div className="flex items-center gap-1.5 text-xs text-[#858585] mt-1">
                          <CalendarIcon className="w-3 h-3" />
                          {s.date}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#1E1E1E] border border-[#3E3E42] text-[#CCCCCC]">
                        {s.matchCount} partidas
                      </span>
                    </div>
                    
                    <div className="flex gap-4 mt-auto pt-3 border-t border-[#3E3E42] w-full">
                      <div>
                        <div className="text-[10px] text-[#858585] uppercase tracking-widest">Jogadores</div>
                        <div className="text-[#D4D4D4] text-sm tabular-nums">{s.jogadores || "—"}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#858585] uppercase tracking-widest">Média Gols</div>
                        <div className="text-[#D4D4D4] text-sm tabular-nums">{avg}</div>
                      </div>
                      {(s as any).avgRating > 0 && (
                        <div>
                          <div className="text-[10px] text-[#858585] uppercase tracking-widest">Nota Média</div>
                          <div className="text-[#89D185] text-sm tabular-nums">{Number((s as any).avgRating).toFixed(1)}</div>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredSessions.length === 0 && (
              <div className="text-[#858585] text-sm py-4">Nenhuma sessão encontrada.</div>
            )}
          </div>
        </>
      )}

      {selectedSessionId && (
        <Modal 
          open={!!selectedSessionId} 
          onClose={() => setSelectedSessionId(null)} 
          title={sessions.find(s => s.id === selectedSessionId)?.title || "Detalhes da Pelada"} 
          size="lg"
        >
          <div className="space-y-4">
            {selectedSessionMatches.map((mt, idx) => {
              const winA = mt.scoreA > mt.scoreB;
              const winB = mt.scoreB > mt.scoreA;
              const isOpen = openMatchId === mt.id || (selectedSessionMatches.length === 1);
              
              return (
                <div key={mt.id} className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] transition">
                  <button
                    onClick={() => setOpenMatchId(isOpen && selectedSessionMatches.length > 1 ? null : mt.id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-[#252526] rounded-t-md"
                  >
                    <div className="text-xs text-[#858585] w-12 text-center border-r border-[#3E3E42] pr-4">
                      Jogo {idx + 1}
                    </div>
                    <div className="flex-1 flex items-center justify-center gap-3 sm:gap-5 text-sm">
                      <span className={`text-right min-w-[90px] ${winA ? "text-white" : "text-[#858585]"}`}>{mt.teamA}</span>
                      <div className="flex items-center gap-1">
                        <ScoreDigit n={mt.scoreA} win={winA} />
                        <span className="text-[#858585] mx-1">:</span>
                        <ScoreDigit n={mt.scoreB} win={winB} />
                      </div>
                      <span className={`text-left min-w-[90px] ${winB ? "text-white" : "text-[#858585]"}`}>{mt.teamB}</span>
                    </div>
                    {selectedSessionMatches.length > 1 && (
                      isOpen ? <ChevronUp className="w-4 h-4 text-[#858585]" /> : <ChevronDown className="w-4 h-4 text-[#858585]" />
                    )}
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
            {selectedSessionMatches.length === 0 && (
              <div className="text-center text-[#858585] text-sm py-8">Nenhuma partida registrada nesta sessão.</div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
