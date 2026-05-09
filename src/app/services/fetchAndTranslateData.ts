// Documentação: Esta linha especial ensina o TypeScript a reconhecer as variáveis do Vite
/// <reference types="vite/client" />

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export const K_RATING_BASE = 6.0;

export type AdvancedBucket = { name: string; count: number; base?: number };

export interface PlayerAdvanced {
  topAssisted: AdvancedBucket;       // quem o jogador mais assistiu
  topAssister: AdvancedBucket;       // quem mais assistiu o jogador
  mostPlayedWith: AdvancedBucket;
  mostWinsWith: AdvancedBucket;
  mostLossesWith: AdvancedBucket;
  mostPlayedAgainst: AdvancedBucket;
  mostWinsAgainst: AdvancedBucket;
  mostLossesAgainst: AdvancedBucket;
  mostDrawsAgainst: AdvancedBucket;
  hatTricks: number;
  cleanSheets: number;
  ownGoals: number;
  yellowCards: number;
  redCards: number;
  biggestWinScore: string;
  biggestLossScore: string;
  maxUnbeatenStreak: number;
  totalTeamGoals: number;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  rating: number;     // "nota" from calculateFinalRating, 1 decimal
  baseRating: number; // raw rating field stored in players_<group>, 1 decimal
  matches: number;
  goals: number;
  assists: number;
  ga: number;
  wins: number;
  draws: number;
  losses: number;
  totalGames?: number;
  advanced?: PlayerAdvanced;
  evolution_chart?: { date: string, nota: number }[];
}

export interface MatchEvent {
  type: string;
  player: string;
  playerId: string;
  assist: string | null;
  assistId: string | null;
  team: string;
  time?: string;
}

export interface RosterPlayer {
  id: string;
  name: string;
  avatar: string;
}

export interface Match {
  id: string;
  sessionId: string;
  date: string;
  duration: string;
  teamA: "Vermelho";
  teamB: "Branco";
  scoreA: number;
  scoreB: number;
  redRoster: RosterPlayer[];
  whiteRoster: RosterPlayer[];
  events: MatchEvent[];
}

export interface SessionInfo {
  id: string;
  title: string;
  date: string;       // "DD/MM/YYYY"
  timestamp: string;  // ISO
  status: string;
  matchCount: number;
  jogadores?: number;
  duration?: number;
  avgRating?: string;
  totalGoals?: number;
  avgGoals?: string;
  biggestWin?: string;
  mvpId?: string;
  mvpName?: string;
  mvpIcon?: string;
}

export interface MonthlyMVP {
  month: string;
  player: string;
  avatar: string;
  goals: number; 
  assists?: number;
  ga?: number;
}

export interface YearChampion {
  player: string;
  avatar: string;
  year: number;
  goals: number;
  rating: number;
}

export interface NextMatch {
  date: string;
  location: string;
  address: string;
}

export interface RatingRules {
  base: number;
  goal: number;
  assist: number;
  win: number;
  loss: number;
  yellow: number;
  red: number;
  own_goal: number;
}

export interface TranslatedData {
  groupName: string;
  groupId: string;
  players: Player[];
  matches: Match[];
  sessions: SessionInfo[];
  monthlyMVPs: MonthlyMVP[];
  lastMonthMVP: MonthlyMVP | null;
  yearChampion: YearChampion | null;
  nextMatch: NextMatch | null;
  ratingRules?: RatingRules;
}

const TAG = "[fetchAndTranslateData]";

const safeString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const safeNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const safeArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

function avatarFor(name: string, icon?: string | null): string {
  const trimmed = (icon || "").trim();
  if (trimmed) {
    const cleanPath = trimmed.startsWith("/") ? trimmed.substring(1) : trimmed;
    const baseUrl = import.meta.env.BASE_URL;
    return baseUrl.endsWith("/") ? `${baseUrl}${cleanPath}` : `${baseUrl}/${cleanPath}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "?")}&background=2D2D30&color=D4D4D4`;
}

function formatLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function parseDate(value: unknown): Date | null {
  const s = safeString(value).trim();
  if (!s) return null;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    const [, y, m, dd] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(dd), 12, 0, 0, 0);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeDate(value: unknown): string {
  const d = parseDate(value);
  return d ? formatLocalIso(d) : "";
}

function parseMaybeJSON<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") return value as T;
  if (!value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    return fallback;
  }
}

