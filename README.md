# Luluka de Ouro

> A premiação anual do grupo. Uma cerimônia digital onde amigos se candidatam,
> votam entre si e descobrem os vencedores em um reveal cinematográfico.

---

## Sobre

Plataforma de premiação construída para um grupo pequeno de amigos, pensada
para ser vivida num fim de semana, predominantemente pelo celular. A
experiência equilibra a descontração da "zoeira" com um acabamento visual
cuidadoso — vidro fosco, dourado sob vinheta, e uma cerimônia de revelação
com suspense digno de uma noite de Oscar.

O fluxo é simples:

1. **Cadastro e login** — cada participante cria sua conta.
2. **Candidaturas** — submete um _pitch_ de campanha para uma ou mais categorias.
3. **Votação** — cada um vota em um candidato por categoria. Não há auto-voto,
   e cada categoria aceita um único voto por usuário.
4. **Contagem regressiva** — quando o relógio chega a zero, a votação se encerra.
5. **Cerimônia de reveal** — animação revela do 3º ao 1º lugar, com _drum roll_,
   confete e efeitos de suspense.
6. **Galeria de resultados** — após a cerimônia, os resultados ficam
   permanentemente disponíveis.

---

## Stack

### Backend

| Camada            | Tecnologia                              |
| ----------------- | --------------------------------------- |
| Linguagem         | Python 3.11+                            |
| Framework         | FastAPI                                 |
| ORM               | SQLAlchemy                              |
| Banco de dados    | SQLite                                  |
| Hashing de senhas | bcrypt                                  |
| Sessão            | JWT (JSON Web Tokens)                   |
| Deploy            | Container único servindo o front estático |

### Frontend

| Camada          | Tecnologia                              |
| --------------- | ---------------------------------------- |
| Framework       | React 18 com Vite                        |
| Estilização     | TailwindCSS                              |
| Animações       | Framer Motion                            |
| 3D              | Three.js via `@react-three/fiber` e `@react-three/drei` |

---

## Identidade visual

A estética é construída sobre uma base escura e dourada, com superfícies em
_glassmorphism_ translúcido e uma vinheta radial que concentra a atenção no
centro da tela. O desenho é _mobile-first_, otimizado para resoluções
pequenas (a partir de 360px).

### Paleta

| Função             | Cor        |
| ------------------ | ---------- |
| Fundo              | `#0A0A0F`  |
| Superfícies        | `#16161D`  |
| Primária / destaques | `#D4AF37`  |
| Gradiente de títulos | `#D4AF37` → `#F5E7A8` |
| Texto              | `#FAF6ED`  |
| Bordas             | `#8C7326`  |

### Tipografia

- **Títulos:** Cinzel ou Playfair Display
- **Corpo de texto:** Inter

---

## Estrutura do monorepo

```text
.
├── backend/                 API em FastAPI
│   ├── main.py              Ponto de entrada
│   ├── api/                 Rotas
│   ├── core/                Configurações e segurança (JWT, envs)
│   ├── models/              Modelos do SQLAlchemy
│   ├── schemas/             Schemas do Pydantic
│   ├── crud/                Operações de banco de dados
│   ├── database.py          Configuração do SQLite
│   └── tests/               Testes (pytest)
├── frontend/                App em React + Vite
│   ├── public/              Assets estáticos e modelos 3D (.glb)
│   ├── src/
│   │   ├── assets/          Imagens e CSS global
│   │   ├── components/      Componentes reutilizáveis (UI, 3D)
│   │   ├── pages/           Telas (Landing, Login, Candidaturas, Votação, Reveal, Resultados)
│   │   ├── hooks/           Hooks customizados (API, Auth)
│   │   ├── store/           Gerenciamento de estado
│   │   └── App.jsx           Configuração de rotas
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── docs/                    Documentação do projeto
├── Dockerfile               Build do front e execução do Uvicorn
├── requirements.txt         Dependências do Python
└── .env                     Variáveis de ambiente (não versionado)
```

---

## Build e deploy (container único)

1. **Frontend** — o Vite compila o React para arquivos estáticos em
   `frontend/dist`.
2. **Serviço estático** — o FastAPI serve `frontend/dist` na rota raiz `/`,
   com fallback para `index.html` (suporte ao React Router).
3. **Docker** — o `Dockerfile` realiza o build do frontend via Node, instala as
   dependências do Python e sobe o Uvicorn em um único container.

---

## Rotas e telas

```text
/ ............................ Landing
/login  .. /register .......... Autenticação
/candidaturas ................ Candidaturas (pitch de campanha)
/votar ........................ Votação
/reveal ....................... Cerimônia de revelação animada
/resultados .................. Galeria permanente de resultados
/admin ....................... Painel de administração
```

---

## Desenvolvimento

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores necessários (chave JWT,
URL do banco, etc.).

---

## Documentação

- [`docs/00-visao-geral.md`](docs/00-visao-geral.md) — Visão geral e stack
- [`docs/01-arquitetura.md`](docs/01-arquitetura.md) — Arquitetura e estrutura
