from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ADMIN_PASSWORD: str = "admin123"
    JWT_SECRET: str = "supersecretkey"
    DATABASE_URL: str = "sqlite:///app.db"
    
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()
