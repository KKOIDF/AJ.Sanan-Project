#!/usr/bin/env python3
"""
Simple Eldercare API Server (Offline Mode)
Serves the web interface and offline CSV data endpoints without database dependencies.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import pandas as pd
import uvicorn
from pathlib import Path

# Initialize FastAPI app
app = FastAPI(title="Eldercare API (Offline)", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
OFFLINE_ONLY = os.getenv("OFFLINE_ONLY", "1") == "1"
OUTPUTS_DIR = os.getenv("OFFLINE_OUTPUTS_DIR", "../../../outputs")
WEB_DIR = os.path.join(os.path.dirname(__file__), "../../../web")

# Data cache
offline_cache = {}

def load_offline_data():
    """Load CSV files into memory cache"""
    if not OFFLINE_ONLY:
        return
        
    print(f"Loading offline data from: {OUTPUTS_DIR}")
    
    for filename in ["merged_scored.csv", "qc_sensor_counts.csv"]:
        filepath = os.path.join(OUTPUTS_DIR, filename)
        if os.path.isfile(filepath):
            try:
                df = pd.read_csv(filepath)
                offline_cache[filename] = df
                print(f"✅ Loaded {filename}: {len(df)} rows")
            except Exception as e:
                print(f"❌ Error loading {filename}: {e}")
        else:
            print(f"⚠️  File not found: {filepath}")

@app.on_event("startup")
def startup():
    """Application startup"""
    print("🏥 Starting Eldercare API Server...")
    load_offline_data()
    
    # Mount static web files
    if os.path.isdir(WEB_DIR):
        app.mount("/", StaticFiles(directory=WEB_DIR, html=True), name="web")
        print(f"✅ Mounted web interface from: {WEB_DIR}")
    else:
        print(f"⚠️  Web directory not found: {WEB_DIR}")
    
    print("🚀 Server ready!")

# Health check
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "mode": "offline" if OFFLINE_ONLY else "online",
        "cache_loaded": len(offline_cache),
        "available_data": list(offline_cache.keys())
    }

# Offline endpoints
@app.get("/api/v1/offline/subjects")
def offline_subjects():
    """Get subject data with basic features"""
    if not OFFLINE_ONLY:
        raise HTTPException(400, "Offline mode disabled")
    
    merged = offline_cache.get("merged_scored.csv")
    if merged is None:
        return {"subjects": []}
    
    # Select relevant columns
    cols = [c for c in ["subject_id", "independence_index", "steps_sum", "active_minutes"] 
            if c in merged.columns]
    
    if not cols:
        return {"subjects": []}
    
    data = merged[cols].head(200).to_dict(orient="records")
    return {"subjects": data}

@app.get("/api/v1/offline/risk_scores")
def offline_risk_scores():
    """Get raw independence scores per subject"""
    if not OFFLINE_ONLY:
        raise HTTPException(400, "Offline mode disabled")
    
    merged = offline_cache.get("merged_scored.csv")
    if merged is None:
        return {"risk_scores": []}
    
    if "independence_index" in merged.columns:
        data = merged[["subject_id", "independence_index"]].rename(
            columns={"independence_index": "score"}
        ).to_dict(orient="records")
    else:
        data = []
    
    return {"risk_scores": data}

@app.get("/api/v1/offline/risk_levels")
def offline_risk_levels(method: str = "quantile"):
    """
    Return risk levels (Low/Medium/High) computed from independence_index.
    
    Args:
        method: 'quantile' (33%/66% split) or 'fixed' (thresholds at -0.5, 0.5)
    """
    if not OFFLINE_ONLY:
        raise HTTPException(400, "Offline mode disabled")
    
    merged = offline_cache.get("merged_scored.csv")
    if merged is None or "independence_index" not in merged.columns:
        return {"risk_levels": []}
    
    df = merged[["subject_id", "independence_index"]].dropna().copy()
    if df.empty:
        return {"risk_levels": []}
    
    series = df["independence_index"]
    
    if method == "quantile" and series.nunique() >= 3:
        low_thr = float(series.quantile(0.33))
        high_thr = float(series.quantile(0.66))
        
        def label_quantile(v):
            if v <= low_thr: return "Low"
            if v <= high_thr: return "Medium"
            return "High"
        
        df["risk_level"] = series.apply(label_quantile)
        meta = {
            "method": "quantile", 
            "low_threshold": low_thr, 
            "high_threshold": high_thr
        }
    else:
        # Fixed thresholds
        def label_fixed(v):
            if v <= -0.5: return "Low"
            if v < 0.5: return "Medium"
            return "High"
        
        df["risk_level"] = series.apply(label_fixed)
        meta = {
            "method": "fixed", 
            "low_threshold": -0.5, 
            "high_threshold": 0.5
        }
    
    return {
        "risk_levels": df.to_dict(orient="records"),
        "meta": meta
    }

@app.get("/api/v1/users/{user_id}/dashboard")
def dashboard(user_id: int):
    """Dashboard data for specific user (offline mode)"""
    if not OFFLINE_ONLY:
        raise HTTPException(400, "Offline mode disabled")
    
    merged = offline_cache.get("merged_scored.csv")
    qc = offline_cache.get("qc_sensor_counts.csv")
    
    user_rows = []
    if merged is not None:
        # Filter for specific user/subject
        subject_col = "subject_id" if "subject_id" in merged.columns else merged.columns[0]
        user_data = merged[merged[subject_col] == str(user_id)]
        user_rows = user_data.to_dict(orient="records")
    
    qc_rows = []
    if qc is not None:
        qc_rows = qc.head(20).to_dict(orient="records")
    
    return {
        "offline": True,
        "user_id": user_id,
        "merged_rows": user_rows,
        "qc_summary_rows": qc_rows
    }

@app.get("/api/v1/reports/{user_id}")
def report(user_id: int, type: str = "csv"):
    """Generate report for user (offline mode)"""
    if not OFFLINE_ONLY:
        raise HTTPException(400, "Offline mode disabled")
    
    merged = offline_cache.get("merged_scored.csv")
    if merged is None:
        return {"type": type, "data": "", "message": "No data available"}
    
    # Sample data for report
    sample_data = merged.head(50)
    csv_content = sample_data.to_csv(index=False)
    
    return {
        "type": type,
        "user_id": user_id,
        "data": csv_content,
        "rows": len(sample_data)
    }

# Simple auth endpoint (dummy for offline mode)
@app.post("/api/v1/auth/login")
def login(email: str, password: str):
    """Dummy login for offline mode"""
    return {
        "access_token": "offline-demo-token",
        "token_type": "bearer",
        "role": "admin",
        "user_id": 1,
        "message": "Offline mode - dummy authentication"
    }

if __name__ == "__main__":
    print("🏥 Starting Eldercare API Server (Offline Mode)")
    print(f"📂 Web directory: {WEB_DIR}")
    print(f"📊 Data directory: {OUTPUTS_DIR}")
    print("🌐 Server will be available at: http://127.0.0.1:8000")
    print("📱 Web interface: http://127.0.0.1:8000/")
    print("🔌 API health check: http://127.0.0.1:8000/health")
    print("=" * 50)
    
    uvicorn.run(
        app, 
        host="127.0.0.1", 
        port=8000,
        log_level="info"
    )