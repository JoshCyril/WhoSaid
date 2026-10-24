import os
import sys
import asyncio
import warnings
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

# Ignore pydantic protected namespace warning for model_size
warnings.filterwarnings("ignore", message='.*Field "model_size" has conflict with protected namespace.*')

from backend.config import (
    APP_DIR, ROOT_DIR, BASE_DIR, STORAGE_DIR, UPLOADS_DIR, AUDIO_DIR, STATIC_DIR,
    get_db_path, get_default_db_path, set_db_path,
    get_models_dir, get_default_models_dir, set_models_dir
)
from backend.db import init_db
from backend.pipeline import TranscriptionPipeline, pipeline_engine

# Import modular routers
from backend.routers import jobs, transcripts, filesystem, profiles, settings

# Initialize database on module load
init_db()

app = FastAPI(title="Who Said - Local Speaker Captions & Diarization")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_app_startup():
    # Connect running event loop to thread-safe pipeline progress broadcaster
    loop = asyncio.get_running_loop()
    pipeline_engine.set_event_loop(loop)

# Register modular sub-routers
app.include_router(jobs.router)
app.include_router(transcripts.router)
app.include_router(filesystem.router)
app.include_router(profiles.router)
app.include_router(settings.router)

# Favicon handler
@app.get("/favicon.ico")
async def get_favicon():
    return Response(status_code=204)

# Serve frontend static assets (100% offline)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Who Said - Local Video Transcriber</h1><p>Frontend loading...</p>"

# Backwards compatibility re-exports for existing scripts and tests
def process_media_pipeline(job_id: str, file_path: str, model_size: str, file_hash: str, language_mode: str = "en"):
    """Backwards-compatible wrapper delegating to deep TranscriptionPipeline."""
    return pipeline_engine.execute_job(job_id, file_path, model_size, file_hash, language_mode)

def sync_broadcast(job_id: str, data: Dict[str, Any]):
    return pipeline_engine.sync_broadcast(job_id, data)

async def broadcast_progress(job_id: str, data: Dict[str, Any]):
    return await pipeline_engine.broadcast_progress(job_id, data)

active_connections = pipeline_engine._active_connections
