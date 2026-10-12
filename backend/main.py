import os
import sys
import asyncio
import threading
import warnings
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect, HTTPException, Response, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

# Ignore pydantic protected namespace warning for model_size
warnings.filterwarnings("ignore", message='.*Field "model_size" has conflict with protected namespace.*')

from backend.db import (
    init_db, create_job, update_job, get_job, get_job_by_hash_and_model, get_latest_completed_job,
    save_transcript, get_transcript, get_transcript_by_job_id, update_transcript_content,
    get_all_voice_profiles, save_voice_profile, delete_voice_profile,
    get_transcription_history, delete_job_and_transcript,
    get_db_stats, get_table_rows, run_readonly_query, DB_PATH,
    get_db_path, get_default_db_path, set_db_path
)
from backend.audio import (
    extract_audio_16k, compute_file_hash, generate_waveform_peaks, load_audio_samples
)
from backend.cleanup import cleanup_old_media
from backend.diarizer import DiarizerService
from backend.transcriber import TranscriberService
from backend.exporter import export_srt, export_vtt, export_json, export_txt


# Directories
if getattr(sys, "frozen", False):
    APP_DIR = getattr(sys, "_MEIPASS", os.path.dirname(sys.executable))
    ROOT_DIR = os.path.dirname(sys.executable)
else:
    APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ROOT_DIR = APP_DIR

BASE_DIR = ROOT_DIR

STORAGE_DIR = os.environ.get("WHOSAID_STORAGE_DIR") or os.path.join(ROOT_DIR, "storage")
UPLOADS_DIR = os.path.join(STORAGE_DIR, "uploads")
AUDIO_DIR = os.path.join(STORAGE_DIR, "audio")

_static_candidates = [
    os.environ.get("WHOSAID_STATIC_DIR"),
    os.path.join(APP_DIR, "static"),
    os.path.join(ROOT_DIR, "static")
]
STATIC_DIR = next((p for p in _static_candidates if p and os.path.exists(p)), os.path.join(ROOT_DIR, "static"))

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

# Initialize Database
init_db()

app = FastAPI(title="Who Said - Local Speaker Captions & Diarization")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active WebSocket connections for progress tracking: job_id -> list[WebSocket]
active_connections: Dict[str, List[WebSocket]] = {}
MAIN_LOOP: Optional[asyncio.AbstractEventLoop] = None

@app.on_event("startup")
async def on_app_startup():
    global MAIN_LOOP
    MAIN_LOOP = asyncio.get_running_loop()
    # Permanent storage policy: all media, audio, and database records are kept indefinitely until manually deleted.

async def broadcast_progress(job_id: str, data: Dict[str, Any]):
    if job_id in active_connections:
        for ws in list(active_connections[job_id]):
            try:
                await ws.send_json(data)
            except Exception:
                pass

def sync_broadcast(job_id: str, data: Dict[str, Any]):
    """Thread-safe progress dispatch to WebSockets."""
    global MAIN_LOOP
    try:
        if MAIN_LOOP and MAIN_LOOP.is_running():
            asyncio.run_coroutine_threadsafe(broadcast_progress(job_id, data), MAIN_LOOP)
    except Exception as e:
        print(f"[WS Broadcast Warning] {e}")

