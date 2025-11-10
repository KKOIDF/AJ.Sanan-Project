import os
import asyncio
from fastapi import FastAPI
import httpx

API_BASE = os.getenv("API_BASE", "http://localhost:8000")

app = FastAPI(title="Ingestion Service (Stub)")

@app.post("/ingest")
async def ingest(device_uid: str, sensor_type: str, value: float):
    # Forward to API
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.post(f"{API_BASE}/api/v1/devices/{device_uid}/data", params={"sensor_type": sensor_type, "value": value})
        r.raise_for_status()
        return {"ok": True}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)
