// Documentação: Importamos o 'useState' do React para criar a memória do nosso componente
import { useState } from "react";
import { LayoutDashboard, BarChart3, History, Users, Trophy, Calendar, Handshake, Newspaper, BookOpen } from "lucide-react";

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
  // Documentação: Criamos o estado. Por padrão, começa como 'false' (aberta).
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside 
      // Documentação: Alteramos 'w-64' para ser dinâmico. Se 'isCollapsed' for true, fica 'w-20', senão 'w-64'.
      // Adicionamos 'transition-all duration-300' para a animação de encolher ser suave.
      className={`shrink-0 bg-[#252526] border-r border-[#3E3E42] h-screen sticky top-0 flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      
      {/* Documentação: Transformamos esta div num botão. Ao clicar, inverte o valor de 'isCollapsed' */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        title={isCollapsed ? "Expandir menu" : "Recolher menu"}
        className={`px-6 py-5 flex items-center border-b border-[#3E3E42] hover:bg-[#2A2D2E] transition-colors cursor-pointer w-full text-left ${
          isCollapsed ? "justify-center px-0" : "gap-2.5"
        }`}
      >
        <div className="w-9 h-9 rounded-md flex items-center justify-center overflow-hidden border border-[#3E3E42] shrink-0">
          <img 
            src={`${import.meta.env.BASE_URL}society_favicon.jpeg`} 
            alt="Logo Society Futsal Club" 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Documentação: Escondemos o texto se a barra estiver recolhida */}
        {!isCollapsed && (
          <div className="whitespace-nowrap overflow-hidden transition-all duration-300">
            <div className="text-white tracking-tight">Society</div>
            <div className="text-[11px] text-[#858585] uppercase tracking-widest">Futsal Club</div>
          </div>
        )}
      </button>

      <nav className="flex-1 p-3 space-y-1 overflow-x-hidden">
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.id;
          return (
            <button
              key={it.id}
              onClick={() => onChange(it.id)}
              title={isCollapsed ? it.label : ""} // Documentação: Mostra uma dica de ferramenta (tooltip) se estiver recolhido
              className={`w-full flex items-center py-2 rounded-md transition-colors ${
                // Documentação: Se recolhido, centra o ícone. Se aberto, alinha à esquerda com espaço.
                isCollapsed ? "justify-center px-0" : "gap-3 px-3 text-left"
              } ${
                isActive
                  ? "bg-[#007ACC]/15 text-white border-l-2 border-[#007ACC] -ml-[1px]"
                  : "text-[#CCCCCC] hover:text-white hover:bg-[#2A2D2E]"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#007ACC]" : ""}`} />
              
              {/* Documentação: Escondemos o texto do botão se a barra estiver recolhida */}
              {!isCollapsed && (
                <span className="text-sm whitespace-nowrap overflow-hidden">{it.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Documentação: Escondemos o rodapé da temporada inteiro se a barra estiver recolhida */}
      {!isCollapsed && (
        <div className="p-4 m-3 rounded-md bg-[#2D2D30] border border-[#3E3E42] whitespace-nowrap overflow-hidden transition-all duration-300">
          <div className="text-xs text-[#858585] mb-1">Temporada</div>
          <div className="text-white">2026 / Q2</div>
          <div className="mt-2 h-1.5 rounded-full bg-[#3E3E42] overflow-hidden">
            <div className="h-full w-2/3 bg-[#89D185]" />
          </div>
        </div>
      )}

    </aside>
  );
}