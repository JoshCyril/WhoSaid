import sqlite3
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import sys

if getattr(sys, "frozen", False):
    APP_DIR = getattr(sys, "_MEIPASS", os.path.dirname(sys.executable))
    ROOT_DIR = os.path.dirname(sys.executable)
else:
    APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ROOT_DIR = APP_DIR

DEFAULT_DB_DIR = os.environ.get("WHOSAID_STORAGE_DIR") or os.path.join(ROOT_DIR, "storage")
DEFAULT_DB_PATH = os.path.join(DEFAULT_DB_DIR, "whosaid.db")

_ACTIVE_DB_PATH: Optional[str] = os.environ.get("WHOSAID_DB_PATH")

def get_default_db_path() -> str:
    return os.path.abspath(DEFAULT_DB_PATH)

def get_db_path() -> str:
    global _ACTIVE_DB_PATH
    if _ACTIVE_DB_PATH and _ACTIVE_DB_PATH.strip():
        return os.path.abspath(_ACTIVE_DB_PATH.strip())
    return os.path.abspath(DEFAULT_DB_PATH)

def set_db_path(new_path: Optional[str]) -> str:
    global _ACTIVE_DB_PATH
    if not new_path or not str(new_path).strip():
        _ACTIVE_DB_PATH = None
    else:
        clean_path = os.path.abspath(str(new_path).strip())
        parent_dir = os.path.dirname(clean_path)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)
        _ACTIVE_DB_PATH = clean_path
    init_db()
    return get_db_path()

# For backwards compatibility
DB_DIR = DEFAULT_DB_DIR
DB_PATH = get_db_path()

def get_connection():
    active_path = get_db_path()
    parent_dir = os.path.dirname(active_path)
    if parent_dir:
        os.makedirs(parent_dir, exist_ok=True)
    conn = sqlite3.connect(active_path)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Jobs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        audio_path TEXT,
        file_hash TEXT,
        model_size TEXT DEFAULT 'tiny',
        status TEXT DEFAULT 'pending',
        progress REAL DEFAULT 0.0,
        message TEXT DEFAULT '',
        duration REAL DEFAULT 0.0,
        created_at TEXT,
        updated_at TEXT
    )
    """)

    # Transcripts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transcripts (
        id TEXT PRIMARY KEY,
        job_id TEXT,
        file_hash TEXT,
        model_size TEXT,
        speakers_json TEXT,
        segments_json TEXT,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY(job_id) REFERENCES jobs(id)
    )
    """)

    # Voice profiles table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS voice_profiles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT DEFAULT '#f6c48f',
        embedding_json TEXT NOT NULL,
        sample_count INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
    )
    """)

    # File tags table for Explorer tagging, filtering, and sorting
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS file_tags (
        file_path TEXT NOT NULL,
        tag TEXT NOT NULL,
        created_at TEXT,
        PRIMARY KEY(file_path, tag)
    )
    """)

    # Add language_mode column if missing
    try:
        cursor.execute("ALTER TABLE jobs ADD COLUMN language_mode TEXT DEFAULT 'en'")
    except Exception:
        pass

    conn.commit()
    conn.close()

# --- Job Operations ---

def create_job(filename: str, file_path: str, file_hash: str, model_size: str = "tiny", language_mode: str = "en") -> str:
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO jobs (id, filename, file_path, file_hash, model_size, language_mode, status, progress, message, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'pending', 0.0, 'Job created', ?, ?)""",
        (job_id, filename, file_path, file_hash, model_size, language_mode, now, now)
    )
    conn.commit()
    conn.close()
    return job_id

def update_job(job_id: str, **kwargs):
    conn = get_connection()
    cursor = conn.cursor()
    fields = []
    values = []
    for k, v in kwargs.items():
        fields.append(f"{k} = ?")
        values.append(v)
    fields.append("updated_at = ?")
    values.append(datetime.now(timezone.utc).isoformat())
    values.append(job_id)
    query = f"UPDATE jobs SET {', '.join(fields)} WHERE id = ?"
    cursor.execute(query, tuple(values))
    conn.commit()
    conn.close()

def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_latest_completed_job() -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs WHERE status = 'completed' ORDER BY updated_at DESC LIMIT 1")
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_job_by_hash_and_model(file_hash: str, model_size: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT * FROM jobs WHERE file_hash = ? AND model_size = ? AND status = 'completed' ORDER BY updated_at DESC LIMIT 1",
        (file_hash, model_size)
    )
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

# --- Transcript Operations ---

def save_transcript(job_id: str, file_hash: str, model_size: str, speakers: List[Dict[str, Any]], segments: List[Dict[str, Any]]) -> str:
    transcript_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """INSERT INTO transcripts (id, job_id, file_hash, model_size, speakers_json, segments_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (transcript_id, job_id, file_hash, model_size, json.dumps(speakers), json.dumps(segments), now, now)
    )
    conn.commit()
    conn.close()
    return transcript_id

