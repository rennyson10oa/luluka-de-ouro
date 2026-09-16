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

**Chaves de localStorage gerenciadas pelo app** (úteis para inspecionar/resetar):

| Chave | Dono | Conteúdo |
|-------|------|----------|
| `pg_token` | useAuth (REAL) | JWT da sessão do usuário |
| `pg_user` | useAuth | `{ id, username, vulgo }` (cache + guard do VotePage) |
| `pg_votes` | useBallot (MOCK) | `{ [categoryId]: nomineeId }` — votos selados |
| `pg_votes_meta` | useBallot | `{ hash, at }` do selo |
| `pg_candidacies` | useCandidacies (MOCK) | candidaturas do usuário (compartilhado perfil ↔ urna) |
| `pg_avatar` | ProfileHeader (MOCK) | dataURL da foto |
| `pg_reveal_at` | AdminPanel (MOCK) | ISO do reveal agendado |
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

- [ ] **2.1** Sem backend rodando: submit exibe "Cartório indisponível..." (mensagem de rede).
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

- [ ] **3.1** Credenciais válidas (seed: `joaorei` / `123`) → navega para `/votar`; `pg_token` salvo.
- [ ] **3.2** Senha errada → banner "Usuário ou senha incorretos" + **animação de shake** no card.
- [ ] **3.3** Campos vazios → submit bloqueado (validação nativa).
- [ ] **3.4** Recarregar a página com sessão ativa → continua logado (hidratação via `GET /api/me` com `pg_token`).
- [ ] **3.5** Corromper `pg_token` no DevTools e recarregar → sessão limpa silenciosamente (volta a deslogado, sem crash).
- [ ] **3.6** "Esqueceu a senha? Chame o admin" → alert humorístico.
- [ ] **3.7** Sessão mock legada: com `pg_user` presente mas **sem** `pg_token`, recarregar → deslogado (invalidação correta).
- [ ] **3.8** **Retorno ao destino original (redirect-after-login):** deslogado, clicar no avatar do header → `/login`; logar → deve cair em `/perfil` (não em `/votar`). Repetir saindo de `/votar` (via botão Votação) e de `/candidaturas` direto na URL → login devolve a cada origem. Sem origem (acesso direto a `/login`) → fluxo padrão `/votar`.

**Status:** `____`

---

## Task 4 — Navegação Global (Header/Footer)

**Objetivo:** links, estados ativos e avatar.

- [ ] **4.1** Header: Início, Candidaturas, Votação, A Cerimônia, Galeria de Resultados e Admin navegam para as rotas corretas.
- [ ] **4.2** O item da rota atual fica destacado (fundo dourado suave) em cada página.
- [ ] **4.3** "Votação" é auth-aware (deslogado → `/login`; logado → `/votar`).
- [ ] **4.4** Avatar do header: deslogado → `/login` com title "Entrar na Gala"; logado → `/perfil` com title "Perfil de @{username}".
- [ ] **4.5** Footer: os 5 links de "Acesso aos Salões" navegam corretamente (Urna de Candidaturas, Cédula, Cerimônia, Galeria, Painel Admin).
- [ ] **4.6** "Voltar ao topo" do footer rola suavemente.

**Status:** `____`

---

## Task 5 — Urna de Candidaturas (`/candidaturas`) — MOCK

**Objetivo:** gestão de candidaturas com store compartilhado com o perfil.

