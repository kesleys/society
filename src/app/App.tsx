import { useMemo, useRef, useState, useEffect } from "react";
import { Search, Bell, Loader2, AlertTriangle, Download } from "lucide-react";
import { Toaster } from "sonner";
import { Sidebar, type Section } from "./components/Sidebar";
import { Dashboard } from "./components/Dashboard";
import { Stats } from "./components/Stats";
import { History } from "./components/History";
import { Members } from "./components/Members";
import { HallOfFame } from "./components/HallOfFame";
import { CalendarView } from "./components/Calendar";
import { Sponsors } from "./components/Sponsors";
import { Press } from "./components/Press";
import { Wiki } from "./components/Wiki";
import { StoreProvider, useStore } from "./store";
import { DataProvider, useData } from "./DataContext";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";

function Header({ onNavigate }: { onNavigate: (s: Section) => void }) {
  const { notifications, markAllRead } = useStore();
  const { data } = useData();
  const players = data?.players ?? [];
  const [q, setQ] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) {
        setShowResults(false);
        setShowNotifs(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const navTargets: { label: string; section: Section; sub: string }[] = [
    { label: "Dashboard", section: "dashboard", sub: "Visão geral" },
    { label: "Estatísticas", section: "stats", sub: "Leaderboard" },
    { label: "Histórico", section: "history", sub: "Partidas anteriores" },
    { label: "Plantel", section: "members", sub: "Jogadores" },
    { label: "Hall of Fame", section: "hall", sub: "Campeões" },
    { label: "Calendário", section: "calendar", sub: "Próximas peladas" },
    { label: "Patrocinadores", section: "sponsors", sub: "Parceiros" },
    { label: "Redação", section: "press", sub: "Matérias" },
    { label: "Wiki", section: "wiki", sub: "Regras e história" },
  ];

  const results = useMemo(() => {
    if (!q.trim()) return null;
    const t = q.toLowerCase();
    const ps = players.filter((p) => p.name.toLowerCase().includes(t)).slice(0, 4);
    const navs = navTargets.filter((n) => n.label.toLowerCase().includes(t));
    return { players: ps, navs };
  }, [q, players]);

  const unread = notifications.filter((n) => !n.read).length;

  const handleExportJSON = () => {
    if (!data) return;
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `site_data_export_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-[#1E1E1E]/90 border-b border-[#3E3E42] px-8 py-4 flex items-center gap-4">
      <div ref={wrap} className="flex-1 max-w-md relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858585]" />
        <input
          value={q}
          onFocus={() => setShowResults(true)}
          onChange={(e) => { setQ(e.target.value); setShowResults(true); }}
          placeholder="Buscar jogador, página, partida..."
          className="w-full pl-10 pr-4 py-2 rounded-md bg-[#3C3C3C] border border-[#3E3E42] text-sm text-[#D4D4D4] placeholder:text-[#858585] focus:outline-none focus:border-[#007ACC]"
        />
        {showResults && results && (
          <div className="absolute top-full mt-2 w-full rounded-md bg-[#252526] border border-[#3E3E42] shadow-lg overflow-hidden">
            {results.players.length > 0 && (
              <div>
                <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-[#858585] bg-[#2D2D30]">Jogadores</div>
                {results.players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { onNavigate("members"); setShowResults(false); setQ(""); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#2A2D2E] text-left"
                  >
                    <ImageWithFallback src={p.avatar} alt={p.name} className="w-7 h-7 rounded-md object-cover border border-[#3E3E42]" />
                    <span className="text-sm text-[#D4D4D4]">{p.name}</span>
                    <span className="ml-auto text-xs text-[#89D185] tabular-nums">{p.rating}</span>
                  </button>
                ))}
              </div>
            )}
            {results.navs.length > 0 && (
              <div>
                <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-[#858585] bg-[#2D2D30]">Páginas</div>
                {results.navs.map((n) => (
                  <button
                    key={n.section}
                    onClick={() => { onNavigate(n.section); setShowResults(false); setQ(""); }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-[#2A2D2E] text-left"
                  >
                    <span className="text-sm text-[#D4D4D4]">{n.label}</span>
                    <span className="ml-auto text-xs text-[#858585]">{n.sub}</span>
                  </button>
                ))}
              </div>
            )}
            {results.players.length === 0 && results.navs.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-[#858585]">Sem resultados</div>
            )}
          </div>
        )}
      </div>

      <div className="relative">
        <button onClick={() => setShowNotifs((v) => !v)} className="relative w-9 h-9 rounded-md bg-[#2D2D30] hover:bg-[#3E3E42] border border-[#3E3E42] flex items-center justify-center">
          <Bell className="w-4 h-4 text-[#CCCCCC]" />
          {unread > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#007ACC]" />}
        </button>
        {showNotifs && (
          <div className="absolute right-0 top-full mt-2 w-80 rounded-md bg-[#252526] border border-[#3E3E42] shadow-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#3E3E42]">
              <span className="text-sm text-white">Notificações</span>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-[10px] uppercase tracking-widest text-[#4FC3F7] hover:underline">
                  Marcar todas
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-[#858585]">Sem notificações</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="px-4 py-3 border-b border-[#3E3E42] last:border-b-0 hover:bg-[#2A2D2E]">
                    <div className="flex items-center gap-2">
                      <div className={`text-sm ${n.read ? "text-[#CCCCCC]" : "text-white"}`}>{n.title}</div>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#007ACC]" />}
                    </div>
                    <div className="text-xs text-[#858585] mt-0.5">{n.body}</div>
                    <div className="text-[10px] text-[#858585] mt-1 tabular-nums">{new Date(n.date).toLocaleDateString("pt-BR")}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <button onClick={handleExportJSON} title="Baixar dados brutos do site" className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#2D2D30] hover:bg-[#3E3E42] border border-[#3E3E42] text-sm text-[#CCCCCC] ml-2">
        <Download className="w-4 h-4" />
        <span className="hidden md:inline">Baixar Dados</span>
      </button>

      <div className="flex items-center gap-3 pl-4 border-l border-[#3E3E42]">
        <div className="text-right">
          <div className="text-sm text-white">Você</div>
          <div className="text-[10px] text-[#858585] uppercase tracking-widest">Admin</div>
        </div>
        <div className="w-9 h-9 rounded-full bg-[#007ACC] flex items-center justify-center text-white text-sm">A</div>
      </div>
    </header>
  );
}

function LoadingScreen() {
  return (
    <div className="dark min-h-screen bg-[#1E1E1E] text-[#D4D4D4] flex items-center justify-center" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="flex items-center gap-3 text-[#CCCCCC]">
        <Loader2 className="w-5 h-5 animate-spin text-[#007ACC]" />
        <span className="text-sm">Carregando dados...</span>
      </div>
    </div>
  );
}

function ConfigScreen({ message }: { message?: string }) {
  const { syncCode, setSyncCode, refresh } = useData();
  const [val, setVal] = useState(syncCode);
  return (
    <div className="dark min-h-screen bg-[#1E1E1E] text-[#D4D4D4] flex items-center justify-center p-6" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-8 max-w-md w-full">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-[#DCDCAA]" />
          <h1 className="text-white text-lg tracking-tight">Sem dados</h1>
        </div>
        <p className="text-sm text-[#CCCCCC] mb-1">
          {message || "Não foi possível carregar dados do Firestore."}
        </p>
        <p className="text-xs text-[#858585] mb-5">
          Configure suas credenciais em <code className="text-[#4FC3F7]">src/app/firebase.ts</code> e informe o código de sincronização do seu grupo abaixo.
        </p>
        <label className="text-[10px] uppercase tracking-widest text-[#858585] block mb-2">Sync code</label>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="ex.: meu-grupo-123"
          className="w-full px-3 py-2 rounded-md bg-[#3C3C3C] border border-[#3E3E42] text-sm text-[#D4D4D4] focus:outline-none focus:border-[#007ACC] mb-4"
        />
        <button
          onClick={() => { setSyncCode(val); refresh(); }}
          className="w-full px-4 py-2 rounded-md bg-[#007ACC] text-white text-sm hover:bg-[#1F8AD2]"
        >
          Tentar novamente
        </button>
      </div>
      <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: "#252526", border: "1px solid #3E3E42", color: "#D4D4D4" } }} />
    </div>
  );
}

function Inner({ section, setSection }: { section: Section; setSection: (s: Section) => void }) {
  const { data, loading, error } = useData();

  if (loading) return <LoadingScreen />;
  if (error) return <ConfigScreen message={error} />;
  if (!data) return <ConfigScreen />;

  return (
    <div className="dark min-h-screen bg-[#1E1E1E] text-[#D4D4D4]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="flex">
        <Sidebar active={section} onChange={setSection} />
        <main className="flex-1 min-w-0">
          <Header onNavigate={setSection} />
          <div className="p-8 max-w-[1400px]">
            {section === "dashboard" && <Dashboard />}
            {section === "stats" && <Stats />}
            {section === "history" && <History />}
            {section === "members" && <Members />}
            {section === "hall" && <HallOfFame />}
            {section === "calendar" && <CalendarView />}
            {section === "sponsors" && <Sponsors />}
            {section === "press" && <Press />}
            {section === "wiki" && <Wiki />}
          </div>
        </main>
      </div>
      <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { background: "#252526", border: "1px solid #3E3E42", color: "#D4D4D4" } }} />
    </div>
  );
}

export default function App() {
  const [section, setSection] = useState<Section>("dashboard");
  return (
    <DataProvider>
      <StoreProvider navigate={setSection}>
        <Inner section={section} setSection={setSection} />
      </StoreProvider>
    </DataProvider>
  );
}
