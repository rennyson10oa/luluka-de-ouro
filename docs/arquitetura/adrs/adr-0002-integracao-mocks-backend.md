# ADR-0002 — Integração dos mocks ao backend real (Fase 2)

- **Status:** Aceito
- **Data:** 2026-09-19
- **Contexto de origem:** encerramento da Fase 1 (roteiro `docs/produto/08-roteiro-de-verificacao.md`)

---

## Contexto

O frontend funciona com dados em `localStorage` (chaves `pg_*` escopadas por
`user.id`) enquanto o backend FastAPI já expõe os endpoints equivalentes em
SQLite. A Fase 1 terminou; a Fase 2 troca os mocks pelas chamadas reais e a
Fase 3 re-verifica de forma enxuta. Os hooks/store a substituir são:

- `useBallot.js` — `pg_votes:u<id>` / `pg_votes_meta:u<id>`
- `useCandidacies.js` — `pg_candidacies:u<id>`
- `pg_reveal_at` — tríade de contagem/estados (landing, cédula, urna, reveal, resultados)
- `useAdminAuth.jsx` — senha em variável de ambiente
- `mockResults.js` — pódio estático
- Stats da landing — número hardcoded ("1.428 votos")
- Avatar de perfil — `pg_avatar:u<id>`

**Permanecem mock por design** (cosméticos, sem endpoint e sem necessidade
para o MVP): chat do reveal, player de áudio, honrarias, hash fake do selo.

---

## Decisão

### 1. Contrato frontend → backend (sem mudanças no backend, exceto onde apontado)

| Consumo frontend | Endpoint | Observações |
|---|---|---|
| Cédula | `GET /api/categories` + `POST /api/votes` | **Pendência de backend:** regra de auto-voto (403 "não vote em você mesmo") |
| Dossiê | `POST /api/candidacies` + `PUT /api/candidacies/{id}` | **Pendência de backend:** validar limite de 4 candidaturas e pitch ≤ 280 server-side |
| Countdown/estados | `GET /api/state` (`reveal_at`, `votacao_aberta`, `total_votos`) | fonte única de verdade; remove `pg_reveal_at` |
| Painel admin | `POST /api/admin/login` (JWT) + `PUT /api/admin/settings` | `AdminAuthProvider` troca o comparador de env por token |
| Resultados | `GET /api/results` | bloqueio 403 real (janela de precerimônia) |
| Stats da landing | `GET /api/state` (`total_votos`) | substitui o número hardcoded |
| Avatar | **Novo** `POST /api/users/me/avatar` | detalhado na seção 2 |

### 2. Novo endpoint: `POST /api/users/me/avatar`

Requisitos de segurança decididos pelo dono:

1. **Validação server-side do tipo real** do arquivo (magic bytes JPEG/PNG/WebP)
   — o `accept="image/*"` do input é apenas UX, burlável via curl;
2. **Limite de tamanho:** 200 KB (checar no servidor, não só no cliente);
3. **Nome de arquivo aleatório no servidor** — nunca persistir o nome original;
4. **Servir via endpoint** que retorna o arquivo com `Content-Type` correto
   e cabeçalhos não-executáveis (`Content-Disposition: inline`, sem sniffing);
5. **Armazenamento:** `backend/uploads/` hoje; o diretório torna-se **volume
   de Docker nomeado** no deploy sem mudança de código — o caminho é
   configurável (`UPLOAD_DIR`).

Resposta: 200 com a URL do avatar novo; erro 415 (tipo inválido), 413
(tamanho) ou 401 (sem sessão).

### 3. Frontend

- Os hooks (`useBallot`, `useCandidacies`, provider de estados) trocam o
  access a `localStorage` por `fetch` nos endpoints acima; a util
  `utils/userScope.js` e as chaves `pg_*` são desativadas/limpas ao fim;
- Erros do servidor mapeados para os estados já existentes nas telas
  (ex.: 403 de auto-voto → toast inline, sem bloquear a cédula);
- O retry pattern permanece: nenhuma lógica de voto muda no backend além
  do 403 de auto-voto.

---

## Consequências / riscos

- **Backend primeiro** (403 de auto-voto + endpoint de avatar), depois o
  frontend — evita o frontend trocar de um mock inexistente para outro;
- A Fase 3 re-verifica apenas: fluxo de voto real (incl. auto-voto 403),
  candidaturas reais com limites server-side, countdown via `/api/state`,
  admin JWT, resultados com bloqueio e end-to-end de verdade;
- Os dados de sangue-frio (votos/candidaturas locais) **não migram** para o
  backend — é uma virada de chave, não uma migração;
- Deploy: `uploads/` vira volume nomeado no compose (código imune).

---

## Alternativas consideradas

- **Migrar `pg_*` para o backend no primeiro boot:** adia os ganhos da Fase 2
  com risco de sync duplo; descartado;
- **Avatar como BLOB no SQLite:** funciona, mas empurra bytes pelo ORM e
  complica o volume de Docker; descartado em favor de arquivo em disco;
- **Validar tipo de avatar só no cliente:** burlável via curl; rejeitado
  pelo dono.
