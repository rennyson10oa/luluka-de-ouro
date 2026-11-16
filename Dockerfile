# ------------------------------------------------------------------
# BUILD DO CONTAINER ÚNICO DA GALA (ADR-0002: front estático + API)
# Etapa 1: Node compila o React (frontend/dist).
# Etapa 2: Python entrega a API + o dist via SPA fallback (main.py).
# ------------------------------------------------------------------

# ---- Etapa 1: build do frontend ----
FROM node:20-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- Etapa 2: runtime Python ----
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Dependências primeiro (cache de layer)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Código: backend + build estático pronto
COPY backend/ ./backend/
COPY --from=frontend-build /build/dist ./frontend/dist

# Diretórios que viram volumes no compose (dados persistentes)
RUN mkdir -p /app/uploads /app/data

# Defaults de container (o compose sobrescreve os secrets via env)
ENV UPLOAD_DIR=uploads \
    DATABASE_URL=sqlite:////app/data/app.db \
    FRONTEND_DIST=frontend/dist

EXPOSE 8000

# ⚠ SINGLE WORKER, SEMPRE: o hub de eventos SSE (ADR-0003) é memória de
# processo — workers > 1 quebrariam o fanout e o replay.
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
