// Documentação: Importações do lucide-react. O 'Zap' foi removido desta lista.
import { LayoutDashboard, BarChart3, History, Users, Trophy, Calendar, Handshake, Newspaper, BookOpen } from "lucide-react";

export type Section = "dashboard" | "stats" | "history" | "members" | "hall" | "calendar" | "sponsors" | "press" | "wiki";

// Documentação: Lista de itens do menu lateral
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
      
      {/* Documentação: Cabeçalho da Sidebar (Logo e Título) */}
      <div className="px-6 py-5 flex items-center gap-2.5 border-b border-[#3E3E42]">
        
        {/* Documentação: Container da imagem. Usamos overflow-hidden para garantir que as bordas fiquem arredondadas. */}
        <div className="w-9 h-9 rounded-md flex items-center justify-center overflow-hidden border border-[#3E3E42]">
          
          {/* Documentação: A tag img usa o BASE_URL para não quebrar no GitHub Pages. 
              O object-cover garante que a imagem preenche o espaço sem ficar esticada. */}
          <img 
            src={`${import.meta.env.BASE_URL}society_favicon.jpeg`} 
            alt="Logo Society Futsal Club" 
            className="w-full h-full object-cover"
          />
        </div>

        <div>
          <div className="text-white tracking-tight">Society</div>
          <div className="text-[11px] text-[#858585] uppercase tracking-widest">Futsal Club</div>
        </div>
      </div>

      {/* Documentação: Menu de navegação principal */}
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

      {/* Documentação: Rodapé da Sidebar indicando a temporada atual */}
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