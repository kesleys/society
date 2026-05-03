import React, { useState, useMemo } from "react";
import {
  X, Flame, Handshake, Dribbble, Users, ThumbsUp, ThumbsDown,
  Smile, Frown, Scale, Shield, Trophy, TrendingDown, Activity,
  AlertTriangle, AlertOctagon, Goal, Info
} from "lucide-react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useData } from "../DataContext";
import type { Player, PlayerAdvanced } from "./data";

function MainStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] p-4 relative group">
      <div className="text-3xl tabular-nums tracking-tight" style={{ color: color || "#FFFFFF" }}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-[#858585] mt-1">{label}</div>
    </div>
  );
}

function AdvRow({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#3E3E42] last:border-b-0">
      <div className="w-9 h-9 rounded-md bg-[#1E1E1E] border border-[#3E3E42] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#4FC3F7]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] uppercase tracking-widest text-[#858585]">{label}</div>
        <div className="text-[#D4D4D4] truncate">{value}</div>
      </div>
      {sub && <div className="text-xs text-[#858585] tabular-nums shrink-0">{sub}</div>}
    </div>
  );
}

const EMPTY_BUCKET = { name: "—", count: 0 };
const EMPTY_ADV: PlayerAdvanced = {
  topAssisted: EMPTY_BUCKET,
  topAssister: EMPTY_BUCKET,
  mostPlayedWith: EMPTY_BUCKET,
  mostWinsWith: EMPTY_BUCKET,
  mostLossesWith: EMPTY_BUCKET,
  mostPlayedAgainst: EMPTY_BUCKET,
  mostWinsAgainst: EMPTY_BUCKET,
  mostLossesAgainst: EMPTY_BUCKET,
  mostDrawsAgainst: EMPTY_BUCKET,
  hatTricks: 0,
  cleanSheets: 0,
  ownGoals: 0,
  yellowCards: 0,
  redCards: 0,
  biggestWinScore: "—",
  biggestLossScore: "—",
  maxUnbeatenStreak: 0,
  totalTeamGoals: 0,
};

