from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Gestão do Cuidado (PSA)"
    VERSION: str = "2.0.0"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str
    CORS_ALLOW_ORIGINS: str = "http://localhost:8080,http://127.0.0.1:8080,http://172.26.224.1:8080"

    METABASE_SECRET_KEY: str = "1f9325def9abf761d543eb8b1e61f77cc4a43dec7fada58d0f9d26c37db3bb7f"
    METABASE_SITE_URL: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ALLOW_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"

settings = Settings()