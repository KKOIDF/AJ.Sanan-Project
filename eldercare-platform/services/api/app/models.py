from typing import Optional, List
from datetime import datetime
from sqlmodel import SQLModel, Field, Relationship

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: str
    role: str  # elderly, caregiver, clinician, admin, integrator
    hashed_password: str
    dob: Optional[datetime] = None
    emergency_contacts: Optional[str] = None  # JSON string for MVP
    consent_status: Optional[str] = None

class Device(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    device_uid: str = Field(index=True, unique=True)
    type: str
    owner_user_id: Optional[int] = Field(default=None, foreign_key="user.id")
    fw_version: Optional[str] = None
    last_seen: Optional[datetime] = None
    battery: Optional[float] = None

class SensorReading(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    device_id: int = Field(foreign_key="device.id")
    ts: datetime = Field(default_factory=datetime.utcnow, index=True)
    sensor_type: str
    value: float
    payload: Optional[str] = None  # JSON string

class Event(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    type: str
    severity: str
    payload: Optional[str] = None

class RiskScore(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    score: float
    factors: Optional[str] = None

class Alert(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: int = Field(foreign_key="event.id")
    recipients: Optional[str] = None  # JSON string
    status: str = Field(default="new")  # new, sent, ack, closed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_by: Optional[str] = None

class MedicationSchedule(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id")
    drug: str
    dose: str
    times: Optional[str] = None  # JSON string
    confirmed: Optional[str] = None  # JSON string
