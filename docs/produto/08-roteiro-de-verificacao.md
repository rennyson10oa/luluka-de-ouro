# 08 - Roteiro de Verificação por Tela

Plano de execução para validar a implementação view por view. Complementa o
[`07-checklist.md`](07-checklist.md) (critérios de aceite final): este documento
decompõe a verificação em tasks ordenadas, cada uma com testes numerados,
passos e resultado esperado.

## Como usar

1. Execute as tasks **na ordem** — elas dependem de estado criado pelas anteriores.
2. Marque cada teste ao concluir. Se falhar, registre na seção **Registro de Falhas** (final do documento) com o ID do teste.
3. Teste sempre em **duas viewports**: desktop (1280px) e mobile (360px — o design é mobile-first).
4. Ao final de cada task, preencha o campo **Status**.

## Preparação de ambiente

O fluxo de autenticação é real (FastAPI + SQLite). Antes de iniciar:

```bash
# Terminal 1 — backend (OBRIGATORIAMENTE da raiz; DATABASE_URL é relativo ao CWD)
poetry install                              # dentro de backend/ (primeira vez)
python -m backend.seed                      # da raiz — popula usuários/categorias/votos
python -m uvicorn backend.main:app --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

Usuários do seed (senha `123`): `joaorei`, `maria`, `carlos`, `ana`, `pedro`, `julia`.

> **Atenção:** o DB de desenvolvimento pode conter contas extras criadas
> durante a verificação (ex.: `test` — senha `123`, `test2` — senha `test`).
> Elas NÃO fazem parte do seed. Para listar as contas existentes:
> `sqlite3 app.db "SELECT id, username FROM users"`. Não confunda contas com
> nomes parecidos — `test` ≠ `test2`.

**Chaves de localStorage gerenciadas pelo app** (úteis para inspecionar/resetar).
Chaves de dados do eleitor são **escopadas por `user.id`** (`pg_votes:u3`) —
sem isso, os dados de um usuário vazavam para o próximo. `pg_reveal_at` é
global de propósito (configuração da gala):

| Chave | Dono | Conteúdo |
|-------|------|----------|
| `pg_token` | useAuth (REAL) | JWT da sessão do usuário |
| `pg_user` | useAuth | `{ id, username, vulgo }` (cache + guard do VotePage) |
| `pg_votes:u<id>` | useBallot (MOCK) | `{ [categoryId]: nomineeId }` — votos selados do eleitor |
| `pg_votes_meta:u<id>` | useBallot | `{ hash, at }` do selo |
| `pg_candidacies:u<id>` | useCandidacies (MOCK) | candidaturas do eleitor (compartilhado perfil ↔ urna) |
| `pg_avatar:u<id>` | ProfileHeader (MOCK) | dataURL da foto do eleitor |
| `pg_reveal_at` | AdminPanel (MOCK, global) | ISO do reveal agendado |
| `pg_admin` | useAdminAuth (MOCK) | sessão admin (sessionStorage) |

**Reset total:** use a Zona de Perigo do painel admin (`/admin`) ou limpe
manualmente todas as chaves `pg_*` no DevTools.

---

## Task 1 — Landing Page (`/`)

**Objetivo:** vitrine, troféu 3D, contagem regressiva e CTAs auth-aware.

- [ ] **1.1** A página carrega sem erros no console; Header e Footer presentes.
- [ ] **1.2** Troféu 3D do hero renderiza e gira (GLB `davy-jones-lite.glb`); ícone 3D do logo no header também gira — e **mantém o tamanho ao navegar entre rotas** (regressão do ADR-0001).
- [ ] **1.3** Contagem regressiva exibe valores decrescendo a cada segundo.
- [ ] **1.4** Deslogado: clicar em "Votar Agora" (header, CTA central e "Abrir Cédula Oficial") e "Votar" num card de categoria → todos navegam para `/login`.
- [ ] **1.5** Logado: os mesmos botões navegam para `/votar`.
- [ ] **1.6** Âncoras: ghost CTA "Ver Categorias & Indicados" rola suavemente até `#categorias`; digitando `/#cerimonia` (vindo de outra rota) a seção da cerimônia é rolada suavemente via hash handler da landing. Obs.: o item "A Cerimônia" do header navega para `/reveal`, não é âncora.
- [ ] **1.7** Em 360px: sem scroll horizontal; hero, countdown e cards empilham.

