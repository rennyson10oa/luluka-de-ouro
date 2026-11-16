# ADR-0003 — Tempo real da gala: hub SSE + comandos via REST

- **Status:** Aceito
- **Data:** 2026-11-14
- **Contexto de origem:** fim da Fase 2 (integração dos mocks); virada para "produção real"

---

## Contexto

Com o núcleo já real (auth JWT, votos, candidaturas, estados, resultados,
avatar), restam quatro necessidades de TEMPO REAL para a gala ser uma
cerimônia viva e não uma página estática:

1. **Broadcast do servidor** — alterações de estado (contagem, fechamento de
   urnas, agendamento) devem chegar a todos os conectados de forma
   sincronizada;
2. **Cerimônia dirigida** — o admin conduz a premiação ao vivo (chamar
   categoria, drum roll, revelar 3º→1º, confete) e todos os clientes
   acompanham a MESMA fase, no MESMO momento;
3. **Chat em tempo real** — mensagens dos participantes durante a cerimônia;
4. **Server pequeno** — um único processo FastAPI/SQLite, sem Redis nem
   filas; a audiência é o grupo (dezenas de conexões simultâneas).

A discussão de transporte passou por duas propostas do dono: SSE inicialmente
e WebSockets depois (atraído pela bidirecionalidade). O debate convergiu:

- **Comandos via REST, sempre.** Toda mutação (ação de admin, voto, chat)
  entra por HTTP POST/PUT com JWT, validação e audit — o mesmo caminho de
  todos os demais dados. O canal em tempo real só leva EVENTOS de leitura.
- Consequência: o cliente nunca EMPURRA dados pelo canal de eventos → a
  principal vantagem do WebSocket (bidirecionalidade de alta frequência)
  deixa de se aplicar. SSE é suficiente e mais simples (reconexão nativa,
  HTTP puro, sem headers de Upgrade no proxy).

---

## Decisão

### 1. Transporte: SSE (Server-Sent Events), um canal por cliente

Endpoint único: `GET /api/events` — stream `text/event-stream`.

**Autenticação do stream (limitação do `EventSource`: sem header
Authorization) — via ticket de curta duração:**

1. Cliente autenticado faz `POST /api/events/ticket` com o JWT normal
   (header `Authorization`);
2. Servidor emite token de USO ÚNICO, TTL de ~60s, associado ao usuário e
   papel (`role` user/admin);
3. Cliente abre `EventSource('/api/events?ticket=...')`; o servidor valida o
   ticket no handshake (ticket é consumido) e adota a sessão do usuário;
4. Sem ticket válido → conexão recusada (a gala é fechada ao grupo).

O JWT nunca trafega na query (não vaza no access log do proxy).

### 2. Hub de eventos em memória (sem Redis)

- Registro de conexões ativas por "sala" (inicialmente uma só: `gala`);
- `broadcast(event)` entrega para todas as conexões vivas; conexão morta
  (heartbeat perdido / erro de write) é removida do registro;
- Heartbeat server→cliente a cada ~15s (linha `: ping`) para manter vivos
  proxies e conexões ociosas;
- Cada evento carrega `seq` (monotônico por servidor) e `type`.

**Formato das mensagens (JSON no campo `data` do SSE):**

```json
{ "seq": 42, "type": "state.change",  "payload": { } }
{ "seq": 43, "type": "ceremony.step", "payload": { "phase": "...", "category_id": 0, "revealed": [] } }
{ "seq": 44, "type": "chat.message",  "payload": { "user": "...", "text": "...", "at": "ISO" } }
{ "seq": 45, "type": "votes.counter", "payload": { "total": 12 } }
```

### 3. Comandos REST que disparam eventos

| Comando (REST, autenticado) | Evento difundido |
|---|---|
| `POST /api/admin/ceremony/start` | `ceremony.step` (phase=`abertura`) |
| `POST /api/admin/ceremony/next` | `ceremony.step` (avança fase/categoria) |
| `POST /api/admin/ceremony/reveal/{order}` | `ceremony.step` (revela pódio 3º→1º) |
| `POST /api/chat` | `chat.message` |
| `PUT /api/admin/settings` | `state.change` |
| `POST /api/votes` | `votes.counter` (apenas total — nunca voto individual) |

O servidor valida (role, estado da cerimônia), executa, persiste, e SÓ
ENTÃO difunde. Nenhum cliente comanda o servidor pelo canal de eventos.

### 4. Resincronização (Last-Event-ID + posição da cerimônia)

