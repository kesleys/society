// All mock data has been removed. Pages now consume real data through useData()
// from "../DataContext", which fetches from Firestore (see src/app/firebase.ts).
//
// This file remains for shared type re-exports so existing imports keep working.

export const ACCENT = "#00ff88";

export type {
  Player,
  Match,
  PlayerAdvanced,
  AdvancedBucket,
  RosterPlayer,
  MatchEvent,
  SessionInfo,
  MonthlyMVP,
  YearChampion,
  NextMatch,
  TranslatedData,
} from "../services/fetchAndTranslateData";

export type Champion = {
  month: string;
  player: string;
  avatar: string;
  medal: "gold" | "silver" | "bronze";
};
