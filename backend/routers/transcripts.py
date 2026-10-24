import os
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Response
from fastapi.responses import JSONResponse

from backend.config import AUDIO_DIR
from backend.db import (
    get_transcript, get_job, update_job, update_transcript_content, save_voice_profile
)
from backend.audio import extract_audio_16k, get_media_duration, generate_waveform_peaks
from backend.exporter import export_srt, export_vtt, export_json, export_txt, export_ai_summary

router = APIRouter(tags=["transcripts"])

@router.get("/api/transcripts/{transcript_id}")
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

        if (not duration or duration <= 0.0) and media_available and file_path:
            duration = get_media_duration(file_path) or 0.0
            if duration > 0.0:
                update_job(job["id"], duration=duration)

        if audio_path and os.path.exists(audio_path):
            audio_available = True
            try:
                peaks = generate_waveform_peaks(audio_path, num_peaks=600)
            except Exception:
                peaks = []

    if (not duration or duration <= 0.0) and data.get("segments"):
        duration = max((s.get("end", 0.0) for s in data["segments"]), default=0.0)

    # Filter out 0-turn / null speakers from transcript data
    segments = data.get("segments", [])
    active_ids = {s.get("speaker_id") for s in segments if s.get("speaker_id") and (s.get("text") or "").strip()}
    if active_ids and data.get("speakers"):
        data["speakers"] = [spk for spk in data["speakers"] if spk["id"] in active_ids]

    data["peaks"] = peaks
    data["duration"] = duration
    data["filename"] = filename
    data["media_available"] = media_available
    data["audio_available"] = audio_available
    data["media_url"] = f"/api/media/{data['job_id']}" if media_available else ""
    data["audio_url"] = f"/api/audio/{data['job_id']}" if audio_available else ""
    return JSONResponse(data)

@router.put("/api/transcripts/{transcript_id}")
async def update_transcript(transcript_id: str, payload: Dict[str, Any]):
    current = get_transcript(transcript_id)
    if not current:
        raise HTTPException(status_code=404, detail="Transcript not found")

    speakers = payload.get("speakers", current["speakers"])
    segments = payload.get("segments", current["segments"])
    update_transcript_content(transcript_id, speakers, segments)
    return JSONResponse({"status": "success", "message": "Transcript updated"})

@router.post("/api/transcripts/{transcript_id}/rename-speaker")
async def rename_speaker(transcript_id: str, payload: Dict[str, Any]):
    """
    Renames a speaker across all segments in the transcript.
    Automatically enrolls or updates the speaker's voice profile with embedding,
    color, and Cameo avatar seed in SQLite for future recognition across videos.
    """
    transcript = get_transcript(transcript_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    speaker_id = payload.get("speaker_id")
    new_label = payload.get("new_label", "").strip()
    enroll_profile = payload.get("enroll_profile", True)
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
        if seg.get("speaker_id") == speaker_id:
            seg["speaker_label"] = new_label
            if color:
                seg["speaker_color"] = color
            if avatar_seed:
                seg["speaker_avatar_seed"] = avatar_seed

    # Get or extract speaker voice embedding
    emb = target_spk.get("embedding") if target_spk else None
    if not emb and target_spk:
        try:
            job_id = transcript.get("job_id")
            if job_id:
                job = get_job(job_id)
                audio_path = job.get("audio_path") if job else None
                if audio_path and os.path.exists(audio_path):
                    from backend.audio import load_audio_samples
                    from backend.diarizer import DiarizerService
                    import numpy as np

                    samples, sr = load_audio_samples(audio_path)
                    spk_segments = [
                        s for s in segments
                        if s.get("speaker_id") == speaker_id and (s.get("end", 0) - s.get("start", 0)) > 0.4
                    ]
                    if spk_segments:
                        chunks = []
                        total_samples = 0
                        for s in spk_segments:
                            s_idx = int(s["start"] * sr)
                            e_idx = min(len(samples), int(s["end"] * sr))
                            if e_idx > s_idx:
                                chunks.append(samples[s_idx:e_idx])
                                total_samples += (e_idx - s_idx)
                                if total_samples >= 15 * sr:
                                    break
                        if chunks:
                            combined = np.concatenate(chunks)
                            emb = DiarizerService.get_instance().extract_embedding_from_samples(combined, sr)
                            if emb:
                                target_spk["embedding"] = emb
        except Exception as e:
            print(f"[RenameSpeaker] Notice: could not extract audio embedding fallback: {e}")

    # Automatically enroll into Voice Profiles if requested and embedding is available
    profile_id = None
    if enroll_profile and target_spk and emb:
        profile_id = save_voice_profile(
            name=new_label,
            embedding=emb,
            color=target_spk.get("color", color or "#f6c48f"),
            avatar_seed=target_spk.get("avatar_seed", avatar_seed)
        )
        target_spk["profile_id"] = profile_id
        print(f"[RenameSpeaker] Enrolled voice profile '{new_label}' (ID: {profile_id})")

    update_transcript_content(transcript_id, speakers, segments)

    return JSONResponse({
        "status": "success",
        "speakers": speakers,
        "profile_id": profile_id,
        "message": f"Renamed to '{new_label}'" + (" and saved into Enrolled Voice Profiles!" if profile_id else "")
    })

@router.post("/api/transcripts/{transcript_id}/merge-speakers")
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

    reassigned_count = 0
    for seg in segments:
        if seg.get("speaker_id") == source_id:
            seg["speaker_id"] = target_id
            seg["speaker_label"] = target_spk["label"]
            seg["speaker_color"] = target_spk["color"]
            reassigned_count += 1

    if source_spk.get("embedding") and target_spk.get("embedding"):
        s_emb = source_spk["embedding"]
        t_emb = target_spk["embedding"]
        if len(s_emb) == len(t_emb):
            target_spk["embedding"] = [round(0.5 * (a + b), 6) for a, b in zip(t_emb, s_emb)]

    updated_speakers = [s for s in speakers if s["id"] != source_id]
    update_transcript_content(transcript_id, updated_speakers, segments)

    return JSONResponse({
        "status": "success",
        "id": transcript_id,
        "message": f"Merged '{source_spk['label']}' ({source_id}) into '{target_spk['label']}' ({target_id}). Reassigned {reassigned_count} turn(s).",
        "speakers": updated_speakers,
        "segments": segments,
        "reassigned_count": reassigned_count
    })

@router.get("/api/transcripts/{transcript_id}/export/{fmt}")
async def export_transcript(transcript_id: str, fmt: str, ai_prompt: Optional[str] = None):
    transcript = get_transcript(transcript_id)
    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    job_id = transcript.get("job_id")
    if job_id:
        job = get_job(job_id)
        if job:
            if not transcript.get("filename"):
                transcript["filename"] = job.get("filename")
            if not transcript.get("duration"):
                transcript["duration"] = job.get("duration")
            if not transcript.get("created_at"):
                transcript["created_at"] = job.get("created_at")

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
    elif fmt in ("ai_summary", "ai-summary", "summary"):
        content = export_ai_summary(transcript, ai_prompt)
        media_type = "text/plain"
        ext = "txt"
    else:
        raise HTTPException(status_code=400, detail=f"Invalid format {fmt}. Supported: srt, txt, ai_summary")

    clean_name = "ai_summary" if fmt in ("ai_summary", "ai-summary", "summary") else "transcript"
    filename = f"whosaid_{clean_name}_{transcript_id[:8]}.{ext}"
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )
