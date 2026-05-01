# Sábados FC / Fut do INF — Documentação

Aplicação web em **React + TypeScript + Tailwind CSS v4** para acompanhar uma liga amadora de futebol/futsal. Todos os dados exibidos são lidos em tempo de execução do **Firebase Firestore** — não há dados mockados em produção.

---

## Sumário

1. [Estrutura do projeto](#1-estrutura-do-projeto)
2. [Como funciona a integração com o Firebase](#2-como-funciona-a-integração-com-o-firebase)
3. [Onde mexer (passo a passo)](#3-onde-mexer-passo-a-passo)
4. [Formato esperado dos dados no Firestore](#4-formato-esperado-dos-dados-no-firestore)
5. [Pipeline de tradução (`fetchAndTranslateData`)](#5-pipeline-de-tradução-fetchandtranslatedata)
6. [Cálculos detalhados de cada estatística](#6-cálculos-detalhados-de-cada-estatística)
7. [Páginas e o que cada uma consome](#7-páginas-e-o-que-cada-uma-consome)
8. [Estado local (UGC) — `store.tsx`](#8-estado-local-ugc--storetsx)
9. [Como melhorar no futuro](#9-como-melhorar-no-futuro)

---

## 1. Estrutura do projeto

```
src/app/
├── App.tsx                       # raiz: providers, header, sidebar, roteamento por seção
├── firebase.ts                   # ⚠️ PLACEHOLDER — coloque suas credenciais aqui
├── DataContext.tsx               # provider que busca, cacheia e expõe os dados do Firebase
├── store.tsx                     # estado local (patrocinadores, redação, notificações)
├── services/
│   └── fetchAndTranslateData.ts  # leitor Firestore + tradutor para o formato do app
└── components/
    ├── data.ts                   # SOMENTE tipos (Player, Match, Champion, etc.)
    ├── Dashboard.tsx             # visão geral, MVP do mês, próximo jogo, últimas partidas
    ├── Stats.tsx                 # tabela de classificação + filtros + pódio
    ├── History.tsx               # histórico agrupado por mês/dia
    ├── Members.tsx               # plantel completo
    ├── HallOfFame.tsx            # MVPs do mês + campeão do ano
    ├── Calendar.tsx              # calendário de sessões e partidas
    ├── PlayerCard.tsx            # modal com stats avançadas
    ├── Sponsors.tsx, Press.tsx, Wiki.tsx   # conteúdo gerado pelo usuário (UGC)
    ├── Modal.tsx, Sidebar.tsx
    └── ui/, figma/               # primitivos reutilizáveis
```

**Pontos-chave:**
- Não há rotas de URL — a navegação é trocando o estado `Section` em `App.tsx`.
- **Dois sistemas de estado distintos**:
  1. **DataContext** → dados do Firebase (read-only do ponto de vista do app).
  2. **Store** → dados locais persistidos em `localStorage` (patrocinadores, matérias, notificações).

---

## 2. Como funciona a integração com o Firebase

### Fluxo de carregamento

```
App.tsx
  └─ <DataProvider>                     (DataContext.tsx)
       │
       ├─ lê syncCode do localStorage ou usa DEFAULT_SYNC_CODE
       ├─ chama fetchAndTranslateData(syncCode)
       │     │
       │     └─ services/fetchAndTranslateData.ts
       │          ├─ getDoc(doc(db, "sync_data", syncCode))
       │          ├─ defensivamente parseia sessions_data[].history[]
       │          └─ retorna { players, matches, sessions, monthlyMVPs, yearChampion, nextMatch }
       │
       ├─ enquanto carrega → <LoadingScreen />
       ├─ se der erro / sem dados → <ConfigScreen /> (input de syncCode + botão "Tentar novamente")
       └─ se ok → <Inner /> (todas as páginas consomem useData())
```

### Onde os dados vivem no Firestore

O documento que o app lê é:

```
Firestore
└── coleção "sync_data"
    └── documento "{seuSyncCode}"
        └── { group_id, group_name, sessions_data: [...], ... }
```

O **syncCode** é o ID do documento. Ele pode ser configurado em dois lugares:

1. Hardcoded em `firebase.ts` (`DEFAULT_SYNC_CODE`) — usado como fallback.
2. Digitado pelo usuário na tela de configuração (`ConfigScreen` em `App.tsx`) — fica salvo em `localStorage["sabados-fc-sync-code"]`.

O usuário tem prioridade. Se ele já digitou um código, esse valor é usado mesmo que `firebase.ts` mude.

### Cache e refresh

Não há cache persistente dos dados do Firebase no momento. Toda vez que o `syncCode` muda ou `refresh()` é chamado, busca-se novamente. Para forçar atualização: chamar `useData().refresh()`.

---

## 3. Onde mexer (passo a passo)

### 3.0. Ícones dos jogadores

Coloque os PNG/WEBP/JPG/SVG dos jogadores em **`public/assets/players_icons/`**. O nome do arquivo precisa bater com o campo `icon` no Firestore (ex.: `assets/players_icons/messi.png`). Quando o arquivo não existe ou `icon` é `null`, gera-se avatar com as iniciais via `ui-avatars.com`.

### 3.1. Configurar suas credenciais Firebase

Abra `src/app/firebase.ts` e substitua os placeholders:

```ts
export const firebaseConfig = {
  apiKey: "AIza...",                          // ← seu apiKey
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc",
};

export const DEFAULT_SYNC_CODE = "grupo_1773427387405"; // ← seu sync code
```

Onde achar isso: Console Firebase → Project settings → "Your apps" → copiar o objeto de configuração do app web.

### 3.2. Mudar o sync code via UI

Se você não quer hardcodar o código no arquivo, deixe `DEFAULT_SYNC_CODE = ""` e o app abrirá direto a `ConfigScreen`. Digite o código lá e ele fica salvo no navegador.

### 3.3. Liberar leitura no Firestore

No console do Firebase → Firestore → Rules. Para leitura pública (caso simples):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sync_data/{document} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

⚠️ Em produção, restrinja com Auth.

### 3.4. Alterar como uma estatística é calculada

Tudo está em `src/app/services/fetchAndTranslateData.ts`. Veja a [Seção 6](#6-cálculos-detalhados-de-cada-estatística) para mapear cada métrica à linha de código que a produz.

### 3.5. Adicionar uma nova métrica

1. Adicione o campo em `interface PlayerAdvanced` (ou `Player`).
2. Crie um acumulador em `interface PlayerAcc` (Map ou contador).
3. No loop de matches/events, alimente o acumulador.
4. No final, na construção do `players[]`, derive o valor (ex.: `topOf(acc.novoMap)`).
5. Renderize em `PlayerCard.tsx` ou onde fizer sentido.

### 3.6. Mudar o que é "próximo jogo"

A lógica está em `fetchAndTranslateData.ts`, na seção `// Next match`. Hoje pega a sessão mais cedo no futuro com `status !== "Finalizado"`. Para mudar critério (ex.: status específico), edite o `.filter(...)`.

### 3.7. Trocar paleta de cores / estilo

Tokens em `src/styles/theme.css`. As classes inline nas páginas usam os hex do **VS Code Dark**: `#1E1E1E` (fundo), `#252526` (cards), `#3E3E42` (bordas), `#007ACC` (primária), `#89D185` (positivo).

---

## 4. Formato esperado dos dados no Firestore

O documento `sync_data/{syncCode}` é uma **coleção plana de chaves dinâmicas** — não há um array `sessions_data` aninhado. Cada chave usa um sufixo (`_session_<id>`, `_grupo_<id>`) e muitos valores são **JSON-encoded como strings** (`"[{...}]"`) e precisam de `JSON.parse` antes de usar.

### Chaves principais

| Chave (padrão)                          | Tipo do valor   | O que contém                                                          |
|-----------------------------------------|-----------------|------------------------------------------------------------------------|
| `app_groups`                            | string (JSON)   | `[{ id, name, createdAt }]` — metadados do grupo.                      |
| `my_sync_code`                          | string          | O próprio sync code do dispositivo de origem.                          |
| `players_grupo_<groupId>`               | string (JSON)   | Lista mestra de jogadores do grupo (`id, name, rating, icon, totalGames, manual_badges?`). **Fonte canônica do rating.** |
| `players_key`                           | string (JSON)   | Lista alternativa (rating padrão 3.0). Usada como fallback.            |
| `match_history_session_<sessionId>`     | string (JSON)   | Array de partidas finalizadas dessa sessão (ver shape abaixo).         |
| `team_red_session_<sessionId>`          | string (JSON)   | Roster atual do time vermelho (sessão em andamento).                    |
| `team_white_session_<sessionId>`        | string (JSON)   | Roster atual do time branco.                                            |
| `present_players_session_<sessionId>`   | string (JSON)   | Todos os jogadores presentes na sessão.                                 |
| `match_events_session_<sessionId>`      | string (JSON)   | Eventos da partida em andamento.                                        |
| `score_red_session_<sessionId>`         | number          | Placar atual vermelho.                                                  |
| `score_white_session_<sessionId>`       | number          | Placar atual branco.                                                    |
| `is_running_session_<sessionId>`        | bool            | Sessão em andamento ou não.                                             |
| `is_overtime_session_<sessionId>`       | bool            | Prorrogação ativa.                                                      |
| `seconds_played_session_<sessionId>`    | number          | Cronômetro.                                                             |
| `red_streak_session_<sessionId>`        | number          | Sequência de vitórias do vermelho na sessão.                            |
| `white_streak_session_<sessionId>`      | number          | Sequência de vitórias do branco na sessão.                              |
| `custom_badges_grupo_<groupId>`         | string (JSON)   | Conquistas customizadas configuráveis no app fonte.                     |

### Shape de uma partida (`match_history_session_<id>` → array)

```jsonc
{
  "match_id": "1777379265098",
  "date": "2026-04-28T09:27:45Z",        // ISO completo
  "match_duration": "00:52",              // "MM:SS"
  "scoreRed": 2,
  "scoreWhite": 3,
  "events": [
    {
      "type": "goal",                     // "goal" | "own_goal" | "yellow_card"
      "playerId": "uuid-do-autor",
      "player": "Darlei",
      "assistId": "uuid-do-assistente",   // pode ser null
      "assist": "Gustavo Elias",
      "team": "Vermelho",                 // ⚠️ Português: "Vermelho" | "Branco"
      "time": "00:09"
    }
  ],
  "players": {
    "red":   [{ "id": "uuid", "name": "Angelo", "rating": 6.94, "icon": "assets/players_icons/gullit.png" }],
    "white": [{ "id": "uuid", "name": "Carlos", "rating": 7.10, "icon": null }]
  }
}
```

### Regras importantes

- **Identidade do jogador é o `id` (UUID)**, não o nome. Trocar de nome **não** quebra estatísticas.
- O `name` é resolvido a partir do `id` no momento de exibir — buckets de stats avançadas guardam `id`, depois traduzem.
- `icon` chega como caminho relativo (`assets/players_icons/foo.png`). O app prefixa com `/` → arquivo deve estar em `public/assets/players_icons/foo.png`.
- Quando `icon` é `null` ou o arquivo não existe, gera-se avatar via `ui-avatars.com`.
- `assist: null` = gol sem assistência (não conta assistência para ninguém).
- `event.team` é em **português** (`"Vermelho"` / `"Branco"`); o tradutor também aceita `"red"` / `"white"` por defesa.
- Datas das partidas estão em ISO. Se a hora estiver ausente, é tratada como meia-noite local.
- **Partidas geralmente acontecem aos sábados.** O cálculo de "próximo jogo" usa o próximo sábado ≥ hoje (com kickoff padrão 16h) quando não há sessão `is_running` futura.

---

## 5. Pipeline de tradução (`fetchAndTranslateData`)

Localização: `src/app/services/fetchAndTranslateData.ts`.

### Passos do algoritmo

1. **Helpers defensivos** (`safeArray`, `safeNumber`, `safeString`, `parseMaybeJSON`, `round1`) — nunca lançam, nunca retornam `undefined` em campos esperados. `parseMaybeJSON` cuida das chaves cujo valor chega como string-JSON.
2. **Busca** `getDoc(doc(db, "sync_data", syncCode))`. Erros de rede são logados (`console.error`) e propagados; doc inexistente retorna estrutura vazia.
3. **Resolve nome do grupo** lendo `app_groups` (string-JSON).
4. **Pré-popula `accs: Map<id, PlayerAcc>`** com a lista mestra `players_grupo_<groupId>` — esta é a fonte canônica do rating e do `totalGames`. A chave do Map é o **UUID** (não o nome).
5. **Descobre sessões** via regex `/_session_(\d+)$/` em todas as chaves do top-level. Não existe array `sessions_data`.
6. **Para cada sessão**:
   - Registra `sessions[]` (status derivado de `is_running_session_<id>`).
   - Lê `match_history_session_<id>` (string-JSON) → array de partidas.
   - Para cada partida:
     - Resolve cada jogador via `registerPlayer()` → atualiza rating/ícone se mais novo.
     - Acumula por id: `matches`, `wins/draws/losses`, `playedWith`, `wonWith`, `lostWith`, `opponentMatches`.
     - Para cada evento, despacha por `type`:
       - `"goal"` → +1 gol no scorer; se `assist` truthy, +1 assistência no assistente; alimenta MVP do mês/ano; alimenta buckets de partner stats; aciona check de hat-trick.
       - `"own_goal"` → +1 em `ownGoals` do autor (não conta como gol marcado).
       - `"yellow_card"` → +1 em `yellowCards`.
     - Empurra a partida em `matches[]` com rosters e events embutidos.
7. **Constrói `players[]`** filtrando quem nunca jogou (matches===0 e totalGames===0). Rating é arredondado a **1 casa decimal** via `round1`. Ordena por rating desc, gols desc.
8. **`monthlyMVPs`** — percorre `goalsByMonth` (chave `YYYY-MM`); para cada mês, o id com mais gols vira MVP. Label PT-BR completo (`"Abril 2026"`).
9. **`yearChampion`** — ano mais recente em `goalsByYear`; jogador com mais gols nesse ano.
10. **`nextMatch`** — primeiro tenta uma sessão `is_running` com timestamp futuro; se não há, calcula o **próximo sábado** (kickoff 16h). Se hoje for sábado e ainda não passou das 16h, o próprio sábado de hoje vale.

### Tipos públicos retornados

```ts
{
  groupName: string;
  players: Player[];          // já com .advanced calculado
  matches: Match[];           // com redRoster, whiteRoster e events embutidos
  sessions: SessionInfo[];
  monthlyMVPs: { month, player, avatar }[];
  yearChampion: { player, avatar, year, goals, rating } | null;
  nextMatch: { date, location, address } | null;
}
```

---

## 6. Cálculos detalhados de cada estatística

### Stats básicas (por jogador)

| Campo      | Como é calculado |
|------------|-------------------|
| `matches`  | +1 toda vez que o jogador aparece em `players.red` ou `players.white` de uma partida. |
| `wins`     | +1 quando o time do jogador venceu (`scoreRed > scoreWhite` para o time vermelho, e vice-versa). |
| `losses`   | +1 quando o time perdeu. |
| `draws`    | +1 quando `scoreRed === scoreWhite`. |
| `goals`    | +1 para cada `event.type === "goal"` em que `event.player === nome`. |
| `assists`  | +1 para cada gol em que `event.assist === nome` (gols sem assist são ignorados). |
| `rating`   | **Não é calculado pelo app** — vem do `players_grupo_<id>` (canônico) ou do último roster visto. **Arredondado para 1 casa decimal** (`Math.round(n*10)/10`). |
| `yellowCards` | +1 para cada `event.type === "yellow_card"` em que o jogador é o `playerId`. |
| `ownGoals` | +1 para cada `event.type === "own_goal"`. **Não** soma em `goals`. O placar do app fonte já contabiliza o gol contra para o time adversário. |

### Hat-tricks

```
hatTricks = nº de partidas em que o jogador marcou ≥ 3 gols
```

Implementação: dentro de cada partida, mantém-se um `Map<scorer, count>` local; ao terminar de processar os eventos, qualquer jogador com `count ≥ 3` recebe `+1 hatTricks`.

### Estatísticas avançadas (todas no formato `{ name, count }`)

| Estatística         | Como é calculada |
|---------------------|-------------------|
| `favoriteAssister`  | Quem **mais te assistiu**. Para cada gol seu com `assist`, +1 no nome do assistente. Vence o de maior contagem. |
| `mostAssisted`      | Quem você **mais assistiu**. Para cada gol em que você é o `assist`, +1 no nome do scorer. |
| `mostPlayedWith`    | Companheiro de time com mais partidas em comum. +1 para cada teammate em cada partida. |
| `mostWonWith`       | Companheiro com mais **vitórias** juntos (só conta partidas vencidas). |
| `mostLostWith`      | Companheiro com mais **derrotas** juntos. |
| `biggestVictim`     | Adversário **contra quem você mais marcou**. Para cada gol seu, +1 em cada oponente que estava no campo (todos do time adversário daquela partida). |
| `nemesis`           | Adversário que **mais marcou contra você**. Para cada gol contra (você está em campo, oponente marca), +1 no nome do oponente. |
| `balancedRival`     | Adversário com mais partidas como oponente (independente de gols). |

> ⚠️ **Sutileza**: `biggestVictim` e `nemesis` contam **todos os oponentes em campo** quando o gol aconteceu, não apenas o autor/sofredor direto. Isso é útil quando o JSON não tem informação de quem estava em quadra no momento exato — assume-se que todo o roster do time joga a partida inteira. Se você passar a registrar substituições, será preciso refinar essa parte.

### MVP do mês (`monthlyMVPs`)

Para cada mês com pelo menos 1 gol registrado, escolhe o jogador com **mais gols nesse mês**. Empate é resolvido pelo primeiro encontrado na iteração (ordem de inserção no Map). Lista é retornada em ordem cronológica decrescente (mês mais recente primeiro).

Formato do label: `"Abr 2026"` usando `PT_MONTHS = ["Jan", "Fev", ..., "Dez"]`.

### Campeão do ano (`yearChampion`)

Pega o **ano mais recente** que tem dados de gol e escolhe o jogador com mais gols nesse ano. Retorna `goals` (do ano) e `rating` (atual). É `null` se não há gols registrados.

> ⚠️ "Ano mais recente" significa o maior ano numérico presente nos `event.date`. Se a temporada atual tem só 2 gols e o ano passado teve centenas, o atual ainda ganha. Para mudar para "último ano completo", filtre `years` para excluir o ano corrente.

### Próximo jogo (`nextMatch`)

Lógica de duas fases (em `fetchAndTranslateData.ts` → `// Next match`):

1. **Sessão futura ao vivo**: pega a primeira `session` com `status === "Em Andamento"` (i.e., `is_running_session_<id> === true`) e `timestamp > agora`. Se houver, usa ela.
2. **Fallback "próximo sábado"**: como o grupo joga toda semana aos sábados, o app calcula o próximo sábado (`getDay() === 6`) com kickoff padrão **16:00 hora local**. Se hoje for sábado e ainda não chegou às 16h, o próprio dia conta.

`location` e `address` retornam `"A definir"`. Para personalizar, edite a seção `// Next match` em `fetchAndTranslateData.ts` ou crie uma chave no Firestore (ex.: `next_match_location`).

### Console logs

O tradutor emite logs prefixados com `[fetchAndTranslateData]` em pontos-chave: início, sucesso/falha do `getDoc`, número de chaves no documento, jogadores pré-carregados, sessões descobertas, e um resumo final (jogadores/partidas/sessões/MVPs/campeão). Abra o DevTools Console para diagnosticar problemas de carregamento. Avisos de JSON malformado são logados como `console.warn` com preview do conteúdo.

### Ordenações finais

- `players` → `rating` desc.
- `matches` → `date` desc (mais recente primeiro).
- `monthlyMVPs` → mês desc.

---

## 7. Páginas e o que cada uma consome

| Página         | Origem dos dados                                                  |
|----------------|-------------------------------------------------------------------|
| **Dashboard**  | `players[0]` (top rating como MVP), `monthlyMVPs[0]`, `matches[0..n]`, `nextMatch`. Rosters vêm de `match.redRoster` / `match.whiteRoster`. |
| **Stats**      | `players` completo. Filtros de período aplicam multiplicadores aproximados (ver `Stats.tsx`). |
| **History**    | `matches` agrupados por mês/dia. Clique expande para ver os eventos. |
| **Members**    | `players` completo. Clique abre `PlayerCard`. |
| **HallOfFame** | `monthlyMVPs` (mapeado para gold/silver/bronze rotativo) + `yearChampion`. |
| **Calendar**   | `sessions` e `matches` viram eventos no calendário. |
| **PlayerCard** | `player.advanced` — exibe placeholders `"—"` se não houver dados. |
| **Sponsors / Press / Wiki** | **NÃO** consomem Firebase. São puramente locais (Store + localStorage). |

---

## 8. Estado local (UGC) — `store.tsx`

Patrocinadores, matérias da redação e notificações são **conteúdo gerado pelo usuário** dentro do próprio app. Não vêm do Firebase. Ficam em:

```
localStorage["sabados-fc-store-v1"] = { presence, sponsors, articles, notifications }
```

Os arrays iniciais (`seedSponsors`, `seedArticles`, notificações) começam **vazios** — sem dados mockados. O usuário cadastra patrocinadores/matérias pela própria UI.

Para limpar dados locais durante dev: `localStorage.clear()` no console do navegador.

---

## 9. Como melhorar no futuro

### Curto prazo

- **Loading skeletons por página**, em vez do loading screen global. Melhora a percepção de velocidade quando só uma página está visível.
- **Cache em IndexedDB / localStorage** com TTL para abrir o app instantaneamente com a última versão dos dados, e revalidar em background (estratégia stale-while-revalidate).
- **Subscribe em vez de fetch único**: trocar `getDoc` por `onSnapshot` para atualização ao vivo quando outro device gravar novos dados.
- **Filtros de período reais em Stats**: hoje os filtros mensais/anuais aplicam multiplicadores aproximados aos totais. Recalcular as agregações por período usando `match.date` daria números corretos.

### Médio prazo

- **Identidade estável de jogador**: hoje a chave é `name.trim()`. Trocar por um `playerId` no JSON eliminaria bugs de renomear/case.
- **Eventos além de gol**: faltas, cartões, defesas — basta adicionar branches no loop de events e novos campos em `PlayerAcc`.
- **Substituições**: hoje todo o roster é considerado em campo a partida toda. Para apps competitivos, registrar entradas/saídas e usar isso em `biggestVictim`/`nemesis`.
- **Localização e endereço de próxima partida**: estender o JSON da sessão com `location` / `address` e propagar até `nextMatch`.
- **Auth Firebase + regras restritivas**: exigir login para ler. Hoje o sync code funciona como token implícito, o que é frágil.

### Longo prazo

- **Mover o cálculo para o servidor** (Cloud Functions): hoje, todo cliente recalcula tudo. Para grupos grandes (>500 partidas), pré-calcular em background e gravar em `sync_data/{code}/aggregates` reduz CPU no cliente e abre caminho para histórico longo.
- **Versionamento de schema**: adicionar `schema_version` no documento e fazer o tradutor escolher o pipeline certo. Permite evoluir o JSON sem quebrar clientes antigos.
- **Testes do tradutor**: o `fetchAndTranslateData` é puro o suficiente para testar com fixtures (o JSON em `src/imports/historico_grupo_Fut_do_INF_(1).json` serve perfeitamente como fixture). Adicionaria confiança ao mexer nos cálculos.
- **Tipagem zod/valibot**: validar o documento bruto antes de traduzir, com erro legível quando o schema diverge.

---

## Anexo A — Resumo dos arquivos críticos

| Arquivo                                    | Edita quando…                                                |
|--------------------------------------------|---------------------------------------------------------------|
| `src/app/firebase.ts`                      | Configurar credenciais ou trocar o sync code padrão.         |
| `src/app/services/fetchAndTranslateData.ts`| Mudar como qualquer estatística é calculada.                 |
| `src/app/DataContext.tsx`                  | Adicionar cache, retry, subscription ao vivo.                |
| `src/app/components/data.ts`               | Adicionar novos tipos compartilhados.                        |
| `src/app/store.tsx`                        | Mudar UGC local (patrocinadores/redação/notificações).       |
| `src/styles/theme.css`                     | Mudar paleta global.                                         |
| `src/app/App.tsx`                          | Adicionar/remover páginas, mudar loading/config screens.     |
