import { useState } from "react";
import { Search, BookOpen, ChevronRight, Hash, FileText, Shield, Coins, Users, Trophy } from "lucide-react";
import { Modal } from "./Modal";

import { useData } from "../DataContext";
import type { RatingRules } from "../services/fetchAndTranslateData";

type Article = { title: string; preview: string; body: string };
type Section = { id: string; title: string; icon: any; articles: Article[] };

const getSections = (rules: RatingRules | undefined): Section[] => [
  {
    id: "regras",
    title: "Regras Oficiais",
    icon: Shield,
    articles: [
      { title: "Como funciona a pelada de sábado", preview: "Tempo de jogo, número de jogadores, sistema de troca de times.", body: "A pelada começa às 16h em ponto. São dois tempos de 30 minutos cada, com intervalo de 5 minutos para hidratação.\n\nCada time tem 5 jogadores em quadra. A regra do \"quem fez gol fica\" só vale nos primeiros 15 minutos do segundo tempo.\n\nSubstituições livres, sem limite. Goleiro pode trocar com jogador de linha desde que ambos concordem." },
      { title: "Faltas, cartões e diplomacia", preview: "Como resolvemos lances duvidosos sem brigar.", body: "Não há juiz oficial. Lances duvidosos são resolvidos por consenso. Se ninguém concordar, lateral para o time que sofreu a falta.\n\nFalta com intenção de machucar resulta em advertência. Reincidência: rodízio para o banco por 5 minutos." },
      { title: "Critério de confirmação semanal", preview: "Confirmação até quinta às 23h59.", body: "Todo jogador deve confirmar presença até quinta-feira às 23h59 no canal oficial.\n\nQuem furar (confirmar e não aparecer) paga uma rodada de cerveja na próxima pelada." },
    ],
  },
  {
    id: "rating",
    title: "Sistema de Rating",
    icon: Hash,
    articles: [
      { title: "Como o Rating é calculado", preview: "Base Bayesiana com pesos de eventos por partida.", body: `A nota do jogador é calculada utilizando a Média Ponderada das partidas (com mais peso para jogos recentes) e um limitador Bayesiano para penalizar/bonificar volume de jogo.

Cada partida jogada inicia com uma Nota Base de ${rules?.base ?? 6.5} e sofre os seguintes ajustes com base no desempenho:

- Gols: +${rules?.goal ?? 0.9} por gol
- Assistências: +${rules?.assist ?? 0.8} por assistência
- Vitória do time: +${rules?.win ?? 1.5}
- Derrota do time: ${rules?.loss ?? -1.5}
- Cartão Amarelo: ${rules?.yellow ?? -1.0}
- Cartão Vermelho: ${rules?.red ?? -2.0}
- Gol Contra: ${rules?.own_goal ?? -1.0}

A média final resultante consolida o ranking da turma.` },
      { title: "Rebalanceamento mensal", preview: "Critério para evitar que um craque jogue sempre no mesmo time.", body: "No início de cada mês os times são redistribuídos com base no rating atual. O algoritmo busca diferença máxima de 5 pontos entre as somas dos times." },
    ],
  },
  {
    id: "premios",
    title: "Prêmios & Hall of Fame",
    icon: Trophy,
    articles: [
      { title: "Melhor do Mês", preview: "Quem leva, como vota e quais critérios entram na escolha.", body: "O MVP do mês é o jogador com maior G+A no período, considerando empate como vantagem ao maior número de vitórias.\n\nO ganhador entra na Galeria de Campeões e recebe um troféu simbólico." },
      { title: "Melhor do Ano", preview: "O grande prêmio: troféu, plaquinha na parede e respeito eterno.", body: "No fim do ano, o jogador com a melhor combinação de Rating + presença leva a coroa anual.\n\nO troféu fica em rodízio: um mês na casa de cada vencedor anterior." },
    ],
  },
  {
    id: "financas",
    title: "Finanças da Liga",
    icon: Coins,
    articles: [
      { title: "Mensalidade e rateio do campo", preview: "Como dividimos a conta.", body: "Mensalidade: R$ 80 por jogador. Pagamento até o dia 5 via PIX para o tesoureiro.\n\nA mensalidade cobre quadra, bola, coletes e taxa do app." },
      { title: "Caixinha do bar pós-jogo", preview: "Ninguém sai sem pagar a parte.", body: "A conta do bar é dividida igualmente entre os presentes. Quem foi e não bebeu paga só a taxa de couvert (1/3 da conta total dividido)." },
    ],
  },
  {
    id: "plantel",
    title: "Plantel & Convocação",
    icon: Users,
    articles: [
      { title: "Como entrar na turma", preview: "Indicação + 3 peladas como avaliação.", body: "Novos jogadores entram por indicação de algum membro ativo. A avaliação é feita ao longo de 3 peladas observando comportamento, técnica e pontualidade." },
      { title: "Política de licença e retorno", preview: "Quem sumir mais de 2 meses precisa reconfirmar.", body: "Ausência prolongada (60 dias sem aparecer) abre vaga na turma. O retorno depende de vaga aberta e nova confirmação no grupo." },
    ],
  },
  {
    id: "historia",
    title: "História do Sábados FC",
    icon: FileText,
    articles: [
      { title: "A origem (2019 — o churrasco)", preview: "Como uma resenha virou liga amadora com tabela.", body: "Tudo começou em um churrasco de aniversário em 2019, quando 8 amigos resolveram alugar uma quadra na semana seguinte. A pelada virou compromisso fixo." },
      { title: "Marcos importantes", preview: "Primeira goleada, primeiro hat-trick e a famosa final do empate de 6x6.", body: "2020: primeira goleada histórica (10x1).\n2022: primeiro hat-trick oficial.\n2026: o lendário 6x6 com 7 viradas no placar." },
    ],
  },
];

