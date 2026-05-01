import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { fetchAndTranslateData, type TranslatedData } from "./services/fetchAndTranslateData";
import { DEFAULT_SYNC_CODE } from "./firebase";

const SYNC_KEY = "sabados-fc-sync-code";

type DataState = {
  data: TranslatedData | null;
  loading: boolean;
  error: string | null;
  syncCode: string;
  setSyncCode: (s: string) => void;
  refresh: () => void;
};

const Ctx = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [syncCode, setSyncCodeState] = useState<string>(() => {
    try {
      return localStorage.getItem(SYNC_KEY) || DEFAULT_SYNC_CODE;
    } catch {
      return DEFAULT_SYNC_CODE;
    }
  });
  const [data, setData] = useState<TranslatedData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const setSyncCode = useCallback((s: string) => {
    setSyncCodeState(s);
    try { localStorage.setItem(SYNC_KEY, s); } catch {}
  }, []);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAndTranslateData(syncCode)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Falha ao carregar dados");
        setData(null);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [syncCode, tick]);

  return (
    <Ctx.Provider value={{ data, loading, error, syncCode, setSyncCode, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("DataProvider missing");
  return v;
}
