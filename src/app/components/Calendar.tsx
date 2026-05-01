import { useMemo, useState } from "react";
import { MapPin, Clock, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "../store";
import { useData } from "../DataContext";

const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

type Event = { time: string; place: string; total: number; status: string };

function eventKey(year: number, month: number, day: number) {
  return `evt-${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function CalendarView() {
  const { data } = useData();
  const sessions = data?.sessions ?? [];
  const matches = data?.matches ?? [];

  // Build event map keyed by "YYYY-MM" -> { day -> Event }
  const eventsByYearMonth = useMemo(() => {
    const map: Record<string, Record<number, Event>> = {};
    const addDate = (iso: string, status: string, place = "A definir") => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return;
      const yKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map[yKey]) map[yKey] = {};
      const day = d.getDate();
      if (!map[yKey][day]) {
        map[yKey][day] = {
          time: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          place,
          total: 14,
          status,
        };
      }
    };
    for (const s of sessions) {
      if (s.timestamp) addDate(s.timestamp, s.status || "");
    }
    for (const m of matches) {
      addDate(m.date, "Finalizado");
    }
    return map;
  }, [sessions, matches]);

  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const { presence, togglePresence } = useStore();

  const ymKey = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  const events = eventsByYearMonth[ymKey] || {};
  const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const goPrev = () => setCursor((c) => (c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 }));
  const goNext = () => setCursor((c) => (c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 }));
  const goToday = () => setCursor({ year: today.getFullYear(), month: today.getMonth() });

  const handleToggle = (day: number) => {
    const key = eventKey(cursor.year, cursor.month, day);
    togglePresence(key);
    const next = presence[key] === "in" ? "out" : "in";
    toast.success(next === "in" ? `Presença confirmada para ${day}/${cursor.month + 1}` : "Presença removida");
  };

  const confirmedFor = (day: number) => {
    const key = eventKey(cursor.year, cursor.month, day);
    const me = presence[key] === "in" ? 1 : 0;
    return ((day * 3) % 9) + 4 + me;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-white tracking-tight text-2xl mb-1">Calendário</h1>
          <p className="text-[#858585] text-sm">{monthNames[cursor.month]} {cursor.year} — sábados destacados</p>
        </div>
        <div className="flex gap-1">
          <button onClick={goPrev} className="px-3 py-1.5 rounded text-xs bg-[#2D2D30] text-[#CCCCCC] hover:bg-[#3E3E42] border border-[#3E3E42] inline-flex items-center gap-1">
            <ChevronLeft className="w-3 h-3" /> Anterior
          </button>
          <button onClick={goToday} className="px-3 py-1.5 rounded text-xs bg-[#007ACC] text-white">Hoje</button>
          <button onClick={goNext} className="px-3 py-1.5 rounded text-xs bg-[#2D2D30] text-[#CCCCCC] hover:bg-[#3E3E42] border border-[#3E3E42] inline-flex items-center gap-1">
            Próximo <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 rounded-md border border-[#3E3E42] bg-[#252526] p-5">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekdays.map((w, i) => (
              <div key={w} className={`text-center text-[10px] uppercase tracking-widest py-2 ${i === 6 ? "text-[#4FC3F7]" : "text-[#858585]"}`}>{w}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, idx) => {
              const isSat = d !== null && (idx % 7) === 6;
              const ev = d ? events[d] : null;
              const key = d ? eventKey(cursor.year, cursor.month, d) : null;
              const isMine = key ? presence[key] === "in" : false;
              const confirmed = ev && d ? confirmedFor(d) : 0;
              return (
                <button
                  key={idx}
                  disabled={!d}
                  onClick={() => ev && d && handleToggle(d)}
                  className={`aspect-square rounded p-2 text-xs border text-left transition ${
                    d === null
                      ? "border-transparent cursor-default"
                      : ev
                      ? isMine
                        ? "border-[#89D185] bg-[#89D185]/10 hover:bg-[#89D185]/15"
                        : "border-[#007ACC]/50 bg-[#007ACC]/10 hover:bg-[#007ACC]/15"
                      : isSat
                      ? "border-[#3E3E42] bg-[#1E1E1E] cursor-default"
                      : "border-[#3E3E42] bg-[#1E1E1E] cursor-default"
                  }`}
                >
                  {d && (
                    <>
                      <div className={`tabular-nums ${isSat ? "text-white" : "text-[#CCCCCC]"}`}>{d}</div>
                      {ev && (
                        <div className="mt-1 text-[10px] text-[#CCCCCC] leading-tight">
                          <div>{ev.time}</div>
                          <div className={`mt-0.5 inline-block px-1 rounded bg-[#252526] border tabular-nums ${isMine ? "border-[#89D185] text-[#89D185]" : "border-[#3E3E42] text-[#CCCCCC]"}`}>
                            {confirmed}/{ev.total}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-3">
          <h2 className="text-white tracking-tight">Próximas Pelas</h2>
          {Object.keys(events).length === 0 && (
            <div className="rounded-md border border-[#3E3E42] bg-[#252526] p-5 text-sm text-[#858585]">Nenhuma pelada agendada esse mês.</div>
          )}
          {Object.entries(events).map(([day, ev]) => {
            const dayNum = Number(day);
            const key = eventKey(cursor.year, cursor.month, dayNum);
            const isMine = presence[key] === "in";
            const confirmed = confirmedFor(dayNum);
            const pct = (confirmed / ev.total) * 100;
            const ok = confirmed >= 10;
            return (
              <div key={day} className="rounded-md border border-[#3E3E42] bg-[#252526] p-4 hover:border-[#007ACC] transition">
                <div className="flex items-center justify-between">
                  <div className="text-white text-sm">{dayNum} {monthNames[cursor.month].slice(0, 3)}</div>
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${ok ? "bg-[#1E1E1E] text-[#89D185] border-[#89D185]/40" : "bg-[#1E1E1E] text-[#DCDCAA] border-[#DCDCAA]/40"}`}>
                    {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {ok ? "Confirmado" : "Faltam jogadores"}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-[#858585]">
                  <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{ev.time}</span>
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.place}</span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-[#858585] mb-1">
                    <span>Presença</span>
                    <span className="tabular-nums text-[#D4D4D4]">{confirmed}/{ev.total}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#1E1E1E] border border-[#3E3E42] overflow-hidden">
                    <div className="h-full bg-[#89D185]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(dayNum)}
                  className={`mt-3 w-full px-3 py-1.5 rounded-md text-xs transition inline-flex items-center justify-center gap-1.5 ${
                    isMine
                      ? "bg-[#89D185]/15 border border-[#89D185]/50 text-[#89D185]"
                      : "bg-[#007ACC] text-white hover:bg-[#1F8AD2]"
                  }`}
                >
                  {isMine ? <><Check className="w-3 h-3" /> Estou dentro</> : <>Confirmar presença</>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
