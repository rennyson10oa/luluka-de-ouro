from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ADMIN_PASSWORD: str = "admin123"
    JWT_SECRET: str = "supersecretkey"
    DATABASE_URL: str = "sqlite:///app.db"
    # Diretório de uploads RELATIVO à raiz do repo (o uvicorn roda de lá).
    # No deploy este caminho vira um volume Docker nomeado, sem mudar código.
    UPLOAD_DIR: str = "uploads"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
