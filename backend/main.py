from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.api.routes import router
from backend.database import engine, Base

# Cria as tabelas ao iniciar (caso nao existam)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Zoeira Awards Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
