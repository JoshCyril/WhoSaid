import os
import numpy as np
from typing import List, Dict, Any, Optional, Callable
import sherpa_onnx
from backend.db import get_all_voice_profiles

import sys

if getattr(sys, "frozen", False):
    APP_DIR = getattr(sys, "_MEIPASS", os.path.dirname(sys.executable))
    ROOT_DIR = os.path.dirname(sys.executable)
else:
    APP_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ROOT_DIR = APP_DIR

_model_candidates = [
    os.environ.get("WHOSAID_MODELS_DIR"),
    os.path.join(ROOT_DIR, "models"),
    os.path.join(APP_DIR, "models")
]
MODELS_DIR = next((p for p in _model_candidates if p and os.path.exists(p)), os.path.join(ROOT_DIR, "models"))
SEG_MODEL_PATH = os.path.join(MODELS_DIR, "model.onnx")
EMB_MODEL_PATH = os.path.join(MODELS_DIR, "3dspeaker_speech_campplus_sv_zh_en_16k-common_advanced.onnx")

SPEAKER_COLORS = [
    "#f6c48f",  # 1. Warm Pastel Peach
    "#fae084",  # 2. Soft Pastel Buttercup
    "#a3c9a8",  # 3. Muted Pastel Sage
    "#9ec5e8",  # 4. Powder Pastel Sky
    "#cbb2fe",  # 5. Soft Pastel Wisteria / Lavender
    "#f4a7bb",  # 6. Blush Pastel Rose
    "#9ae3d1",  # 7. Minty Pastel Seafoam
    "#d2b48c",  # 8. Warm Pastel Sand / Tan
    "#b4c596",  # 9. Muted Pastel Olive
    "#b6c2f8",  # 10. Soft Pastel Periwinkle
]

