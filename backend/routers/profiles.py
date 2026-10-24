import os
import shutil
from typing import Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from backend.config import AUDIO_DIR, UPLOADS_DIR
from backend.db import get_all_voice_profiles, save_voice_profile, delete_voice_profile
from backend.audio import extract_audio_16k, load_audio_samples
from backend.diarizer import DiarizerService

router = APIRouter(tags=["profiles"])

@router.get("/api/profiles")
async def list_profiles():
    profiles = get_all_voice_profiles()
    return JSONResponse(profiles)

@router.post("/api/profiles")
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

@router.delete("/api/profiles/{profile_id}")
async def remove_profile(profile_id: str):
    delete_voice_profile(profile_id)
    return JSONResponse({"status": "success", "message": "Profile removed"})
