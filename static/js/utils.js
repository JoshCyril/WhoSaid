/**
 * WhoSaid Client Engine — Utilities & Theme Tokens
 * Provides 100% offline avatar rendering, time & file formatters, and HTML sanitization.
 */

window.WhoSaidUtils = (function () {
  const PALETTE = [
    "#fb7185", "#2dd4bf", "#fbbf24", "#c084fc", "#4ade80",
    "#f472b6", "#38bdf8", "#f97316", "#a3e635", "#818cf8"
  ];

  const CAMEO_PRESETS = ["Felix", "Daisy", "Jack", "Willow", "Leo", "Maya", "Milo", "Zoe"];

  const DEFAULT_AI_PROMPT = `You are summarizing an engineering meeting for a team building automation and
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
>>>`;

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getDicebearAvatarUrl(seed, colorHex = "#38bdf8") {
    if (window.GazeAvatar && typeof window.GazeAvatar.renderDataUri === "function") {
      return window.GazeAvatar.renderDataUri(seed, colorHex);
    }
    if (window.CameoAvatar && typeof window.CameoAvatar.renderDataUri === "function") {
      return window.CameoAvatar.renderDataUri(seed, colorHex);
    }
    const s = encodeURIComponent((seed || "speaker").trim());
    const c = (colorHex || "#38bdf8").replace("#", "").trim();
    return `https://api.dicebear.com/10.x/gaze/svg?seed=${s}&color=${c}&backgroundColor=transparent`;
  }

  function getDicebearAvatarHtml(name, id, color = "#38bdf8", size = 26, avatarSeed = null, isSpeaking = false) {
    if (window.GazeAvatar && typeof window.GazeAvatar.renderHtml === "function") {
      return window.GazeAvatar.renderHtml(name, id, color, size, avatarSeed, isSpeaking);
    }
    const seed = (avatarSeed || name || id || "speaker").trim();
    const url = getDicebearAvatarUrl(seed, color);
    const initial = (name || id || "S").charAt(0).toUpperCase();
    const spkClass = isSpeaking ? "is-speaking" : "";
    return `
      <span class="speaker-avatar-wrap ${spkClass}" data-speaker-id="${escapeHtml(id || '')}" style="width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;max-width:${size}px;max-height:${size}px;background:transparent;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;" title="${escapeHtml(name || id)}">
        <img class="speaker-avatar-img" width="${size}" height="${size}" src="${url}" alt="${escapeHtml(name || id)}" loading="lazy" style="width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;max-width:${size}px;max-height:${size}px;object-fit:contain;display:block;" onerror="this.style.display='none'; if (this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
        <span class="speaker-avatar-fallback" style="background:transparent; color:${color}; display:none;">${initial}</span>
      </span>
    `;
  }

  function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconSvg = "";
    if (type === "success") {
      iconSvg = `<svg class="w-4 h-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
    } else if (type === "error" || type === "danger") {
      iconSvg = `<svg class="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else if (type === "warning") {
      iconSvg = `<svg class="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
      iconSvg = `<svg class="w-4 h-4 text-brand-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      <div class="flex items-center gap-2">
        ${iconSvg}
        <span class="text-xs sm:text-sm font-medium leading-tight">${escapeHtml(message)}</span>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("toast-leaving");
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  return {
    PALETTE,
    CAMEO_PRESETS,
    DEFAULT_AI_PROMPT,
    formatTime,
    formatFileSize,
    escapeHtml,
    getDicebearAvatarUrl,
    getDicebearAvatarHtml,
    showToast
  };
})();
