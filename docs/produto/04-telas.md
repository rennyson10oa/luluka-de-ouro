# 04 - Telas do Frontend

## `/` (Landing Page)
- **Objetivo:** Ponto de entrada impressionante. Apresenta o status e engaja o usuário a participar.
- **Componentes:**
  - **Hero 3D:** Modelo 3D dourado girando continuamente (usando `@react-three/fiber`). *Placeholder inicial: esfera ou busto genérico.* Lazy loaded.
  - **Header:** Estado deslogado (Entrar/Criar conta) e estado logado (Avatar com a inicial + dropdown).
  - **Timer / Flip-card:** Contagem regressiva visual sincronizada com o backend, mostrando dias, horas, min, seg.
  - **Estatísticas Rápidas:** Total de votos e categorias exibidas de forma glassmorphism.
  - **CTA:** Botão primário brilhante "Votar" (Gradiente Dourado).

## `/register` & `/login`
- **Objetivo:** Identificar os usuários. Sem necessidade de e-mail.
- **Componentes:** Formulário simples sobre card escuro translúcido com borda `1px` dourada.
- **Estados/Interações:** 
  - Erro em tempo real (ex: "Username já existe").
  - Animação sutil de tremedeira (shake) no erro de senha do `/login`.

## `/candidaturas`
- **Objetivo:** Urna de candidaturas onde usuários criam seus pitches.
- **Componentes:** Grid de cards (um por categoria).
- **Estados/Interações:**
  - Estado vazio: Botão "Candidatar-se".
  - Estado preenchido: Exibe o pitch atual e botão "Editar".
  - Modal: Abre um popup modal com `<textarea>` para digitar o pitch. Contador regressivo de 280 caracteres.

## `/votar`
- **Objetivo:** Fluxo de votação, guiado.
- **Componentes:** Stepper horizontal/vertical exibindo o progresso das categorias. Um card central por categoria.
- **Estados/Interações:**
  - Exibição do pitch de cada candidato no card de escolha.
  - **Auto-voto bloqueado:** Se o candidato for o usuário atual, o botão de voto fica bloqueado e emite alerta visual: *"Voto não permitido 😜"*.
  - Animação de confete rápido ou brilho ao confirmar voto, passando para o próximo step.
  - Feedback claro de "Votação Fechada" caso o tempo esgote durante a navegação.

## `/reveal`
- **Objetivo:** Cerimônia animada apresentada quando o timer zera.
- **Componentes:** Tela focada, escura, interface minimalista. Controle manual ("Próxima", barra de espaço) ou autoplay.
- **Animações (Specs):**
  - Ordem de revelação: 3º lugar → 2º lugar → *Drum roll* → 1º lugar.
  - *Drum roll*: Animação de pulsação leve por 1,5s antes de revelar o campeão.
  - 1º lugar: Texto de suspense muda para o vencedor junto com explosão de confete dourado. Exibição do pitch vencedor.
  - Empate: Quebra a tela com banner em vermelho/dourado: "EMPATE HISTÓRICO ⚖️".

## `/resultados`
- **Objetivo:** Repositório permanente pós-cerimônia.
- **Componentes:** Lista de categorias mostrando o pódio completo (1º, 2º, 3º). Exibe contagem de votos e o pitch vencedor de cada um. 
- Sem restrições após liberado.

## `/admin`
- **Objetivo:** Painel de controle do organizador.
- **Componentes:** Sistema de abas (Categorias, Usuários, Votação ao Vivo, Configurações). Login por senha ambiente (`ADMIN_PASSWORD`).
- **Estados:** Toggle rápido para abrir/fechar votação; botão vermelho para "Forçar Reveal" ignorando o timer.
