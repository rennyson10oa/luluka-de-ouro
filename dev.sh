#!/usr/bin/env bash
# dev.sh — ciclo diário do projeto com comando único.
#
# POR QUE ESTE SCRIPT EXISTE: a DATABASE_URL (sqlite:///app.db) é RELATIVA ao
# diretório onde o processo nasce e o pacote "backend" só é importável da RAIZ
# do repo. Rodar `python -m backend.seed` ou `uvicorn backend.main:app` de
# dentro de backend/ resulta em "No module named 'backend'" ou num app.db
# fantasma em lugar errado. Este script ancora a raiz e roda tudo de lá,
# independentemente de onde você estava no terminal.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

# Resolve o virtualenv gerenciado pelo PoETRY (que vive em backend/pyproject.toml)
# e usa o binário Python dele DIRETAMENTE: assim o processo nasce na raiz do
# repo (import de "backend.*" e app.db no lugar certo), sem depender do CWD do
# poetry. Fallback: .venv local/pip se o Poetry não estiver instalado.
if command -v poetry >/dev/null 2>&1 && PYENV="$(poetry -C backend env info -p 2>/dev/null)" && [ -x "$PYENV/bin/python" ]; then
  PY="$PYENV/bin/python"
else
  if [ -x ".venv/bin/python" ]; then
    PY=".venv/bin/python"
  else
    echo "✗ Nenhum ambiente Python encontrado." >&2
    echo "  Configure com: cd backend && poetry install   (ou crie .venv na raiz)" >&2
    exit 1
  fi
fi

# Auto-cura de dependência: o Poetry pode criar virtualenvs DIFERENTES por
# terminal (o $XDG_CACHE_HOME de um alacritty snap difere do cache padrão).
# Sem o python-multipart, o import do app quebra (UploadFile de avatar).
# Se estiver faltando, instalamos no venv resolvido sem interromper.
if ! "$PY" -c "import multipart" >/dev/null 2>&1; then
  echo "→ python-multipart ausente no ambiente; instalando..."
  "$PY" -m pip install -q python-multipart >/dev/null 2>&1 \
    || echo "⚠ Não foi possível instalar automaticamente; rode manualmente:" >&2
    echo "  pip install python-multipart" >&2
fi

cmd="${1:-help}"

case "$cmd" in
  # Semear o banco (usuários + categorias + candidaturas de exemplo)
  seed)
    $PY -m backend.seed
    ;;
  # Subir a API em :8000 (os docs interativos ficam em /docs)
  api)
    $PY -m uvicorn backend.main:app --port 8000
    ;;
  # Testes do backend (usam SQLite temporário — NÃO tocam no app.db)
  test)
    $PY -m pytest backend/tests/ -q
    ;;
  # Testes do backend em modo verboso (mostra prints)
  testv)
    $PY -m pytest backend/tests/ -q -s
    ;;
  # Frontend em modo dev (Vite :5173 com proxy /api → :8000)
  front)
    (cd frontend && npm run dev)
    ;;
  # Build de produção do frontend
  build)
    (cd frontend && npm run build)
    ;;
  *)
    echo "uso: ./dev.sh {seed|api|test|testv|front|build}"
    echo ""
    echo "  seed    — popula o app.db (não apaga dados existentes)"
    echo "  api     — servidor FastAPI em http://localhost:8000"
    echo "  test    — pytest do backend"
    echo "  front   — Vite dev em http://localhost:5173"
    echo "  build   — build estático do frontend (frontend/dist)"
    ;;
esac
