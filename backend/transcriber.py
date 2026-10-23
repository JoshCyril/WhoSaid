import os
import sys
import numpy as np
from typing import List, Dict, Any, Optional, Callable
import faster_whisper

if getattr(sys, "frozen", False):
    APP_DIR = getattr(sys, "_MEIPASS", os.path.dirname(sys.executable))
    ROOT_DIR = os.path.dirname(sys.executable)
else:
    APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ROOT_DIR = APP_DIR

_model_candidates = [
    os.environ.get("WHOSAID_MODELS_DIR"),
    os.path.join(ROOT_DIR, "models"),
    os.path.join(APP_DIR, "models"),
    os.path.join(ROOT_DIR, "..", "models"),
    os.path.join(APP_DIR, "_internal", "models")
]
MODELS_DIR = next((p for p in _model_candidates if p and os.path.exists(p)), os.path.join(ROOT_DIR, "models"))


def find_local_whisper_model(model_size: str, search_dir: str) -> Optional[str]:
    """Finds a local directory for the given whisper model size."""
    if not os.path.exists(search_dir):
        return None
        
    candidates = [
        os.path.join(search_dir, model_size),
        os.path.join(search_dir, f"whisper-{model_size}"),
        os.path.join(search_dir, f"faster-whisper-{model_size}"),
        os.path.join(search_dir, f"models--Systran--faster-whisper-{model_size}"),
    ]
    for cand in candidates:
        if os.path.isdir(cand):
            # Check if directory directly contains model files
            if any(os.path.exists(os.path.join(cand, f)) for f in ["model.bin", "model.safetensors"]):
                return cand
            # Check snapshots subdirectory (Hugging Face hub format)
            snaps_dir = os.path.join(cand, "snapshots")
            if os.path.isdir(snaps_dir):
                for snap in os.listdir(snaps_dir):
                    sub = os.path.join(snaps_dir, snap)
                    if os.path.isdir(sub) and any(os.path.exists(os.path.join(sub, f)) for f in ["model.bin", "model.safetensors"]):
                        return sub
    return None


def get_whisper_models_status() -> Dict[str, Any]:
    """Returns local installation status and Hugging Face links for all supported Whisper model sizes."""
    sizes = ["tiny", "base", "small", "medium"]
    status = {}
    for s in sizes:
        local_path = find_local_whisper_model(s, MODELS_DIR)
        status[s] = {
            "installed_locally": local_path is not None,
            "path": local_path,
            "hf_url": f"https://huggingface.co/Systran/faster-whisper-{s}"
        }
    return status


