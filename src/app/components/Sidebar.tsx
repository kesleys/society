import { LayoutDashboard, BarChart3, History, Users, Trophy, Calendar, Zap, Handshake, Newspaper, BookOpen } from "lucide-react";

export type Section = "dashboard" | "stats" | "history" | "members" | "hall" | "calendar" | "sponsors" | "press" | "wiki";

const items: { id: Section; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "stats", label: "Estatísticas", icon: BarChart3 },
  { id: "history", label: "Histórico", icon: History },
  { id: "members", label: "Plantel", icon: Users },
  { id: "hall", label: "Hall of Fame", icon: Trophy },
  { id: "calendar", label: "Calendário", icon: Calendar },
  { id: "sponsors", label: "Patrocinadores", icon: Handshake },
  { id: "press", label: "Redação", icon: Newspaper },
  { id: "wiki", label: "Wiki", icon: BookOpen },
];

export function Sidebar({ active, onChange }: { active: Section; onChange: (s: Section) => void }) {
  return (
    <aside className="w-64 shrink-0 bg-[#252526] border-r border-[#3E3E42] h-screen sticky top-0 flex flex-col">
      <div className="px-6 py-5 flex items-center gap-2.5 border-b border-[#3E3E42]">
        <div className="w-9 h-9 rounded-md bg-[#007ACC] flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <div className="text-white tracking-tight">LIGA AMADORA</div>
          <div className="text-[11px] text-[#858585] uppercase tracking-widest">Sábados FC</div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-left ${
                isActive
                  ? "bg-[#007ACC]/15 text-white border-l-2 border-[#007ACC] -ml-[1px]"
                  : "text-[#CCCCCC] hover:text-white hover:bg-[#2A2D2E]"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#007ACC]" : ""}`} />
              <span className="text-sm">{it.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 m-3 rounded-md bg-[#2D2D30] border border-[#3E3E42]">
        <div className="text-xs text-[#858585] mb-1">Temporada</div>
        <div className="text-white">2026 / Q2</div>
        <div className="mt-2 h-1.5 rounded-full bg-[#3E3E42] overflow-hidden">
          <div className="h-full w-2/3 bg-[#89D185]" />
        </div>
      </div>
    </aside>
  );
}
