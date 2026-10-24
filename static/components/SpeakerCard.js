/**
 * Reusable Speaker Card / Chip Component
 * Displays speaker identification, editable label, segment metrics,
 * cameo face thumbnail, and merge controls with responsive layout.
 */
import { Icons } from './Icons.js';

export class SpeakerCard {
  /**
   * Render a speaker card
   * @param {Object} speaker
   * @param {string} speaker.id - e.g. "SPEAKER_00"
   * @param {string} speaker.name - Display name (e.g. "Alice")
   * @param {string} speaker.color - Hex or CSS color
   * @param {number} speaker.count - Number of speech segments
   * @param {number} speaker.duration - Total speaking duration in seconds
   * @param {string} [speaker.avatarUrl] - Optional Cameo face thumbnail data URL
   */
  static render(speaker) {
    const durationFormatted = speaker.duration 
      ? `${Math.floor(speaker.duration / 60)}m ${Math.floor(speaker.duration % 60)}s` 
      : '';

    return `
      <div class="speaker-card group relative bg-dark-surface/80 hover:bg-dark-surface border border-white/5 hover:border-brand-500/30 rounded-xl p-3.5 transition-all duration-150 flex flex-col gap-2.5" data-speaker-id="${speaker.id}">
        <div class="flex items-center justify-between gap-2">
          
          <!-- Avatar + Name -->
          <div class="flex items-center gap-2.5 min-w-0">
            ${speaker.avatarUrl ? `
              <img src="${speaker.avatarUrl}" alt="${speaker.name}" class="w-8 h-8 rounded-full object-cover border border-white/20 shrink-0" />
            ` : `
              <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-slate-900 shadow-sm" style="background-color: ${speaker.color || '#38bdf8'}">
                ${(speaker.name || speaker.id || 'S').substring(0, 2).toUpperCase()}
              </div>
            `}
            
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="speaker-display-name text-sm font-semibold text-white truncate cursor-pointer hover:text-brand-300" title="Click to rename" data-action="rename-speaker" data-id="${speaker.id}">
                  ${speaker.name || speaker.id}
                </span>
                <button type="button" class="text-dark-muted hover:text-white p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity" data-action="rename-speaker" data-id="${speaker.id}" title="Rename">
                  ${Icons.edit('w-3 h-3')}
                </button>
              </div>
              <span class="text-xs text-dark-muted font-mono truncate block">${speaker.id}</span>
            </div>
          </div>

          <!-- Segment / Duration Pill -->
          <div class="text-right shrink-0">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-dark-muted border border-white/5">
              ${speaker.count || 0} segs
            </span>
            ${durationFormatted ? `<div class="text-[10px] text-dark-subtle mt-0.5">${durationFormatted}</div>` : ''}
          </div>
        </div>

        <!-- Quick Actions Footer -->
        <div class="flex items-center justify-between pt-1.5 border-t border-white/5 text-xs text-dark-muted">
          <button type="button" class="hover:text-brand-300 flex items-center gap-1 transition-colors" data-action="filter-speaker" data-id="${speaker.id}">
            ${Icons.search('w-3 h-3')}
            <span>Filter</span>
          </button>
          
          <button type="button" class="hover:text-amber-300 flex items-center gap-1 transition-colors" data-action="merge-speaker" data-id="${speaker.id}">
            ${(typeof Icons !== 'undefined' && Icons.merge ? Icons.merge('w-3 h-3') : '')}
            <span>Merge</span>
          </button>
        </div>
      </div>
    `;
  }
}

if (typeof window !== "undefined") {
  window.WhoSaidComponents = window.WhoSaidComponents || {};
  window.WhoSaidComponents.SpeakerCard = SpeakerCard;
}
