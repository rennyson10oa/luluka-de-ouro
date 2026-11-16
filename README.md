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
| Linguagem         | Python 3.12 (Poetry)                    |
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
│   │   ├── hooks/           Hooks customizados (API, Auth, estado da gala)
│   │   └── App.jsx           Configuração de rotas
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.js
├── docs/                    Documentação do projeto
├── uploads/                 Avatares salvos pelo backend (volume no deploy)
├── Dockerfile               Build do front e execução do Uvicorn
├── requirements.txt         Dependências do Python (via pip, sem Poetry)
└── .env                     Variáveis de ambiente (não versionado)
```

---

## Build e deploy (container único)

A imagem constrói o front e serve tudo por um processo só (a API entrega o
`frontend/dist` com fallback SPA — rodando sem container, o mesmo layout
funciona se `frontend/dist` existir ao lado do backend).

```bash
# 1. Secrets de produção (NÃO versionar o .env!)
cp .env.example .env
#   → JWT_SECRET forte:  python3 -c "import secrets; print(secrets.token_urlsafe(48))"
#   → ADMIN_PASSWORD nova (nada de admin123 no deploy real)

# 2. Imagem + serviço
docker compose up -d --build

# 3. Primeira vez: semear o banco do volume
docker compose run --rm gala python -m backend.seed
```

| Item | Onde vive | Persistência |
|------|-----------|--------------|
| Banco SQLite | `/app/data/app.db` | volume `gala_data` |
| Avatares | `/app/uploads/` | volume `gala_uploads` |
| Secrets | env do compose (de `.env` da raiz) | — |

**Regras de ouro do deploy:**

- ⚠️ **Single worker, sempre** (`--workers 1`): o hub de eventos SSE (ADR-0003)
  vive na memória do processo — mais de um worker quebra o fanout/replay;
- **TLS/wss**: proxy de frente recomendado — o exemplo pronto está em
  `Caddyfile.example` (Caddy faz TLS automático e não bufferiza SSE; para
  Nginx, desligue buffering e estenda `proxy_read_timeout`);
- Porta do serviço: 8000 (o proxy é quem expõe 80/443);
- Migrações: idempotentes no boot (`ALTER TABLE` com try/except) — nada a
  rodar manualmente além do seed inicial;
- **Checklist do dia da gala:** `.env` preenchido → `docker compose up -d
  --build` → seed → login no `/admin` com a senha de produção → agendar o
  reveal → ensaio da cerimônia via console do palco → resetar palco.

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

### Início rápido — `dev.sh` (o caminho recomendado)

**Um único comando, de qualquer diretório do terminal** (o script ancora a
raiz do repo sozinho — evita o `No module named 'backend'` e o `app.db`
fantasma de rodar de dentro de `backend/`):

```bash
./dev.sh api     # backend FastAPI em http://localhost:8000 (docs: /docs)
./dev.sh front   # Vite dev em http://localhost:5173 (proxy /api → :8000)
./dev.sh seed    # semear o app.db (usuários + categorias de exemplo)
./dev.sh test    # pytest do backend (SQLite temporário — não toca no app.db)
./dev.sh build   # build de produção do frontend → frontend/dist
```

Os dois do dia a dia:

```bash
# terminal 1
./dev.sh api
# terminal 2
./dev.sh front
```

> Primeira vez? Instale antes: `cd backend && poetry install` e `cd frontend && npm install`.
> O `dev.sh` encontra o virtualenv do Poetry automaticamente (e cai para `.venv`/pip se necessário).

### Backend (detalhes, sem o script)

O backend usa **Poetry** com Python 3.12, e precisa ser executado **a partir
da raiz do repositório** — nunca de dentro de `backend/`:

```bash
cd backend && poetry install && cd ..
poetry run python -m backend.seed
poetry run python -m uvicorn backend.main:app --port 8000
```

> ⚠️ A `DATABASE_URL` é relativa (`sqlite:///app.db`): rodar de outro diretório
> cria um `app.db` fantasma em lugar errado. Da raiz, sempre — ou use o
> `dev.sh`, que resolve isso para você.

Alternativa sem Poetry (o `requirements.txt` existe para essa via):

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m backend.seed
uvicorn backend.main:app --port 8000   # a partir da raiz
```

Contribuições de desenvolvimento correntes:

| Comando (da raiz)                          | O que faz                          |
| ------------------------------------------ | ---------------------------------- |
| `./dev.sh seed` ou `poetry run python -m backend.seed` | Popula `app.db` (NÃO apaga) |
| `./dev.sh test`                            | Testes (usam SQLite temporário)    |
| `./dev.sh api`                             | API em :8000                       |
| `curl localhost:8000/api/state`            | Estado vivo da gala                |

- A API expõe os docs interativos em [`localhost:8000/docs`](http://localhost:8000/docs).
- Senha do painel admin vem de `backend/.env` (`ADMIN_PASSWORD`, padrão `admin123`).
- Configuração do perfil: `backend/.env` (`ADMIN_PASSWORD`, `JWT_SECRET`,
  `DATABASE_URL`; `UPLOAD_DIR` para avatares, padrão `uploads/`).

### Frontend

```bash
cd frontend
npm install
npm run dev        # :5173 — o Vite já faz proxy de /api → :8000
```

> O servidor do backend precisa estar rodando antes (o proxy depende dele).
> Build de produção: `npm run build` → `frontend/dist`.

### Variáveis de ambiente

`backend/.env` (não versionado):

```env
ADMIN_PASSWORD=admin123
JWT_SECRET=<troque em produção>
DATABASE_URL=sqlite:///app.db
```

Não existe `.env` no frontend — o proxy do Vite resolve as chamadas `/api/*`.

---

## Documentação

O índice completo está em [`docs/README.md`](docs/README.md).

- [`docs/produto/00-visao-geral.md`](docs/produto/00-visao-geral.md) — Visão geral e stack
- [`docs/arquitetura/01-arquitetura.md`](docs/arquitetura/01-arquitetura.md) — Arquitetura e estrutura