def cosine_similarity(a: List[float], b: List[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    norm_a = np.linalg.norm(va)
    norm_b = np.linalg.norm(vb)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(va, vb) / (norm_a * norm_b))

class DiarizerService:
    _instance = None

    def __init__(self):
        if not os.path.exists(SEG_MODEL_PATH) or not os.path.exists(EMB_MODEL_PATH):
            raise FileNotFoundError(
                f"Model files missing. Ensure {SEG_MODEL_PATH} and {EMB_MODEL_PATH} exist."
            )

        # 1. Segmentation Config
        seg_cfg = sherpa_onnx.OfflineSpeakerSegmentationModelConfig(
            pyannote=sherpa_onnx.OfflineSpeakerSegmentationPyannoteModelConfig(model=SEG_MODEL_PATH),
            num_threads=2,
            provider="cpu"
        )

        # 2. Embedding Extractor Config
        self.emb_cfg = sherpa_onnx.SpeakerEmbeddingExtractorConfig(
            model=EMB_MODEL_PATH,
            num_threads=2,
            provider="cpu"
        )
        self.extractor = sherpa_onnx.SpeakerEmbeddingExtractor(self.emb_cfg)

        # 3. Clustering Config
        cluster_cfg = sherpa_onnx.FastClusteringConfig(num_clusters=-1, threshold=0.55)

        # 4. Diarization Pipeline
        self.diarizer_cfg = sherpa_onnx.OfflineSpeakerDiarizationConfig(
            segmentation=seg_cfg,
            embedding=self.emb_cfg,
            clustering=cluster_cfg,
            min_duration_on=0.3,
            min_duration_off=0.5
        )
        self.diarizer = sherpa_onnx.OfflineSpeakerDiarization(self.diarizer_cfg)

    @classmethod
    def get_instance(cls) -> "DiarizerService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def extract_embedding_from_samples(self, audio_slice: np.ndarray, sample_rate: int = 16000) -> Optional[List[float]]:
        """Extracts 192-dim speaker embedding vector from raw audio array."""
        if len(audio_slice) < int(0.4 * sample_rate):  # Need at least 400ms
            return None
        try:
            stream = self.extractor.create_stream()
            stream.accept_waveform(sample_rate, audio_slice.tolist())
            stream.input_finished()
            emb = self.extractor.compute(stream)
            if emb and len(emb) > 0:
                return [float(x) for x in emb]
        except Exception as e:
            print(f"Error extracting embedding: {e}")
        return None

    def diarize_and_match(
        self,
        samples: np.ndarray,
        sample_rate: int = 16000,
        similarity_threshold: float = 0.58,
        progress_callback: Optional[Callable[[int, int], None]] = None
    ) -> Dict[str, Any]:
        """
        Runs speaker diarization on audio samples, computes speaker embeddings,
        and matches against enrolled voice profiles.
        """
        # Internal callback for sherpa-onnx
        def _cb(processed: int, total: int) -> int:
            if progress_callback:
                progress_callback(processed, total)
            return 0  # 0 means continue

        res = self.diarizer.process(samples.tolist(), callback=_cb)
        raw_segments = res.sort_by_start_time()

        # Group audio chunks by speaker to compute a representative voice embedding
        speaker_samples: Dict[int, List[np.ndarray]] = {}
        diarized_intervals = []

        for seg in raw_segments:
            diarized_intervals.append({
                "start": round(seg.start, 2),
                "end": round(seg.end, 2),
                "cluster_id": seg.speaker
            })
            start_idx = int(seg.start * sample_rate)
            end_idx = min(len(samples), int(seg.end * sample_rate))
            if end_idx - start_idx > int(0.5 * sample_rate):
                chunk = samples[start_idx:end_idx]
                speaker_samples.setdefault(seg.speaker, []).append(chunk)

        # Enrolled voice profiles from database
        voice_profiles = get_all_voice_profiles()

        # Compute embedding per speaker cluster and find profile matches
        speaker_map: Dict[int, Dict[str, Any]] = {}
        color_idx = 0

        for spk_id, chunks in speaker_samples.items():
            # Combine up to 15 seconds of audio for highest fidelity embedding
            combined = []
            total_samples = 0
            for c in chunks:
                combined.append(c)
                total_samples += len(c)
                if total_samples >= 15 * sample_rate:
                    break

            combined_audio = np.concatenate(combined) if combined else np.array([], dtype=np.float32)
            embedding = self.extract_embedding_from_samples(combined_audio, sample_rate)

            # Match with enrolled voice profiles
            matched_profile = None
            best_score = -1.0
            if embedding and voice_profiles:
                for vp in voice_profiles:
                    score = cosine_similarity(embedding, vp["embedding"])
                    if score > best_score:
                        best_score = score
                        if score >= similarity_threshold:
                            matched_profile = vp

            if matched_profile:
                speaker_name = matched_profile["name"]
                speaker_color = matched_profile.get("color", SPEAKER_COLORS[color_idx % len(SPEAKER_COLORS)])
                profile_id = matched_profile["id"]
            else:
                speaker_name = f"Speaker {spk_id + 1}"
                speaker_color = SPEAKER_COLORS[color_idx % len(SPEAKER_COLORS)]
                profile_id = None
            color_idx += 1

            speaker_map[spk_id] = {
                "id": f"spk_{spk_id}",
                "cluster_id": spk_id,
                "label": speaker_name,
                "color": speaker_color,
                "profile_id": profile_id,
                "match_confidence": round(best_score, 3) if best_score > 0 else None,
                "embedding": embedding
            }

        # If no speakers detected, default to Speaker 1
        if not speaker_map:
            speaker_map[0] = {
                "id": "spk_0",
                "cluster_id": 0,
                "label": "Speaker 1",
                "color": SPEAKER_COLORS[0],
                "profile_id": None,
                "match_confidence": None,
                "embedding": None
            }

        # Attach assigned speaker label and color to intervals
        enriched_intervals = []
        for interval in diarized_intervals:
            spk_info = speaker_map.get(interval["cluster_id"], speaker_map[0])
            enriched_intervals.append({
                "start": interval["start"],
                "end": interval["end"],
                "speaker_id": spk_info["id"],
                "speaker_label": spk_info["label"],
                "speaker_color": spk_info["color"]
            })

        return {
            "speakers": list(speaker_map.values()),
            "intervals": enriched_intervals
        }
