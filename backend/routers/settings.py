import os
import sys
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse

from backend.config import (
    UPLOADS_DIR, AUDIO_DIR,
    get_db_path, get_default_db_path, set_db_path,
    get_models_dir, get_default_models_dir, set_models_dir
)
from backend.db import get_db_stats, get_table_rows, run_readonly_query
from backend.cleanup import cleanup_old_media
from backend.transcriber import get_whisper_models_status

router = APIRouter(tags=["settings"])

@router.get("/api/db/stats")
async def api_db_stats():
    stats = get_db_stats()
    def folder_size(path):
        if not os.path.exists(path):
            return 0
        total = 0
        for dirpath, _, filenames in os.walk(path):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                total += os.path.getsize(fp) if os.path.exists(fp) else 0
        return total

    stats["uploads_size"] = folder_size(UPLOADS_DIR)
    stats["audio_size"] = folder_size(AUDIO_DIR)
    stats["server_port"] = 8000
    stats["app_version"] = "v0.3-beta"
    stats["platform"] = sys.platform
    stats["frozen"] = getattr(sys, "frozen", False)
    return stats

@router.get("/api/db/table/{table_name}")
async def api_db_table(table_name: str, limit: int = 100, offset: int = 0):
    try:
        return get_table_rows(table_name, limit=limit, offset=offset)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

@router.post("/api/db/query")
async def api_db_query(request: Request):
    try:
        data = await request.json()
        query = data.get("query", "").strip()
        if not query:
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        return run_readonly_query(query)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {e}")

@router.post("/api/backend/cleanup-cache")
async def api_backend_cleanup():
    try:
        deleted = cleanup_old_media([UPLOADS_DIR, AUDIO_DIR], max_age_seconds=0)
        return {"status": "ok", "deleted_files": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup error: {e}")

@router.get("/api/backend/db-config")
async def api_get_db_config():
    active_path = get_db_path()
    default_path = get_default_db_path()
    return JSONResponse({
        "current_db_path": active_path,
        "default_db_path": default_path,
        "is_custom": os.path.abspath(active_path) != default_path,
        "exists": os.path.exists(active_path),
        "file_size": os.path.getsize(active_path) if os.path.exists(active_path) else 0
    })

@router.post("/api/backend/db-config")
async def api_set_db_config(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}

    reset = body.get("reset_to_default", False)
    new_path = body.get("db_path")

    if reset or not new_path:
        updated_path = set_db_path(None)
    else:
        clean_path = str(new_path).strip()
        if not clean_path.lower().endswith((".db", ".sqlite", ".sqlite3")):
            clean_path = f"{clean_path}.db"
        updated_path = set_db_path(clean_path)

    stats = get_db_stats()
    return JSONResponse({
        "status": "success",
        "message": f"Connected to database at {updated_path}",
        "current_db_path": updated_path,
        "default_db_path": get_default_db_path(),
        "is_custom": os.path.abspath(updated_path) != get_default_db_path(),
        "stats": stats
    })

@router.get("/api/db/download")
async def api_db_download():
    active_path = get_db_path()
    if not os.path.exists(active_path):
        raise HTTPException(status_code=404, detail="Database file not found")
    filename = os.path.basename(active_path) or "whosaid.db"
    return FileResponse(active_path, media_type="application/x-sqlite3", filename=filename)

@router.get("/api/backend/models-config")
async def api_get_models_config():
    active_dir = get_models_dir()
    default_dir = get_default_models_dir()
    return JSONResponse({
        "current_models_dir": active_dir,
        "default_models_dir": default_dir,
        "is_custom": os.path.abspath(active_dir) != os.path.abspath(default_dir),
        "exists": os.path.exists(active_dir)
    })

@router.post("/api/backend/models-config")
async def api_set_models_config(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}

    reset = body.get("reset_to_default", False)
    new_dir = body.get("models_dir")

    if reset or not new_dir:
        updated_dir = set_models_dir(None)
    else:
        clean_dir = str(new_dir).strip()
        updated_dir = set_models_dir(clean_dir)

    seg_exists = os.path.exists(os.path.join(updated_dir, "model.onnx"))
    emb_exists = os.path.exists(os.path.join(updated_dir, "3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx"))
    whisper_status = get_whisper_models_status()

    return JSONResponse({
        "status": "success",
        "message": f"Connected to models directory at {updated_dir}",
        "current_models_dir": updated_dir,
        "default_models_dir": get_default_models_dir(),
        "is_custom": os.path.abspath(updated_dir) != os.path.abspath(get_default_models_dir()),
        "exists": os.path.exists(updated_dir),
        "diarization": {
            "segmentation_model": seg_exists,
            "embedding_model": emb_exists,
            "ready": seg_exists and emb_exists
        },
        "whisper_models": whisper_status,
        "offline_ready": (seg_exists and emb_exists and whisper_status.get("tiny", {}).get("installed_locally", False))
    })

@router.get("/api/backend/models-info")
async def api_get_models_info():
    current_dir = get_models_dir()
    seg_exists = os.path.exists(os.path.join(current_dir, "model.onnx"))
    emb_exists = os.path.exists(os.path.join(current_dir, "3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx"))
    whisper_status = get_whisper_models_status()
    return JSONResponse({
        "models_dir": current_dir,
        "exists": os.path.exists(current_dir),
        "is_custom": os.path.abspath(current_dir) != os.path.abspath(get_default_models_dir()),
        "diarization": {
            "segmentation_model": seg_exists,
            "embedding_model": emb_exists,
            "ready": seg_exists and emb_exists
        },
        "whisper_models": whisper_status,
        "offline_ready": (seg_exists and emb_exists and whisper_status.get("tiny", {}).get("installed_locally", False))
    })
