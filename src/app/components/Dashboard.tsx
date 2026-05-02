import { useEffect, useState } from "react";
import { MapPin, Clock, Trophy, TrendingUp, Calendar as CalIcon, ChevronDown, ChevronUp, Check, X } from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useStore } from "../store";
import { useData } from "../DataContext";
import { PlayerCard } from "./PlayerCard";
import type { Player } from "./data";

function useCountdown(target: string | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  if (!target) return { d: 0, h: 0, m: 0 };
  const diff = Math.max(0, new Date(target).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return { d, h, m };
}

function ScoreDigit({ n, win }: { n: number; win: boolean }) {
  return (
    <div
      className={`w-10 h-12 rounded flex items-center justify-center tabular-nums text-2xl border ${win
          ? "bg-[#007ACC] border-[#1F8AD2] text-white"
          : "bg-[#1E1E1E] border-[#3E3E42] text-[#CCCCCC]"
        }`}
    >
      {n}
    </div>
  );
}

export function Dashboard() {
  const { data } = useData();
  const players = data?.players ?? [];
  const matches = data?.matches ?? [];
  const sessions = data?.sessions ?? [];
  const nextMatch = data?.nextMatch ?? null;

  // 1. Lemos diretamente o MVP do mês anterior que o nosso tradutor calculou
  const currentMonthMVP = data?.lastMonthMVP ?? null;
  const latestSession = sessions[0] as any; // Usar a última sessão (já ordenada DESC) para o resumo do dia

  // 2. Encontramos o jogador para poder abrir o modal. 
  // Removi o "players[0]" para que, se não houver MVP, o site mostre 
  // corretamente "Sem dados" em vez de puxar um jogador aleatório.
  const mvpPlayer: Player | null = currentMonthMVP
    ? players.find((p) => p.name === currentMonthMVP.player) ?? null
    : null;

  const { d, h, m } = useCountdown(nextMatch?.date ?? null);
  const [open, setOpen] = useState<string | null>(null);
  const [showMvp, setShowMvp] = useState(false);
  const { presence, setPresence, navigate, pushNotification } = useStore();
  const nextId = "next";
  const myStatus = presence[nextId];

  const confirmPresence = (v: "in" | "out") => {
    setPresence(nextId, v);
    toast.success(v === "in" ? "Convocação confirmada! 🟢" : "Presença removida");
    if (v === "in" && nextMatch) {
      pushNotification({ title: "Você confirmou presença", body: new Date(nextMatch.date).toLocaleString("pt-BR") });
    }
  };

  const nextDate = nextMatch ? new Date(nextMatch.date) : null;
  const nextDateValid = nextDate && !isNaN(nextDate.getTime()) ? nextDate : null;

  const totalGoals = matches.reduce((acc, mt) => acc + mt.scoreA + mt.scoreB, 0);
  const totalMatches = matches.length;

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[#007ACC]/15 border border-[#007ACC]/40 text-[#4FC3F7] text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#007ACC] animate-pulse" />
            PRÓXIMO JOGO
          </div>
          {nextDateValid && (
            <div className="text-xs text-[#858585] tabular-nums">
              faltam <span className="text-[#CCCCCC]">{d}d {String(h).padStart(2, "0")}h {String(m).padStart(2, "0")}m</span>
            </div>
          )}
        </div>

        <h1 className="text-white text-4xl tracking-tight mb-6">Sábado é dia de bola</h1>

        {nextDateValid ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-md border border-[#3E3E42] bg-[#1E1E1E] p-5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#858585] mb-2">
                  <CalIcon className="w-3.5 h-3.5" /> Data
                </div>
                <div className="text-white text-2xl tracking-tight">{nextDateValid.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</div>
                <div className="text-[#CCCCCC] text-sm mt-0.5">{nextDateValid.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric" })}</div>
              </div>
              <div className="rounded-md border border-[#3E3E42] bg-[#1E1E1E] p-5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#858585] mb-2">
                  <Clock className="w-3.5 h-3.5" /> Horário
                </div>
                <div className="text-white text-2xl tracking-tight tabular-nums">{nextDateValid.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                <div className="text-[#CCCCCC] text-sm mt-0.5">Duração 90 min</div>
              </div>
              <div className="rounded-md border border-[#3E3E42] bg-[#1E1E1E] p-5">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-[#858585] mb-2">
                  <MapPin className="w-3.5 h-3.5" /> Local
                </div>
                <div className="text-white text-2xl tracking-tight">{nextMatch?.location || "A definir"}</div>
                <div className="text-[#CCCCCC] text-sm mt-0.5">{nextMatch?.address || "A definir"}</div>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => confirmPresence("in")}
                className={`px-5 py-2 rounded-md text-sm transition inline-flex items-center gap-2 ${myStatus === "in"
                    ? "bg-[#89D185]/20 border border-[#89D185]/50 text-[#89D185]"
                    : "bg-[#007ACC] text-white hover:bg-[#1F8AD2]"
                  }`}
              >
                <Check className="w-4 h-4" />
                {myStatus === "in" ? "Presença confirmada" : "Confirmar Convocação"}
              </button>
              {myStatus === "in" && (
                <button
                  onClick={() => confirmPresence("out")}
                  className="px-5 py-2 rounded-md border border-[#3E3E42] bg-[#2D2D30] text-[#F48771] text-sm hover:bg-[#3E3E42] transition inline-flex items-center gap-2"
                >
                  <X className="w-4 h-4" /> Cancelar
                </button>
              )}
              <button onClick={() => navigate("calendar")} className="px-5 py-2 rounded-md border border-[#3E3E42] bg-[#2D2D30] text-[#D4D4D4] text-sm hover:bg-[#3E3E42] transition">
                Ver detalhes
              </button>
            </div>
          </>
        ) : (
          <div className="rounded-md border border-[#3E3E42] bg-[#1E1E1E] p-6 text-sm text-[#858585]">
            Nenhuma partida agendada no momento.
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-7 rounded-md border border-[#3E3E42] bg-[#252526] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 text-[#858585] text-xs uppercase tracking-widest">
              <Trophy className="w-4 h-4 text-[#FFD700]" fill="currentColor" /> Melhor do Mês
            </div>
            <span className="text-xs text-[#858585]">{currentMonthMVP?.month || "—"}</span>
          </div>
          {mvpPlayer ? (
            <div className="flex items-center gap-6">
              <button onClick={() => setShowMvp(true)} className="relative shrink-0 group">
                <ImageWithFallback src={mvpPlayer.avatar} alt={mvpPlayer.name} className="w-44 h-44 rounded-md object-cover border border-[#3E3E42] group-hover:border-[#FFD700] transition" />
                <div className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-md bg-[#1E1E1E] border border-[#FFD700]/40 text-[#FFD700] text-xs uppercase tracking-widest">
                  MVP do mês
                </div>
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-white text-3xl tracking-tight">{mvpPlayer.name}</div>
                <div className="text-[#858585] text-sm mt-1">#{mvpPlayer.id}</div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {/* Agora usamos os golos e assistências ESPECÍFICOS do mês, vindos do currentMonthMVP */}
                  <Stat label="Gols" value={currentMonthMVP?.goals || 0} positive />
                  <Stat label="Assist." value={currentMonthMVP?.assists || 0} />
                  {/* Destacamos a nova métrica G+A que definiu o MVP! */}
                  <Stat label="G+A" value={currentMonthMVP?.ga || 0} positive />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#858585]">Sem dados ainda. Configure o Firebase em src/app/firebase.ts.</div>
          )}
        </div>

        <div className="col-span-12 lg:col-span-5 grid grid-cols-2 gap-4">
          <KPI icon={TrendingUp} label="Gols na temporada" value={String(totalGoals)} />
          <KPI icon={Trophy} label="Partidas jogadas" value={String(totalMatches)} />
        </div>
      </div>

      {latestSession && latestSession.mvpName && (
        <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white tracking-tight flex items-center gap-2">
              <CalIcon className="w-5 h-5 text-[#89D185]" /> Resumo da Última Pelada
            </h2>
            <span className="text-xs text-[#858585]">{latestSession.date}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] p-4 col-span-1 md:col-span-2 flex items-center gap-4">
              <ImageWithFallback src={latestSession.mvpIcon || ""} alt={latestSession.mvpName} className="w-16 h-16 rounded-full border-2 border-[#FFD700] object-cover" />
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#FFD700] mb-1 font-bold">MVP do Dia</div>
                <div className="text-white text-xl tracking-tight">{latestSession.mvpName}</div>
              </div>
            </div>
            <div className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] p-4 flex flex-col justify-center">
              <div className="text-[10px] uppercase tracking-widest text-[#858585] mb-1">Média de Gols da Pelada</div>
              <div className="text-white text-2xl tracking-tight">{latestSession.avgGoals || "-"}</div>
            </div>
            <div className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] p-4 flex flex-col justify-center">
              <div className="text-[10px] uppercase tracking-widest text-[#858585] mb-1">Maior Goleada</div>
              <div className="text-white text-2xl tracking-tight">{latestSession.biggestWin || "-"}</div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white tracking-tight">Últimas Partidas</h2>
          <button onClick={() => navigate("history")} className="text-xs text-[#4FC3F7] hover:underline">Ver Histórico</button>
        </div>
        {matches.length === 0 ? (
          <div className="text-sm text-[#858585]">Sem partidas ainda.</div>
        ) : (
          <div className="space-y-2">
            {matches.slice(0, 4).map((mt) => {
              const winA = mt.scoreA > mt.scoreB;
              const winB = mt.scoreB > mt.scoreA;
              const isOpen = open === mt.id;
              return (
                <div key={mt.id} className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] hover:border-[#007ACC]/60 transition">
                  <button
                    onClick={() => setOpen(isOpen ? null : mt.id)}
                    className="w-full flex items-center gap-4 p-4 text-left"
                  >
                    <div className="text-xs text-[#858585] w-20 tabular-nums shrink-0">{new Date(mt.date).toLocaleDateString("pt-BR")}</div>
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
                      <RosterList title={mt.teamA} highlight={winA} players={mt.redRoster.map((r) => r.name)} />
                      <RosterList title={mt.teamB} highlight={winB} players={mt.whiteRoster.map((r) => r.name)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showMvp && mvpPlayer && <PlayerCard player={mvpPlayer} onClose={() => setShowMvp(false)} />}
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

function Stat({ label, value, positive }: { label: string; value: number; positive?: boolean }) {
  return (
    <div className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] px-3 py-2">
      <div className={`text-xl tabular-nums ${positive ? "text-[#89D185]" : "text-white"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[#858585]">{label}</div>
    </div>
  );
}

function KPI({ icon: Icon, label, value, delta }: any) {
  return (
    <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-5">
      <div className="flex items-center justify-between">
        <div className="w-9 h-9 rounded-md bg-[#2D2D30] border border-[#3E3E42] flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#4FC3F7]" />
        </div>
        {delta && <span className="text-xs text-[#89D185] tabular-nums">{delta}</span>}
      </div>
      <div className="mt-4 text-white text-2xl tracking-tight tabular-nums">{value}</div>
      <div className="text-xs text-[#858585] mt-0.5">{label}</div>
    </div>
  );
}
