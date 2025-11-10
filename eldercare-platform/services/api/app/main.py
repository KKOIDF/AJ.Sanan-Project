from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from .database import engine, init_db
from .models import User, Device, SensorReading, Alert, Event
from .config import settings
from .auth import create_access_token, hash_password, verify_password
import os, pandas as pd

app = FastAPI(title="Eldercare API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WEB_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "web")
if os.path.isdir(WEB_DIR):
    app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")

# Offline dataset caching
OFFLINE = os.getenv("OFFLINE_ONLY", "0") == "1"
OUTPUTS_DIR = os.getenv("OFFLINE_OUTPUTS_DIR", "/data/outputs")
offline_cache: dict[str, pd.DataFrame] = {}

ROLES = {"elderly", "caregiver", "clinician", "admin", "integrator"}

def rbac(required_roles: set[str]):
    def _dep(x_role: str | None = Header(default=None, convert_underscores=False, alias="X-Role")):
        if not x_role or x_role not in required_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return x_role
    return _dep

@app.on_event("startup")
def on_startup():
    init_db()
    if OFFLINE:
        for fname in ["merged_scored.csv", "qc_sensor_counts.csv"]:
            fpath = os.path.join(OUTPUTS_DIR, fname)
            if os.path.isfile(fpath):
                try:
                    offline_cache[fname] = pd.read_csv(fpath)
                except Exception:
                    pass

# --- Auth minimal ---
@app.post("/api/v1/auth/login")
def login(email: str, password: str):
    with Session(engine) as s:
        user = s.exec(select(User).where(User.email == email)).first()
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_access_token(str(user.id))
        return {"access_token": token, "token_type": "bearer", "role": user.role, "user_id": user.id}

# --- Users ---
@app.post("/api/v1/users", dependencies=[Depends(rbac({"admin"}))])
def create_user(email: str, name: str, role: str, password: str):
    if role not in ROLES:
        raise HTTPException(400, "Invalid role")
    with Session(engine) as s:
        if s.exec(select(User).where(User.email == email)).first():
            raise HTTPException(400, "Email exists")
        u = User(email=email, name=name, role=role, hashed_password=hash_password(password))
        s.add(u)
        s.commit()
        s.refresh(u)
        return u

@app.get("/api/v1/users/{user_id}", dependencies=[Depends(rbac({"admin", "clinician", "caregiver", "elderly"}))])
def get_user(user_id: int):
    with Session(engine) as s:
        u = s.get(User, user_id)
        if not u:
            raise HTTPException(404)
        return u

# --- Devices ---
@app.post("/api/v1/devices", dependencies=[Depends(rbac({"admin"}))])
def register_device(device_uid: str, type: str, owner_user_id: int | None = None):
    with Session(engine) as s:
        d = Device(device_uid=device_uid, type=type, owner_user_id=owner_user_id)
        s.add(d)
        s.commit()
        s.refresh(d)
        return d

@app.post("/api/v1/devices/{device_uid}/data")
def ingest_device_data(device_uid: str, sensor_type: str, value: float):
    with Session(engine) as s:
        d = s.exec(select(Device).where(Device.device_uid == device_uid)).first()
        if not d:
            raise HTTPException(404, "device not found")
        r = SensorReading(device_id=d.id, sensor_type=sensor_type, value=value)
        s.add(r)
        d.last_seen = r.ts
        s.add(d)
        s.commit()
        return {"ok": True}

# --- Alerts & ACK ---
@app.post("/api/v1/alerts/ack", dependencies=[Depends(rbac({"caregiver", "clinician", "admin"}))])
def ack_alert(alert_id: int, by: str):
    with Session(engine) as s:
        a = s.get(Alert, alert_id)
        if not a:
            raise HTTPException(404)
        a.status = "ack"
        a.acknowledged_by = by
        s.add(a)
        s.commit()
        return {"ok": True}

# --- Dashboard (sketch) ---
@app.get("/api/v1/users/{user_id}/dashboard")
def dashboard(user_id: int):
    if OFFLINE:
        merged = offline_cache.get("merged_scored.csv")
        qc = offline_cache.get("qc_sensor_counts.csv")
        user_rows = None
        if merged is not None:
            user_rows = merged[merged.get("subject_id", merged.columns[0]) == str(user_id)].to_dict(orient="records")
        return {"offline": True, "merged_rows": user_rows, "qc_summary_rows": qc.head(20).to_dict(orient="records") if qc is not None else None}
    with Session(engine) as s:
        readings = s.exec(select(SensorReading).limit(100)).all()
        alerts = s.exec(select(Alert).limit(50)).all()
        return {"recent_readings": [r.dict() for r in readings], "alerts": [a.dict() for a in alerts]}

# --- Reports (sketch) ---
@app.get("/api/v1/offline/subjects")
def offline_subjects():
    if not OFFLINE:
        raise HTTPException(400, "offline mode disabled")
    merged = offline_cache.get("merged_scored.csv")
    if merged is None:
        return {"subjects": []}
    cols = [c for c in ["subject_id", "independence_index", "steps_sum", "active_minutes"] if c in merged.columns]
    return {"subjects": merged[cols].head(200).to_dict(orient="records")}

@app.get("/api/v1/offline/risk_scores")
def offline_risk_scores():
    if not OFFLINE:
        raise HTTPException(400, "offline mode disabled")
    merged = offline_cache.get("merged_scored.csv")
    if merged is None:
        return {"risk_scores": []}
    if "independence_index" in merged.columns:
        out = merged[["subject_id", "independence_index"]].rename(columns={"independence_index": "score"})
    else:
        out = merged.iloc[:0]
    return {"risk_scores": out.to_dict(orient="records")}

@app.get("/api/v1/reports/{user_id}")
def report(user_id: int, type: str = "csv"):
    if OFFLINE:
        merged = offline_cache.get("merged_scored.csv")
        if merged is None:
            return JSONResponse({"type": type, "data": ""})
        csv_head = merged.head(50).to_csv(index=False)
        return JSONResponse({"type": type, "data": csv_head})
    return JSONResponse({"type": type, "data": "timestamp,sensor,value\n"})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
