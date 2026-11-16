from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from backend.api.routes import router
from backend.database import engine, Base

# Cria as tabelas ao iniciar (caso nao existam)
# audit_logs é tabela NOVA: o create_all acima já a cria em bancos existentes
# (não precisa de ALTER TABLE; as migrações leves abaixo são só para colunas).
Base.metadata.create_all(bind=engine)

# Migration leve: SQLite não altera tabela existente via create_all.
# Idempotente: se a coluna já existir, o ALTER falha e seguimos.
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE users ADD COLUMN vulgo VARCHAR"))
        conn.commit()
    except Exception:
        pass
    try:
        # Migração leve da coluna de avatar (idempotente, igual à de vulgo).
        conn.execute(text("ALTER TABLE users ADD COLUMN avatar VARCHAR"))
        conn.commit()
    except Exception:
        pass
    try:
        # Marca usuários "convidados" (indicados sem conta criados pelo admin).
        conn.execute(
            text("ALTER TABLE users ADD COLUMN is_guest BOOLEAN NOT NULL DEFAULT 0")
        )
        conn.commit()
    except Exception:
        pass
    try:
        # Timestamp do voto: permite rehidratar o "Horário do Registro" da cédula
        # após reload (antes o horário era memória de sessão do frontend).
        conn.execute(text("ALTER TABLE votes ADD COLUMN created_at DATETIME"))
        conn.commit()
    except Exception:
        pass

    # Estado da cerimônia dirigida em Settings. Tabela nova (chat_messages) é
    # criada pelo create_all acima; estas colunas exigem ALTER em tabela
    # existente, daí o try/except idempotente.
    for stmt in (
        "ALTER TABLE settings ADD COLUMN ceremony_phase VARCHAR",
        "ALTER TABLE settings ADD COLUMN ceremony_category_id INTEGER",
        "ALTER TABLE settings ADD COLUMN ceremony_revealed VARCHAR",
    ):
        try:
            conn.execute(text(stmt))
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
