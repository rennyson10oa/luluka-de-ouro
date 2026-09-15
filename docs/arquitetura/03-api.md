# 03 - Contratos da API

A API utilizará o prefixo `/api` para se distinguir do frontend. 

## Endpoints Públicos

### `GET /api/state`
Retorna o estado global do evento para o frontend controlar timers e bloqueios.
- **Response (200):**
  ```json
  {
    "votacao_aberta": true,
    "reveal_at": "2026-10-10T20:00:00Z",
    "total_votos": 42,
    "total_users": 10,
    "total_candidatos": 25
  }
  ```

### `POST /api/register`
- **Request:** `{ "username": "joao", "password": "123" }`
- **Response (200):** `{ "access_token": "jwt_aqui", "token_type": "bearer" }`
- **Errors:** `400` se username já existir.

### `POST /api/login`
- **Request:** `{ "username": "joao", "password": "123" }`
- **Response (200):** `{ "access_token": "jwt_aqui", "token_type": "bearer" }`
- **Errors:** `401 Unauthorized` credenciais inválidas.

## Endpoints Protegidos (Requerem JWT do Usuário)

### `GET /api/me`
- **Response (200):** `{ "id": 1, "username": "joao" }`

### `GET /api/categories`
Lista categorias, candidatos e pitches. Não retorna quantidade de votos se `votacao_aberta == true`.
- **Response (200):**
  ```json
  [
    {
      "id": 1,
      "title": "Melhor participação especial",
      "emoji": "🎬",
      "modo": "aberta",
      "candidacies": [
        { "id": 10, "user_id": 2, "username": "maria", "pitch": "Apareci no meio do nada!" }
      ]
    }
  ]
  ```

### `POST /api/candidacies`
Cria candidatura.
- **Request:** `{ "category_id": 1, "pitch": "Vota em mim!" }`
- **Response (201):** `{ "id": 11, ... }`
- **Errors:** `403` se `votacao_aberta == false`, `400` se já candidato nesta categoria.

### `PUT /api/candidacies/:id`
Edita o pitch (apenas o autor).
- **Request:** `{ "pitch": "Novo texto" }`
- **Response (200):** `{ ... }`
- **Errors:** `403` se não for o autor ou se votação fechada.

### `POST /api/votes`
Registra ou atualiza um voto (Upsert se já existir).
- **Request:** `{ "category_id": 1, "voted_user_id": 2 }`
- **Response (200/201):** `{ "status": "success" }`
- **Errors:** 
  - `403 Forbidden` se auto-voto (`voted_user_id == user_id`).
  - `403 Forbidden` se votação fechada.

### `GET /api/results`
Ranking completo, acessível apenas *após* o reveal (ou para o admin).
- **Response (200):** (Array de pódios)
- **Errors:** `403 Forbidden` se requisitado antes do timer de reveal zerar (ou ser forçado).

## Endpoints de Admin

### `POST /api/admin/login`
- **Request:** `{ "password": "senha_do_env" }`
- **Response (200):** `{ "access_token": "admin_jwt_aqui" }`

### `CRUD` Categorias e Usuários
- `GET`, `POST`, `PUT`, `DELETE` `/api/admin/categories`
- `GET`, `PUT`, `DELETE` `/api/admin/users` (Reset de senhas)

### `POST /api/admin/candidacies`
Cria candidatura no lugar do usuário.
- **Request:** `{ "category_id": 1, "username": "joao", "pitch": "Fui nomeado pelo admin" }`

### `PUT /api/admin/settings`
- **Request:** `{ "votacao_aberta": false, "reveal_at": "2026-10-10T20:00:00Z" }`

### `GET /api/admin/votes`
Para painel em tempo real, mostra contagem de votos.
