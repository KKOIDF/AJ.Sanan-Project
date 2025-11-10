from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Optional in OFFLINE mode
    database_url: Optional[str] = None
    secret_key: str = "change-me"
    access_token_expire_minutes: int = 60
    api_key: str = ""

    class Config:
        env_prefix = ""
        env_file = ".env"


settings = Settings()
