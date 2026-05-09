import React, { useMemo } from "react";
import { X } from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useData } from "../DataContext";
import type { Player } from "./data";

export function PlayerComparison({ playerA, playerB, onClose }: { playerA: Player; playerB: Player; onClose: () => void }) {
  const { data } = useData();
  const matches = data?.matches || [];
  
  const calcRadar = (p: Player) => {
    const a = p.advanced || { cleanSheets: 0, totalTeamGoals: 0 };
    const games = p.matches || 1;
    const attack = Math.min(100, (p.goals / games) * 100);
    const vision = Math.min(100, (p.assists / games) * 100);
    const defense = Math.min(100, ((a.cleanSheets || 0) / games) * 200);
    const teamGoals = a.totalTeamGoals || 0;
    const indirectGoals = Math.max(0, teamGoals - p.goals - p.assists);
    const tactic = teamGoals > 0 ? (indirectGoals / teamGoals) * 100 : 0;
    const gana = Math.min(100, ((p.wins * 3 + p.draws * 1) / (games * 3)) * 100);
    return { attack, vision, defense, tactic, gana };
  };

  const rA = calcRadar(playerA);
  const rB = calcRadar(playerB);

  const radarData = [
    { subject: 'Ataque', A: rA.attack, B: rB.attack, fullMark: 100 },
    { subject: 'Visão', A: rA.vision, B: rB.vision, fullMark: 100 },
    { subject: 'Defesa', A: rA.defense, B: rB.defense, fullMark: 100 },
    { subject: 'Tática', A: rA.tactic, B: rB.tactic, fullMark: 100 },
    { subject: 'Gana', A: rA.gana, B: rB.gana, fullMark: 100 },
  ];

  const h2h = useMemo(() => {
    let winsA = 0;
    let winsB = 0;
    let draws = 0;
    let total = 0;
    
    for (const m of matches) {
      const aInRed = m.redRoster.some(r => r.id === playerA.id);
      const aInWhite = m.whiteRoster.some(r => r.id === playerA.id);
      const bInRed = m.redRoster.some(r => r.id === playerB.id);
      const bInWhite = m.whiteRoster.some(r => r.id === playerB.id);

      if ((aInRed && bInWhite) || (aInWhite && bInRed)) {
        total++;
        const redWins = m.scoreA > m.scoreB;
        const whiteWins = m.scoreB > m.scoreA;
        
        if (aInRed) {
          if (redWins) winsA++;
          else if (whiteWins) winsB++;
          else draws++;
        } else {
          if (whiteWins) winsA++;
          else if (redWins) winsB++;
          else draws++;
        }
      }
    }
    return { winsA, winsB, draws, total };
  }, [matches, playerA.id, playerB.id]);

  const statRow = (label: string, valA: number, valB: number, inverseObj?: boolean) => {
    let colorA = "text-[#D4D4D4]";
    let colorB = "text-[#D4D4D4]";
    
    if (valA > valB) {
      colorA = inverseObj ? "text-[#F48771]" : "text-[#89D185]";
      colorB = inverseObj ? "text-[#89D185]" : "text-[#F48771]";
    } else if (valB > valA) {
      colorA = inverseObj ? "text-[#89D185]" : "text-[#F48771]";
      colorB = inverseObj ? "text-[#F48771]" : "text-[#89D185]";
    }

    const fmt = (v: number) => Number.isInteger(v) ? v : v.toFixed(1);

    return (
      <div className="flex items-center justify-between py-2.5 border-b border-[#3E3E42]/50 last:border-0 text-sm">
        <div className={`font-semibold tabular-nums w-1/4 text-center ${colorA}`}>{fmt(valA)}</div>
        <div className="flex-1 text-center text-[10px] md:text-[11px] uppercase tracking-widest text-[#858585]">{label}</div>
        <div className={`font-semibold tabular-nums w-1/4 text-center ${colorB}`}>{fmt(valB)}</div>
      </div>
    );
  };

  const getAprov = (p: Player) => ((p.wins * 3 + p.draws * 1) / (Math.max(1, p.matches) * 3)) * 100;
  const getGA = (p: Player) => p.goals + p.assists;
  const getGAPerGame = (p: Player) => getGA(p) / Math.max(1, p.matches);
  const getCards = (p: Player) => (p.advanced?.yellowCards || 0) + (p.advanced?.redCards || 0);

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 md:p-4" onClick={onClose}>
      <div
        className="bg-[#0D1117] border border-[#3E3E42] rounded-xl max-w-md w-full max-h-[95vh] overflow-y-auto shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#0D1117] border-b border-[#3E3E42] p-4 flex items-center gap-4 z-10">
          <button onClick={onClose} className="w-8 h-8 rounded-md bg-[#2D2D30] border border-[#3E3E42] hover:bg-[#3E3E42] flex items-center justify-center shrink-0">
            <X className="w-4 h-4 text-[#CCCCCC]" />
          </button>
          <h2 className="text-white text-lg tracking-tight font-medium text-center flex-1 pr-8">X1 - Comparação</h2>
        </div>

        <div className="p-4 flex flex-col items-center">
          <div className="flex items-center justify-between w-full mb-6">
            <div className="flex items-center gap-3">
              <ImageWithFallback src={playerA.avatar} alt={playerA.name} className="w-10 h-10 md:w-12 md:h-12 rounded-md object-cover border-2 border-[#007ACC]" />
              <span className="text-white font-medium text-sm md:text-base max-w-[80px] md:max-w-[100px] truncate" style={{ color: "#4FC3F7" }}>{playerA.name}</span>
            </div>
            <div className="text-[10px] text-[#858585] uppercase tracking-widest font-bold">VS</div>
            <div className="flex items-center gap-3 flex-row-reverse">
              <ImageWithFallback src={playerB.avatar} alt={playerB.name} className="w-10 h-10 md:w-12 md:h-12 rounded-md object-cover border-2 border-[#F48771]" />
              <span className="text-white font-medium text-sm md:text-base max-w-[80px] md:max-w-[100px] truncate text-right" style={{ color: "#F48771" }}>{playerB.name}</span>
            </div>
          </div>

          <div className="w-full rounded-xl bg-[#161B22] border border-[#3E3E42] mb-6">
            <div className="h-64 flex items-center justify-center p-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#3E3E42" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#858585', fontSize: 10 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name={playerA.name} dataKey="A" stroke="#4FC3F7" strokeWidth={2} fill="#4FC3F7" fillOpacity={0.4} />
                  <Radar name={playerB.name} dataKey="B" stroke="#F48771" strokeWidth={2} fill="#F48771" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="w-full rounded-xl bg-[#161B22] border border-[#3E3E42] overflow-hidden">
            <div className="bg-[#1E242D] border-b border-[#3E3E42] py-3 text-center text-white text-sm font-medium tracking-tight">
              Estatísticas Frente a Frente
            </div>
            <div className="p-4">
              <div className="text-center text-[#858585] text-[11px] uppercase tracking-widest mb-4">Confronto Direto</div>
              <div className="flex items-center justify-between mb-2">
                <div className={`text-2xl font-bold tabular-nums ${h2h.winsA > h2h.winsB ? "text-[#89D185]" : h2h.winsA < h2h.winsB ? "text-[#F48771]" : "text-[#4FC3F7]"}`}>{h2h.winsA}</div>
                <div className="text-[#858585] text-sm">Vitórias Diretas</div>
                <div className={`text-2xl font-bold tabular-nums ${h2h.winsB > h2h.winsA ? "text-[#89D185]" : h2h.winsB < h2h.winsA ? "text-[#F48771]" : "text-[#4FC3F7]"}`}>{h2h.winsB}</div>
              </div>
              <div className="text-center text-[#858585] text-xs pb-4 border-b border-[#3E3E42] mb-2">
                Empates: {h2h.draws} / Total: {h2h.total} confrontos
              </div>

              {statRow("Jogos Totais", playerA.matches, playerB.matches)}
              {statRow("Nota Média", playerA.rating, playerB.rating)}
              {statRow("Aproveitamento (%)", getAprov(playerA), getAprov(playerB))}
              {statRow("Participações (G+A)", getGA(playerA), getGA(playerB))}
              {statRow("G+A / Jogo", getGAPerGame(playerA), getGAPerGame(playerB))}
              {statRow("Gols", playerA.goals, playerB.goals)}
              {statRow("Assistências", playerA.assists, playerB.assists)}
              {statRow("Vitórias", playerA.wins, playerB.wins)}
              {statRow("Clean Sheets", playerA.advanced?.cleanSheets || 0, playerB.advanced?.cleanSheets || 0)}
              {statRow("Gols Contra", playerA.advanced?.ownGoals || 0, playerB.advanced?.ownGoals || 0, true)}
              {statRow("Cartões", getCards(playerA), getCards(playerB), true)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