# Background processing logic
def process_media_pipeline(job_id: str, file_path: str, model_size: str, file_hash: str, language_mode: str = "en"):
    def update_progress(pct: float, msg: str, status: str = "processing"):
        update_job(job_id, progress=round(pct, 1), message=msg, status=status)
        sync_broadcast(job_id, {
            "job_id": job_id,
            "status": status,
            "progress": round(pct, 1),
            "message": msg
        })

    try:
        update_progress(5.0, "Extracting audio with ffmpeg...", status="extracting")
        audio_path = os.path.join(AUDIO_DIR, f"{job_id}.wav")
        duration = extract_audio_16k(file_path, audio_path)
        update_job(job_id, audio_path=audio_path, duration=duration)

        update_progress(15.0, "Loading audio waveform...", status="analyzing")
        samples, sr = load_audio_samples(audio_path)

        update_progress(20.0, "Diarizing speakers (segmentation & voice clustering)...", status="diarizing")
        diarizer = DiarizerService.get_instance()

        def diar_cb(proc, total):
            if total > 0:
                fraction = proc / total
                update_progress(20.0 + fraction * 25.0, f"Diarizing speakers ({int(fraction * 100)}%)...", status="diarizing")

        diar_result = diarizer.diarize_and_match(samples, sr, progress_callback=diar_cb)
        speakers = diar_result["speakers"]
        intervals = diar_result["intervals"]

        if language_mode == "ta_translate":
            trans_label = f"Translating Tamil speech to English ({model_size})"
        elif language_mode == "ta":
            trans_label = f"Transcribing Tamil speech ({model_size})"
        else:
            trans_label = f"Transcribing English speech ({model_size})"

        update_progress(50.0, f"Identified {len(speakers)} speaker(s). {trans_label}...", status="transcribing")

        def trans_cb(fraction, msg):
            update_progress(50.0 + fraction * 40.0, msg, status="transcribing")

        whisper_segs = TranscriberService.transcribe(
            samples,
            model_size=model_size,
            language_mode=language_mode,
            progress_callback=trans_cb
        )

        update_progress(92.0, "Aligning speech timestamps with speaker turns...", status="aligning")
        merged_turns = TranscriberService.merge_transcription_and_diarization(whisper_segs, intervals, speakers)

        # Save transcript to database
        transcript_id = save_transcript(
            job_id=job_id,
            file_hash=file_hash,
            model_size=model_size,
            speakers=speakers,
            segments=merged_turns
        )

        update_progress(100.0, "Completed successfully!", status="completed")
        print(f"[Pipeline] Job {job_id} successfully completed. Transcript ID: {transcript_id}")

    except Exception as e:
        import traceback
        traceback.print_exc()
        update_progress(0.0, f"Error: {str(e)}", status="failed")

# --- WebSocket Progress Route ---
@app.websocket("/api/ws/{job_id}")
async def websocket_progress(websocket: WebSocket, job_id: str):
    await websocket.accept()
    if job_id not in active_connections:
        active_connections[job_id] = []
    active_connections[job_id].append(websocket)
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
        if job_id in active_connections and websocket in active_connections[job_id]:
            active_connections[job_id].remove(websocket)

