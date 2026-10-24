import os
import sys
import asyncio
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse, StreamingResponse

from backend.config import BASE_DIR
from backend.db import (
    get_connection, get_all_unique_tags, add_file_tag, remove_file_tag, get_all_file_tags_map
)
from backend.audio import get_media_duration

router = APIRouter(tags=["filesystem"])

@router.get("/api/fs/scan-folder")
async def scan_filesystem_folder(folder_path: Optional[str] = None):
    if not folder_path or not folder_path.strip():
        videos_dir = os.path.expanduser("~/Videos")
        target_dir = videos_dir if os.path.isdir(videos_dir) else BASE_DIR
    else:
        candidate = folder_path.strip()
        if not os.path.isabs(candidate):
            candidate = os.path.join(BASE_DIR, candidate)
        if os.path.isdir(candidate):
            target_dir = candidate
        else:
            videos_dir = os.path.expanduser("~/Videos")
            target_dir = videos_dir if os.path.isdir(videos_dir) else BASE_DIR

    target_dir = os.path.abspath(target_dir)

    if not os.path.exists(target_dir):
        target_dir = BASE_DIR

    ignored_dirs = {".git", ".svn", ".vscode", ".agent", ".agents", "node_modules", "__pycache__", "models", "storage", ".cache"}
    media_exts = {".mp4", ".mkv", ".mov", ".webm", ".mp3", ".wav", ".wmv"}
    sub_exts = {".srt", ".vtt", ".json", ".txt"}

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, filename, file_path, file_hash, model_size, status, duration FROM jobs")
        all_jobs = [dict(r) for r in cursor.fetchall()]
        cursor.execute("SELECT id, job_id FROM transcripts")
        all_transcripts = {r["job_id"]: r["id"] for r in cursor.fetchall()}
    except Exception:
        all_jobs = []
        all_transcripts = {}
    finally:
        if conn:
            conn.close()

    try:
        tags_map = get_all_file_tags_map()
    except Exception:
        tags_map = {}

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
                    st = entry.stat()
                    size = st.st_size
                    mtime = st.st_mtime
                except Exception:
                    size = 0
                    mtime = 0

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
                                    "model_size": j.get("model_size", "tiny"),
                                    "duration": j.get("duration")
                                }
                                break

                file_tags = tags_map.get(entry_path, [])
                node["children"].append({
                    "name": entry.name,
                    "path": entry_path,
                    "is_dir": False,
                    "size": size,
                    "mtime": mtime,
                    "ext": ext,
                    "is_media": is_media,
                    "is_subtitle": is_sub,
                    "duration": (cached_info.get("duration") if cached_info else None) or (get_media_duration(entry_path) if is_media else None),
                    "cached_job": cached_info,
                    "tags": file_tags
                })

        return node

    tree = build_tree(target_dir)
    return JSONResponse({
        "root": tree,
        "folder_path": target_dir,
        "folder_name": os.path.basename(target_dir) or target_dir
    })

@router.get("/api/fs/tags")
async def get_all_tags_endpoint():
    return JSONResponse({"tags": get_all_unique_tags()})

@router.post("/api/fs/tags")
async def add_file_tag_endpoint(request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}
    file_path = data.get("file_path")
    tag = data.get("tag")
    if not file_path or not tag:
        raise HTTPException(status_code=400, detail="file_path and tag are required")
    updated = add_file_tag(file_path, tag)
    return JSONResponse({"status": "success", "file_path": file_path, "tags": updated})

@router.delete("/api/fs/tags")
async def remove_file_tag_endpoint(request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}
    file_path = data.get("file_path")
    tag = data.get("tag")
    if not file_path or not tag:
        raise HTTPException(status_code=400, detail="file_path and tag are required")
    updated = remove_file_tag(file_path, tag)
    return JSONResponse({"status": "success", "file_path": file_path, "tags": updated})