- Cliente guarda o último `seq` recebido; o `EventSource` repassa
  automaticamente o header `Last-Event-ID` na reconexão;
- O servidor mantém um buffer curto (últimos ~100 eventos); eventos
  recuperáveis são reenviados na reconexão;
- Se o cliente estiver além do buffer, ou abrir a página do zero:
  `GET /api/ceremony/position` devolve o estado determinístico atual
  (fase, categoria em pauta, já revelados) e o cliente reconstrói a tela a
  partir dele — o servidor é a fonte do batimento, o cliente é determinístico.

### 5. Cerimônia dirigida (decisão do dono)

- O admin conduz a sequência por comandos REST (fases de abertura, chamada
  de categoria, drum roll, revelação 3º→2º→1º, encerramento);
- `reveal_at` (settings) permanece como **horário mínimo de início**: antes
  dele, o `ceremony/start` é recusado (403); a partir dele, o admin comanda;
- O frontend dirige as animações (drum roll, confete, pódio) a partir da
  `phase` recebida — nunca por timers locais independentes.

### 6. Chat

- Somente usuários autenticados (`POST /api/chat` com JWT);
- Mensagens persistidas (SQLite, tabela nova `chat_messages`) — o histórico
  sobrevive a reload; o stream entrega o `chat.message` novo a todos;
- No reconnect, o cliente busca o histórico via `GET /api/chat/recent`
  (REST) — não pelo buffer do stream.

### 7. CRUD de categorias e indicados pelo admin (escopo desta fase)

- `POST/PUT/DELETE /api/admin/categories` e endpoints de indicados — a
  premiação deixa de depender do seed fixo;
- Indicados sem conta passam a ser possíveis (candidatura de "convidado",
  sem user_id obrigatório — migração da coluna `user_id` para nullable OU
  tabela de nominees separada: decisão de implementação, documentar no PR).

### 8. Fallback

- O polling do `useGalaState` (GET /api/state) permanece como rede de
  segurança: se o stream não abrir (proxy bloqueado, rede restrita), a app
  degrada para o comportamento atual de polling em vez de morrer;
- Proxy de deploy: SSE é HTTP puro — Nginx requer `X-Accel-Buffering: no`;
  Caddy funciona sem configuração extra.

---

## Consequências / riscos

- **Escala:** 1 conexão SSE por cliente + hub em memória → trivial no
  worker único async do uvicorn para dezenas de convidados; SE a gala um dia
  crescer para centenas, o hub ainda serve (fanout é O(n)); múltiplos
  workers/instâncias quebrariam o hub em memória — nesta fase, single
  container é a regra (documentado no deploy);
- **Buffer/seq:** buffer de 100 eventos + `GET /api/ceremony/position`
  cobrem reconexões normais; chat tem histórico próprio, então nenhum dado
  se perde em excesso de buffer;
- **Segurança:** ticket de uso único/TTL evita JWT na query; chat e comandos
  autenticados; cerimônia observável apenas com ticket válido (sala fechada);
- **Complexidade nova no frontend:** um hook único (`useGalaEvents`) como
  dono do `EventSource`, consumido por quem precisa (cerimônia, chat,
  contadores) — nada de abrir streams múltiplos;
- **Migrações:** tabelas novas (`chat_messages`, posição da cerimônia em
  `settings` ou tabela própria), `user_id` opcional em indicados — migrar via
  padrão idempotente já usado (`ALTER TABLE` guardado por try/except em
  `main.py`).

---

## Alternativas consideradas

- **WebSocket único bidirecional (`/ws/gala`):** rejeitado NESTE desenho —
  como todo comando vai por REST (JWT, validação, audit num único caminho),
  a bidirecionalidade do WS fica ociosa; perde a reconexão nativa do SSE e
  exige handshake/Upgrade no proxy. Revisitar SE surgir client→server de
  alta frequência (ex.: reações ao vivo em rajada);
- **Polling puro (sem stream):** resolve os contadores, mas a cerimônia
  dirigida com drum roll/reveal sincronizado entre dezenas de clientes exige
  latência de push; polling agressivo gera ruído de rede e "salto" de fase
  desincronizado;
- **Múltiplos canais SSE separados (cerimônia/chat/estado):** mais conexões
  e mais sincronia para gerenciar que UM canal com eventos tipados;
- **Redis pub/sub:** desnecessário na escala; introduz serviço novo no
  container/host. O hub em memória é suficiente e removível.
