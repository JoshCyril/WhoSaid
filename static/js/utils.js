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

  const DEFAULT_AI_PROMPT = `Please provide a comprehensive summary of the following meeting/video transcript.
Highlight the main discussion points, key decisions made, and action items assigned to each speaker.`;

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

  function getDicebearAvatarUrl(seed, colorHex = "#f6c48f") {
    if (window.CameoAvatar && typeof window.CameoAvatar.renderDataUri === "function") {
      return window.CameoAvatar.renderDataUri(seed, colorHex);
    }
    const s = encodeURIComponent((seed || "speaker").trim());
    const c = (colorHex || "#f6c48f").replace("#", "").trim();
    return `https://api.dicebear.com/10.x/cameo/svg?seed=${s}&color=${c}&backgroundColor=transparent`;
  }

  function getDicebearAvatarHtml(name, id, color = "#f6c48f", size = 26, avatarSeed = null) {
    const seed = (avatarSeed || name || id || "speaker").trim();
    const url = getDicebearAvatarUrl(seed, color);
    const initial = (name || id || "S").charAt(0).toUpperCase();
    return `
      <span class="speaker-avatar-wrap" style="width:${size}px;height:${size}px;min-width:${size}px;min-height:${size}px;max-width:${size}px;max-height:${size}px;background:transparent;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;" title="${escapeHtml(name || id)}">
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
