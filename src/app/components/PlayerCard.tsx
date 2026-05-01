import {
  X, Flame, Handshake, Dribbble, Users, ThumbsUp, ThumbsDown,
  Smile, Frown, Scale, Shield, Trophy, TrendingDown, Activity,
  AlertTriangle, AlertOctagon, Goal,
} from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import type { Player, PlayerAdvanced } from "./data";

function MainStat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="rounded-md bg-[#1E1E1E] border border-[#3E3E42] p-4">
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
  const a = player.advanced ?? EMPTY_ADV;
  const ga = player.goals + player.assists;

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
            <div className="text-xs text-[#858585]">
              #{player.id.slice(0, 8)} · Rating <span className="text-[#89D185] tabular-nums">{player.rating.toFixed(1)}</span>
              {" · "}Jogos <span className="text-[#D4D4D4] tabular-nums">{player.matches}</span>
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
