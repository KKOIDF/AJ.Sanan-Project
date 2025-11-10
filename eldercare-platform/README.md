# Eldercare Platform (Scaffold)

Minimal multi-service architecture seed based on requirements:

Services:
- api: FastAPI core (users, devices, alerts, reports, auth, RBAC)
- ingestion: HTTP + MQTT (stub) for sensor/device data intake
- detection: Rule/ML placeholder processing stream events -> risk scores & events
- notifier: Dispatch alerts via channels (stub: console + email placeholder)
- web: Static frontend (React scaffold placeholder)

Tech stack:
- Python (FastAPI) for backend microservices
- PostgreSQL for relational data (users, devices, alerts, schedules)
- TimescaleDB/InfluxDB placeholder (not provisioned yet) for sensor data (future)
- Redis for pub/sub + task queue (risk & alert processing)
- MQTT broker (external, e.g. Eclipse Mosquitto) (not bundled yet)

## Quick Start (Dev)
```powershell
# From repo root
cd eldercare-platform
# Start core stack (DB + services)
docker-compose up --build
# Seed demo data (users, roles)
python services/api/app/seed.py
```

## Roadmap Next
- Add proper persistence models/migrations
- Implement JWT endpoints and refresh tokens
- Integrate real MQTT subscriber in ingestion
- Expand detection with ML pipeline & fallback rules
- Add notification integrations (SMS, LINE, email, voice)
- Add real React UI with login & role-based dashboards

## Security / Compliance Notes (Initial)
- Implement audit logging middleware
- Encrypt sensitive fields (medical conditions, emergency contacts)
- Consent records with signed timestamp & scope JSON

## License
Internal prototype.
