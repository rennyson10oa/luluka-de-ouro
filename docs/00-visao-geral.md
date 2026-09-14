# 🏆 Projeto "Prêmios do Grupo" — Visão Geral

## Resumo do Projeto
Site de premiação anual de um grupo de amigos ("Oscar da zoeira"). Uma plataforma onde usuários criam conta, candidatam-se aos troféus com um *pitch* de campanha, e votam uns nos outros. A votação permite apenas 1 voto por categoria por usuário e não permite auto-voto. Quando a contagem regressiva atinge zero, acontece uma cerimônia de reveal animada, revelando do 3º ao 1º lugar com efeitos de suspense (drum roll) e confete. Após a cerimônia, os resultados ficam permanentemente disponíveis.

## Público-alvo
Aproximadamente 10 usuários (amigos), acessando predominantemente via celular durante um evento de fim de semana. A aplicação foca em uma experiência fluida, "zoeira", mas com alto capricho visual, sem necessidade de escala ou produção enterprise.

## Stack Obrigatória
### Backend
- **Linguagem/Framework:** Python 3.11+, FastAPI
- **Banco de Dados:** SQLite via SQLAlchemy
- **Autenticação e Segurança:** bcrypt para hashing de senhas, JWT (JSON Web Tokens) para sessão.
- **Deploy:** Container único onde o front-end "buildado" é servido estaticamente pelo próprio FastAPI.

### Frontend
- **Framework:** React 18 com Vite
- **Estilização:** TailwindCSS
- **Animações:** Framer Motion
- **3D:** Three.js via `@react-three/fiber` e `@react-three/drei` (modelo 3D do hero).

### Identidade Visual
- **Paleta de Cores:**
  - Fundo: Preto profundo `#0A0A0F`
  - Superfícies: Grafite `#16161D`
  - Primária/Destaques: Dourado `#D4AF37`
  - Títulos (Gradiente): Dourado → `#F5E7A8`
  - Texto: `#FAF6ED`
  - Bordas: `#8C7326`
- **Tipografia:**
  - Títulos: Cinzel ou Playfair Display
  - Corpo de texto: Inter
- **Estilo:** Glassmorphism (fundos escuros translúcidos + borda dourada de 1px), vinheta radial, god rays discretos.
- **Abordagem:** Mobile-first obrigatório (focado em resoluções pequenas como 360px).
