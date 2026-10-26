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

DEFAULT_AI_PROMPT = """You are summarizing an engineering meeting for a team building automation and
back/middle-office systems for banks and fintech clients (reconciliation,
settlements, payments ops, reporting, onboarding/KYC, integrations).
The meeting mixes standup updates, dev demos, and bug-fix discussions.
Summarize the transcript in footnote [^1].

## Rules
- Be specific. Every bullet must carry a name, ticket ID, system, environment,
  number, or decision. Drop anything like "team discussed progress".
- Never invent names, IDs, dates, owners, or decisions. Write "not stated" if missing.
- Attribute updates, blockers, and actions to whoever said them.
- Keep ticket IDs, client names, versions, dates, and numbers exactly as spoken.
- Fix obvious speech-to-text errors (names, jargon, acronyms) from context;
  mark low-confidence guesses with (?).
- Skip small talk and repeats. Omit any section that has no content.
- Mark as **HIGH**: money movement, reconciliation breaks, client-facing reports,
  data accuracy, prod incidents, compliance/audit trail, SLA impact.

## Sections
1. **TL;DR** (max 3 lines): overall progress, biggest risk, what needs attention today.
2. **Updates**: per person. Done / Next / Blocker (write "None" if no blocker).
3. **Demos**: what was shown, by whom, feedback or concerns, outcome
   (approved / needs changes / follow-up).
4. **Bugs & fixes**: ID | issue | root cause | fix/status | owner | env | impact
5. **Decisions**: decision, who made it, reason if stated.
6. **Action items**: owner | task | due date | priority
7. **Risks & dependencies**: client/SLA exposure, release or deployment
   dependencies, bank/third-party API issues, security or data privacy concerns,
   unresolved blockers.
8. **Open questions**: what is unanswered and who should answer it.

## Output format
- Default: plain Markdown (headings, bullets, tables).
- If I mention "obsidian md": output Obsidian Markdown instead:
  - YAML frontmatter: date, type: meeting, attendees, project, tags
  - [[wikilinks]] for people, tickets, and clients
  - #tags for topics (e.g. #bugfix, #demo, #recon)
  - "- [ ]" checkboxes for action items, with owner and due date inline
  - callouts for HIGH items, e.g. > [!warning] and > [!question] for open questions

[^1]: TRANSCRIPT
<<<
<PASTE TRANSCRIPT HERE>
>>>"""

def export_ai_summary(transcript_data: Dict[str, Any], ai_prompt: str = None) -> str:
    prompt = (ai_prompt or "").strip()
    if not prompt:
        prompt = DEFAULT_AI_PROMPT

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
    raw_transcript_lines = []
    for seg in segments:
        spk = seg.get("speaker_label", "Speaker")
        start_ts = format_timestamp_simple(seg.get("start", 0))
        end_ts = format_timestamp_simple(seg.get("end", 0))
        text = seg.get("text", "").strip()
        transcript_block.append(f"{spk} [{start_ts} - {end_ts}]:")
        transcript_block.append(f"  {text}\n")
        raw_transcript_lines.append(f"{spk} [{start_ts} - {end_ts}]:\n  {text}\n")

    if "<PASTE TRANSCRIPT HERE>" in prompt:
        rendered_prompt = prompt.replace("<PASTE TRANSCRIPT HERE>", "".join(raw_transcript_lines).strip())
        return "\n".join(summary_block) + "\n\n" + rendered_prompt

    return f"{prompt}\n\n" + "\n".join(summary_block) + "\n\n" + "\n".join(transcript_block)