function playerIdFromObject(p: any): string {
  if (!p || typeof p !== "object") return "";
  const id = safeString(p.id);
  if (id) return id;
  return safeString(p.name);
}

function eventPlayerId(ev: any, kind: "player" | "assist"): string {
  if (!ev || typeof ev !== "object") return "";
  const idField = kind === "player" ? "playerId" : "assistId";
  return safeString(ev[idField]) || safeString(ev[kind]);
}

function calculateMatchRating(args: {
  status: number;
  goals: number;
  assists: number;
  ownGoals: number;
  teamGoals: number;
  conceded: number;
  yellow: number;
  red: number;
  teamWinStreak?: number;
}, rules: RatingRules): number {
  let rating = rules.base || K_RATING_BASE;
  if (args.status === 1) rating += rules.win || 1.0;
  else if (args.status === -1) rating += rules.loss || -0.6; // Assuming loss is negative in rules
  rating += args.goals * (rules.goal || 0.6);
  rating += args.assists * (rules.assist || 0.4);
  rating += args.ownGoals * (rules.own_goal || -0.8);
  rating += args.yellow * (rules.yellow || -0.3);
  rating += args.red * (rules.red || -1.2);
  
  // Team contribution: small bump for high-scoring wins, penalty for blowouts
  const margin = args.teamGoals - args.conceded;
  rating += Math.max(-0.5, Math.min(0.5, margin * 0.05));
  if ((args.teamWinStreak ?? 0) >= 3 && args.status === 1) rating += 0.1;
  
  return Math.max(0, Math.min(10, rating));
}

function calculateFinalRating(ratings: number[]): number {
  if (!ratings || ratings.length === 0) return K_RATING_BASE;
  const sum = ratings.reduce((s, r) => s + r, 0);
  const C = 5;
  return (sum + K_RATING_BASE * C) / (ratings.length + C);
}

