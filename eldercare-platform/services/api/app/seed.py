from sqlmodel import Session
from .database import engine, init_db
from .models import User
from .auth import hash_password

USERS = [
    {"email": "elderly1@example.com", "name": "Elder One", "role": "elderly", "password": "pass"},
    {"email": "caregiver1@example.com", "name": "Care One", "role": "caregiver", "password": "pass"},
    {"email": "clinician1@example.com", "name": "Dr. Clin", "role": "clinician", "password": "pass"},
    {"email": "admin@example.com", "name": "Admin Root", "role": "admin", "password": "admin"},
]

def run():
    init_db()
    with Session(engine) as s:
        for u in USERS:
            if s.query(User).filter(User.email == u["email"]).first():
                continue
            user = User(email=u["email"], name=u["name"], role=u["role"], hashed_password=hash_password(u["password"]))
            s.add(user)
        s.commit()
    print("Seed complete")

if __name__ == "__main__":
    run()