@router.get("/api/fs/stream-media")
async def stream_fs_media_file(file_path: str, request: Request):
    if not file_path:
        raise HTTPException(status_code=400, detail="file_path parameter is required")
    clean_path = os.path.abspath(file_path)
    if not os.path.exists(clean_path) or os.path.isdir(clean_path):
        raise HTTPException(status_code=404, detail="Media file not found on disk")

    ext = os.path.splitext(clean_path)[1].lower()
    content_types = {
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".mov": "video/quicktime",
        ".mkv": "video/x-matroska",
        ".avi": "video/x-msvideo",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".flac": "audio/flac",
        ".ogg": "audio/ogg"
    }
    media_type = content_types.get(ext, "video/mp4")
    file_size = os.path.getsize(clean_path)
    range_header = request.headers.get("Range")

    if not range_header:
        return FileResponse(clean_path, media_type=media_type)

    range_val = range_header.replace("bytes=", "").split("-")
    start = int(range_val[0])
    end = int(range_val[1]) if range_val[1] else file_size - 1
    content_length = end - start + 1

    def iterfile():
        with open(clean_path, "rb") as f:
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

@router.post("/api/fs/choose-folder")
async def choose_folder_dialog(request: Request):
    data = {}
    try:
        data = await request.json()
    except Exception:
        pass
    initial_dir = data.get("initial_dir") or os.path.expanduser("~/Videos")
    if not os.path.exists(initial_dir):
        initial_dir = BASE_DIR

    def _open_picker():
        try:
            import tkinter
            import tkinter.filedialog
            root = tkinter.Tk()
            root.withdraw()
            root.wm_attributes('-topmost', 1)
            selected = tkinter.filedialog.askdirectory(
                title="Select Folder to Open in Who Said",
                initialdir=initial_dir
            )
            root.destroy()
            if selected and os.path.isdir(selected):
                return selected
        except Exception:
            pass

        if sys.platform == "win32":
            try:
                import subprocess
                ps_script = f"""
                Add-Type -AssemblyName System.Windows.Forms
                $f = New-Object System.Windows.Forms.FolderBrowserDialog
                $f.Description = 'Select Media Folder to Open in Who Said'
                $f.SelectedPath = '{initial_dir}'
                if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {{
                    Write-Output $f.SelectedPath
                }}
                """
                res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True, timeout=60)
                path = res.stdout.strip()
                if path and os.path.isdir(path):
                    return path
            except Exception:
                pass
        return None

    loop = asyncio.get_event_loop()
    selected_path = await loop.run_in_executor(None, _open_picker)
    
    if selected_path and os.path.isdir(selected_path):
        return JSONResponse({"status": "success", "folder_path": os.path.abspath(selected_path)})
    return JSONResponse({"status": "cancelled", "folder_path": None})

@router.get("/api/fs/quick-directories")
async def get_quick_directories():
    home = os.path.expanduser("~")
    dirs = [
        {"name": "Videos", "path": os.path.join(home, "Videos"), "icon": "video"},
        {"name": "Downloads", "path": os.path.join(home, "Downloads"), "icon": "download"},
        {"name": "Music", "path": os.path.join(home, "Music"), "icon": "music"},
        {"name": "Documents", "path": os.path.join(home, "Documents"), "icon": "folder"},
        {"name": "Project Root", "path": BASE_DIR, "icon": "code"}
    ]
    valid_dirs = [d for d in dirs if os.path.isdir(d["path"])]
    return JSONResponse({"directories": valid_dirs})

@router.get("/api/fs/file-properties")
async def get_file_properties(file_path: str):
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    stat = os.stat(file_path)
    size = stat.st_size
    mtime = stat.st_mtime
    ext = os.path.splitext(file_path)[1].lower()
    filename = os.path.basename(file_path)
    
    job = None
    transcript_id = None
    try:
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
    except Exception:
        pass

    dur = job.get("duration") if job else None
    is_media = ext in {".mp4", ".mkv", ".mov", ".webm", ".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"}
    if (dur is None or dur <= 0.0) and is_media:
        dur = get_media_duration(file_path)

    return JSONResponse({
        "name": filename,
        "path": file_path,
        "size": size,
        "ext": ext,
        "mtime": mtime,
        "duration": dur,
        "is_media": is_media,
        "model_size": job.get("model_size") if job else None,
        "cached": bool(transcript_id),
        "transcript_id": transcript_id,
        "job_id": job.get("id") if job else None
    })
