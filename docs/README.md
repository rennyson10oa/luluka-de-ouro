# Documentação — Prêmios do Grupo

Índice de navegação da documentação do projeto. A ordem abaixo reflete a
sequência recomendada de leitura.

## Produto (escopo e plano)

| Doc | Conteúdo |
|-----|----------|
| [`00-visao-geral.md`](produto/00-visao-geral.md) | Visão geral do produto, público-alvo, stack obrigatória e identidade visual |
| [`04-telas.md`](produto/04-telas.md) | Especificação das telas e fluxos |
| [`07-checklist.md`](produto/07-checklist.md) | Checklist de execução do projeto |

## Arquitetura (desenho técnico e decisões)

| Doc | Conteúdo |
|-----|----------|
| [`01-arquitetura.md`](arquitetura/01-arquitetura.md) | Estrutura de pastas do monorepo, build/deploy e diagrama de rotas |
| [`02-modelo-dados.md`](arquitetura/02-modelo-dados.md) | Modelo de dados (entidades e relações) |
| [`03-api.md`](arquitetura/03-api.md) | Contrato da API (endpoints e payloads) |
| [`adrs/`](arquitetura/adrs/) | Architecture Decision Records — decisões técnicas formalizadas |

### ADRs

| ADR | Status | Assunto |
|-----|--------|---------|
| [ADR-0001](arquitetura/adrs/adr-0001-auth-provider-e-header-persistente.md) | Proposto | AuthProvider reativo + Header persistente no layout (origem: bug do tamanho alternado do troféu 3D) |

## Backend

| Doc | Conteúdo |
|-----|----------|
| [`05-backend.md`](backend/05-backend.md) | Arquitetura do FastAPI, autenticação e segurança |

## Frontend

| Doc | Conteúdo |
|-----|----------|
| [`06-frontend.md`](frontend/06-frontend.md) | Convenções de React, componentes e padrões de UI |
