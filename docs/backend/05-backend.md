# 05 - Passo a Passo: Backend

Esta documentação serve de guia estrito para a implementação do backend. Siga a ordem:

1. **Setup Inicial**
   - Iniciar projeto FastAPI.
   - Configurar `requirements.txt` (FastAPI, uvicorn, sqlalchemy, bcrypt, pyjwt, pydantic-settings, pytest).
   - Configurar carregamento de env vars (`ADMIN_PASSWORD`, `JWT_SECRET`, `DATABASE_URL`).

2. **Models e Migrations**
   - *Dependência: Arquitetura definida em `02-modelo-dados.md`.*
   - Criar `database.py` e engine do SQLite.
   - Declarar modelos SQLAlchemy: `User`, `Category`, `Candidacy`, `Vote`, `Settings`.
   - Adicionar constraints explícitas (UniqueConstraints e CheckConstraints na declaração da tabela).
   - Script para criar tabelas no startup (sem necessidade de Alembic para esse escopo simples).

3. **Autenticação (Auth)**
   - Criar utilitários para senhas (hashing e verificação com `bcrypt`).
   - Implementar geração/decodificação de JWT.
   - Criar dependências do FastAPI: `get_current_user` e `verify_admin_token`.

4. **Implementação dos Endpoints Públicos e de Usuário**
   - *Dependência: Contratos em `03-api.md`.*
   - `GET /api/state`
   - Rotas de autenticação (`/register`, `/login`, `/me`).
   - `GET /api/categories` e lógica de agregação das candidaturas.

5. **Regras de Negócio e Endpoints Transacionais**
   - `POST/PUT /api/candidacies`: Validar se `votacao_aberta` no BD. Restrição de tamanho (280 max).
   - `POST /api/votes`:
     - Regra: Verificar tabela `settings`, rejeitar 403 se `votacao_aberta == False`.
     - Regra: Rejeitar se `voter_id == voted_user_id` (403 Auto-voto).
     - Usar `upsert` na operação (SQLAlchemy `on_conflict_do_update` ou checar e atualizar).
   - `GET /api/results`: Bloquear (403) até que o servidor julgue que o horário `reveal_at` já passou ou o admin forçou.

6. **Endpoints de Admin**
   - Login de admin com verificação simples (`ADMIN_PASSWORD`).
   - Crud de categorias e controle do `settings`.
   - Rota de dump de dados (Votação ao vivo).

7. **Seed de Desenvolvimento**
   - Criar um script `seed.py` rodado opcionalmente:
     - Cria 6 usuários falsos.
     - Cria 4 categorias específicas listadas no documento geral (ex: "Melhor participação especial").
     - Adiciona pitches engraçados (candidaturas).
     - Distribui votos aleatórios ou forjados para garantir funcionamento do `/reveal` e empates.

8. **Testes Mínimos (pytest)**
   - Testar o cadastro bloqueando username duplicado.
   - Testar API de voto com falha intencional de auto-voto (403).
   - Testar bloqueio da API de `/api/results` antes do reveal.
