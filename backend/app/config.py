from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://civicfix:civicfix@db:5432/civicfix"
    jwt_secret: str = "dev-secret-change-me"
    upload_dir: str = "/data/uploads"

    class Config:
        env_file = ".env"

settings = Settings()