# --- Media Upload & Processing API ---
@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    model_size: str = Form("base"),
    language_mode: str = Form("en")
):
    valid_exts = {".mp4", ".mkv", ".mov", ".webm", ".mp3", ".wav"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in valid_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported format {ext}. Supported: mp4, mkv, mov, webm, mp3, wav.")

    # Save to temp location to compute hash
    temp_path = os.path.join(UPLOADS_DIR, f"temp_{file.filename}")
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    file_hash = compute_file_hash(temp_path)

    # Check cache (check content hash and model and language)
    cached_job = get_job_by_hash_and_model(file_hash, model_size)
    if cached_job and cached_job.get("language_mode", "en") == language_mode:
        transcript = get_transcript_by_job_id(cached_job["id"])
        if transcript:
            os.remove(temp_path)
            # Track renamed file: update filename if different
            if cached_job.get("filename") != file.filename:
                update_job(cached_job["id"], filename=file.filename)
            return JSONResponse({
                "job_id": cached_job["id"],
                "transcript_id": transcript["id"],
                "cached": True,
                "message": "Loaded instantly from cache!"
            })

    # Not cached: rename to perm file
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

    thread = threading.Thread(
        target=process_media_pipeline,
        args=(job_id, perm_path, model_size, file_hash, language_mode),
        daemon=True
    )
    thread.start()

    return JSONResponse({
        "job_id": job_id,
        "cached": False,
        "message": "Processing started"
    })

# --- Demo Video Loader ---
@app.post("/api/demo")
async def load_demo_video(model_size: str = Form("tiny")):
    demo_path = os.path.join(BASE_DIR, "sample_data", "two_speakers_demo.mp4")
    if not os.path.exists(demo_path):
        raise HTTPException(status_code=404, detail="Demo file not found.")

    file_hash = compute_file_hash(demo_path)

    cached_job = get_job_by_hash_and_model(file_hash, model_size)
    if cached_job:
        transcript = get_transcript_by_job_id(cached_job["id"])
        if transcript:
            return JSONResponse({
                "job_id": cached_job["id"],
                "transcript_id": transcript["id"],
                "cached": True,
                "message": "Demo loaded from cache!"
            })

    job_id = create_job(
        filename="two_speakers_demo.mp4",
        file_path=demo_path,
        file_hash=file_hash,
        model_size=model_size
    )

    thread = threading.Thread(
        target=process_media_pipeline,
        args=(job_id, demo_path, model_size, file_hash),
        daemon=True
    )
    thread.start()

    return JSONResponse({
        "job_id": job_id,
        "cached": False,
        "message": "Demo processing initiated"
    })

# --- Direct Local File Processing (Desktop / Electron) ---
@app.post("/api/process-path")
async def process_local_path(request: Request):
    try:
        body = await request.json()
    except Exception:
        body = {}
    
    file_path = body.get("file_path")
    model_size = body.get("model_size", "base")
    language_mode = body.get("language_mode", "en")

    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=400, detail=f"File not found: {file_path}")

    valid_exts = {".mp4", ".mkv", ".mov", ".webm", ".mp3", ".wav"}
    ext = os.path.splitext(file_path)[1].lower()
    if ext not in valid_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported format {ext}. Supported: mp4, mkv, mov, webm, mp3, wav.")

    file_hash = compute_file_hash(file_path)
    filename = os.path.basename(file_path)

    # Check cache by content hash
    cached_job = get_job_by_hash_and_model(file_hash, model_size)
    if cached_job and cached_job.get("language_mode", "en") == language_mode:
        transcript = get_transcript_by_job_id(cached_job["id"])
        if transcript:
            # If filename or location changed on disk, update job record to track new filename & path
            if cached_job.get("filename") != filename or cached_job.get("file_path") != file_path:
                update_job(cached_job["id"], filename=filename, file_path=file_path)
            return JSONResponse({
                "job_id": cached_job["id"],
                "transcript_id": transcript["id"],
                "cached": True,
                "message": "Loaded instantly from cache!"
            })

    filename = os.path.basename(file_path)
    job_id = create_job(
        filename=filename,
        file_path=file_path,
        file_hash=file_hash,
        model_size=model_size,
        language_mode=language_mode
    )

    thread = threading.Thread(
        target=process_media_pipeline,
        args=(job_id, file_path, model_size, file_hash, language_mode),
        daemon=True
    )
    thread.start()

    return JSONResponse({
        "job_id": job_id,
        "cached": False,
        "message": "Processing started"
    })

# --- Filesystem Scanner for VS Code Folder Explorer ---
@app.get("/api/fs/scan-folder")
async def scan_filesystem_folder(folder_path: Optional[str] = None):
    if not folder_path or not folder_path.strip():
        target_dir = os.path.join(BASE_DIR, "sample_data")
    else:
        candidate = folder_path.strip()
        if not os.path.isabs(candidate):
            candidate = os.path.join(BASE_DIR, candidate)
        if os.path.isdir(candidate):
            target_dir = candidate
        else:
            target_dir = os.path.join(BASE_DIR, "sample_data")

    target_dir = os.path.abspath(target_dir)

    if not os.path.exists(target_dir):
        target_dir = BASE_DIR

    ignored_dirs = {".git", ".svn", ".vscode", ".agent", ".agents", "node_modules", "__pycache__", "models", "storage", ".cache"}
    media_exts = {".mp4", ".mkv", ".mov", ".webm", ".mp3", ".wav"}
    sub_exts = {".srt", ".vtt", ".json", ".txt"}

    # Fetch all completed jobs for fast cache lookup
    conn = None
    try:
        from backend.db import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, filename, file_path, file_hash, model_size, status FROM jobs")
        all_jobs = [dict(r) for r in cursor.fetchall()]
        cursor.execute("SELECT id, job_id FROM transcripts")
        all_transcripts = {r["job_id"]: r["id"] for r in cursor.fetchall()}
    except Exception:
        all_jobs = []
        all_transcripts = {}
    finally:
        if conn:
            conn.close()

    def build_tree(current_dir: str, depth: int = 0, max_depth: int = 4):
        dir_name = os.path.basename(current_dir) or current_dir
        node = {
            "name": dir_name,
            "path": current_dir,
            "is_dir": True,
            "children": [],
            "media_count": 0
        }

        if depth >= max_depth:
            return node

        try:
            entries = sorted(os.scandir(current_dir), key=lambda e: (not e.is_dir(), e.name.lower()))
        except (PermissionError, OSError):
            return node

        for entry in entries:
            if entry.name.startswith(".") or entry.name in ignored_dirs:
                continue
            
            entry_path = os.path.abspath(entry.path)
            if entry.is_dir(follow_symlinks=False):
                child_node = build_tree(entry_path, depth + 1, max_depth)
                node["children"].append(child_node)
                node["media_count"] += child_node.get("media_count", 0)
            else:
                ext = os.path.splitext(entry.name)[1].lower()
                is_media = ext in media_exts
                is_sub = ext in sub_exts
                try:
                    size = entry.stat().st_size
                except Exception:
                    size = 0

                # Match with database jobs
                cached_info = None
                if is_media:
                    node["media_count"] += 1
                    for j in all_jobs:
                        if j.get("file_path") == entry_path or (j.get("filename") == entry.name and j.get("status") == "completed"):
                            t_id = all_transcripts.get(j["id"])
                            if t_id:
                                cached_info = {
                                    "job_id": j["id"],
                                    "transcript_id": t_id,
                                    "model_size": j.get("model_size", "base")
                                }
                                break

                node["children"].append({
                    "name": entry.name,
                    "path": entry_path,
                    "is_dir": False,
                    "size": size,
                    "ext": ext,
                    "is_media": is_media,
                    "is_subtitle": is_sub,
                    "cached_job": cached_info
                })

        return node

    tree = build_tree(target_dir)
    return JSONResponse({
        "root": tree,
        "folder_path": target_dir,
        "folder_name": os.path.basename(target_dir) or target_dir
    })

@app.get("/api/fs/file-properties")
async def get_file_properties(file_path: str):
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    stat = os.stat(file_path)
    size = stat.st_size
    mtime = stat.st_mtime
    ext = os.path.splitext(file_path)[1].lower()
    filename = os.path.basename(file_path)
    
    # Check if cached in DB
    job = None
    transcript_id = None
    try:
        from backend.db import get_connection
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, filename, file_hash, model_size, duration, status FROM jobs WHERE file_path = ? OR filename = ?", (file_path, filename))
        row = cursor.fetchone()
        if row:
            job = dict(row)
            cursor.execute("SELECT id FROM transcripts WHERE job_id = ?", (job["id"],))
            tr = cursor.fetchone()
            if tr:
                transcript_id = tr["id"]
        conn.close()
    except Exception as e:
        pass

    return JSONResponse({
        "name": filename,
        "path": file_path,
        "size": size,
        "ext": ext,
        "mtime": mtime,
        "duration": job.get("duration") if job else None,
        "model_size": job.get("model_size") if job else None,
        "cached": bool(transcript_id),
        "transcript_id": transcript_id,
        "job_id": job.get("id") if job else None
    })

