# Eldercare Platform (Offline MVP)

This repository began as a multi-service eldercare monitoring scaffold. It is now **simplified to an offline-only FastAPI service** that serves analytics generated from the notebook using static CSV outputs (no live sensor ingestion, no database).

## Current Offline Architecture

Service:

- `api`: FastAPI app exposing user/risk/report endpoints and serving a static HTML demo (`web/index.html`).

Data Inputs (exported by the analysis notebook):

- `outputs/merged_scored.csv` – engineered daily subject features + `independence_index`.
- `outputs/qc_sensor_counts.csv` – sensor/device quality coverage summary.

Environment Flags:

- `OFFLINE_ONLY=1` activates CSV loading.
- `OFFLINE_OUTPUTS_DIR=/data/outputs` container path mounting host `../outputs`.

## Endpoints (Offline Mode)

- `GET /api/v1/offline/subjects` – basic subject feature slice.
- `GET /api/v1/offline/risk_scores` – raw independence index per subject.
- `GET /api/v1/offline/risk_levels?method=quantile|fixed` – Low/Medium/High classification (quantile or fixed thresholds).
- `GET /api/v1/users/{id}/dashboard` – merged rows + QC summary (offline variant).
- `GET /api/v1/reports/{id}` – sample CSV head (placeholder).

## Quick Start (Docker)

Requires Docker Desktop running.

```powershell
cd eldercare-platform
docker compose up --build
```

Then open: <http://localhost:8000/> (HTML demo) and test endpoints:

```powershell
Invoke-RestMethod http://localhost:8000/api/v1/offline/subjects | ConvertTo-Json -Depth 4
Invoke-RestMethod http://localhost:8000/api/v1/offline/risk_levels | ConvertTo-Json -Depth 4
```

## Quick Start (Local Python)

If Docker is unavailable:

```powershell
cd eldercare-platform/services/api
pip install -r ../requirements.txt  # adjust path if needed
setx OFFLINE_ONLY 1
setx OFFLINE_OUTPUTS_DIR "..\..\..\outputs"
python app/main.py
```

Visit <http://127.0.0.1:8000/>.

## Refreshing Data

1. Open and run `Sanan_Project_Analysis.ipynb` to regenerate analytics.
2. Ensure new `merged_scored.csv` and `qc_sensor_counts.csv` are written to `outputs/`.
3. Restart the API (container or local) to reload cache.

## Risk Level Logic

Two modes:

- `quantile` (default): 33% / 66% split of `independence_index`.
- `fixed`: thresholds at -0.5 and 0.5 (assumes near z-normal distribution of index).

Response includes `meta` with applied thresholds.

## Roadmap (Next Enhancements)

- Add lightweight React/Vue frontend to visualize subjects & risk levels.
- Implement alert/event creation endpoints (currently absent).
- Harden auth (JWT refresh, role enforcement per endpoint).
- Add detection rules & notifier integrations (email/SMS/LINE).
- Replace fixed risk thresholds with calibrated model outputs.

## Security / Compliance (Planned)

- Audit logging middleware.
- Consent & data usage records.
- Field-level encryption for sensitive health metadata.

## License

Internal prototype.
