// Documentação: Esta linha especial ensina o TypeScript a reconhecer as variáveis do Vite
/// <reference types="vite/client" />

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// ... (todo o resto do teu código que está aqui no meio continua igual) ...

// ---------------------------------------------------------------------------
// Constants (mirror of Dart constants/rating_calculator.dart)
// ---------------------------------------------------------------------------

export const K_RATING_BASE = 6.0;
export const K_MIN_GAMES_FOR_GLOBAL_RANKING = 5;
export const K_MIN_BASE_FOR_RATIO = 5;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

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
}

// ---------------------------------------------------------------------------
// Defensive helpers
// ---------------------------------------------------------------------------

const TAG = "[fetchAndTranslateData]";

const safeArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const safeNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const safeString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;
const round1 = (n: number): number => Math.round(n * 10) / 10;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

const PT_MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];


// Documentação: Helper para gerar a URL do avatar do jogador de forma 100% segura.
function avatarFor(name: string, icon?: string | null): string {
  const trimmed = (icon || "").trim();
  
  if (trimmed) {
    // Etapa 1: Limpa o caminho da imagem para garantir que NÃO começa com uma barra.
    // Exemplo: "/assets/cr7.png" ou "assets/cr7.png" vão transformar-se sempre em "assets/cr7.png"
    const cleanPath = trimmed.startsWith("/") ? trimmed.substring(1) : trimmed;
    
    // Etapa 2: Acessa a variável do Vite (o erro TypeScript sumiu graças à linha 1)
    const baseUrl = import.meta.env.BASE_URL; // Ex: "/society/" ou "/"
    
    // Etapa 3: Junta os dois textos verificando as barras de forma inteligente
    if (baseUrl.endsWith("/")) {
      return `${baseUrl}${cleanPath}`; // Se já tem barra no fim, junta direto
    } else {
      return `${baseUrl}/${cleanPath}`; // Se não tem barra, adicionamos uma no meio
    }
  }
  
  // Documentação: Fallback caso o jogador não tenha foto configurada
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "?")}&background=2D2D30&color=D4D4D4`;
}

function parseMaybeJSON<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") return value as T;
  if (!value.trim()) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    console.warn(`${TAG} JSON parse falhou`, err, "preview:", value.slice(0, 120));
    return fallback;
  }
}

function formatLocalIso(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function normalizeDate(value: unknown): string {
  const d = parseDate(value);
  return d ? formatLocalIso(d) : "";
}

function parseDate(value: unknown): Date | null {
  const s = safeString(value).trim();
  if (!s) return null;
  // Date-only "YYYY-MM-DD" → JS parses as UTC midnight, which shifts the day
  // backwards in negative-offset timezones (e.g. Brazil UTC-3 shows the previous
  // day). Anchor to local noon to keep the calendar date stable in any TZ.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnly) {
    const [, y, m, dd] = dateOnly;
    return new Date(Number(y), Number(m) - 1, Number(dd), 12, 0, 0, 0);
  }
  // "YYYY-MM-DDTHH:mm[:ss]" without timezone → JS treats as local already; OK.
  // ISO with explicit TZ (Z or ±hh:mm) → respect it; user's local getters give
  // the right wall-clock day for the user's timezone.
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// Player identity helpers (mirror of utils/player_identity.dart)
// ---------------------------------------------------------------------------

function playerIdFromObject(p: any): string {
  if (!p || typeof p !== "object") return "";
  const id = safeString(p.id);
  if (id) return id;
  return safeString(p.name);
}

function eventPlayerId(ev: any, kind: "player" | "assist"): string {
  if (!ev || typeof ev !== "object") return "";
  const idField = kind === "player" ? "playerId" : "assistId";
  const nameField = kind;
  const id = safeString(ev[idField]);
  if (id) return id;
  return safeString(ev[nameField]);
}

// ---------------------------------------------------------------------------
// Rating calculator (mirror of utils/rating_calculator.dart)
// ---------------------------------------------------------------------------

interface MatchRatingArgs {
  status: number;       // 1 win, 0 draw, -1 loss
  goals: number;
  assists: number;
  ownGoals: number;
  teamGoals: number;
  conceded: number;
  yellow: number;
  red: number;
  teamWinStreak?: number;
}

function calculateMatchRating(args: MatchRatingArgs): number {
  let rating = K_RATING_BASE;
  if (args.status === 1) rating += 1.0;
  else if (args.status === -1) rating -= 0.6;
  rating += args.goals * 0.6;
  rating += args.assists * 0.4;
  rating -= args.ownGoals * 0.8;
  rating -= args.yellow * 0.3;
  rating -= args.red * 1.2;
  // Team contribution: small bump for high-scoring wins, penalty for blowouts
  const margin = args.teamGoals - args.conceded;
  rating += clamp(margin * 0.05, -0.5, 0.5);
  if ((args.teamWinStreak ?? 0) >= 3 && args.status === 1) rating += 0.1;
  return clamp(rating, 0, 10);
}

function calculateFinalRating(ratings: number[], opts: { useBayesian?: boolean } = {}): number {
  if (!ratings || ratings.length === 0) return K_RATING_BASE;
  const sum = ratings.reduce((s, r) => s + r, 0);
  const avg = sum / ratings.length;
  const useBayes = opts.useBayesian !== false; // default true (matches Dart)
  if (!useBayes) return avg;
  // Bayesian smoothing toward base when sample is small
  const C = 5;
  return (sum + K_RATING_BASE * C) / (ratings.length + C);
}

// ---------------------------------------------------------------------------
// Raw types
// ---------------------------------------------------------------------------

interface RawRosterPlayer {
  id?: string;
  name?: string;
  rating?: number;
  icon?: string | null;
  totalGames?: number;
}

interface RawSession {
  id?: string;
  title?: string;
  timestamp?: string;
  jogadores?: number;
  duration?: number;
  win_limit?: number;
  draft_mode?: boolean;
}

interface RawEvent {
  type?: string;
  player?: string;
  playerId?: string;
  assist?: string | null;
  assistId?: string | null;
  team?: string;
  time?: string;
}

interface RawMatch {
  match_id?: string | number;
  date?: string;
  match_duration?: string;
  scoreRed?: number;
  scoreWhite?: number;
  events?: RawEvent[];
  players?: {
    red?: RawRosterPlayer[];
    white?: RawRosterPlayer[];
    gk_red?: RawRosterPlayer | null;
    gk_white?: RawRosterPlayer | null;
  };
}

interface RawAppGroup {
  id?: string;
  name?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// Per-player accumulator
// ---------------------------------------------------------------------------

interface Acc {
  id: string;
  name: string;
  icon?: string | null;
  baseRating: number;
  totalGames?: number;
  // global counters
  games: number;
  goals: number;
  assists: number;
  wins: number;
  draws: number;
  losses: number;
  yellow: number;
  red: number;
  ownGoals: number;
  ratings: number[];
  // advanced (id-keyed maps)
  assistsGiven: Map<string, number>;     // I assisted someone (key=scorerId)
  assistsReceived: Map<string, number>;  // someone assisted me (key=assisterId)
  gamesWith: Map<string, number>;
  winsWith: Map<string, number>;
  lossesWith: Map<string, number>;
  gamesAgainst: Map<string, number>;
  winsAgainst: Map<string, number>;
  lossesAgainst: Map<string, number>;
  drawsAgainst: Map<string, number>;
  hatTricks: number;
  cleanSheets: number;
  biggestWinMargin: number;
  biggestWinScore: string;
  biggestLossMargin: number;
  biggestLossScore: string;
  currentUnbeatenStreak: number;
  maxUnbeatenStreak: number;
  totalTeamGoals: number;
}

function newAcc(id: string, name: string): Acc {
  return {
    id, name,
    baseRating: 0,
    games: 0, goals: 0, assists: 0,
    wins: 0, draws: 0, losses: 0,
    yellow: 0, red: 0, ownGoals: 0,
    ratings: [],
    assistsGiven: new Map(), assistsReceived: new Map(),
    gamesWith: new Map(), winsWith: new Map(), lossesWith: new Map(),
    gamesAgainst: new Map(), winsAgainst: new Map(), lossesAgainst: new Map(),
    drawsAgainst: new Map(),
    hatTricks: 0, cleanSheets: 0,
    biggestWinMargin: 0, biggestWinScore: "—",
    biggestLossMargin: 0, biggestLossScore: "—",
    currentUnbeatenStreak: 0, maxUnbeatenStreak: 0,
    totalTeamGoals: 0,
  };
}

function bump(map: Map<string, number>, key: string, by = 1) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + by);
}

function findMaxBucket(
  map: Map<string, number>,
  idToName: Map<string, string>,
  opts?: { ratioBaseMap?: Map<string, number>; minBase?: number },
): AdvancedBucket {
  if (map.size === 0) return { name: "—", count: 0 };
  const candidates: { id: string; value: number }[] = [];
  for (const [id, value] of map) {
    if (value <= 0) continue;
    if (opts?.ratioBaseMap) {
      const base = opts.ratioBaseMap.get(id) ?? 0;
      if (base < (opts.minBase ?? 0)) continue;
    }
    candidates.push({ id, value });
  }
  if (candidates.length === 0) return { name: "—", count: 0 };
  candidates.sort((a, b) => {
    if (opts?.ratioBaseMap) {
      const baseA = opts.ratioBaseMap.get(a.id) ?? 1;
      const baseB = opts.ratioBaseMap.get(b.id) ?? 1;
      const rA = a.value / baseA;
      const rB = b.value / baseB;
      if (rB !== rA) return rB - rA;
      return baseB - baseA;
    }
    return b.value - a.value;
  });
  const top = candidates[0];
  return {
    name: idToName.get(top.id) ?? top.id,
    count: top.value,
    base: opts?.ratioBaseMap?.get(top.id),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function fetchAndTranslateData(syncCode: string): Promise<TranslatedData> {
  const empty: TranslatedData = {
    groupName: "", groupId: "",
    players: [], matches: [], sessions: [],
    monthlyMVPs: [], lastMonthMVP: null, yearChampion: null, nextMatch: null,
  };

  console.log(`${TAG} iniciando fetch para syncCode="${syncCode}"`);
  if (!syncCode) {
    console.warn(`${TAG} syncCode vazio — retornando vazio`);
    return empty;
  }

  let snapshot;
  try {
    snapshot = await getDoc(doc(db, "sync_data", syncCode));
  } catch (err) {
    console.error(`${TAG} erro no getDoc Firestore`, err);
    throw err;
  }
  if (!snapshot.exists()) {
    console.warn(`${TAG} documento sync_data/${syncCode} não existe`);
    return empty;
  }

  const docData = snapshot.data() as Record<string, unknown> | undefined;
  if (!docData) return empty;

  // The Dart sync service writes `{ data: {...}, last_updated }`. Read .data.
  // Fallback to top-level for backwards compatibility with the example JSON.
  const rawData: Record<string, unknown> = (docData as any).data && typeof (docData as any).data === "object"
    ? (docData as any).data
    : docData;

  console.log(`${TAG} doc carregado, ${Object.keys(rawData).length} chaves`);

  // ---- 1. Group ----------------------------------------------------------
  const appGroups = parseMaybeJSON<RawAppGroup[]>(rawData["app_groups"], []);
  const groupId = safeString(appGroups[0]?.id);
  const groupName = safeString(appGroups[0]?.name) || "Meu Grupo";
  console.log(`${TAG} grupo: ${groupName} (${groupId})`);

  // ---- 2. Master player roster ------------------------------------------
  const accs = new Map<string, Acc>();
  const idToName = new Map<string, string>();
  const idToIcon = new Map<string, string>();

  const upsertFromRoster = (rp: RawRosterPlayer | undefined | null): Acc | null => {
    if (!rp) return null;
    const id = safeString(rp.id);
    const name = safeString(rp.name).trim();
    if (!id && !name) return null;
    const key = id || name;
    let a = accs.get(key);
    if (!a) {
      a = newAcc(key, name || key);
      accs.set(key, a);
    }
    if (name && a.name !== name) a.name = name;
    if (rp.icon != null && !a.icon) a.icon = safeString(rp.icon);
    const r = safeNumber(rp.rating, NaN);
    if (Number.isFinite(r)) a.baseRating = r;
    const tg = safeNumber(rp.totalGames, NaN);
    if (Number.isFinite(tg)) a.totalGames = tg;
    if (id) idToName.set(id, a.name);
    if (a.icon && id) idToIcon.set(id, a.icon);
    return a;
  };

  const playersGroupKey = groupId ? `players_${groupId}` : Object.keys(rawData).find((k) => k.startsWith("players_grupo_"));
  if (playersGroupKey) {
    const list = parseMaybeJSON<RawRosterPlayer[]>(rawData[playersGroupKey], []);
    console.log(`${TAG} ${playersGroupKey}: ${list.length} jogadores`);
    for (const p of list) upsertFromRoster(p);
  } else {
    console.warn(`${TAG} chave players_<groupId> não encontrada`);
  }

  // ---- 3. Sessions list (sessions_<groupId>) ----------------------------
  const sessionsKey = groupId ? `sessions_${groupId}` : Object.keys(rawData).find((k) => k.startsWith("sessions_"));
  const rawSessions = sessionsKey ? parseMaybeJSON<RawSession[]>(rawData[sessionsKey], []) : [];
  console.log(`${TAG} ${rawSessions.length} sessões em ${sessionsKey}`);

  // Como no Dart (`getAllGroupMatches`): SOMENTE sessões listadas em
  // sessions_<groupId> contam. Sessões órfãs com `match_history_*` no
  // documento mas que não estão na lista oficial são ignoradas — caso
  // contrário gols/assistências de sessões abandonadas inflam os totais.
  const discoveredSessionIds = new Set<string>();
  for (const s of rawSessions) {
    const id = safeString(s.id);
    if (id) discoveredSessionIds.add(id);
  }

  const sessionMap = new Map<string, RawSession>();
  for (const s of rawSessions) {
    const id = safeString(s.id);
    if (id) sessionMap.set(id, s);
  }

  // ---- 4. Iterate all matches across sessions ---------------------------
  const matches: Match[] = [];
  const sessions: SessionInfo[] = [];
  const statsByMonth = new Map<string, Map<string, { g: number, a: number }>>(); // Substitui goalsByMonth
  const goalsByYear = new Map<number, Map<string, number>>();

  // Sort sessions by timestamp asc so "biggest streak" / "first goal" semantics are stable
  const sortedSessionIds = Array.from(discoveredSessionIds).sort((a, b) => {
    const ta = parseDate(sessionMap.get(a)?.timestamp)?.getTime() ?? Number(a);
    const tb = parseDate(sessionMap.get(b)?.timestamp)?.getTime() ?? Number(b);
    return ta - tb;
  });

  // We need history sorted by date to compute streaks correctly per player
  type EnrichedMatch = { sessionId: string; sessionTimestamp: string; raw: RawMatch };
  const enriched: EnrichedMatch[] = [];

  for (const sId of sortedSessionIds) {
    const sessionMeta = sessionMap.get(sId);
    const sessionTimestamp = safeString(sessionMeta?.timestamp);
    const historyKey = `match_history_${sId}`;
    const history = parseMaybeJSON<RawMatch[]>(rawData[historyKey], []);

    for (const m of history) {
      if (m.date && m.date.includes("2026-04-27")) {
        m.date = m.date.replace("2026-04-27", "2026-03-28");
      }
    }

    let displayDate = "";
    if (sessionTimestamp) {
      const d = parseDate(sessionTimestamp);
      if (d) displayDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    } else if (history.length > 0) {
      const d = parseDate(history[history.length - 1]?.date);
      if (d) displayDate = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    }

    const isRunning = rawData[`is_running_session_${sId}`] === true;

    sessions.push({
      id: sId,
      title: safeString(sessionMeta?.title) || (displayDate ? `Fut ${displayDate.slice(0, 5)}` : `Sessão ${sId}`),
      date: displayDate,
      timestamp: normalizeDate(sessionTimestamp) || sessionTimestamp,
      status: isRunning ? "Em Andamento" : (history.length > 0 ? "Finalizado" : "Aguardando"),
      matchCount: history.length,
      jogadores: safeNumber(sessionMeta?.jogadores, 0) || undefined,
      duration: safeNumber(sessionMeta?.duration, 0) || undefined,
    });

    for (const m of history) enriched.push({ sessionId: sId, sessionTimestamp, raw: m });
  }

  // Sort matches chronologically (asc) for streak computation
  enriched.sort((a, b) => {
    const ta = parseDate(a.raw.date)?.getTime() ?? parseDate(a.sessionTimestamp)?.getTime() ?? 0;
    const tb = parseDate(b.raw.date)?.getTime() ?? parseDate(b.sessionTimestamp)?.getTime() ?? 0;
    return ta - tb;
  });

  for (const { sessionId, sessionTimestamp, raw: match } of enriched) {
    const scoreRed = safeNumber(match.scoreRed, 0);
    const scoreWhite = safeNumber(match.scoreWhite, 0);
    const redStatus = scoreRed > scoreWhite ? 1 : (scoreRed === scoreWhite ? 0 : -1);
    const whiteStatus = scoreWhite > scoreRed ? 1 : (scoreRed === scoreWhite ? 0 : -1);

    const rawRed = safeArray<RawRosterPlayer>(match.players?.red);
    const rawWhite = safeArray<RawRosterPlayer>(match.players?.white);
    const gkRed = match.players?.gk_red ?? null;
    const gkWhite = match.players?.gk_white ?? null;

    const allRed = [...rawRed, ...(gkRed ? [gkRed] : [])];
    const allWhite = [...rawWhite, ...(gkWhite ? [gkWhite] : [])];

    const redIds: string[] = [];
    const whiteIds: string[] = [];

    const redRoster: RosterPlayer[] = allRed.map((p) => {
      const acc = upsertFromRoster(p);
      const id = acc?.id ?? playerIdFromObject(p);
      if (id) redIds.push(id);
      return { id, name: acc?.name ?? safeString(p?.name), avatar: avatarFor(acc?.name ?? safeString(p?.name), acc?.icon ?? p?.icon) };
    });
    const whiteRoster: RosterPlayer[] = allWhite.map((p) => {
      const acc = upsertFromRoster(p);
      const id = acc?.id ?? playerIdFromObject(p);
      if (id) whiteIds.push(id);
      return { id, name: acc?.name ?? safeString(p?.name), avatar: avatarFor(acc?.name ?? safeString(p?.name), acc?.icon ?? p?.icon) };
    });

    // Pre-tally events per playerId for THIS match
    type PerMatchEv = { g: number; a: number; og: number; yc: number; rc: number };
    const matchPlayerEvents = new Map<string, PerMatchEv>();
    const ensure = (id: string) => {
      let v = matchPlayerEvents.get(id);
      if (!v) { v = { g: 0, a: 0, og: 0, yc: 0, rc: 0 }; matchPlayerEvents.set(id, v); }
      return v;
    };

    // Mapa nome→id construído com o roster DA PARTIDA. Eventos antigos podem
    // não ter playerId/assistId; nesse caso o helper cai para o nome. Sem
    // este passo, a chave em matchPlayerEvents (nome) não bate com a chave
    // usada em processPlayer (UUID), e a assistência/gol se perde.
    const nameToIdInMatch = new Map<string, string>();
    for (const p of [...allRed, ...allWhite]) {
      const id = safeString(p?.id);
      const nm = safeString(p?.name).trim();
      if (id && nm) nameToIdInMatch.set(nm, id);
    }
    const resolveEventId = (raw: string, fallbackName: string): string => {
      if (!raw) return "";
      // Se já é um id presente na partida, mantém. Senão tenta resolver pelo nome.
      const byName = fallbackName ? nameToIdInMatch.get(fallbackName.trim()) : undefined;
      return byName ?? raw;
    };

    const events = safeArray<RawEvent>(match.events);
    for (const ev of events) {
      const type = safeString(ev.type);
      const pid = resolveEventId(eventPlayerId(ev, "player"), safeString(ev.player));
      const aid = resolveEventId(eventPlayerId(ev, "assist"), safeString(ev.assist));
      if (pid) {
        const e = ensure(pid);
        if (type === "goal") e.g += 1;
        else if (type === "own_goal") e.og += 1;
        else if (type === "yellow_card") e.yc += 1;
        else if (type === "red_card") e.rc += 1;
      }
      if (aid && type === "goal") {
        ensure(aid).a += 1;
        // Make sure we know this assister has a name
        if (!idToName.has(aid)) idToName.set(aid, safeString(ev.assist));
      }
      if (pid && !idToName.has(pid)) idToName.set(pid, safeString(ev.player));
    }

    // Per-player processing — dedupe so a player appearing twice (e.g. in roster + GK) counts once
    const processed = new Set<string>();

    const processPlayer = (
      acc: Acc | null,
      side: "red" | "white",
      status: number,
      teamGoals: number,
      conceded: number,
      teammates: string[],
      opponents: string[],
    ) => {
      if (!acc) return;
      if (processed.has(acc.id)) return;
      processed.add(acc.id);

      acc.games += 1;
      acc.totalTeamGoals += teamGoals;
      if (status === 1) acc.wins += 1;
      else if (status === -1) acc.losses += 1;
      else acc.draws += 1;

      if (status >= 0) {
        acc.currentUnbeatenStreak += 1;
        if (acc.currentUnbeatenStreak > acc.maxUnbeatenStreak) acc.maxUnbeatenStreak = acc.currentUnbeatenStreak;
      } else {
        acc.currentUnbeatenStreak = 0;
      }

      if (conceded === 0) acc.cleanSheets += 1;

      if (status === 1) {
        const margin = teamGoals - conceded;
        if (margin > acc.biggestWinMargin) {
          acc.biggestWinMargin = margin;
          acc.biggestWinScore = `${teamGoals} x ${conceded}`;
        }
      } else if (status === -1) {
        const margin = conceded - teamGoals;
        if (margin > acc.biggestLossMargin) {
          acc.biggestLossMargin = margin;
          acc.biggestLossScore = `${conceded} x ${teamGoals}`;
        }
      }

      const e = matchPlayerEvents.get(acc.id) ?? { g: 0, a: 0, og: 0, yc: 0, rc: 0 };
      acc.goals += e.g;
      acc.assists += e.a;
      acc.ownGoals += e.og;
      acc.yellow += e.yc;
      acc.red += e.rc;
      if (e.g >= 3) acc.hatTricks += 1;

      // Per-month / per-year for MVPs
      const dateObj = parseDate(match.date) ?? parseDate(sessionTimestamp);
      if (dateObj) {
        
        // Novo cálculo de MVP do Mês usando G+A (Golos + Assistências)
        if (e.g > 0 || e.a > 0) {
          const mk = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
          let mm = statsByMonth.get(mk);
          if (!mm) { mm = new Map(); statsByMonth.set(mk, mm); }
          
          const currentStats = mm.get(acc.id) ?? { g: 0, a: 0 };
          currentStats.g += e.g;
          currentStats.a += e.a;
          mm.set(acc.id, currentStats);
        }

        // Campeão do ano (mantido apenas com golos, conforme original)
        if (e.g > 0) {
          const yk = dateObj.getFullYear();
          let ym = goalsByYear.get(yk);
          if (!ym) { ym = new Map(); goalsByYear.set(yk, ym); }
          ym.set(acc.id, (ym.get(acc.id) ?? 0) + e.g);
        }
      }

      // Match rating
      const matchRating = calculateMatchRating({
        status, goals: e.g, assists: e.a, ownGoals: e.og,
        teamGoals, conceded, yellow: e.yc, red: e.rc,
      });
      acc.ratings.push(matchRating);

      // Teammates / opponents counters (id-keyed)
      for (const tId of teammates) {
        if (!tId || tId === acc.id) continue;
        bump(acc.gamesWith, tId);
        if (status === 1) bump(acc.winsWith, tId);
        else if (status === -1) bump(acc.lossesWith, tId);
      }
      for (const oId of opponents) {
        if (!oId || oId === acc.id) continue;
        bump(acc.gamesAgainst, oId);
        if (status === 1) bump(acc.winsAgainst, oId);
        else if (status === -1) bump(acc.lossesAgainst, oId);
        else bump(acc.drawsAgainst, oId);
      }

      // Assists given/received based on event ids
      for (const ev of events) {
        if (safeString(ev.type) !== "goal") continue;
        const sId = eventPlayerId(ev, "player");
        const aId = eventPlayerId(ev, "assist");
        if (!sId || !aId || sId === aId) continue;
        if (sId === acc.id && aId !== acc.id) bump(acc.assistsReceived, aId);
        if (aId === acc.id && sId !== acc.id) bump(acc.assistsGiven, sId);
      }
    };

    for (const id of redIds) processPlayer(accs.get(id) ?? null, "red", redStatus, scoreRed, scoreWhite, redIds, whiteIds);
    for (const id of whiteIds) processPlayer(accs.get(id) ?? null, "white", whiteStatus, scoreWhite, scoreRed, whiteIds, redIds);

    const matchId = safeString(match.match_id ? String(match.match_id) : "") || `match-${matches.length + 1}`;
    matches.push({
      id: matchId,
      sessionId,
      date: normalizeDate(match.date) || normalizeDate(sessionTimestamp),
      duration: safeString(match.match_duration),
      teamA: "Vermelho",
      teamB: "Branco",
      scoreA: scoreRed,
      scoreB: scoreWhite,
      redRoster,
      whiteRoster,
      events: events.map((e) => ({
        type: safeString(e.type),
        player: safeString(e.player),
        playerId: safeString(e.playerId),
        assist: e.assist ? safeString(e.assist) : null,
        assistId: e.assistId ? safeString(e.assistId) : null,
        team: safeString(e.team),
        time: safeString(e.time) || undefined,
      })),
    });
  }

  // ---- 5. Build final players list --------------------------------------
  const playersAll: Player[] = [];
  for (const a of accs.values()) {
    if (a.games === 0 && (!a.totalGames || a.totalGames === 0)) continue;
    const finalNota = calculateFinalRating(a.ratings, { useBayesian: false });

    const advanced: PlayerAdvanced = {
      topAssisted: findMaxBucket(a.assistsGiven, idToName),
      topAssister: findMaxBucket(a.assistsReceived, idToName),
      mostPlayedWith: findMaxBucket(a.gamesWith, idToName),
      mostWinsWith: findMaxBucket(a.winsWith, idToName, { ratioBaseMap: a.gamesWith, minBase: K_MIN_BASE_FOR_RATIO }),
      mostLossesWith: findMaxBucket(a.lossesWith, idToName, { ratioBaseMap: a.gamesWith, minBase: K_MIN_BASE_FOR_RATIO }),
      mostPlayedAgainst: findMaxBucket(a.gamesAgainst, idToName),
      mostWinsAgainst: findMaxBucket(a.winsAgainst, idToName, { ratioBaseMap: a.gamesAgainst, minBase: K_MIN_BASE_FOR_RATIO }),
      mostLossesAgainst: findMaxBucket(a.lossesAgainst, idToName, { ratioBaseMap: a.gamesAgainst, minBase: K_MIN_BASE_FOR_RATIO }),
      mostDrawsAgainst: findMaxBucket(a.drawsAgainst, idToName),
      hatTricks: a.hatTricks,
      cleanSheets: a.cleanSheets,
      ownGoals: a.ownGoals,
      yellowCards: a.yellow,
      redCards: a.red,
      biggestWinScore: a.biggestWinScore,
      biggestLossScore: a.biggestLossScore,
      maxUnbeatenStreak: a.maxUnbeatenStreak,
      totalTeamGoals: a.totalTeamGoals,
    };

    playersAll.push({
      id: a.id,
      name: a.name,
      avatar: avatarFor(a.name, a.icon),
      rating: round1(finalNota),
      baseRating: round1(a.baseRating || K_RATING_BASE),
      matches: a.games,
      goals: a.goals,
      assists: a.assists,
      ga: a.goals + a.assists,
      wins: a.wins,
      draws: a.draws,
      losses: a.losses,
      totalGames: a.totalGames,
      advanced,
    });
  }

  // Ranking visibility: prefer players that meet min-games threshold; otherwise still
  // include them but they sort to the bottom. Pages can filter by `matches >= K_MIN_GAMES_FOR_GLOBAL_RANKING`.
  playersAll.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.ga !== a.ga) return b.ga - a.ga;
    return b.goals - a.goals;
  });

  // ---- 6. Order matches desc, sessions desc -----------------------------
  matches.sort((a, b) => {
    const ta = parseDate(a.date)?.getTime() ?? 0;
    const tb = parseDate(b.date)?.getTime() ?? 0;
    return tb - ta;
  });
  sessions.sort((a, b) => {
    const ta = parseDate(a.timestamp)?.getTime() ?? 0;
    const tb = parseDate(b.timestamp)?.getTime() ?? 0;
    return tb - ta;
  });

  // ---- 7. Monthly MVPs / year champion ----------------------------------
  const playerById = new Map(playersAll.map((p) => [p.id, p]));
  const monthlyMVPs: MonthlyMVP[] = [];
  
  // Vamos buscar as chaves dos meses que têm estatísticas e ordená-las
  const monthsSorted = Array.from(statsByMonth.keys()).sort().reverse();
  
  for (const mk of monthsSorted) {
    const map = statsByMonth.get(mk)!;
    let topId = ""; 
    let topGA = -1;
    let topG = 0;
    let topA = 0;
    
    // Procura o jogador com mais G+A nesse mês
    for (const [id, st] of map) {
      const ga = st.g + st.a;
      // Critério de desempate: quem tiver mais golos vence o empate.
      if (ga > topGA || (ga === topGA && st.g > topG)) { 
        topId = id; 
        topGA = ga; 
        topG = st.g; 
        topA = st.a; 
      }
    }
    
    if (!topId) continue;
    
    const [y, mo] = mk.split("-").map(Number);
    const label = `${PT_MONTHS_FULL[(mo || 1) - 1]} ${y}`;
    const p = playerById.get(topId);
    
    monthlyMVPs.push({
      month: label,
      player: p?.name ?? idToName.get(topId) ?? topId,
      avatar: p?.avatar ?? avatarFor(idToName.get(topId) ?? topId),
      goals: topG, // Mantemos os golos reais para não quebrar componentes existentes
      assists: topA,
      ga: topGA,
      rawMonthKey: mk // Propriedade temporária para nos ajudar no próximo passo
    } as MonthlyMVP & { rawMonthKey: string });
  }

  // Lógica Especial: Identificar o MVP do mês de calendário anterior
  const today = new Date();
  let prevMonth = today.getMonth(); // 0 a 11 (onde 0 = Jan, 1 = Fev...)
  let prevYear = today.getFullYear();
  
  if (prevMonth === 0) { 
    // Se o mês atual for Janeiro (0), o mês passado é Dezembro (12) do ano anterior
    prevMonth = 12; 
    prevYear -= 1;  
  }
  
  // Monta a chave exata do mês passado (Ex: "2026-04" para o mês passado em relação a Maio 2026)
  const targetMonthKey = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
  
  // Procura na nossa lista recém-gerada se houve um MVP nesse mês exato
  const lastMonthMVPRaw = monthlyMVPs.find((m: any) => m.rawMonthKey === targetMonthKey) || null;
  const lastMonthMVP = lastMonthMVPRaw;

  // Limpeza: remove a chave temporária para não 'sujar' o objeto final
  monthlyMVPs.forEach(m => delete (m as any).rawMonthKey);

  let yearChampion: YearChampion | null = null;
  if (goalsByYear.size > 0) {
    const years = Array.from(goalsByYear.keys()).sort((a, b) => b - a);
    const latest = years[0];
    const map = goalsByYear.get(latest)!;
    let topId = ""; let topGoals = 0;
    for (const [id, g] of map) if (g > topGoals) { topId = id; topGoals = g; }
    if (topId) {
      const p = playerById.get(topId);
      yearChampion = {
        player: p?.name ?? idToName.get(topId) ?? topId,
        avatar: p?.avatar ?? avatarFor(idToName.get(topId) ?? topId),
        year: latest,
        goals: topGoals,
        rating: p?.rating ?? K_RATING_BASE,
      };
    }
  }

  // ---- 8. Next match (next Saturday at 16h, or live in-progress session) -
  let nextMatch: NextMatch | null = null;
  const upcomingSession = sessions.find((s) => {
    if (s.status !== "Em Andamento") return false;
    const t = parseDate(s.timestamp)?.getTime();
    return t != null && t > Date.now();
  });
  if (upcomingSession) {
    nextMatch = { date: normalizeDate(upcomingSession.timestamp) || upcomingSession.timestamp, location: "Em andamento", address: "—" };
  } else {
    const now = new Date();
    const sat = new Date(now);
    sat.setHours(16, 0, 0, 0);
    const dow = sat.getDay();
    const delta = dow === 6 ? (sat.getTime() <= now.getTime() ? 7 : 0) : (6 - dow + 7) % 7 || 7;
    sat.setDate(sat.getDate() + delta);
    nextMatch = { date: formatLocalIso(sat), location: "Próximo sábado", address: "A definir" };
  }

  console.log(
    `${TAG} concluído:`,
    `${playersAll.length} jogadores,`,
    `${matches.length} partidas,`,
    `${sessions.length} sessões,`,
    `${monthlyMVPs.length} MVPs,`,
    `campeão ano: ${yearChampion?.player ?? "—"}`,
  );

  return {
    groupName, groupId,
    players: playersAll,
    matches,
    sessions,
    monthlyMVPs,
    lastMonthMVP,    // <-- Linha adicionada aqui!
    yearChampion,
    nextMatch,
  };
}
