import { Trophy } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useData } from "../DataContext";
import type { Champion } from "./data";

const medalConfig = {
  gold: {
    base: "#FFD700",
    light: "#FFF4A3",
    dark: "#B8860B",
    label: "Ouro",
  },
  silver: {
    base: "#E5E5E5",
    light: "#FFFFFF",
    dark: "#8A8A8A",
    label: "Prata",
  },
  bronze: {
    base: "#CD7F32",
    light: "#E8A765",
    dark: "#6B3410",
    label: "Bronze",
  },
};

function Trophy3D({ tier, size = 56 }: { tier: "gold" | "silver" | "bronze"; size?: number }) {
  const c = medalConfig[tier];
  const id = `tr-${tier}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
      <defs>
        <linearGradient id={`${id}-cup`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c.light} />
          <stop offset="45%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.dark} />
        </linearGradient>
        <linearGradient id={`${id}-base`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.dark} />
        </linearGradient>
        <radialGradient id={`${id}-shine`} cx="0.3" cy="0.2" r="0.5">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M16 8 h32 v18 a16 16 0 0 1 -32 0 z" fill={`url(#${id}-cup)`} stroke={c.dark} strokeWidth="0.6" />
      <path d="M16 14 c -8 0 -10 6 -6 10 c 3 3 6 3 8 2" fill="none" stroke={`url(#${id}-cup)`} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M48 14 c 8 0 10 6 6 10 c -3 3 -6 3 -8 2" fill="none" stroke={`url(#${id}-cup)`} strokeWidth="2.5" strokeLinecap="round" />
      <ellipse cx="32" cy="9" rx="16" ry="2" fill={c.light} opacity="0.8" />
      <path d="M20 14 q 6 6 0 18" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M16 8 h32 v18 a16 16 0 0 1 -32 0 z" fill={`url(#${id}-shine)`} />
      <rect x="28" y="40" width="8" height="8" fill={`url(#${id}-base)`} />
      <rect x="20" y="48" width="24" height="6" rx="1" fill={`url(#${id}-base)`} stroke={c.dark} strokeWidth="0.5" />
      <rect x="18" y="54" width="28" height="4" rx="1" fill={c.dark} />
    </svg>
  );
}

function medalForIndex(i: number): "gold" | "silver" | "bronze" {
  if (i === 0) return "gold";
  if (i === 1) return "silver";
  if (i === 2) return "bronze";
  return "gold";
}

export function HallOfFame() {
  const { data } = useData();
  const monthlyMVPs = data?.monthlyMVPs ?? [];
  const yearChampion = data?.yearChampion ?? null;

  const champions: Champion[] = monthlyMVPs.map((c, i) => ({
    month: c.month,
    player: c.player,
    avatar: c.avatar,
    medal: medalForIndex(i),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white tracking-tight text-2xl mb-1">Galeria de Campeões</h1>
        <p className="text-[#858585] text-sm">Os reis da nossa quadra</p>
      </div>

      <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-8">
        {yearChampion ? (
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex flex-col items-center gap-3">
              <Trophy3D tier="gold" size={120} />
              <span className="px-3 py-1 rounded bg-[#1E1E1E] border border-[#3E3E42] text-[#FFD700] text-[10px] uppercase tracking-widest">Melhor do Ano</span>
            </div>
            <div className="hidden md:block w-px self-stretch bg-[#3E3E42]" />
            <div className="flex items-center gap-5 flex-1">
              <ImageWithFallback src={yearChampion.avatar} alt={yearChampion.player} className="w-32 h-32 rounded-md object-cover border border-[#3E3E42]" />
              <div>
                <div className="text-[#858585] text-xs uppercase tracking-widest">Temporada {yearChampion.year}</div>
                <h2 className="text-white text-3xl tracking-tight mt-1">{yearChampion.player}</h2>
                <div className="mt-4 flex gap-6">
                  <div>
                    <div className="text-[#89D185] text-2xl tabular-nums">{yearChampion.goals}</div>
                    <div className="text-xs text-[#858585] uppercase tracking-widest">Gols no ano</div>
                  </div>
                  <div>
                    <div className="text-[#89D185] text-2xl tabular-nums">{yearChampion.rating}</div>
                    <div className="text-xs text-[#858585] uppercase tracking-widest">Rating final</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-[#858585]">Sem dados ainda. Configure o Firebase em src/app/firebase.ts.</div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-[#89D185]" />
          <h2 className="text-white tracking-tight">Melhor do Mês — Prateleira</h2>
        </div>
        <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-6">
          {champions.length === 0 ? (
            <div className="text-sm text-[#858585]">Sem campeões ainda.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {champions.map((c) => {
                const cfg = medalConfig[c.medal];
                return (
                  <div key={c.month} className="rounded-md border border-[#3E3E42] bg-[#1E1E1E] p-4 text-center hover:border-[#007ACC] transition">
                    <div className="flex justify-center mb-3">
                      <Trophy3D tier={c.medal} size={56} />
                    </div>
                    <ImageWithFallback src={c.avatar} alt={c.player} className="w-16 h-16 rounded-md object-cover mx-auto border border-[#3E3E42]" />
                    <div className="mt-3 text-[#D4D4D4] text-sm tracking-tight">{c.player}</div>
                    <div className="text-[10px] uppercase tracking-widest text-[#858585] mt-0.5">{c.month}</div>
                    <div className="mt-2 inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-widest" style={{ color: cfg.base, borderColor: cfg.dark, borderWidth: 1 }}>{cfg.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
