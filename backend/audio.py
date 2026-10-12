import os
import hashlib
import subprocess
import imageio_ffmpeg
import soundfile as sf
import numpy as np
from typing import Tuple, List, Optional

def get_ffmpeg_path() -> str:
    env_exe = os.environ.get("IMAGEIO_FFMPEG_EXE")
    if env_exe and os.path.exists(env_exe):
        return env_exe
    try:
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"

FFMPEG_EXE = get_ffmpeg_path()

def compute_file_hash(file_path: str) -> str:
    """Computes SHA-256 hash of a file for caching purposes."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(1024 * 1024):
            hasher.update(chunk)
    return hasher.hexdigest()

def extract_audio_16k(input_path: str, output_wav_path: str) -> float:
    """
    Extracts audio from video/audio container and converts to 16kHz mono 16-bit PCM WAV.
    Returns audio duration in seconds.
    """
    os.makedirs(os.path.dirname(output_wav_path), exist_ok=True)
    cmd = [
        FFMPEG_EXE,
        "-y",
        "-i", input_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        output_wav_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg audio extraction failed: {result.stderr}")

    info = sf.info(output_wav_path)
    return info.duration

def load_audio_samples(wav_path: str) -> Tuple[np.ndarray, int]:
    """Loads 16kHz mono WAV audio as a float32 NumPy array."""
    data, sr = sf.read(wav_path, dtype="float32")
    if data.ndim > 1:
        data = np.mean(data, axis=1)
    return data, sr

def generate_waveform_peaks(wav_path: str, num_peaks: int = 800) -> List[float]:
    """
    Computes normalized amplitude peaks for fast waveform rendering in the frontend.
    Returns a list of peak floats between 0.0 and 1.0.
    """
    try:
        data, _ = sf.read(wav_path, dtype="float32")
        if data.ndim > 1:
            data = np.mean(data, axis=1)
        if len(data) == 0:
            return []
        
        chunk_size = max(1, len(data) // num_peaks)
        peaks = []
        for i in range(0, len(data), chunk_size):
            chunk = data[i:i + chunk_size]
            if len(chunk) > 0:
                peaks.append(float(np.max(np.abs(chunk))))
        max_val = max(peaks) if peaks and max(peaks) > 0 else 1.0
        return [round(p / max_val, 4) for p in peaks]
    except Exception:
        return []

def get_media_duration(file_path: str) -> Optional[float]:
    """
    Fast extraction of media file duration in seconds.
    Tries soundfile for audio containers, and ffmpeg header probe for videos.
    """
    if not file_path or not os.path.exists(file_path):
        return None
    ext = os.path.splitext(file_path)[1].lower()
    if ext in {".wav", ".flac", ".ogg"}:
        try:
            info = sf.info(file_path)
            return round(info.duration, 2)
        except Exception:
            pass

    # Use ffmpeg -i probe
    try:
        cmd = [FFMPEG_EXE, "-i", file_path]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=5)
        import re
        match = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.?\d*)", proc.stderr)
        if match:
            h, m, s = match.groups()
            dur = int(h) * 3600 + int(m) * 60 + float(s)
            return round(dur, 2)
    except Exception:
        pass
    return None
