import json
from typing import Dict, Any

def format_timestamp_srt(seconds: float) -> str:
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hrs:02d}:{mins:02d}:{secs:02d},{millis:03d}"

def format_timestamp_vtt(seconds: float) -> str:
    hrs = int(seconds // 3600)
    mins = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{millis:03d}"

def format_timestamp_simple(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"

def export_srt(transcript_data: Dict[str, Any]) -> str:
    lines = []
    segments = transcript_data.get("segments", [])
    for idx, seg in enumerate(segments, start=1):
        start_ts = format_timestamp_srt(seg["start"])
        end_ts = format_timestamp_srt(seg["end"])
        spk = seg.get("speaker_label", "Speaker")
        text = seg.get("text", "")
        lines.append(f"{idx}")
        lines.append(f"{start_ts} --> {end_ts}")
        lines.append(f"[{spk}] {text}")
        lines.append("")
    return "\n".join(lines)

def export_vtt(transcript_data: Dict[str, Any]) -> str:
    lines = ["WEBVTT - Exported by Who Said\n"]
    segments = transcript_data.get("segments", [])
    for idx, seg in enumerate(segments, start=1):
        start_ts = format_timestamp_vtt(seg["start"])
        end_ts = format_timestamp_vtt(seg["end"])
        spk = seg.get("speaker_label", "Speaker")
        text = seg.get("text", "")
        lines.append(f"{idx}")
        lines.append(f"{start_ts} --> {end_ts}")
        lines.append(f"<v {spk}>{text}")
        lines.append("")
    return "\n".join(lines)

def export_json(transcript_data: Dict[str, Any]) -> str:
    clean_data = {
        "id": transcript_data.get("id"),
        "model_size": transcript_data.get("model_size"),
        "speakers": transcript_data.get("speakers", []),
        "segments": transcript_data.get("segments", [])
    }
    return json.dumps(clean_data, indent=2)

def export_txt(transcript_data: Dict[str, Any]) -> str:
    lines = []
    segments = transcript_data.get("segments", [])
    for seg in segments:
        spk = seg.get("speaker_label", "Speaker")
        start_ts = format_timestamp_simple(seg["start"])
        end_ts = format_timestamp_simple(seg["end"])
        text = seg.get("text", "")
        lines.append(f"{spk} [{start_ts} - {end_ts}]:")
        lines.append(f"  {text}\n")
    return "\n".join(lines)