# --- History Endpoints ---
@app.get("/api/history")
async def get_history_list():
    items = get_transcription_history()
    return JSONResponse(items)

@app.delete("/api/history/{job_id}")
async def delete_history_job(job_id: str):
    job = get_job(job_id)
    if job:
        for p in [job.get("file_path"), job.get("audio_path")]:
            # Safeguard: never delete user files outside uploads or audio folders!
            if p and os.path.exists(p) and (p.startswith(UPLOADS_DIR) or p.startswith(AUDIO_DIR)):
                try:
                    os.remove(p)
                except Exception:
                    pass
    delete_job_and_transcript(job_id)
    return JSONResponse({"status": "success", "message": "History entry deleted"})

# --- Job Status Endpoint ---
@app.get("/api/jobs/latest")
async def get_latest_job():
    job = get_latest_completed_job()
    if not job:
        return JSONResponse({"job": None, "transcript_id": None})
    transcript = get_transcript_by_job_id(job["id"])
    return JSONResponse({
        "job": job,
        "transcript_id": transcript["id"] if transcript else None
    })

@app.get("/api/jobs/{job_id}")
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

@app.get("/api/transcripts/{transcript_id}")
async def get_transcript_data(transcript_id: str):
    data = get_transcript(transcript_id)
    if not data:
        raise HTTPException(status_code=404, detail="Transcript not found")

    job = get_job(data["job_id"])
    peaks = []
    duration = 0.0
    filename = "media"
    media_available = False
    audio_available = False

    if job:
        filename = job.get("filename", "media")
        duration = job.get("duration", 0.0)
        file_path = job.get("file_path")
        media_available = bool(file_path and os.path.exists(file_path))

        # Check / auto-regenerate audio if video file exists on disk
        audio_path = job.get("audio_path")
        if (not audio_path or not os.path.exists(audio_path)) and media_available:
            target_wav = os.path.join(AUDIO_DIR, f"{job['id']}.wav")
            try:
                extract_audio_16k(file_path, target_wav)
                update_job(job["id"], audio_path=target_wav)
                audio_path = target_wav
            except Exception as e:
                print(f"[Audio] Error auto-regenerating wav: {e}")

        if audio_path and os.path.exists(audio_path):
            audio_available = True
            try:
                peaks = generate_waveform_peaks(audio_path, num_peaks=600)
            except Exception:
                peaks = []

    data["peaks"] = peaks
    data["duration"] = duration
    data["filename"] = filename
    data["media_available"] = media_available
    data["audio_available"] = audio_available
    data["media_url"] = f"/api/media/{data['job_id']}" if media_available else ""
    data["audio_url"] = f"/api/audio/{data['job_id']}" if audio_available else ""
    return JSONResponse(data)

@app.put("/api/transcripts/{transcript_id}")
async def update_transcript(transcript_id: str, payload: Dict[str, Any]):
    current = get_transcript(transcript_id)
    if not current:
        raise HTTPException(status_code=404, detail="Transcript not found")

    speakers = payload.get("speakers", current["speakers"])
    segments = payload.get("segments", current["segments"])
    update_transcript_content(transcript_id, speakers, segments)
    return JSONResponse({"status": "success", "message": "Transcript updated"})

