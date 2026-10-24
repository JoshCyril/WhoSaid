import os
import shutil
from typing import Dict, Any, Optional
from fastapi import APIRouter, UploadFile, File, Form, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse

from backend.config import UPLOADS_DIR, AUDIO_DIR
from backend.db import (
    create_job, update_job, get_job, get_job_by_hash_and_model,
    get_latest_completed_job, get_transcript_by_job_id,
    get_transcription_history, delete_job_and_transcript
)
from backend.audio import compute_file_hash, extract_audio_16k
from backend.pipeline import pipeline_engine

router = APIRouter(tags=["jobs"])

@router.websocket("/api/ws/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()
    pipeline_engine.register_websocket(job_id, websocket)
    try:
        job = get_job(job_id)
        if job:
            await websocket.send_json({
                "job_id": job["id"],
                "status": job["status"],
                "progress": job["progress"],
                "message": job["message"]
            })
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pipeline_engine.unregister_websocket(job_id, websocket)

@router.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    model_size: str = Form("tiny"),
    language_mode: str = Form("en")
):
    valid_exts = {".mp4", ".mkv", ".mov", ".webm", ".mp3", ".wav"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in valid_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported format {ext}. Supported: mp4, mkv, mov, webm, mp3, wav.")

    temp_path = os.path.join(UPLOADS_DIR, f"temp_{file.filename}")
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_hash = compute_file_hash(temp_path)

    cached_job = get_job_by_hash_and_model(file_hash, model_size)
    if cached_job and cached_job.get("language_mode", "en") == language_mode:
        transcript = get_transcript_by_job_id(cached_job["id"])
        if transcript:
            os.remove(temp_path)
            if cached_job.get("filename") != file.filename:
                update_job(cached_job["id"], filename=file.filename)
            return JSONResponse({
                "job_id": cached_job["id"],
                "transcript_id": transcript["id"],
                "cached": True,
                "message": "Loaded instantly from cache!"
            })

    final_filename = f"{file_hash[:12]}_{file.filename}"
    perm_path = os.path.join(UPLOADS_DIR, final_filename)
    if os.path.exists(perm_path):
        os.remove(temp_path)
    else:
        os.rename(temp_path, perm_path)

    job_id = create_job(
        filename=file.filename,
        file_path=perm_path,
        file_hash=file_hash,
        model_size=model_size,
        language_mode=language_mode
    )

    pipeline_engine.start_background_job(job_id, perm_path, model_size, file_hash, language_mode)

    return JSONResponse({
        "job_id": job_id,
        "cached": False,
        "message": "Processing started"
    })

@router.post("/api/process-path")
async def process_local_path(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    
    file_path = body.get("file_path")
    model_size = body.get("model_size", "tiny")
    language_mode = body.get("language_mode", "en")

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail=f"File not found: {file_path}")

    valid_exts = {".mp4", ".mkv", ".mov", ".webm", ".mp3", ".wav"}
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in valid_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported format {ext}. Supported: mp4, mkv, mov, webm, mp3, wav.")

    file_hash = compute_file_hash(file_path)
    filename = os.path.basename(file_path)

    cached_job = get_job_by_hash_and_model(file_hash, model_size)
    if cached_job and cached_job.get("language_mode", "en") == language_mode:
        transcript = get_transcript_by_job_id(cached_job["id"])
        if transcript:
            if cached_job.get("filename") != filename or cached_job.get("file_path") != file_path:
                update_job(cached_job["id"], filename=filename, file_path=file_path)
            return JSONResponse({
                "job_id": cached_job["id"],
                "transcript_id": transcript["id"],
                "cached": True,
                "message": "Loaded instantly from cache!"
            })

    job_id = create_job(
        filename=filename,
        file_path=file_path,
        file_hash=file_hash,
        model_size=model_size,
        language_mode=language_mode
    )

    pipeline_engine.start_background_job(job_id, file_path, model_size, file_hash, language_mode)

    return JSONResponse({
        "job_id": job_id,
        "cached": False,
        "message": "Processing started"
    })

@router.get("/api/jobs/latest")
async def get_latest_job():
    job = get_latest_completed_job()
    if not job:
        return JSONResponse({"job": None, "transcript_id": None})
    transcript = get_transcript_by_job_id(job["id"])
    return JSONResponse({
        "job": job,
        "transcript_id": transcript["id"] if transcript else None
    })

@router.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    response_data = dict(job)
    if job["status"] == "completed":
        transcript = get_transcript_by_job_id(job_id)
        if transcript:
            response_data["transcript_id"] = transcript["id"]

    return JSONResponse(response_data)

@router.get("/api/history")
async def get_history_list():
    items = get_transcription_history()
    return JSONResponse(items)

@router.delete("/api/history/{job_id}")
async def delete_history_job(job_id: str):
    job = get_job(job_id)
    if job:
        for p in [job.get("file_path"), job.get("audio_path")]:
            if p and os.path.exists(p) and (p.startswith(UPLOADS_DIR) or p.startswith(AUDIO_DIR)):
                try:
                    os.remove(p)
                except Exception:
                    pass
    delete_job_and_transcript(job_id)
    return JSONResponse({"status": "success", "message": "History entry deleted"})

@router.get("/api/media/{job_id}")
async def stream_media_file(job_id: str, request: Request):
    job = get_job(job_id)
    if not job or not os.path.exists(job["file_path"]):
        raise HTTPException(status_code=404, detail="Media file not found")

    file_path = job["file_path"]
    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("Range")

    ext = os.path.splitext(file_path)[1].lower()
    content_types = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav"
    }
    media_type = content_types.get(ext, "video/mp4")

    if not range_header:
        return FileResponse(file_path, media_type=media_type)

    range_val = range_header.replace("bytes=", "").split("-")
    start = int(range_val[0])
    end = int(range_val[1]) if range_val[1] else file_size - 1
    content_length = end - start + 1

    def iterfile():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = content_length
            chunk_size = 1024 * 512
            while remaining > 0:
                bytes_to_read = min(remaining, chunk_size)
                data = f.read(bytes_to_read)
                if not data:
                    break
                remaining -= len(data)
                yield data

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": media_type,
    }
    return StreamingResponse(iterfile(), status_code=206, headers=headers)

@router.get("/api/audio/{job_id}")
async def stream_audio_file(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    audio_path = job.get("audio_path")
    file_path = job.get("file_path")

    if (not audio_path or not os.path.exists(audio_path)) and file_path and os.path.exists(file_path):
        target_wav = os.path.join(AUDIO_DIR, f"{job_id}.wav")
        try:
            extract_audio_16k(file_path, target_wav)
            update_job(job_id, audio_path=target_wav)
            audio_path = target_wav
        except Exception as e:
            print(f"[Audio] Re-extract error: {e}")

    if not audio_path or not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(audio_path, media_type="audio/wav")