export function PlayerCard({ player, onClose }: { player: Player; onClose: () => void }) {
  const { data } = useData();
  const rules = data?.ratingRules;
  const [showRatingBreakdown, setShowRatingBreakdown] = useState(false);
  const [showRadarInfo, setShowRadarInfo] = useState(false);
  const [evolutionFilter, setEvolutionFilter] = useState<'all' | 'last10' | 'months'>('last10');

  const a = player.advanced ?? EMPTY_ADV;
  const ga = player.goals + player.assists;

  // Radar Chart calculations matching Flutter's player_detail.dart
  const games = player.matches || 1;
  const attackScore = Math.min(100, (player.goals / games) * 100);
  const visionScore = Math.min(100, (player.assists / games) * 100);
  const defenseScore = Math.min(100, ((a.cleanSheets || 0) / games) * 200);
  const teamGoals = a.totalTeamGoals || 0;
  const indirectGoals = Math.max(0, teamGoals - player.goals - player.assists);
  const tacticScore = teamGoals > 0 ? (indirectGoals / teamGoals) * 100 : 0;
  const ganaScore = Math.min(100, ((player.wins * 3 + player.draws * 1) / (games * 3)) * 100);

  const radarData = [
    { subject: 'Ataque', A: attackScore, fullMark: 100 },
    { subject: 'Visão', A: visionScore, fullMark: 100 },
    { subject: 'Defesa', A: defenseScore, fullMark: 100 },
    { subject: 'Tática', A: tacticScore, fullMark: 100 },
    { subject: 'Gana', A: ganaScore, fullMark: 100 },
  ];

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    if (dateStr.length === 7) {
      const [year, month] = dateStr.split('-');
      return `${month}/${year.slice(2)}`;
    }
    if (dateStr.length === 10) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}`;
    }
    return dateStr;
  };

  // Evolution Chart Logic
  const evolutionChartData = useMemo(() => {
    const rawChart: {date: string, nota: number}[] = (player as any).evolution_chart || [];
    if (!rawChart || rawChart.length === 0) return [];
    
    if (evolutionFilter === 'all') {
      return rawChart;
    } else if (evolutionFilter === 'last10') {
      return rawChart.slice(-10);
    } else if (evolutionFilter === 'months') {
      const monthly: Record<string, { sum: number, count: number }> = {};
      rawChart.forEach(item => {
        const month = item.date.substring(0, 7); // YYYY-MM
        if (!monthly[month]) monthly[month] = { sum: 0, count: 0 };
        monthly[month].sum += item.nota;
        monthly[month].count += 1;
      });
      const sortedMonths = Object.keys(monthly).sort();
      const last12 = sortedMonths.slice(-12);
      return last12.map(m => ({
        date: m,
        nota: monthly[m].sum / monthly[m].count
      }));
    }
    return rawChart;
  }, [player, evolutionFilter]);

  // Breakdown Rating Math: replaced by static legend matching the app
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#252526] border border-[#3E3E42] rounded-md max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[#252526] border-b border-[#3E3E42] p-5 flex items-center gap-4 z-10">
          <ImageWithFallback src={player.avatar} alt={player.name} className="w-14 h-14 rounded-md object-cover border border-[#3E3E42]" />
          <div className="flex-1 min-w-0">
            <div className="text-white text-xl tracking-tight">{player.name}</div>
            <div className="flex items-center gap-2 text-xs text-[#858585] mt-1 relative">
              <span>#{player.id.slice(0, 8)}</span>
              <span>·</span>
              <span className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors"
                    onMouseEnter={() => setShowRatingBreakdown(true)}
                    onMouseLeave={() => setShowRatingBreakdown(false)}>
                <span>Rating <strong className="text-[#89D185] tabular-nums">{player.rating.toFixed(1)}</strong></span>
                <Info className="w-3 h-3 text-[#4FC3F7]" />
              </span>
              <span>·</span>
              <span>Jogos <strong className="text-[#D4D4D4] tabular-nums">{player.matches}</strong></span>
              
              {/* RATING BREAKDOWN POPUP */}
              {showRatingBreakdown && (
                <div className="absolute top-full left-10 mt-2 w-72 bg-[#252526] border border-[#3E3E42] p-4 rounded-md shadow-2xl z-50 text-xs text-[#D4D4D4]">
                  <div className="font-bold text-white mb-2 pb-1 border-b border-[#3E3E42]">Composição da Nota</div>
                  <div className="mb-3 text-[#858585] text-[10px] leading-relaxed">
                    A sua nota é a média do seu desempenho em todas as partidas jogadas. Cada partida começa com uma Nota Base e sofre ajustes com base nos seus eventos em campo:
                  </div>
                  <div className="flex justify-between py-1"><span>Nota Base</span><span className="text-white">{rules?.base ?? "6.5"}</span></div>
                  <div className="flex justify-between py-1"><span>Gol Feito</span><span className="text-[#89D185]">+{rules?.goal ?? "0.9"}</span></div>
                  <div className="flex justify-between py-1"><span>Assistência</span><span className="text-[#89D185]">+{rules?.assist ?? "0.8"}</span></div>
                  <div className="flex justify-between py-1"><span>Vitória</span><span className="text-[#89D185]">+{rules?.win ?? "1.5"}</span></div>
                  <div className="flex justify-between py-1"><span>Derrota</span><span className="text-[#F48771]">{rules?.loss ?? "-1.5"}</span></div>
                  <div className="flex justify-between py-1"><span>Cartão Amarelo</span><span className="text-[#DCDCAA]">{rules?.yellow ?? "-1.0"}</span></div>
                  <div className="flex justify-between py-1"><span>Cartão Vermelho</span><span className="text-[#F48771]">{rules?.red ?? "-2.0"}</span></div>
                  <div className="flex justify-between py-1"><span>Gol Contra</span><span className="text-[#F48771]">{rules?.own_goal ?? "-1.0"}</span></div>
                  
                  <div className="mt-3 text-[10px] text-[#858585] italic leading-tight border-t border-[#3E3E42] pt-2">
                    * Nota Bayesiana: Penaliza ou bonifica levemente jogadores baseando-se no histórico.
                  </div>
                  <div className="flex justify-between py-1 mt-2 font-bold text-white text-sm">
                    <span className="text-[#4FC3F7]">Sua Média Atual:</span>
                    <span className="text-[#4FC3F7]">{player.rating.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-md bg-[#2D2D30] border border-[#3E3E42] hover:bg-[#3E3E42] flex items-center justify-center">
            <X className="w-4 h-4 text-[#CCCCCC]" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-[#858585] mb-3">Estatísticas Principais</div>
            <div className="grid grid-cols-3 gap-3">
              <MainStat label="G + A" value={ga} color="#89D185" />
              <MainStat label="Gols" value={player.goals} />
              <MainStat label="Assistências" value={player.assists} color="#DCDCAA" />
              <MainStat label="Vitórias" value={player.wins} color="#89D185" />
              <MainStat label="Empates" value={player.draws} />
              <MainStat label="Derrotas" value={player.losses} color="#F48771" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2 relative">
                <div className="text-[11px] uppercase tracking-widest text-[#858585]">Desempenho (Radar)</div>
                <Info 
                  className="w-3.5 h-3.5 text-[#858585] cursor-pointer hover:text-white transition-colors" 
                  onMouseEnter={() => setShowRadarInfo(true)}
                  onMouseLeave={() => setShowRadarInfo(false)}
                />
                {showRadarInfo && (
                  <div className="absolute top-full right-0 mt-1 w-64 bg-[#252526] border border-[#3E3E42] p-3 rounded-md shadow-2xl z-50 text-xs">
                    <div className="font-bold text-white mb-2 pb-1 border-b border-[#3E3E42]">Entenda o Gráfico</div>
                    <div className="mb-1"><strong className="text-[#4FC3F7]">Ataque:</strong> Média de gols por jogo.</div>
                    <div className="mb-1"><strong className="text-[#4FC3F7]">Visão:</strong> Média de assistências por jogo.</div>
                    <div className="mb-1"><strong className="text-[#4FC3F7]">Defesa:</strong> Frequência de clean sheets.</div>
                    <div className="mb-1"><strong className="text-[#4FC3F7]">Tática:</strong> Participação em gols indiretos do time.</div>
                    <div><strong className="text-[#4FC3F7]">Gana:</strong> Aproveitamento de vitórias.</div>
                  </div>
                )}
              </div>
              <div className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] h-64 flex items-center justify-center p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="#3E3E42" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#858585', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Stats" dataKey="A" stroke="#007ACC" fill="#007ACC" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] uppercase tracking-widest text-[#858585]">Evolução (Nota Média)</div>
                <select 
                  className="bg-transparent border border-[#3E3E42] rounded px-1 text-[10px] uppercase tracking-widest text-[#4FC3F7] cursor-pointer focus:outline-none"
                  value={evolutionFilter}
                  onChange={(e) => setEvolutionFilter(e.target.value as any)}
                >
                  <option value="last10" className="bg-[#252526]">Últimas 10</option>
                  <option value="months" className="bg-[#252526]">Por Mês (12m)</option>
                  <option value="all" className="bg-[#252526]">Todo Histórico</option>
                </select>
              </div>
              <div className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] h-64 p-4">
                {evolutionChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={evolutionChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3E3E42" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={formatDate} tick={{ fill: '#858585', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: '#858585', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#252526', borderColor: '#3E3E42', color: '#D4D4D4' }}
                        itemStyle={{ color: '#007ACC' }}
                        labelFormatter={formatDate}
                        formatter={(value: number) => [value.toFixed(1), 'Nota']}
                      />
                      <Line type="monotone" dataKey="nota" stroke="#007ACC" strokeWidth={3} dot={{ fill: '#007ACC', r: 4 }} activeDot={{ r: 6, fill: '#4FC3F7' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-[#858585]">Gráfico indisponível</div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-widest text-[#858585] mb-2">Estatísticas Avançadas</div>
            <div className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] px-4">
              <AdvRow icon={Flame} label="Hat-Tricks (3+ gols/jogo)" value={`${a.hatTricks} marcados`} />
              <AdvRow icon={Shield} label="Jogos sem sofrer gol" value={`${a.cleanSheets} clean sheets`} />
              <AdvRow icon={Trophy} label="Maior Vitória" value={a.biggestWinScore} />
              <AdvRow icon={TrendingDown} label="Maior Derrota" value={a.biggestLossScore} />
              <AdvRow icon={Activity} label="Maior Sequência Invicto" value={`${a.maxUnbeatenStreak} jogos`} />
              <AdvRow icon={Goal} label="Gols do Time (com ele)" value={`${a.totalTeamGoals} gols`} />
              <AdvRow icon={AlertTriangle} label="Cartões Amarelos" value={`${a.yellowCards}`} />
              <AdvRow icon={AlertOctagon} label="Cartões Vermelhos" value={`${a.redCards}`} />
              <AdvRow icon={Frown} label="Gols Contra" value={`${a.ownGoals}`} />
              <AdvRow icon={Handshake} label="Mais o Assistiu" value={a.topAssister.name} sub={`${a.topAssister.count} assist.`} />
              <AdvRow icon={Dribbble} label="Mais Assistiu" value={a.topAssisted.name} sub={`${a.topAssisted.count} assist.`} />
              <AdvRow icon={Users} label="Mais Jogou Junto" value={a.mostPlayedWith.name} sub={`${a.mostPlayedWith.count} jogos`} />
              <AdvRow icon={ThumbsUp} label="Mais Venceu Junto" value={a.mostWinsWith.name} sub={`${a.mostWinsWith.count} vit.`} />
              <AdvRow icon={ThumbsDown} label="Mais Perdeu Junto" value={a.mostLossesWith.name} sub={`${a.mostLossesWith.count} der.`} />
              <AdvRow icon={Users} label="Mais Enfrentou" value={a.mostPlayedAgainst.name} sub={`${a.mostPlayedAgainst.count} jogos`} />
              <AdvRow icon={Smile} label="Maior Freguês (Contra)" value={a.mostWinsAgainst.name} sub={`${a.mostWinsAgainst.count} vit.`} />
              <AdvRow icon={Frown} label="Carrasco (Contra)" value={a.mostLossesAgainst.name} sub={`${a.mostLossesAgainst.count} der.`} />
              <AdvRow icon={Scale} label="Rival Equilibrado" value={a.mostDrawsAgainst.name} sub={`${a.mostDrawsAgainst.count} emp.`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
