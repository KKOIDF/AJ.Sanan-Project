from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60
    api_key: str = ""

    class Config:
        env_prefix = ""
        env_file = ".env"

settings = Settings()
