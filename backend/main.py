from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from backend.api.routes import router
from backend.database import engine, Base

# Cria as tabelas ao iniciar (caso nao existam)
Base.metadata.create_all(bind=engine)

# Migration leve: SQLite não altera tabela existente via create_all.
# Idempotente: se a coluna já existir, o ALTER falha e seguimos.
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN vulgo VARCHAR"))
        conn.commit()
    except Exception:
        pass

app = FastAPI(title="Zoeira Awards Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
