# 06 - Passo a Passo: Frontend

A implementação do frontend deve ser executada nesta exata ordem:

1. **Setup Inicial (Vite + Tailwind)**
   - Iniciar via `npm create vite@latest` (React + JS/TS).
   - Instalar TailwindCSS, PostCSS e Autoprefixer.
   - Instalar libs adicionais: `framer-motion`, `lucide-react` (ícones), `axios`, `react-router-dom`, e dependências do `three.js` (`@react-three/fiber`, `@react-three/drei`).

2. **Design Tokens e Tematização**
   - Configurar o `tailwind.config.js` com a paleta de cores (`#0A0A0F`, `#16161D`, `#D4AF37`, etc).
   - Configurar fontes (importar Cinzel/Playfair e Inter no `index.css`).
   - Configurar classes utilitárias para os efeitos *glassmorphism* (blur + borda dourada translucida) e degradês de texto.

3. **Layout Base e Roteamento**
   - Configurar React Router com rotas descritas em `04-telas.md`.
   - Criar o `<Header>` (responsivo, adaptando para estado logado/deslogado).
   - Criar fundo global (gradientes escuros, vinhetas).

4. **Integração com API (Hooks Base)**
   - *Dependência: Endpoints definidos em `03-api.md`.*
   - Configurar Axios interceptor para injetar JWT.
   - Criar custom hook (ex: `useAuth`, `useAppState`) para lidar com o estado de login e variáveis como `votacao_aberta` ou `reveal_at`.

5. **Desenvolvimento das Telas (Sequencial)**
   - **Fase 1: Landing e Auth:** Implementar `/`, criar placeholder 3D (esfera dourada). Fazer forms de `/login` e `/register` conectando na API.
   - **Fase 2: Candidaturas:** Implementar a tela `/candidaturas`, grids responsivos e modal de edição do pitch (com contador de 280 chars).
   - **Fase 3: Votação:** Tela `/votar`. Componente de stepper. Bloqueio visual para o auto-voto e dependência estrita do `votacao_aberta` no global state.
   - **Fase 4: Reveal (Cerimônia):** O complexo. Criar lógica que espera o timer, muda de modo, e carrega os componentes de *drum roll*, empate, e pódio final utilizando `framer-motion` pesado.
   - **Fase 5: Resultados:** Layout limpo e em formato de lista final para `/resultados`.
   - **Fase 6: Painel Admin:** Componentes básicos e chamadas à API de admin (CRUD e forçar status).

6. **Otimizações e Polimento Final**
   - Assegurar otimização GPU (`transform` e `opacity` no framer-motion).
   - Revisar comportamentos mobile-first e layout em 360px de largura.