export async function fetchAndTranslateData(syncCode: string): Promise<TranslatedData> {
  console.log(`${TAG} Buscando syncCode="${syncCode}" no Firestore...`);
  const docRef = doc(db, "sync_data", syncCode);
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    console.error(`${TAG} sync_data/${syncCode} não encontrado`);
    throw new Error(`Sync code "${syncCode}" não encontrado na base de dados.`);
  }

  const docData = snap.data() as Record<string, any>;
  const rawData = docData.data || {};
  
  // Extrai o siteData consolidado pelo Flutter
  let siteData = docData.site_data;
  if (!siteData && rawData.site_data) {
    siteData = rawData.site_data;
  }

  if (!siteData || !Array.isArray(siteData.players)) {
    throw new Error(`Dados do site não encontrados para o sync code "${syncCode}". Verifique se o app realizou o backup corretamente.`);
  }

  console.log(`${TAG} Consumindo site_data pré-calculado do Flutter...`);

  // 1. Carregar jogadores consolidados pelo app
  const playersAll: Player[] = siteData.players.map((p: any) => ({
    id: safeString(p.id),
    name: safeString(p.name),
    avatar: avatarFor(safeString(p.name), safeString(p.icon)),
    rating: safeNumber(p.nota),
    baseRating: K_RATING_BASE,
    matches: safeNumber(p.games),
    goals: safeNumber(p.goals),
    assists: safeNumber(p.assists),
    ga: safeNumber(p.ga),
    wins: safeNumber(p.wins),
    draws: safeNumber(p.draws),
    losses: safeNumber(p.losses),
    totalGames: safeNumber(p.games),
    advanced: {
      topAssisted: p.advanced?.topAssisted || { name: "-", count: 0 },
      topAssister: p.advanced?.topAssister || { name: "-", count: 0 },
      mostPlayedWith: p.advanced?.mostPlayedWith || { name: "-", count: 0 },
      mostWinsWith: p.advanced?.mostWinsWith || { name: "-", count: 0 },
      mostLossesWith: p.advanced?.mostLossesWith || { name: "-", count: 0 },
      mostPlayedAgainst: p.advanced?.mostPlayedAgainst || { name: "-", count: 0 },
      mostWinsAgainst: p.advanced?.mostWinsAgainst || { name: "-", count: 0 },
      mostLossesAgainst: p.advanced?.mostLossesAgainst || { name: "-", count: 0 },
      mostDrawsAgainst: p.advanced?.mostDrawsAgainst || { name: "-", count: 0 },
      hatTricks: safeNumber(p.hat_tricks),
      cleanSheets: safeNumber(p.clean_sheets),
      ownGoals: safeNumber(p.own_goals),
      yellowCards: safeNumber(p.yellow),
      redCards: safeNumber(p.red),
      biggestWinScore: safeString(p.biggest_win_score, "-"),
      biggestLossScore: safeString(p.biggest_loss_score, "-"),
      maxUnbeatenStreak: safeNumber(p.max_unbeaten),
      totalTeamGoals: safeNumber(p.total_team_goals),
    },
    // We will build evolution_chart below dynamically.
    evolution_chart: [], 
  }));

  // Rebuild evolution_chart dynamically to bypass Flutter interpolation bugs
  const playerRatingsTracker: Record<string, number[]> = {};
  for (const p of playersAll) playerRatingsTracker[p.id] = [];
  
  // We need to iterate over all historical matches chronologically
  // to build the evolution chart accurately.
  const historyRaw: any[] = [];
  if (Array.isArray(siteData.sessions)) {
    for (const s of siteData.sessions) {
      const historyKey = `match_history_${s.id}`;
      const hist = parseMaybeJSON<any[]>(rawData[historyKey], []);
      for (const m of hist) {
         historyRaw.push({...m, session_date: s.timestamp || m.date});
      }
    }
  }
  
  // Sort oldest to newest
  historyRaw.sort((a, b) => {
     const da = parseDate(a.date || a.session_date)?.getTime() || 0;
     const db = parseDate(b.date || b.session_date)?.getTime() || 0;
     return da - db;
  });

  const ratingRules = siteData.rating_rules || {
    base: K_RATING_BASE, goal: 0.6, assist: 0.4, win: 1.0, loss: -0.6, yellow: -0.3, red: -1.2, own_goal: -0.8
  };

  for (const match of historyRaw) {
    const scoreR = safeNumber(match.scoreRed);
    const scoreW = safeNumber(match.scoreWhite);
    const redStatus = scoreR > scoreW ? 1 : (scoreR === scoreW ? 0 : -1);
    const whiteStatus = scoreW > scoreR ? 1 : (scoreR === scoreW ? 0 : -1);

    const matchPlayerEvents: Record<string, any> = {};
    for (const ev of safeArray<any>(match.events)) {
      const pId = eventPlayerId(ev, "player");
      const aId = eventPlayerId(ev, "assist");
      if (pId) {
        if (!matchPlayerEvents[pId]) matchPlayerEvents[pId] = { g: 0, a: 0, og: 0, yc: 0, rc: 0 };
        if (ev.type === "goal") matchPlayerEvents[pId].g++;
        if (ev.type === "own_goal") matchPlayerEvents[pId].og++;
        if (ev.type === "yellow_card") matchPlayerEvents[pId].yc++;
        if (ev.type === "red_card") matchPlayerEvents[pId].rc++;
      }
      if (aId) {
        if (!matchPlayerEvents[aId]) matchPlayerEvents[aId] = { g: 0, a: 0, og: 0, yc: 0, rc: 0 };
        if (ev.type === "goal") matchPlayerEvents[aId].a++;
      }
    }

    const processPlayerRating = (pObj: any, status: number, scored: number, conceded: number) => {
      const pId = playerIdFromObject(pObj);
      if (!pId || !playerRatingsTracker[pId]) return;
      
      const g = matchPlayerEvents[pId]?.g || 0;
      const a = matchPlayerEvents[pId]?.a || 0;
      const og = matchPlayerEvents[pId]?.og || 0;
      const yc = matchPlayerEvents[pId]?.yc || 0;
      const rc = matchPlayerEvents[pId]?.rc || 0;

      const mRating = calculateMatchRating({
        status, goals: g, assists: a, ownGoals: og, teamGoals: scored, conceded, yellow: yc, red: rc
      }, ratingRules);
      
      playerRatingsTracker[pId].push(mRating);
      
      const pRef = playersAll.find(x => x.id === pId);
      if (pRef && pRef.evolution_chart) {
        const dateKey = normalizeDate(match.date || match.session_date).slice(0, 10);
        const finalNota = calculateFinalRating(playerRatingsTracker[pId]);
        
        const lastEntry = pRef.evolution_chart[pRef.evolution_chart.length - 1];
        if (lastEntry && lastEntry.date.slice(0, 10) === dateKey) {
            lastEntry.nota = finalNota;
        } else {
            pRef.evolution_chart.push({
              date: normalizeDate(match.date || match.session_date),
              nota: finalNota
            });
        }
      }
    };

    if (match.players) {
      for (const p of safeArray<any>(match.players.red)) processPlayerRating(p, redStatus, scoreR, scoreW);
      for (const p of safeArray<any>(match.players.white)) processPlayerRating(p, whiteStatus, scoreW, scoreR);
      if (match.players.gk_red) processPlayerRating(match.players.gk_red, redStatus, scoreR, scoreW);
      if (match.players.gk_white) processPlayerRating(match.players.gk_white, whiteStatus, scoreW, scoreR);
    }
  }

  // Helper para buscar jogador pelo id local
  const getPlayerCache = (id: string, name: string): RosterPlayer => {
    const found = playersAll.find(x => x.id === id || x.name === name);
    return {
      id: found?.id || id || name,
      name: found?.name || name,
      avatar: found?.avatar || avatarFor(name),
    };
  };

  // 2. Carregar sessões consolidadas pelo app
  const sessions: SessionInfo[] = [];
  if (Array.isArray(siteData.sessions)) {
    for (const s of siteData.sessions) {
      const ts = safeString(s.timestamp);
      let displayDate = "";
      if (ts) {
        const d = parseDate(ts);
        if (d) displayDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      }
      sessions.push({
        id: safeString(s.id),
        title: safeString(s.title) || (displayDate ? `Fut ${displayDate.slice(0, 5)}` : "Sessão"),
        date: displayDate,
        timestamp: normalizeDate(ts) || ts,
        status: s.status || "Finalizado",
        matchCount: safeNumber(s.matchesCount),
        jogadores: safeNumber(s.jogadores),
        duration: safeNumber(s.duration),
        avgRating: safeString(s.avgRating, "0"),
        totalGoals: safeNumber(s.totalGoals, 0),
        avgGoals: safeString(s.avgGoals, "0"),
        biggestWin: safeString(s.biggestWin, "-"),
        mvpId: safeString(s.mvpId),
        mvpName: safeString(s.mvpName),
        mvpIcon: safeString(s.mvpIcon),
      });
    }
  }

  // 3. Carregar partidas (necessário para as telas de "Peladas" e "Confronto X1")
  const matches: Match[] = [];
  for (const s of sessions) {
    const historyKey = `match_history_${s.id}`;
    const history = parseMaybeJSON<any[]>(rawData[historyKey], []);
    
    for (const m of history) {
      const redIds: RosterPlayer[] = [];
      const whiteIds: RosterPlayer[] = [];
      
      const rawRed = safeArray<any>(m.players?.red);
      const rawWhite = safeArray<any>(m.players?.white);
      const gkRed = m.players?.gk_red;
      const gkWhite = m.players?.gk_white;
      
      const allRed = [...rawRed, ...(gkRed ? [gkRed] : [])];
      const allWhite = [...rawWhite, ...(gkWhite ? [gkWhite] : [])];
      
      for (const p of allRed) redIds.push(getPlayerCache(playerIdFromObject(p), safeString(p.name)));
      for (const p of allWhite) whiteIds.push(getPlayerCache(playerIdFromObject(p), safeString(p.name)));
      
      const events: MatchEvent[] = safeArray<any>(m.events).map(e => ({
        type: safeString(e.type),
        player: safeString(e.player),
        playerId: eventPlayerId(e, "player"),
        assist: e.assist ? safeString(e.assist) : null,
        assistId: eventPlayerId(e, "assist") || null,
        team: safeString(e.team),
        time: safeString(e.time),
      }));

      matches.push({
        id: safeString(m.match_id) || `match-${matches.length + 1}`,
        sessionId: s.id,
        date: normalizeDate(m.date) || s.timestamp,
        duration: safeString(m.match_duration),
        teamA: "Vermelho",
        teamB: "Branco",
        scoreA: safeNumber(m.scoreRed),
        scoreB: safeNumber(m.scoreWhite),
        redRoster: redIds,
        whiteRoster: whiteIds,
        events,
      });
    }
  }

  // 4. Encontrar MVP do Mês e Campeão do Ano
  const monthlyMVPs: MonthlyMVP[] = [];
  let yearChampion: YearChampion | null = null;
  let lastMonthMVP: MonthlyMVP | null = null;
  
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentYear = now.getFullYear();

  // Accumulate goals and assists per player per month and year
  const playerStatsByMonth: Record<string, Record<string, { g: number, a: number }>> = {};
  const playerStatsByYear: Record<number, Record<string, { g: number }>> = {};

  for (const m of matches) {
    const d = parseDate(m.date);
    if (!d) continue;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const yearKey = d.getFullYear();

    if (!playerStatsByMonth[monthKey]) playerStatsByMonth[monthKey] = {};
    if (!playerStatsByYear[yearKey]) playerStatsByYear[yearKey] = {};

    for (const ev of m.events) {
      if (ev.type === "goal" && ev.playerId) {
        if (!playerStatsByMonth[monthKey][ev.playerId]) playerStatsByMonth[monthKey][ev.playerId] = { g: 0, a: 0 };
        playerStatsByMonth[monthKey][ev.playerId].g += 1;
        
        if (!playerStatsByYear[yearKey][ev.playerId]) playerStatsByYear[yearKey][ev.playerId] = { g: 0 };
        playerStatsByYear[yearKey][ev.playerId].g += 1;
      }
      if (ev.type === "goal" && ev.assistId) {
        if (!playerStatsByMonth[monthKey][ev.assistId]) playerStatsByMonth[monthKey][ev.assistId] = { g: 0, a: 0 };
        playerStatsByMonth[monthKey][ev.assistId].a += 1;
      }
    }
  }

  // Find Monthly MVP for current month
  if (playerStatsByMonth[currentMonth]) {
    let topPlayerId = "";
    let maxGA = -1;
    for (const [pId, stats] of Object.entries(playerStatsByMonth[currentMonth])) {
      const ga = stats.g + stats.a;
      if (ga > maxGA) {
        maxGA = ga;
        topPlayerId = pId;
      }
    }
    if (topPlayerId) {
      const p = playersAll.find(x => x.id === topPlayerId);
      if (p) {
        lastMonthMVP = {
          month: currentMonth,
          player: p.name,
          avatar: p.avatar,
          goals: playerStatsByMonth[currentMonth][topPlayerId].g,
          assists: playerStatsByMonth[currentMonth][topPlayerId].a,
          ga: maxGA,
        };
        monthlyMVPs.push(lastMonthMVP);
      }
    }
  }

  // Find Year Champion
  if (playerStatsByYear[currentYear]) {
    let topPlayerId = "";
    let maxG = -1;
    for (const [pId, stats] of Object.entries(playerStatsByYear[currentYear])) {
      if (stats.g > maxG) {
        maxG = stats.g;
        topPlayerId = pId;
      }
    }
    if (topPlayerId) {
      const p = playersAll.find(x => x.id === topPlayerId);
      if (p) {
        yearChampion = {
          player: p.name,
          avatar: p.avatar,
          year: currentYear,
          goals: maxG,
          rating: p.rating,
        };
      }
    }
  }

  // 5. Next Match
  let nextMatch: NextMatch | null = null;
  const upcomingSession = sessions.find((s) => s.status === "Em Andamento" || s.status === "Aguardando");
  if (upcomingSession) {
    nextMatch = { date: upcomingSession.timestamp, location: "Sessão Agendada", address: "—" };
  } else {
    const now = new Date();
    const sat = new Date(now);
    sat.setHours(9, 0, 0, 0);
    const dow = sat.getDay();
    const delta = dow === 6 ? (sat.getTime() <= now.getTime() ? 7 : 0) : (6 - dow + 7) % 7 || 7;
    sat.setDate(sat.getDate() + delta);
    nextMatch = { date: formatLocalIso(sat), location: "Sábado's FC", address: "Goiânia" };
  }

  let groupName = "Grupo sem nome";
  let groupId = "default";
  for (const k of Object.keys(rawData)) {
    if (k.startsWith("app_groups")) {
      const groups = parseMaybeJSON<any[]>(rawData[k], []);
      if (groups.length > 0) {
        groupId = safeString(groups[0].id) || groupId;
        groupName = safeString(groups[0].name) || groupName;
        break;
      }
    }
  }

  console.log(
    `${TAG} concluído: `,
    `${playersAll.length} jogadores, `,
    `${matches.length} partidas, `,
    `${sessions.length} sessões`
  );

  return {
    groupName, groupId,
    players: playersAll,
    matches,
    sessions,
    monthlyMVPs,
    lastMonthMVP,
    yearChampion,
    nextMatch,
    ratingRules: siteData.rating_rules,
  };
}