def get_transcript(transcript_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transcripts WHERE id = ?", (transcript_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    data = dict(row)
    data["speakers"] = json.loads(data["speakers_json"]) if data["speakers_json"] else []
    data["segments"] = json.loads(data["segments_json"]) if data["segments_json"] else []
    return data

def get_transcript_by_job_id(job_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transcripts WHERE job_id = ? ORDER BY updated_at DESC LIMIT 1", (job_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    data = dict(row)
    data["speakers"] = json.loads(data["speakers_json"]) if data["speakers_json"] else []
    data["segments"] = json.loads(data["segments_json"]) if data["segments_json"] else []
    return data

def update_transcript_content(transcript_id: str, speakers: List[Dict[str, Any]], segments: List[Dict[str, Any]]):
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """UPDATE transcripts SET speakers_json = ?, segments_json = ?, updated_at = ? WHERE id = ?""",
        (json.dumps(speakers), json.dumps(segments), now, transcript_id)
    )
    conn.commit()
    conn.close()

# --- Voice Profiles Operations ---

def get_all_voice_profiles() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, color, sample_count, embedding_json, created_at, updated_at FROM voice_profiles ORDER BY name ASC")
    rows = cursor.fetchall()
    conn.close()
    profiles = []
    for r in rows:
        item = dict(r)
        item["embedding"] = json.loads(item["embedding_json"]) if item["embedding_json"] else []
        del item["embedding_json"]
        profiles.append(item)
    return profiles

def get_voice_profile_by_name(name: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM voice_profiles WHERE LOWER(name) = LOWER(?)", (name.strip(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        item = dict(row)
        item["embedding"] = json.loads(item["embedding_json"]) if item["embedding_json"] else []
        return item
    return None

def save_voice_profile(name: str, embedding: List[float], color: str = "#f6c48f") -> str:
    name = name.strip()
    existing = get_voice_profile_by_name(name)
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    if existing:
        profile_id = existing["id"]
        # Blend embedding with running average
        old_emb = existing["embedding"]
        count = existing["sample_count"] + 1
        new_emb = [(old_emb[i] * (count - 1) + embedding[i]) / count for i in range(len(embedding))]
        cursor.execute(
            """UPDATE voice_profiles SET embedding_json = ?, sample_count = ?, color = ?, updated_at = ? WHERE id = ?""",
            (json.dumps(new_emb), count, color, now, profile_id)
        )
    else:
        profile_id = str(uuid.uuid4())
        cursor.execute(
            """INSERT INTO voice_profiles (id, name, color, embedding_json, sample_count, created_at, updated_at)
               VALUES (?, ?, ?, ?, 1, ?, ?)""",
            (profile_id, name, color, json.dumps(embedding), now, now)
        )
    conn.commit()
    conn.close()
    return profile_id

def delete_voice_profile(profile_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM voice_profiles WHERE id = ?", (profile_id,))
    conn.commit()
    conn.close()

# --- Transcription History Operations ---

def get_transcription_history() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT j.id as job_id, j.filename, j.file_path, j.model_size, j.language_mode, j.status, j.duration, j.created_at, j.updated_at,
               t.id as transcript_id, t.speakers_json
        FROM jobs j
        LEFT JOIN transcripts t ON j.id = t.job_id
        WHERE j.status = 'completed'
        ORDER BY j.created_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    result = []
    for r in rows:
        item = dict(r)
        speakers = json.loads(item["speakers_json"]) if item.get("speakers_json") else []
        item.pop("speakers_json", None)
        item["speaker_count"] = len(speakers)
        item["speakers"] = [{"label": s.get("label", "Speaker"), "color": s.get("color", "#f6c48f")} for s in speakers[:5]]
        fp = item.pop("file_path", None)
        item["media_available"] = bool(fp and os.path.exists(fp))
        result.append(item)
    return result

def delete_job_and_transcript(job_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transcripts WHERE job_id = ?", (job_id,))
    cursor.execute("DELETE FROM jobs WHERE id = ?", (job_id,))
    conn.commit()
    conn.close()

# --- Database Introspection & Management ---

def get_db_stats() -> Dict[str, Any]:
    active_path = get_db_path()
    file_size = os.path.getsize(active_path) if os.path.exists(active_path) else 0
    conn = get_connection()
    cursor = conn.cursor()
    tables_info = {}
    for table in ["jobs", "transcripts", "voice_profiles"]:
        try:
            count = cursor.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            cols = [col[1] for col in cursor.execute(f"PRAGMA table_info({table})").fetchall()]
            tables_info[table] = {"count": count, "columns": cols}
        except Exception:
            tables_info[table] = {"count": 0, "columns": []}
    conn.close()
    return {
        "db_path": os.path.abspath(active_path),
        "db_dir": os.path.abspath(os.path.dirname(active_path)),
        "is_custom": os.path.abspath(active_path) != get_default_db_path(),
        "db_exists": os.path.exists(active_path),
        "file_size": file_size,
        "db_size_bytes": file_size,
        "jobs_count": tables_info.get("jobs", {}).get("count", 0),
        "transcripts_count": tables_info.get("transcripts", {}).get("count", 0),
        "profiles_count": tables_info.get("voice_profiles", {}).get("count", 0),
        "tags_count": tables_info.get("file_tags", {}).get("count", 0),
        "tables": tables_info
    }

def get_table_rows(table_name: str, limit: int = 100, offset: int = 0) -> Dict[str, Any]:
    valid_tables = {"jobs", "transcripts", "voice_profiles", "file_tags"}
    if table_name not in valid_tables:
        raise ValueError(f"Invalid table name: {table_name}")
    conn = get_connection()
    cursor = conn.cursor()
    cols = [col[1] for col in cursor.execute(f"PRAGMA table_info({table_name})").fetchall()]
    total_count = cursor.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
    cursor.execute(f"SELECT * FROM {table_name} ORDER BY rowid DESC LIMIT ? OFFSET ?", (limit, offset))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {
        "table": table_name,
        "columns": cols,
        "total_count": total_count,
        "limit": limit,
        "offset": offset,
        "rows": rows
    }

def run_readonly_query(sql_query: str) -> Dict[str, Any]:
    query_clean = sql_query.strip().rstrip(";")
    upper = query_clean.upper()
    if not (upper.startswith("SELECT") or upper.startswith("PRAGMA") or upper.startswith("EXPLAIN")):
        raise ValueError("Only read-only SELECT or PRAGMA queries are allowed.")
    forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "ATTACH", "DETACH", "REPLACE"]
    for word in forbidden:
        if f" {word} " in f" {upper} ":
            raise ValueError(f"Keyword '{word}' is not permitted in read-only queries.")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(query_clean)
    cols = [description[0] for description in cursor.description] if cursor.description else []
    rows = [dict(r) for r in cursor.fetchall()[:200]]
    conn.close()
    return {
        "query": query_clean,
        "columns": cols,
        "row_count": len(rows),
        "rows": rows
    }

# --- File Tags Operations ---

def get_file_tags(file_path: str) -> List[str]:
    if not file_path:
        return []
    clean_path = os.path.abspath(file_path)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT tag FROM file_tags WHERE file_path = ? ORDER BY tag ASC", (clean_path,))
    tags = [r["tag"] for r in cursor.fetchall()]
    conn.close()
    return tags

def add_file_tag(file_path: str, tag: str) -> List[str]:
    clean_tag = tag.strip()
    if not clean_tag or not file_path:
        return get_file_tags(file_path)
    clean_path = os.path.abspath(file_path)
    now = datetime.now(timezone.utc).isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR IGNORE INTO file_tags (file_path, tag, created_at) VALUES (?, ?, ?)",
        (clean_path, clean_tag, now)
    )
    conn.commit()
    conn.close()
    return get_file_tags(clean_path)

def remove_file_tag(file_path: str, tag: str) -> List[str]:
    if not file_path or not tag:
        return get_file_tags(file_path)
    clean_path = os.path.abspath(file_path)
    clean_tag = tag.strip()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM file_tags WHERE file_path = ? AND tag = ?",
        (clean_path, clean_tag)
    )
    conn.commit()
    conn.close()
    return get_file_tags(clean_path)

def get_all_file_tags_map() -> Dict[str, List[str]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT file_path, tag FROM file_tags ORDER BY tag ASC")
    res = {}
    for r in cursor.fetchall():
        p = r["file_path"]
        if p not in res:
            res[p] = []
        res[p].append(r["tag"])
    conn.close()
    return res

def get_all_unique_tags() -> List[str]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT tag FROM file_tags ORDER BY tag ASC")
    tags = [r["tag"] for r in cursor.fetchall()]
    conn.close()
    return tags