class TranscriberService:
    _models: Dict[str, faster_whisper.WhisperModel] = {}

    @classmethod
    def get_model(cls, model_size: str = "tiny") -> faster_whisper.WhisperModel:
        valid_sizes = {"tiny", "base", "small", "medium"}
        if model_size not in valid_sizes:
            model_size = "tiny"
        if model_size not in cls._models:
            print(f"[Transcriber] Resolving faster-whisper model '{model_size}' on CPU (int8)...")
            
            # 1. Search in configured MODELS_DIR
            local_path = find_local_whisper_model(model_size, MODELS_DIR)
            
            # 2. Check standard user huggingface cache
            if not local_path:
                hf_cache = os.path.expanduser("~/.cache/huggingface/hub")
                local_path = find_local_whisper_model(model_size, hf_cache)
                
            model_source = local_path
            if not model_source:
                # If requested model is not present locally, fallback to bundled tiny
                bundled_tiny = find_local_whisper_model("tiny", MODELS_DIR)
                if bundled_tiny and model_size != "tiny":
                    print(f"[Transcriber] Model '{model_size}' not found in local models directory. Falling back to bundled 'tiny' model.")
                    return cls.get_model("tiny")
                raise FileNotFoundError(
                    f"Local model '{model_size}' was not found in '{MODELS_DIR}'. "
                    f"Please select 'tiny' (bundled 100% offline inside the application) or place the '{model_size}' files in '{os.path.join(MODELS_DIR, model_size)}'."
                )

            print(f"[Transcriber] Loading 100% offline Whisper model '{model_size}' from: {model_source}")
            try:
                cls._models[model_size] = faster_whisper.WhisperModel(
                    model_source,
                    device="cpu",
                    compute_type="int8",
                    cpu_threads=4,
                    local_files_only=True
                )
            except Exception as e:
                raise RuntimeError(
                    f"Failed to load offline model from '{model_source}': {e}. "
                    f"Ensure model.bin and config.json are present."
                ) from e
        return cls._models[model_size]

    @classmethod
    def transcribe(
        cls,
        audio_samples: np.ndarray,
        model_size: str = "tiny",
        language_mode: str = "en",
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> List[Dict[str, Any]]:
        """
        Runs faster-whisper on audio samples with word-level timestamps.
        Supports language='en' (default) and language='ta' with task='translate' (Tamil to English).
        Returns a list of segment dictionaries with words.
        """
        model = cls.get_model(model_size)
        
        # Determine language and task
        if language_mode == "ta_translate":
            lang = "ta"
            task = "translate"
            status_desc = f"Translating Tamil audio to English with Whisper ({model_size})..."
        elif language_mode == "ta":
            lang = "ta"
            task = "transcribe"
            status_desc = f"Transcribing Tamil audio with Whisper ({model_size})..."
        else:
            lang = "en"
            task = "transcribe"
            status_desc = f"Transcribing English audio with Whisper ({model_size})..."

        if progress_callback:
            progress_callback(0.1, status_desc)

        # faster_whisper accepts numpy float32 array
        whisper_segments, info = model.transcribe(
            audio_samples,
            language=lang,
            task=task,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=400)
        )

        total_duration = info.duration if info.duration and info.duration > 0 else 1.0
        results = []

        for seg in whisper_segments:
            seg_dict = {
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "text": seg.text.strip(),
                "words": []
            }
            if seg.words:
                for w in seg.words:
                    seg_dict["words"].append({
                        "word": w.word,
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "prob": round(w.probability, 2)
                    })
            results.append(seg_dict)

            if progress_callback and seg.end:
                pct = min(0.95, seg.end / total_duration)
                progress_callback(pct, f"Transcribing ({int(pct * 100)}%)...")

        return results

    @classmethod
    def merge_transcription_and_diarization(
        cls,
        whisper_segments: List[Dict[str, Any]],
        diarized_intervals: List[Dict[str, Any]],
        speakers: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Aligns word-level timestamps with speaker intervals to form speaker-attributed
        transcript turns.
        """
        speaker_lookup = {s["id"]: s for s in speakers}
        default_spk = speakers[0] if speakers else {
            "id": "spk_0", "label": "Speaker 1", "color": "#f6c48f"
        }

        # Helper to find which diarized interval matches a word
        def get_speaker_for_time(start: float, end: float, fallback_id: Optional[str] = None) -> Dict[str, Any]:
            if not diarized_intervals:
                return default_spk

            best_overlap = 0.0
            best_spk_id = None
            closest_dist = float("inf")
            closest_spk_id = None

            mid = (start + end) / 2.0

            for interval in diarized_intervals:
                i_start = interval["start"]
                i_end = interval["end"]
                # Overlap
                overlap = max(0.0, min(end, i_end) - max(start, i_start))
                if overlap > best_overlap:
                    best_overlap = overlap
                    best_spk_id = interval["speaker_id"]

                # Distance
                dist = 0.0
                if mid < i_start:
                    dist = i_start - mid
                elif mid > i_end:
                    dist = mid - i_end
                if dist < closest_dist:
                    closest_dist = dist
                    closest_spk_id = interval["speaker_id"]

            if best_overlap > 0:
                chosen_id = best_spk_id
            elif closest_dist <= 1.2 and closest_spk_id:
                chosen_id = closest_spk_id
            elif fallback_id and fallback_id in speaker_lookup:
                chosen_id = fallback_id
            else:
                chosen_id = closest_spk_id or (default_spk["id"] if default_spk else "spk_0")

            return speaker_lookup.get(chosen_id, default_spk)

        # Flatten all words with assigned speaker
        all_words = []
        for seg in whisper_segments:
            seg_start = seg.get("start", 0.0)
            seg_end = seg.get("end", 0.0)
            # Dominant speaker for this overall whisper segment
            seg_spk = get_speaker_for_time(seg_start, seg_end)
            prev_spk_id = seg_spk["id"]

            words = seg.get("words", [])
            if not words and seg.get("text"):
                words = [{
                    "word": seg["text"],
                    "start": seg_start,
                    "end": seg_end,
                    "prob": 1.0
                }]

            for w in words:
                spk = get_speaker_for_time(w["start"], w["end"], fallback_id=prev_spk_id)
                prev_spk_id = spk["id"]
                all_words.append({
                    "word": w["word"],
                    "start": w["start"],
                    "end": w["end"],
                    "prob": w.get("prob", 1.0),
                    "speaker_id": spk["id"]
                })

        if not all_words:
            return []

        # Group words into cohesive transcript turns
        merged_turns = []
        curr_turn = {
            "id": f"turn_0",
            "speaker_id": all_words[0]["speaker_id"],
            "speaker_label": speaker_lookup.get(all_words[0]["speaker_id"], default_spk)["label"],
            "speaker_color": speaker_lookup.get(all_words[0]["speaker_id"], default_spk)["color"],
            "start": all_words[0]["start"],
            "end": all_words[0]["end"],
            "words": [all_words[0]],
            "text": all_words[0]["word"].strip()
        }

        turn_idx = 1
        for w in all_words[1:]:
            prev_w = curr_turn["words"][-1]
            speaker_changed = w["speaker_id"] != curr_turn["speaker_id"]
            large_pause = (w["start"] - prev_w["end"]) > 1.8  # Turn break on substantial silence

            if speaker_changed or large_pause:
                curr_turn["text"] = " ".join([x["word"].strip() for x in curr_turn["words"]]).strip()
                curr_turn["end"] = prev_w["end"]
                merged_turns.append(curr_turn)

                spk_info = speaker_lookup.get(w["speaker_id"], default_spk)
                curr_turn = {
                    "id": f"turn_{turn_idx}",
                    "speaker_id": w["speaker_id"],
                    "speaker_label": spk_info["label"],
                    "speaker_color": spk_info["color"],
                    "start": w["start"],
                    "end": w["end"],
                    "words": [w],
                    "text": w["word"].strip()
                }
                turn_idx += 1
            else:
                curr_turn["words"].append(w)
                curr_turn["end"] = w["end"]

        # Final turn
        if curr_turn["words"]:
            curr_turn["text"] = " ".join([x["word"].strip() for x in curr_turn["words"]]).strip()
            merged_turns.append(curr_turn)

        return merged_turns
