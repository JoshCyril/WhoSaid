import os
import time
import sqlite3
from typing import List, Optional, Set
from backend.db import DB_PATH, DB_DIR

def get_active_job_files() -> Set[str]:
    files = set()
    if not os.path.exists(DB_PATH):
        return files
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        for row in cursor.execute("SELECT file_path, audio_path FROM jobs").fetchall():
            for p in row:
                if p:
                    files.add(os.path.abspath(os.path.normpath(p)).lower())
        conn.close()
    except Exception as e:
        print(f"[Cleanup DB Warning] {e}")
    return files

def cleanup_old_media(storage_dirs: Optional[List[str]] = None, max_age_seconds: int = 3600) -> int:
    """
    Deletes orphaned uploaded and extracted media files older than max_age_seconds (1 hour).
    Preserves files associated with saved transcription history jobs, sample assets, and directory structures.
    """
    if storage_dirs is None:
        storage_dirs = [os.path.join(DB_DIR, "uploads"), os.path.join(DB_DIR, "audio")]
    now = time.time()
    deleted_count = 0
    active_files = get_active_job_files()

    for directory in storage_dirs:
        if not os.path.exists(directory):
            continue
        try:
            for filename in os.listdir(directory):
                if filename.startswith(".") or "two_speakers_demo" in filename or "demo" in filename.lower():
                    continue
                filepath = os.path.join(directory, filename)
                if not os.path.isfile(filepath):
                    continue
                # If this file belongs to a session currently saved in history, preserve it!
                norm_path = os.path.abspath(os.path.normpath(filepath)).lower()
                if norm_path in active_files:
                    continue
                try:
                    mtime = os.path.getmtime(filepath)
                    if now - mtime > max_age_seconds:
                        os.remove(filepath)
                        deleted_count += 1
                        print(f"[Auto-Cleanup] Removed orphaned media file (>1 hr old): {filename}")
                except Exception as file_err:
                    print(f"[Auto-Cleanup] Error checking {filepath}: {file_err}")
        except Exception as dir_err:
            print(f"[Auto-Cleanup] Error reading {directory}: {dir_err}")

    return deleted_count

