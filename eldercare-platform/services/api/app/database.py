from typing import Optional
from sqlmodel import SQLModel, create_engine
from .config import settings

engine: Optional[object]
if settings.database_url:
    engine = create_engine(settings.database_url, echo=False)
else:
    engine = None


def init_db():
    if not settings.database_url:
        # Offline mode: skip DB initialization
        return
    import app.models  # noqa: F401
    SQLModel.metadata.create_all(engine)