**Status:** `____`

---

## Task 2 — Registro (`/register`) — BACKEND REAL

**Objetivo:** criação de conta com validações locais + unicidade no banco.

- [x] **2.1** Sem backend rodando: submit exibe "Cartório indisponível..." (mensagem de rede).
- [x] **2.2** Username com menos de 3 caracteres: feedback "Mínimo de 3 caracteres"; com 3+: "disponível para nomeação".
- [x] **2.3** Senhas diferentes: "As senhas ainda não coincidem" (vermelho); iguais: "Senhas conferem! Voto garantido" (verde).
- [x] **2.4** Botão "Criar conta" desabilitado até: username ≥3, senhas conferem, termos aceito.
- [x] **2.5** Registro válido → navega para `/votar`; `pg_token` e `pg_user` existem no localStorage.
- [x] **2.6** **Duplicado:** registrar username já existente (ex.: `maria`) → erro "Este nome de usuário já foi registrado em cartório".
- [x] **2.7** Toggle "Entrar" no topo leva a `/login` (ordem correta das abas: Entrar | Criar Conta).
- [x] **2.8** Toggle de visibilidade de senha funciona em ambos os campos de senha.

**Status:** `____`

---

## Task 3 — Login (`/login`) — BACKEND REAL

**Objetivo:** autenticação, persistência de sessão e tratamento de erros.

- [x] **3.1** Credenciais válidas (seed: `joaorei` / `123`) → navega para `/votar`; `pg_token` salvo.
- [x] **3.2** Senha errada → banner "Usuário ou senha incorretos" + **animação de shake** no card.
- [x] **3.3** Campos vazios → submit bloqueado (validação nativa).
- [x] **3.4** Recarregar a página com sessão ativa → continua logado (hidratação via `GET /api/me` com `pg_token`).
- [x] **3.5** Corromper `pg_token` no DevTools e recarregar → sessão limpa silenciosamente (volta a deslogado, sem crash).
- [x] **3.6** "Esqueceu a senha? Chame o admin" → alert humorístico.
- [x] **3.7** Sessão mock legada: com `pg_user` presente mas **sem** `pg_token`, recarregar → deslogado (invalidação correta).
- [x] **3.8** **Retorno ao destino original (redirect-after-login):** deslogado, clicar no avatar do header → `/login`; logar → deve cair em `/perfil` (não em `/votar`). Repetir saindo de `/votar` (via botão Votação) e de `/candidaturas` direto na URL → login devolve a cada origem. Sem origem (acesso direto a `/login`) → fluxo padrão `/votar`.

**Status:** `____`

---

## Task 4 — Navegação Global (Header/Footer)

**Objetivo:** links, estados ativos e avatar.

- [x] **4.1** Header: Início, Candidaturas, Votação, A Cerimônia, Galeria de Resultados e Admin navegam para as rotas corretas.
- [x] **4.2** O item da rota atual fica destacado (fundo dourado suave) em cada página.
- [x] **4.3** "Votação" é auth-aware (deslogado → `/login`; logado → `/votar`).
- [x] **4.4** Avatar do header: deslogado → `/login` com title "Entrar na Gala"; logado → `/perfil` com title "Perfil de @{username}".
- [x] **4.5** Footer: os 5 links de "Acesso aos Salões" navegam corretamente (Urna de Candidaturas, Cédula, Cerimônia, Galeria, Painel Admin).
- [x] **4.6** "Voltar ao topo" do footer rola suavemente.

