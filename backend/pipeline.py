import os
import asyncio
import threading
from typing import Dict, List, Any, Optional
from fastapi import WebSocket

from backend.config import AUDIO_DIR
from backend.db import update_job, save_transcript, get_job
from backend.audio import extract_audio_16k, load_audio_samples
from backend.diarizer import DiarizerService
from backend.transcriber import TranscriberService

class TranscriptionPipeline:
    """
    Deep pipeline orchestrator for offline CPU speech-to-text and speaker diarization.
    Encapsulates audio extraction, acoustic feature extraction, speaker clustering,
    Whisper transcription, turn alignment, and thread-safe WebSocket progress reporting.
    """
    _instance: Optional["TranscriptionPipeline"] = None

    def __init__(self):
        self._active_connections: Dict[str, List[WebSocket]] = {}
        self._event_loop: Optional[asyncio.AbstractEventLoop] = None
        self._lock = threading.Lock()

    @classmethod
    def get_instance(cls) -> "TranscriptionPipeline":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        """Sets the main asyncio loop for dispatching WebSocket frames from worker threads."""
        self._event_loop = loop

    def register_websocket(self, job_id: str, ws: WebSocket):
        with self._lock:
            if job_id not in self._active_connections:
                self._active_connections[job_id] = []
            self._active_connections[job_id].append(ws)

    def unregister_websocket(self, job_id: str, ws: WebSocket):
        with self._lock:
            if job_id in self._active_connections and ws in self._active_connections[job_id]:
                self._active_connections[job_id].remove(ws)
                if not self._active_connections[job_id]:
                    del self._active_connections[job_id]

    async def broadcast_progress(self, job_id: str, data: Dict[str, Any]):
        """Dispatches JSON progress to all connected WebSockets for a given job."""
        connections = []
        with self._lock:
            if job_id in self._active_connections:
                connections = list(self._active_connections[job_id])

        for ws in connections:
            try:
                await ws.send_json(data)
            except Exception:
                pass

    def sync_broadcast(self, job_id: str, data: Dict[str, Any]):
        """Thread-safe dispatch from background worker thread to asyncio event loop."""
        try:
            if self._event_loop and self._event_loop.is_running():
                asyncio.run_coroutine_threadsafe(self.broadcast_progress(job_id, data), self._event_loop)
        except Exception as e:
            print(f"[WS Broadcast Warning] {e}")

    def execute_job(
        self,
        job_id: str,
        file_path: str,
        model_size: str,
        file_hash: str,
        language_mode: str = "en"
    ):
        """
        Executes the multi-stage media transcription & diarization pipeline synchronously.
        Updates job status in database and broadcasts real-time progress.
        """
        def update_progress(pct: float, msg: str, status: str = "processing"):
            update_job(job_id, progress=round(pct, 1), message=msg, status=status)
            self.sync_broadcast(job_id, {
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

            # Filter out speakers who speak 0 times
            spoken_speaker_ids = {t["speaker_id"] for t in merged_turns if t.get("speaker_id") and (t.get("text") or "").strip()}
            active_speakers = [s for s in speakers if s["id"] in spoken_speaker_ids]
            if not active_speakers and speakers:
                active_speakers = [speakers[0]]

            # Persist transcript in database
            transcript_id = save_transcript(
                job_id=job_id,
                file_hash=file_hash,
                model_size=model_size,
                speakers=active_speakers,
                segments=merged_turns
            )

            update_progress(100.0, "Completed successfully!", status="completed")
            print(f"[Pipeline] Job {job_id} successfully completed. Transcript ID: {transcript_id}")

        except Exception as e:
            import traceback
            traceback.print_exc()
            update_progress(0.0, f"Error: {str(e)}", status="failed")

    def start_background_job(
        self,
        job_id: str,
        file_path: str,
        model_size: str,
        file_hash: str,
        language_mode: str = "en"
    ) -> threading.Thread:
        """Launches the transcription pipeline on an asynchronous background thread."""
        thread = threading.Thread(
            target=self.execute_job,
            args=(job_id, file_path, model_size, file_hash, language_mode),
            daemon=True
        )
        thread.start()
        return thread

# Global singleton helper instance
pipeline_engine = TranscriptionPipeline.get_instance()
