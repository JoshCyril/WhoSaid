import os
import sys
import json
from typing import Optional, Tuple

# Base application directories (handles PyInstaller packaged vs dev mode)
if getattr(sys, "frozen", False):
    APP_DIR = getattr(sys, "_MEIPASS", os.path.dirname(sys.executable))
    ROOT_DIR = os.path.dirname(sys.executable)
else:
    APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ROOT_DIR = APP_DIR

BASE_DIR = ROOT_DIR

# Storage directories
STORAGE_DIR = os.environ.get("WHOSAID_STORAGE_DIR") or os.path.join(ROOT_DIR, "storage")
UPLOADS_DIR = os.path.join(STORAGE_DIR, "uploads")
AUDIO_DIR = os.path.join(STORAGE_DIR, "audio")

# Static files directory
_static_candidates = [
    os.environ.get("WHOSAID_STATIC_DIR"),
    os.path.join(APP_DIR, "static"),
    os.path.join(ROOT_DIR, "static")
]
STATIC_DIR = next((p for p in _static_candidates if p and os.path.exists(p)), os.path.join(ROOT_DIR, "static"))

# Ensure essential runtime storage directories exist
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(STATIC_DIR, exist_ok=True)

# Database paths configuration
DEFAULT_DB_DIR = STORAGE_DIR
DEFAULT_DB_PATH = os.path.join(DEFAULT_DB_DIR, "whosaid.db")
_ACTIVE_DB_PATH: Optional[str] = os.environ.get("WHOSAID_DB_PATH")

def get_default_db_path() -> str:
    """Returns the default absolute database path."""
    return os.path.abspath(DEFAULT_DB_PATH)

def get_db_path() -> str:
    """Returns the currently active absolute database path."""
    global _ACTIVE_DB_PATH
    if _ACTIVE_DB_PATH and _ACTIVE_DB_PATH.strip():
        return os.path.abspath(_ACTIVE_DB_PATH.strip())
    return os.path.abspath(DEFAULT_DB_PATH)

def set_db_path(new_path: Optional[str]) -> str:
    """Sets a custom database path, ensuring its directory exists."""
    global _ACTIVE_DB_PATH
    if not new_path or not str(new_path).strip():
        _ACTIVE_DB_PATH = None
    else:
        clean_path = os.path.abspath(str(new_path).strip())
        parent_dir = os.path.dirname(clean_path)
        if parent_dir:
            os.makedirs(parent_dir, exist_ok=True)
        _ACTIVE_DB_PATH = clean_path
    return get_db_path()

# Models configuration
MODELS_CONFIG_FILE = os.path.join(STORAGE_DIR, "models_config.json")

def get_default_models_dir() -> str:
    """Returns the default models directory searching local build and system candidates."""
    candidates = [
        os.path.join(ROOT_DIR, "models"),
        os.path.join(APP_DIR, "models"),
        os.path.join(ROOT_DIR, "..", "models"),
        os.path.join(APP_DIR, "_internal", "models")
    ]
    return os.path.abspath(next((p for p in candidates if p and os.path.exists(p)), os.path.join(ROOT_DIR, "models")))

def _load_initial_models_dir() -> str:
    saved_dir = None
    if os.path.exists(MODELS_CONFIG_FILE):
        try:
            with open(MODELS_CONFIG_FILE, "r", encoding="utf-8") as f:
                c = json.load(f)
                saved_dir = c.get("models_dir")
        except Exception:
            pass

    candidates = [
        saved_dir,
        os.environ.get("WHOSAID_MODELS_DIR"),
        os.path.join(ROOT_DIR, "models"),
        os.path.join(APP_DIR, "models"),
        os.path.join(ROOT_DIR, "..", "models"),
        os.path.join(APP_DIR, "_internal", "models")
    ]
    resolved = next((p for p in candidates if p and os.path.exists(p)), os.path.join(ROOT_DIR, "models"))
    return os.path.abspath(resolved)

MODELS_DIR = _load_initial_models_dir()
os.environ["WHOSAID_MODELS_DIR"] = MODELS_DIR

def get_models_dir() -> str:
    """Returns the current models directory."""
    global MODELS_DIR
    return os.path.abspath(MODELS_DIR)

def set_models_dir(new_path: Optional[str]) -> str:
    """Sets a custom models directory and persists to models_config.json."""
    global MODELS_DIR
    if not new_path or not str(new_path).strip():
        MODELS_DIR = get_default_models_dir()
        if os.path.exists(MODELS_CONFIG_FILE):
            try:
                os.remove(MODELS_CONFIG_FILE)
            except Exception:
                pass
    else:
        clean_path = os.path.abspath(str(new_path).strip())
        MODELS_DIR = clean_path
        os.environ["WHOSAID_MODELS_DIR"] = clean_path
        try:
            os.makedirs(os.path.dirname(MODELS_CONFIG_FILE), exist_ok=True)
            with open(MODELS_CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump({"models_dir": clean_path}, f, indent=2)
        except Exception:
            pass

    return get_models_dir()

def get_diarizer_model_paths() -> Tuple[str, str]:
    """Returns (segmentation_model_path, embedding_model_path) based on current MODELS_DIR."""
    current_dir = get_models_dir()
    seg = os.path.join(current_dir, "model.onnx")
    emb = os.path.join(current_dir, "3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx")
    return seg, emb
