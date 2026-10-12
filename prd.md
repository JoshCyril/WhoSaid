## RPD: Local Video Transcriber with Speaker Captions

### 1. Goal

A local web app that takes a video file, transcribes it, identifies who is speaking, and plays it back with synced captions that show speaker names. It also shows a waveform. Everything runs on CPU, with no cloud calls.

### 2. Scope

**In:** upload a file, offline processing, a player with synced captions, a waveform with speaker-colored segments, renaming speakers, enrolling known voices, and exporting SRT/VTT/JSON.**Out (v1):** real-time mic or stream capture, multi-user acCPU ts, GPU support, and translation.

### 3. Functional requirements

| #   | Requirement                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Upload mp4/mkv/mov/webm/mp3/wav. Audio is extracted with ffmpeg.                                                                                                |
| F2  | Transcription with word-level timestamps.                                                                                                                       |
| F3  | Speaker diarization that assigns each segment to Speaker 1, 2, 3 and so on.                                                                                     |
| F4  | Voice profiles: enroll a name from a short sample (or from a diarized speaker), then auto-match it in later files. Unmatched speakers fall back to “Speaker N”. |
| F5  | Rename a speaker in the UI. The change applies across the whole transcript and can be saved as a voice profile.                                                 |
| F6  | Player with a caption overlay in the form “ text”, highlighting the current word or line.                                                                       |
| F7  | Waveform synced with the player, with colored speaker regions. Click to seek.                                                                                   |
| F8  | Transcript panel: click a line to jump to it, and edit text inline.                                                                                             |
| F9  | Progress indicator while processing. Results are cached so reopening a file is instant.                                                                         |
| F10 | Export SRT, VTT (with speaker names) and JSON.                                                                                                                  |

### 4. Non-functional requirements

- **CPU only, fully offline** after the one-time model download.
- **Speed target:** about 1x real time or better on a modern 8-core CPU with the small model (to be validated).
- **Memory:** under 8 GB for the default configuration.
- **Privacy:** files and voice profiles never leave the machine.
- **Accuracy:** an adjustable model size (tiny/base/small/medium) so you can trade speed for quality.

### 5. Proposed stack (my recommendation, open to change)

- **Backend:** Python with FastAPI, and a background job queue with progress over WebSocket or SSE.
- **ASR:** faster-whisper (CTranslate2, int8) for good CPU speed.
- **Diarization and voice ID:** sherpa-onnx (segmentation plus speaker embeddings, CPU-friendly, no access token). Voice profiles are stored embeddings matched by cosine similarity. The alternative is pyannote, which is more accurate but heavier on CPU and needs a Hugging Face token.
- **Frontend:** a plain HTML5 `<video>` element, wavesurfer.js with the Regions plugin, and a custom caption overlay driven by the transcript JSON.
- **Storage:** local folder with SQLite for jobs and profiles, plus one JSON file per transcript.

### 6. Key risks

- **Diarization on overlapping speech** is the weakest link on any engine. Expect some mislabeled segments, so the rename and reassign tools matter.
- **Long files on CPU:** a 2-hour video can take a while, so chunked processing and a resumable progress state are needed.
- **Voice matching** needs enough clean audio per person (roughly 10-30 seconds). Short or noisy samples will match unreliably.

### 7. Milestones

1. **M1:** ffmpeg, then transcript JSON from the CLI.
2. **M2:** diarization merged with the transcript.
3. **M3:** web UI with player, synced captions and waveform.
4. **M4:** rename, voice enrollment and matching.
5. **M5:** exports, caching and polish.