export function Wiki() {
  const { data } = useData();
  const sections = getSections(data?.ratingRules);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState(sections[0].id);
  const [reading, setReading] = useState<{ section: string; article: Article } | null>(null);
  const active = sections.find((s) => s.id === activeId)!;

  const filtered = query
    ? sections.flatMap((s) =>
        s.articles
          .filter((a) => (a.title + a.preview + a.body).toLowerCase().includes(query.toLowerCase()))
          .map((a) => ({ section: s.title, article: a }))
      )
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-white tracking-tight text-2xl mb-1">Wiki</h1>
        <p className="text-[#858585] text-sm">Tudo que rege a vida da liga em um só lugar</p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858585]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar na wiki..."
          className="w-full pl-10 pr-4 py-2 rounded-md bg-[#3C3C3C] border border-[#3E3E42] text-sm text-[#D4D4D4] placeholder:text-[#858585] focus:outline-none focus:border-[#007ACC]"
        />
      </div>

      {filtered ? (
        <div className="rounded-md border border-[#3E3E42] bg-[#252526]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-[#858585] text-sm">Nada encontrado para "{query}"</div>
          ) : (
            filtered.map((r, i) => (
              <button
                key={i}
                onClick={() => setReading(r)}
                className="w-full text-left p-4 border-b border-[#3E3E42] last:border-b-0 hover:bg-[#2A2D2E]"
              >
                <div className="text-[10px] uppercase tracking-widest text-[#4FC3F7]">{r.section}</div>
                <div className="text-[#D4D4D4] mt-1">{r.article.title}</div>
                <div className="text-xs text-[#858585] mt-1">{r.article.preview}</div>
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 md:col-span-4 lg:col-span-3 rounded-md border border-[#3E3E42] bg-[#252526] p-2 h-fit">
            {sections.map((s) => {
              const Icon = s.icon;
              const isActive = s.id === activeId;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded text-left transition ${
                    isActive ? "bg-[#007ACC]/15 text-white border-l-2 border-[#007ACC] -ml-[1px]" : "text-[#CCCCCC] hover:bg-[#2A2D2E]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#007ACC]" : "text-[#858585]"}`} />
                  <span className="text-sm">{s.title}</span>
                  <ChevronRight className="w-3 h-3 ml-auto text-[#858585]" />
                </button>
              );
            })}
          </aside>

          <div className="col-span-12 md:col-span-8 lg:col-span-9 rounded-md border border-[#3E3E42] bg-[#252526] p-6">
            <div className="flex items-center gap-3 pb-4 border-b border-[#3E3E42]">
              <BookOpen className="w-5 h-5 text-[#4FC3F7]" />
              <h2 className="text-white tracking-tight text-lg">{active.title}</h2>
              <span className="ml-auto text-xs text-[#858585]">{active.articles.length} artigo(s)</span>
            </div>
            <div className="mt-4 divide-y divide-[#3E3E42]">
              {active.articles.map((a) => (
                <button
                  key={a.title}
                  onClick={() => setReading({ section: active.title, article: a })}
                  className="w-full text-left py-4 group"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#858585]" />
                    <span className="text-[#D4D4D4] group-hover:text-white tracking-tight">{a.title}</span>
                    <ChevronRight className="w-3 h-3 ml-auto text-[#858585] group-hover:text-[#4FC3F7]" />
                  </div>
                  <p className="text-sm text-[#858585] mt-1.5 ml-6">{a.preview}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {reading && (
        <Modal open onClose={() => setReading(null)} title={reading.article.title} size="lg">
          <div className="text-[10px] uppercase tracking-widest text-[#4FC3F7] mb-3">{reading.section}</div>
          <p className="text-[#D4D4D4] leading-relaxed whitespace-pre-line">{reading.article.body}</p>
        </Modal>
      )}
    </div>
  );
}