- [ ] **5.1** Deslogado → redirect para `/login`.
- [ ] **5.2** Primeiro acesso semeia 2 candidaturas (#MIT em disputa, #PAT homologada) e o badge mostra "2/4 Ativas".
- [ ] **5.3** "Vagas Abertas" lista exatamente as 2 categorias sem candidatura.
- [ ] **5.4** Candidatar-se: modal abre com a categoria correta; contador de caracteres cresce ao digitar; acima de 280 fica vermelho e o submit desabilita.
- [ ] **5.5** Candidatura registrada → card "STATUS: EM DISPUTA" surge com protocolo `#XXX-2025-NN`; badge vira "3/4 Ativas"; a vaga da categoria some.
- [ ] **5.6** **Perfil sincronizado:** abrir `/perfil` → "Minhas Candidaturas" mostra a nova candidatura e o contador do card do eleitor reflete 3.
- [ ] **5.7** Editar pitch (edit_note) → modal em modo edição pré-preenchido; salvar altera o texto no card e no perfil.
- [ ] **5.8** **Compartilhar:** botão share copia o texto formatado (clipboard) → toast de confirmação.
- [ ] **5.9** Com `pg_reveal_at` no passado: cards viram "SELADO PARA A CERIMÔNIA", edição desabilitada, seção de vagas some, share continua.
- [ ] **5.10** Com 4/4: banner "dossiê completo" e nenhuma vaga aberta.

**Status:** `____`

---

## Task 6 — Cédula de Votação (`/votar`) — MOCK

**Objetivo:** regras de voto (1 por categoria, anti-auto-voto, selo, fechamento).

- [ ] **6.1** Deslogado → redirect para `/login` (inclusive digitando a URL direto).
- [ ] **6.2** Sidebar mostra "0 / 4" e botão "Confirmar e Selar" desabilitado com 0 seleções.
- [ ] **6.3** Selecionar um indicado → card ganha borda dourada + check; progresso "1 / 4"; clicar de novo desseleciona.
- [ ] **6.4** **Auto-voto:** logar com username `BetoChave` → o card de `@BetoChave` (Melhor Participação Especial) aparece bloqueado com "voto não permitido (auto-voto é golpe)" e não é selecionável.
- [ ] **6.5** Voto em branco: selar com apenas 2 de 4 categorias selecionadas → o modal lista as demais como "Voto em branco".
- [ ] **6.6** Confirmar → modal "Selar votos na urna?" lista todas as escolhas; "Cancelar" volta sem selar.
- [ ] **6.7** Selar → estado "Votos Selados na Cripta!" com hash `#GALA-2025-XXXXXX` e horário do registro.
- [ ] **6.8** Recarregar a página → **continua selado** (persistência em `pg_votes`).
- [ ] **6.9** Limpar `pg_votes` no DevTools e recarregar → cédula reabre.
- [ ] **6.10** Com `pg_reveal_at` no passado → estado "As Urnas Estão Fechadas" (sem cédula).
- [ ] **6.11** "Fechamento das Urnas" na sidebar mostra contagem regressiva alinhada com `pg_reveal_at`.

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
- [ ] **7.8** Honrarias, Minhas Candidaturas e Atividade Recente renderizam os mocks (candidaturas vindas do store compartilhado).
- [ ] **7.9** **Logout:** botão limpa `pg_token`/`pg_user` e redireciona para `/`; avatar no header volta ao estado deslogado.

**Status:** `____`

---

## Task 8 — Painel Admin (`/admin`) — MOCK (senha via env)

**Objetivo:** gate de acesso e governança da gala.

- [ ] **8.1** Senha errada → banner "Senha soberana incorreta" + shake.
- [ ] **8.2** Senha correta (`luluka2025` ou `VITE_ADMIN_PASSWORD`) → painel com identidade `@AdminMor` no HeaderAdmin.
- [ ] **8.3** Fechar a aba e reabrir → sessão admin **morre** (sessionStorage) → gate novamente.
- [ ] **8.4** Stats e categorias renderizam; accordion abre/fecha com indicados e barras de votos.
- [ ] **8.5** Audit log: filtro por eleitor/categoria funciona; filtro sem resultado mostra estado vazio.
- [ ] **8.6** **Agendar reveal:** definir data futura → toast de sucesso; verificar que `pg_reveal_at` foi gravado e que a **contagem da landing** passa a contar para essa data.
- [ ] **8.7** Com reveal agendado no futuro: `/reveal` trancado e `/resultados` trancados (ver Tasks 9/10).
- [ ] **8.8** **Zona de Perigo:** "Zerar Tudo Agora" → confirm nativo; confirmar → todas as chaves `pg_*` removidas, usuário e admin deslogados.
- [ ] **8.9** Botão "Sair" do HeaderAdmin encerra só a sessão admin (usuário permanece logado).

**Status:** `____`

---

## Task 9 — Cerimônia de Reveal (`/reveal`)

**Objetivo:** máquina de estados da cerimônia, suspense, autoplay e teclado.

- [ ] **9.1** Com reveal agendado no futuro: estado trancado com contagem regressiva; "entrar em modo ensaio" destrava sem alterar `pg_reveal_at`.
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

- [ ] **10.1** Página pública: deslogado acessa normalmente (sem guard).
- [ ] **10.2** Com reveal agendado no futuro → estado trancado "A Cerimônia Ainda Não Aconteceu"; sem agendamento ou no passado → galeria aberta.
- [ ] **10.3** 4 cards de estatísticas da apuração renderizam.
- [ ] **10.4** **Filtros:** "Todas as Categorias" mostra os 4 pódios; cada pill isola sua categoria; pill ativa destacada.
- [ ] **10.5** **Pódio (desktop):** layout 2º | 1º | 3º, com o 1º central elevado (borda dourada, coroa, pct em gradiente).
- [ ] **10.6** **Pódio (mobile 360px):** ordem 1º → 2º → 3º, empilhados, sem scroll horizontal.
- [ ] **10.7** Menção honrosa visível em cada categoria, com a frase do meme.
- [ ] **10.8** Bastidores: 3 estatísticas curiosas renderizam.
- [ ] **10.9** "Compartilhar" copia o link (toast); "Baixar Relatório em PDF" mostra toast de "em breve"; "Rever Cerimônia Completa" mostra toast; "Voltar ao Início" navega.

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
| — | Código | Comentários em espanhol em arquivos legados do @dev (`useAuth.jsx`, `VotePage.jsx`, `ProfilePage.jsx`, `CandidacyPage.jsx`, `schemas.py`). Convenção do projeto é pt-BR. Consolidar numa passada de limpeza. | POLISH | Aberto |

Severidade sugerida: `BLOQUEIO` (impede o fluxo), `MAJOR` (funcionalidade errada), `MINOR` (visual/texto), `POLISH` (melhoria).
