from sqlmodel import SQLModel, create_engine
from .config import settings

engine = create_engine(settings.database_url, echo=False)

def init_db():
    import app.models  # noqa: F401
    SQLModel.metadata.create_all(engine)