# --- Rename Speaker & Enroll Voice Profile ---
@app.post("/api/transcripts/{transcript_id}/rename-speaker")
async def rename_speaker(transcript_id: str, payload: Dict[str, Any]):
    """
    Renames a speaker across all segments in the transcript.
    Optionally saves the speaker's voice embedding as an enrolled Voice Profile (Requirement F4 & F5).
    """
    transcript = get_transcript(transcript_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    speaker_id = payload.get("speaker_id")
    new_label = payload.get("new_label", "").strip()
    enroll_profile = payload.get("enroll_profile", False)
    color = payload.get("color")
    avatar_seed = payload.get("avatar_seed")

    if not speaker_id or not new_label:
        raise HTTPException(status_code=400, detail="Missing speaker_id or new_label")

    speakers = transcript["speakers"]
    segments = transcript["segments"]

    target_spk = None
    for spk in speakers:
        if spk["id"] == speaker_id:
            spk["label"] = new_label
            if color:
                spk["color"] = color
            if avatar_seed:
                spk["avatar_seed"] = avatar_seed
            target_spk = spk
            break

    # Update across all segments
    for seg in segments:
        if seg["speaker_id"] == speaker_id:
            seg["speaker_label"] = new_label
            if color:
                seg["speaker_color"] = color
            if avatar_seed:
                seg["speaker_avatar_seed"] = avatar_seed

    # If requested, enroll voice profile
    profile_id = None
    if enroll_profile and target_spk and target_spk.get("embedding"):
        profile_id = save_voice_profile(
            name=new_label,
            embedding=target_spk["embedding"],
            color=target_spk.get("color", "#f6c48f")
        )
        target_spk["profile_id"] = profile_id

    update_transcript_content(transcript_id, speakers, segments)

    return JSONResponse({
        "status": "success",
        "speakers": speakers,
        "profile_id": profile_id,
        "message": f"Renamed to '{new_label}'" + (" and saved as Voice Profile!" if enroll_profile else "")
    })

# --- Merge Misclassified Speakers ---
@app.post("/api/transcripts/{transcript_id}/merge-speakers")
async def merge_speakers(transcript_id: str, payload: Dict[str, Any]):
    """
    Merges a misclassified source speaker into a target speaker.
    Reassigns all dialogue segments from source to target, averages voice embeddings if available,
    and removes the redundant source speaker.
    """
    transcript = get_transcript(transcript_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    source_id = payload.get("source_speaker_id")
    target_id = payload.get("target_speaker_id")

    if not source_id or not target_id:
        raise HTTPException(status_code=400, detail="source_speaker_id and target_speaker_id are required")
    if source_id == target_id:
        raise HTTPException(status_code=400, detail="Source and Target speaker must be different")

    speakers = transcript["speakers"]
    segments = transcript["segments"]

    source_spk = next((s for s in speakers if s["id"] == source_id), None)
    target_spk = next((s for s in speakers if s["id"] == target_id), None)

    if not source_spk:
        raise HTTPException(status_code=404, detail=f"Source speaker '{source_id}' not found")
    if not target_spk:
        raise HTTPException(status_code=404, detail=f"Target speaker '{target_id}' not found")

    # Reassign segments
    reassigned_count = 0
    for seg in segments:
        if seg.get("speaker_id") == source_id:
            seg["speaker_id"] = target_id
            seg["speaker_label"] = target_spk["label"]
            seg["speaker_color"] = target_spk["color"]
            reassigned_count += 1

    # Average embeddings if both are available
    if source_spk.get("embedding") and target_spk.get("embedding"):
        s_emb = source_spk["embedding"]
        t_emb = target_spk["embedding"]
        if len(s_emb) == len(t_emb):
            target_spk["embedding"] = [round(0.5 * (a + b), 6) for a, b in zip(t_emb, s_emb)]

    # Remove source speaker
    updated_speakers = [s for s in speakers if s["id"] != source_id]

    update_transcript_content(transcript_id, updated_speakers, segments)

    return JSONResponse({
        "status": "success",
        "message": f"Merged '{source_spk['label']}' ({source_id}) into '{target_spk['label']}' ({target_id}). Reassigned {reassigned_count} turn(s).",
        "speakers": updated_speakers,
        "segments": segments,
        "reassigned_count": reassigned_count
    })

# --- Voice Profiles Endpoints ---
@app.get("/api/profiles")
async def list_profiles():
    profiles = get_all_voice_profiles()
    return JSONResponse(profiles)

@app.post("/api/profiles")
async def create_profile_from_audio(
    name: str = Form(...),
    color: str = Form("#f6c48f"),
    audio_file: UploadFile = File(...)
):
    temp_wav = os.path.join(AUDIO_DIR, f"profile_enroll_{audio_file.filename}.wav")
    temp_upload = os.path.join(UPLOADS_DIR, f"profile_enroll_{audio_file.filename}")

    with open(temp_upload, "wb") as f:
        shutil.copyfileobj(audio_file.file, f)

    try:
        extract_audio_16k(temp_upload, temp_wav)
        samples, sr = load_audio_samples(temp_wav)
        diarizer = DiarizerService.get_instance()
        emb = diarizer.extract_embedding_from_samples(samples, sr)
        if not emb:
            raise HTTPException(status_code=400, detail="Could not extract voice embedding. Audio sample may be too short (minimum 0.5s of speech required).")

        profile_id = save_voice_profile(name=name, embedding=emb, color=color)
        return JSONResponse({"status": "success", "profile_id": profile_id, "name": name})
    finally:
        if os.path.exists(temp_upload):
            os.remove(temp_upload)
        if os.path.exists(temp_wav):
            os.remove(temp_wav)

@app.delete("/api/profiles/{profile_id}")
async def remove_profile(profile_id: str):
    delete_voice_profile(profile_id)
    return JSONResponse({"status": "success", "message": "Profile removed"})

# --- Export Endpoint (SRT, VTT, JSON, TXT) ---
@app.get("/api/transcripts/{transcript_id}/export/{fmt}")
async def export_transcript(transcript_id: str, fmt: str):
    transcript = get_transcript(transcript_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    fmt = fmt.lower()
    if fmt == "srt":
        content = export_srt(transcript)
        media_type = "text/plain"
        ext = "srt"
    elif fmt == "vtt":
        content = export_vtt(transcript)
        media_type = "text/vtt"
        ext = "vtt"
    elif fmt == "json":
        content = export_json(transcript)
        media_type = "application/json"
        ext = "json"
    elif fmt == "txt":
        content = export_txt(transcript)
        media_type = "text/plain"
        ext = "txt"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid format {fmt}. Supported: srt, vtt, json, txt")

    filename = f"whosaid_transcript_{transcript_id[:8]}.{ext}"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )

# --- Media Streaming with HTTP 206 Byte-Range for Video Seeking ---
@app.get("/api/media/{job_id}")
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

    # Parse Range: bytes=start-end
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

@app.get("/api/audio/{job_id}")
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

# --- Database & Backend Settings Endpoints ---

@app.get("/api/db/stats")
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
    stats["app_version"] = "1.0.0"
    stats["platform"] = sys.platform
    stats["frozen"] = getattr(sys, "frozen", False)
    return stats

@app.get("/api/db/table/{table_name}")
async def api_db_table(table_name: str, limit: int = 100, offset: int = 0):
    try:
        return get_table_rows(table_name, limit=limit, offset=offset)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

@app.post("/api/db/query")
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

@app.post("/api/backend/cleanup-cache")
async def api_backend_cleanup():
    try:
        deleted = cleanup_old_media([UPLOADS_DIR, AUDIO_DIR], max_age_seconds=0)
        return {"status": "ok", "deleted_files": deleted}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cleanup error: {e}")

@app.get("/api/backend/db-config")
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

@app.post("/api/backend/db-config")
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

@app.get("/api/db/download")
async def api_db_download():
    active_path = get_db_path()
    if not os.path.exists(active_path):
        raise HTTPException(status_code=404, detail="Database file not found")
    filename = os.path.basename(active_path) or "whosaid.db"
    return FileResponse(active_path, media_type="application/x-sqlite3", filename=filename)

@app.get("/favicon.ico")
async def get_favicon():
    return Response(status_code=204)

# Serve frontend static assets
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_file):
        with open(index_file, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Who Said - Local Video Transcriber</h1><p>Frontend loading...</p>"

