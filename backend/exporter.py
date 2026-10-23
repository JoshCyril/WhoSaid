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

def export_ai_summary(transcript_data: Dict[str, Any], ai_prompt: str = None) -> str:
    prompt = (ai_prompt or "").strip()
    if not prompt:
        prompt = (
            "Please provide a comprehensive summary of the following meeting/video transcript.\n"
            "Highlight the main discussion points, key decisions made, and action items assigned to each speaker."
        )

    # 1. Video / Media Summary section
    filename = transcript_data.get("filename") or transcript_data.get("file_path") or "Media File"
    if "/" in filename or "\\" in filename:
        import os
        filename = os.path.basename(filename)

    duration_sec = transcript_data.get("duration", 0) or 0
    try:
        duration_sec = float(duration_sec)
    except (ValueError, TypeError):
        duration_sec = 0.0

    if duration_sec <= 0 and transcript_data.get("segments"):
        duration_sec = max((float(s.get("end", 0)) for s in transcript_data["segments"]), default=0.0)

    mins = int(duration_sec // 60)
    secs = int(duration_sec % 60)
    duration_str = f"{mins:02d}:{secs:02d}"

    raw_date = transcript_data.get("created_at") or transcript_data.get("date") or "N/A"
    created_at = str(raw_date).replace("T", " ").split(".")[0]

    # Distinct speakers
    speakers = []
    if "speakers" in transcript_data and isinstance(transcript_data["speakers"], list):
        for s in transcript_data["speakers"]:
            if isinstance(s, dict) and "name" in s:
                speakers.append(s["name"])
            elif isinstance(s, str):
                speakers.append(s)
    if not speakers:
        segments = transcript_data.get("segments", [])
        seen = set()
        for seg in segments:
            lbl = seg.get("speaker_label", "Speaker")
            if lbl and lbl not in seen:
                seen.add(lbl)
                speakers.append(lbl)
    speakers_str = ", ".join(speakers) if speakers else "Unknown"

    model_size = transcript_data.get("model_size", "standard")

    summary_block = [
        "================================================================================",
        "VIDEO / MEDIA SUMMARY",
        "================================================================================",
        f"Name:        {filename}",
        f"Speakers:    {speakers_str}",
        f"Duration:    {duration_str} ({int(duration_sec)}s)",
        f"Date:        {created_at}",
        f"Model:       Whisper {model_size}",
        "================================================================================"
    ]

    # 2. Transcript section (similar to txt file)
    transcript_block = [
        "================================================================================",
        "TRANSCRIPT",
        "================================================================================"
    ]
    segments = transcript_data.get("segments", [])
    for seg in segments:
        spk = seg.get("speaker_label", "Speaker")
        start_ts = format_timestamp_simple(seg.get("start", 0))
        end_ts = format_timestamp_simple(seg.get("end", 0))
        text = seg.get("text", "").strip()
        transcript_block.append(f"{spk} [{start_ts} - {end_ts}]:")
        transcript_block.append(f"  {text}\n")

    return f"{prompt}\n\n" + "\n".join(summary_block) + "\n\n" + "\n".join(transcript_block)