**Status:** `____`

---

## Task 5 — Urna de Candidaturas (`/candidaturas`) — MOCK

**Objetivo:** gestão de candidaturas com store compartilhado com o perfil.

- [x] **5.1** Deslogado → redirect para `/login`.
- [x] **5.2** Primeiro acesso semeia 2 candidaturas (#MIT em disputa, #PAT homologada) e o badge mostra "2/4 Ativas".
- [x] **5.3** "Vagas Abertas" lista exatamente as 2 categorias sem candidatura.
- [x] **5.4** Candidatar-se: modal abre com a categoria correta; contador de caracteres cresce ao digitar; acima de 280 fica vermelho e o submit desabilita.
- [x] **5.5** Candidatura registrada → card "STATUS: EM DISPUTA" surge com protocolo `#XXX-2025-NN`; badge vira "3/4 Ativas"; a vaga da categoria some.
- [x] **5.6** **Perfil sincronizado:** abrir `/perfil` → "Minhas Candidaturas" mostra a nova candidatura e o contador do card do eleitor reflete 3.
- [x] **5.7** Editar pitch (edit_note) → modal em modo edição pré-preenchido; salvar altera o texto no card e no perfil.
- [x] **5.8** **Compartilhar:** botão share copia o texto formatado (clipboard) → toast de confirmação.
- [x] **5.9** Com `pg_reveal_at` no passado: cards viram "SELADO PARA A CERIMÔNIA", edição desabilitada, seção de vagas some, share continua.
- [x] **5.10** Com 4/4: banner "dossiê completo" e nenhuma vaga aberta.

**Status:** `____`

---

## Task 6 — Cédula de Votação (`/votar`) — MOCK

**Objetivo:** regras de voto (1 por categoria, anti-auto-voto, selo, fechamento).

- [x] **6.1** Deslogado → redirect para `/login` (inclusive digitando a URL direto).
- [x] **6.2** Sidebar mostra "0 / 4" e botão "Confirmar e Selar" desabilitado com 0 seleções.
- [x] **6.3** Selecionar um indicado → card ganha borda dourada + check; progresso "1 / 4"; clicar de novo desseleciona.
- [x] **6.4** **Auto-voto:** registrar (e logar com) o username `BetoChave` — ele não existe no seed → o card de `@BetoChave` (Melhor Participação Especial) aparece bloqueado com "voto não permitido (auto-voto é golpe)" e não é selecionável. Depois deslogar e voltar para o usuário principal.
- [x] **6.5** Voto em branco: selar com apenas 2 de 4 categorias selecionadas → o modal lista as demais como "Voto em branco".
- [x] **6.6** Confirmar → modal "Selar votos na urna?" lista todas as escolhas; "Cancelar" volta sem selar.
- [x] **6.7** Selar → estado "Votos Selados na Cripta!" com hash `#GALA-2025-XXXXXX` e horário do registro.
- [x] **6.8** Recarregar a página → **continua selado** (persistência em `pg_votes:u<id>`).
- [x] **6.9** Limpar `pg_votes:u<id>` no DevTools e recarregar → cédula reabre.
- [x] **6.10** Com `pg_reveal_at` no passado → estado "As Urnas Estão Fechadas" (sem cédula).
- [x] **6.11** "Fechamento das Urnas" na sidebar mostra contagem regressiva alinhada com `pg_reveal_at`.
- [x] **6.12** **Isolamento por eleitor:** selar votos com o usuário A → deslogar → logar com o usuário B → a cédula de B abre **em branco** (0/4), sem herdar o selo de A. Repetir o inverso. Candidaturas e avatar também são privativos por eleitor.

**Status:** `____`

---

## Task 7 — Perfil (`/perfil`) — BACKEND REAL + MOCKS

**Objetivo:** gestão da conta (vulgo, handle, senha) + seções mockadas.

- [ ] **7.1** Deslogado → redirect para `/login`.
- [ ] **7.2** Card do eleitor: nome de exibição mostra o vulgo (se houver) senão o username; @handle abaixo; stats corretas (votos = entradas em `pg_votes`; candidaturas = store; honrarias = mock).
- [ ] **7.3** **Avatar mock:** enviar imagem >200KB → erro amigável; imagem válida → vira o avatar (persiste em `pg_avatar` após reload); "Remover" volta ao ícone.
- [ ] **7.4** **Trocar vulgo:** salvar → feedback "Credencial atualizada!"; o nome novo aparece no card e no Header.
- [ ] **7.5** **Trocar @handle:** salvar → feedback de nova credencial emitida; a sessão **continua válida** (novo JWT trocado em `pg_token`); `/api/me` retorna o handle novo.
- [ ] **7.6** **Handle duplicado:** tentar trocar para um username já existente (ex.: `maria`) → erro "Este nome de usuário já foi registrado em cartório".
- [ ] **7.7** **Trocar senha:** senha atual errada → "A senha atual não confere"; senhas novas divergentes → validação local; sucesso → limpa campos, e logout + login com a senha nova funciona.
- [x] **7.8** Honrarias, Minhas Candidaturas e Atividade Recente renderizam os mocks (candidaturas vindas do store compartilhado).
- [x] **7.9** **Logout:** botão limpa `pg_token`/`pg_user` e redireciona para `/`; avatar no header volta ao estado deslogado.
- [x] **7.10** **Reatividade da credencial (pós-ADR-0001):** logado, trocar o vulgo → o nome novo aparece **na hora** no card do perfil E no Header, sem reload; trocar o @handle → idem, e os campos do formulário acompanham.

**Status:** `____`

---

## Task 8 — Painel Admin (`/admin`) — MOCK (senha via env)

**Objetivo:** gate de acesso e governança da gala.

- [x] **8.1** Senha errada → banner "Senha soberana incorreta" + shake.
- [x] **8.2** Senha correta (`luluka2025` ou `VITE_ADMIN_PASSWORD`) → painel com identidade `@AdminMor` no HeaderAdmin.
- [x] **8.3** Fechar a aba e reabrir → sessão admin **morre** (sessionStorage) → gate novamente.
- [x] **8.4** Stats e categorias renderizam; accordion abre/fecha com indicados e barras de votos.
- [x] **8.5** Audit log: filtro por eleitor/categoria funciona; filtro sem resultado mostra estado vazio.
- [x] **8.6** **Agendar reveal:** definir data futura → toast de sucesso; verificar que `pg_reveal_at` foi gravado e que a **contagem da landing** passa a contar para essa data.
- [x] **8.7** Com reveal agendado no futuro: `/reveal` trancado e `/resultados` trancados (ver Tasks 9/10).
- [x] **8.8** **Zona de Perigo:** "Zerar Tudo Agora" → confirm nativo; confirmar → todas as chaves `pg_*` removidas, usuário e admin deslogados.
- [x] **8.9** Botão "Sair" do HeaderAdmin encerra só a sessão admin (usuário permanece logado).

**Status:** `____`

---

## Task 9 — Cerimônia de Reveal (`/reveal`)

**Objetivo:** máquina de estados da cerimônia, suspense, autoplay e teclado.

- [ ] **9.1** Com reveal agendado no futuro: estado trancado com contagem regressiva; "entrar em modo ensaio" destrava sem alterar `pg_reveal_at`. **Corrigido no ensaio da Task 11:** o countdown agora destrava a cerimônia sozinho quando o relógio zera (sem reload); idem na galeria de resultados.
- [ ] **9.2** Estado suspense: "E o vencedor é..." com pontos pulsando; "Revelar Vencedor" transiciona com shake + burst de confete.
- [ ] **9.3** Estado revelado: vencedor ouro com pct/votos, player de áudio **falso** (play/pause anima a barrinha), reações, pódio lateral 🥈🥉🎖️ com os detalhes, chat ao vivo injetando mensagens a cada ~4s.
- [ ] **9.4** **Teclado:** Espaço e → avançam (suspense → revelado → próxima categoria); ← volta; Espaço não rola a página.
- [ ] **9.5** **Autoplay:** ligado → revela em ~3s e avança em ~4s, sozinho, até o finale; desliga sozinho no fim.
- [ ] **9.6** "Pular Suspense" revela a categoria atual direto.
- [ ] **9.7** Progresso: "% das Vergonhas Reveladas" e dots acompanham (verde concluída / dourada atual / outline futura).
- [ ] **9.8** "Anterior" desabilitado na primeira; "Próxima" mostra o `navLabel` da próxima categoria.
- [ ] **9.9** **Finale:** na última categoria revelada → banner "Fim da Cerimônia" + chuva dupla de confete + "Ver Galeria de Resultados" (navega) + "Rever do Começo" (reseta para suspense da 1ª).
- [ ] **9.10** Botão flutuante "Jogar Confete!" dispara burst em qualquer momento da cerimônia.

**Status:** `____`

---

## Task 10 — Galeria de Resultados (`/resultados`)

**Objetivo:** registro oficial pós-cerimônia, filtros e pódios.

- [x] **10.1** Página pública: deslogado acessa normalmente (sem guard).
- [x] **10.2** Com reveal agendado no futuro → estado trancado "A Cerimônia Ainda Não Aconteceu"; sem agendamento ou no passado → galeria aberta.
- [x] **10.3** 4 cards de estatísticas da apuração renderizam.
- [x] **10.4** **Filtros:** "Todas as Categorias" mostra os 4 pódios; cada pill isola sua categoria; pill ativa destacada.
- [x] **10.5** **Pódio (desktop):** layout 2º | 1º | 3º, com o 1º central elevado (borda dourada, coroa, pct em gradiente).
- [x] **10.6** **Pódio (mobile 360px):** ordem 1º → 2º → 3º, empilhados, sem scroll horizontal.
- [x] **10.7** Menção honrosa visível em cada categoria, com a frase do meme.
- [x] **10.8** Bastidores: 3 estatísticas curiosas renderizam.
- [x] **10.9** "Compartilhar" copia o link (toast); "Baixar Relatório em PDF" mostra toast de "em breve"; "Rever Cerimônia Completa" mostra toast; "Voltar ao Início" navega.

**Status:** `____`

---

## Task 11 — Fluxo Ponta a Ponta (integração)

**Objetivo:** o ciclo completo do usuário, como na gala real.

- [ ] **11.1** Reset total de storage → registrar usuário novo (ex.: `betotest`) → logado em `/votar`.
- [ ] **11.2** `/candidaturas` → candidatar-se a 2 categorias → verificar no perfil.
- [ ] **11.3** `/votar` → selar votos (deixando 1 em branco) → hash anotado.
- [ ] **11.4** `/perfil` → contador de votos reflete as categorias votadas; candidaturas corretas.
- [ ] **11.5** `/admin` → agendar reveal para ~3 minutos no futuro.
- [ ] **11.6** Landing → countdown contando para a data; `/reveal` e `/resultados` trancados.
- [ ] **11.7** Esperar o prazo passar (ou usar modo ensaio) → cerimônia completa → finale → galeria aberta com os pódios.
- [ ] **11.8** Logar com o username de um indicado (ex.: `BetoChave`) → auto-voto bloqueado na cédula.
- [ ] **11.9** Repetir o fluxo inteiro em 360px sem quebras de layout.

**Status:** `____`

---

## Task 12 — Higiene de Estado e Regressões

**Objetivo:** storage, regressões conhecidas e limites.

- [ ] **12.1** Após o fluxo completo, inspecionar: `pg_token`, `pg_user`, `pg_votes`, `pg_votes_meta`, `pg_candidacies`, `pg_avatar`, `pg_reveal_at` — todos com o conteúdo esperado.
- [ ] **12.2** Navegar por TODAS as rotas em sequência rápida → o troféu do header nunca muda de tamanho (regressão ADR-0001) e não há acúmulo de erros no console.
- [ ] **12.3** Console limpo em todas as telas (sem warnings de React, sem 404 de assets).
- [ ] **12.4** `npm run build` de produção compila sem erros.
- [ ] **12.5** Limite de 280 chars do pitch e do modal: colar 500 caracteres → contador vermelho e submit travado.
- [ ] **12.6** Abrir `/admin` e `/reveal` em abas separadas: sessões independentes (admin sessionStorage não vaza para outras abas).

**Status:** `____`

---

## Registro de Falhas

| ID do teste | Tela | Descrição do problema | Severidade | Status |
|-------------|------|----------------------|------------|--------|
| 1.2 | Landing | `Trophy3D.jsx` (hero) aplica `scale`/`position` direto na cena cacheada do `useGLTF`, sem clone — mesmo padrão do bug do ADR-0001. Seguro hoje (instância única, transform constante), mas quebra se o componente for reutilizado com props diferentes. Refatorar junto com o ADR-0001. | POLISH | Aberto |
| 2.2 | Registro | `UserCreate` no backend não validava tamanho do username (aceitava 1+ char se o frontend fosse burlado; `UserUpdate` já tinha `min_length=3`). **Corrigido durante a verificação:** `Field(min_length=3, max_length=30)` adicionado, uvicorn reiniciado, retestado via curl (curto → 422). | MINOR | Corrigido |
| 2.6 | Doc | Exemplo do teste usava `joao`, que não existe no seed (o username real é `joaorei`). Causou falso-negativo na primeira rodada do teste. **Doc corrigido** (também na lista do seed e no teste 3.1). | MINOR | Corrigido |
| 3.8 | Login | Login/registro sempre levavam a `/votar`, ignorando o destino que motivou o acesso (ex.: clicar no avatar deslogado → login → cair na urna em vez do perfil). **Corrigido:** convenção `location.state.from` em 7 pontos — `useVoteNav` (from /votar), avatar do Header (from /perfil), guards de VotePage/ProfilePage/CandidacyPage, e `LoginPage`/`RegisterPage` consomem `state?.from` com fallback `/votar` + `replace: true`. Build OK. | MAJOR | Corrigido |
| — | Código | Comentários em espanhol em arquivos legados do @dev (`useAuth.jsx`, `VotePage.jsx`, `ProfilePage.jsx`, `CandidacyPage.jsx`, `schemas.py`). Convenção do projeto é pt-BR. **Corrigido:** varredura completa — `useAuth.jsx` (reescrito no fix do AuthProvider), `VotePage`, `ProfilePage`, `CandidacyPage`, `ResultsPage`, `schemas.py`, componentes da cédula (`CategorySection`, `NomineeCard`, `ConfirmModal`) e resquícios do `useBallot`. Grep final: zero comentários em espanhol. | POLISH | Corrigido |
| 8.9 | Admin | **Logout do painel não refletia na página:** `useAdminAuth` tinha o mesmo defeito de estado fragmentado do antigo `useAuth` — `AdminPage` e `AdminPanel` criavam instâncias independentes; clicar em "Sair" não exibia o gate sem reload. **Corrigido:** `AdminAuthProvider` (contexto único, mesmo padrão do AuthProvider), envolvido em `App.jsx`. Arquivo renomeado para `.jsx` (JSX do provider não compila em `.js`). | MAJOR | Corrigido |
| 8.8 | Admin | **Zona de Perigo não sincronizava estados:** `wipeAll` limpava as chaves `pg_*` do storage mas o Header continuava mostrando usuário logado e o painel aberto até reload. **Corrigido:** após limpar, chama `logoutAdmin()` + `logout()` (providers reagem na hora) e navega para `/` com `replace`. | MAJOR | Corrigido |
| 9.5 | Reveal | **Autoplay e teclado mortos no modo ensaio** (auto-auditoria da Task 9): os efeitos testavam `isLocked` em vez da condição de render (`!isLocked \|\| rehearsal`) — como `isLocked` nunca muda de valor, no ensaio o autoplay nunca disparava e o teclado só funcionava após a 1ª revelação. **Corrigido:** condição unificada `isOpen` nas dependências dos dois efeitos. Também removido `useToast` morto (nunca chamado). Build OK. | MAJOR | Corrigido |
| 9.1/10.2 | Reveal/Resultados | **Cerimônia trancada em 00:00** (reportado no ensaio da Task 11): o estado de lock era calculado só no mount — countdown chegando a zero com a tela aberta exigia reload manual. **Corrigido:** `RevealPage` destrava no tick em que o relógio zera; `ResultsPage` re-verifica `pg_reveal_at` a cada 1s enquanto trancada. O `VotePage` já fechava de graça (o re-render do countdown dele reavalia `isClosed`). | MAJOR | Corrigido |
| 9.2 | Reveal | **Primeiro burst de confete agrupado à esquerda** (reportado no ensaio): o `fire()` distribuía partículas antes do primeiro resize — o canvas default de ~300px fazia nascerem só na faixa esquerda (mais visível no burst do 1º reveal). **Corrigido:** `ConfettiCanvas` faz `resize()` no mount e antes de cada burst. | MINOR | Corrigido |
| 3.1 | Login/DB | `joaorei` e `test` rejeitavam a senha do seed (`123`) — foram criados numa execução anterior com outra senha e o `seed.py` pula usuários existentes (comportamento correto, só não detecta drift). **Corrigido:** hashes resetados para `123` via `get_password_hash`. Matriz re-testada: 7/7 usuários → 200; round-trip token → `/api/me` OK. | MINOR | Corrigido |
| 6.12 | Cédula | **Votos vazavam entre eleitores:** `pg_votes`/`pg_votes_meta` eram chaves globais — selar com o usuário A fazia o usuário B herdar a cédula selada de A. Mesma classe de bug em `pg_candidacies` (dossiê) e `pg_avatar` (foto). **Corrigido:** escopo por `user.id` (`pg_votes:u<id>` etc.) via novo util `utils/userScope.js` (fonte única), aplicado em `useBallot`, `useCandidacies` e `ProfileHeader`, com re-sincronização na hidratação do `useAuth`. Escopo por id (não username) sobrevive à troca de @handle. `pg_reveal_at` permanece global (config da gala). Chaves legadas sem escopo são ignoradas — votos/candidaturas anteriores ao fix precisam ser refeitos. Build OK. | MAJOR | Corrigido |
| 7.10 | Perfil | **Estado de auth fragmentado (reportado pelo usuário):** cada componente criava sua própria instância de `useAuth` (estado próprio) — trocar vulgo/handle atualizava só o formulário; Header e card do perfil exigiam reload. Era o cenário previsto no ADR-0001. **Corrigido:** `AuthProvider` (contexto único no topo da árvore, em `App.jsx`) com a interface pública intacta — zero mudanças nos consumidores. ADR-0001 movido para "Aceito (AuthProvider implementado; Header persistente pendente)". Comentários do arquivo reescritos em pt-BR. Build OK. | MAJOR | Corrigido |

Severidade sugerida: `BLOQUEIO` (impede o fluxo), `MAJOR` (funcionalidade errada), `MINOR` (visual/texto), `POLISH` (melhoria).

---

## Fase 2 (planejada) — Integração dos mocks com o backend real

Decisão tomada durante a verificação: terminar as tasks 6–7 (checkpoint), depois
substituir os mocks que já têm endpoint no backend, e re-verificar de forma
enxuta (não do zero). O backend já expõe: `GET /api/categories`,
`POST /api/candidacies`, `PUT /api/candidacies/{id}`, `POST /api/votes`,
`GET /api/results`, `GET /api/state`, `POST /api/admin/login`,
`PUT /api/admin/settings`.

| Mock atual | Substituto real | Pendências |
|------------|-----------------|------------|
| `useBallot` (pg_votes) | `GET /api/categories` + `POST /api/votes` | regra de auto-voto (403) no backend |
| `useCandidacies` (pg_candidacies) | `POST/PUT /api/candidacies` | validar limite 4 + pitch 280 no backend |
| Countdown/isClosed (landing, cédula, urna, reveal, resultados) | `GET /api/state` (`reveal_at`, `votacao_aberta`) | remove a tríade `pg_reveal_at` |
| `useAdminAuth` (senha em env) | `POST /api/admin/login` + `PUT /api/admin/settings` | admin JWT real |
| `mockResults` | `GET /api/results` | bloqueio 403 real |
| Stats da landing ("1.428 votos") | `/api/state` (`total_votos`) | vitória barata |
| Avatar (`pg_avatar:u<id>`) | **Novo endpoint** `POST /api/users/me/avatar` | **Requisitos de segurança (decisão do dono):** armazenar em volume Docker dedicado (nunca no PC do usuário); validação **server-side** do tipo real do arquivo (magic bytes JPEG/PNG/WebP — o `accept="image/*"` do input é só UX, burlável via curl); limite de tamanho (200KB); nome de arquivo aleatório no servidor (nunca o original); servir via endpoint com `Content-Type` correto — nunca executável. **Nuance de arquitetura:** o endpoint não depende do Docker — na Fase 2 salva em `backend/uploads/` (diretório do servidor); na fase de deploy o diretório vira volume nomeado no compose, sem mudança de código. |

**Permanecem mock por design** (cosméticos, sem endpoint): chat do reveal,
player de áudio, honrarias, hash fake do selo, avatar (até existir endpoint
de upload).

## Fase 3 (planejada) — Re-verificação enxuta pós-integração

Novo roteiro curto cobrindo apenas: fluxo de voto real (incl. auto-voto 403),
candidaturas reais (limites no servidor), countdown/estados via `/api/state`,
admin JWT, resultados com bloqueio, end-to-end de verdade e limpeza das
chaves `pg_*` remanescentes. As tasks 1–5 deste documento permanecem válidas
como registro histórico (auth real e fluxos de UI não mudam).

---

## Task 13 — Navegação Mobile (feature do ensaio da Task 11)

Design pedido pelo dono durante a Task 11: no mobile não havia navegação
(o nav pill desaparece em telas pequenas). Solução: clicar no ícone de
perfil do Header abre um overlay em tela cheia com a **taça 3D girando**
(modelo `trophy-3d.glb` já carregado/cacheado pelo `useGLTF`) e as opções
na parte de cima.

- [ ] **13.1** Em 360px, o ícone de perfil (avatar) do Header abre o menu em tela cheia: fundo escuro com a taça 3D girando no centro, opções de navegação no topo.
- [ ] **13.2** Os links levam aos destinos corretos e **fecham o menu** (Início, Candidaturas, A Cerimônia, Galeria, Painel Admin).
- [ ] **13.3** "Votação" é auth-aware e fecha o menu antes de navegar.
- [ ] **13.4** Item de conta: logado → "Perfil de @handle"; deslogado → "Entrar na Gala".
- [ ] **13.5** Fecha com o X, com a tecla Esc e com clique no fundo; o scroll do body fica travado enquanto aberto.
- [ ] **13.6** O menu não existe no desktop (`md:hidden`) — o avatar desktop continua indo direto ao perfil.
- [ ] **13.7** Sem scroll horizontal e sem travar a taça 3D (performance ok no mobile — modelo de 44KB já cacheado).
