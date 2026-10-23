/**
 * Reusable History Session Card Component
 * Renders previous transcription sessions in a responsive card with quick load/delete/export triggers.
 */
import { Icons } from './Icons.js';

export class HistoryCard {
  /**
   * Render history session card
   * @param {Object} session
   * @param {string} session.id - Unique session ID
   * @param {string} session.filename - Media file name
   * @param {string} session.createdAt - Date string
   * @param {number} [session.duration] - Audio duration in seconds
   * @param {number} [session.speakerCount] - Number of detected speakers
   * @param {number} [session.segmentCount] - Number of segments
   */
  static render(session) {
    const formattedDate = session.createdAt ? new Date(session.createdAt).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Recent';

    const durationStr = session.duration 
      ? `${Math.floor(session.duration / 60)}:${Math.floor(session.duration % 60).toString().padStart(2, '0')}`
      : '--:--';

    return `
      <div class="history-item group relative bg-dark-surface/60 hover:bg-dark-surface border border-white/5 hover:border-brand-500/30 rounded-xl p-3 sm:p-4 transition-all duration-150 flex flex-col gap-2" data-session-id="${session.id}">
        <div class="flex items-start justify-between gap-3">
          
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
              ${Icons.fileVideo('w-4 h-4')}
            </div>
            <div class="min-w-0">
              <h4 class="text-sm font-semibold text-white truncate group-hover:text-brand-300 transition-colors cursor-pointer" data-action="load-session" data-id="${session.id}">
                ${session.filename || 'Untitled Media'}
              </h4>
              <span class="text-xs text-dark-muted block mt-0.5">${formattedDate} &bull; ${durationStr}</span>
            </div>
          </div>

          <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button type="button" class="ws-btn-icon text-red-400/80 hover:text-red-400 hover:bg-red-500/10" data-action="delete-session" data-id="${session.id}" title="Delete session">
              ${Icons.trash('w-3.5 h-3.5')}
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-dark-muted pt-1 border-t border-white/5">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-white/5 text-[11px]">${session.speakerCount || 0} Speakers</span>
            <span class="px-2 py-0.5 rounded bg-white/5 text-[11px]">${session.segmentCount || 0} Segments</span>
          </div>

          <button type="button" class="text-brand-400 hover:text-brand-300 font-medium text-xs flex items-center gap-1" data-action="load-session" data-id="${session.id}">
            <span>Open</span>
            ${Icons.chevronRight('w-3 h-3')}
          </button>
        </div>
      </div>
    `;
  }
}
