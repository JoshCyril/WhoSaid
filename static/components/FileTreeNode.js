/**
 * Reusable File Tree Node Component for Media Explorer
 */
import { Icons } from './Icons.js';

export class FileTreeNode {
  /**
   * Render file or folder item
   * @param {Object} item
   * @param {string} item.name
   * @param {string} item.path
   * @param {boolean} item.isDir
   * @param {boolean} [item.isActive=false]
   * @param {number} [item.level=0]
   */
  static render(item) {
    const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(item.name);
    const isAudio = /\.(wav|mp3|m4a|aac|flac|ogg)$/i.test(item.name);
    
    let iconSvg = Icons.fileAudio('w-4 h-4 text-emerald-400');
    if (item.isDir) {
      iconSvg = Icons.folder('w-4 h-4 text-amber-400');
    } else if (isVideo) {
      iconSvg = Icons.fileVideo('w-4 h-4 text-brand-400');
    }

    const activeCls = item.isActive 
      ? 'bg-brand-500/15 text-white border-l-2 border-brand-400' 
      : 'text-dark-muted hover:text-white hover:bg-white/5 border-l-2 border-transparent';

    return `
      <div 
        class="file-node flex items-center justify-between px-3 py-1.5 cursor-pointer rounded-r text-xs transition-colors duration-150 ${activeCls}"
        data-path="${item.path}"
        data-is-dir="${item.isDir ? 'true' : 'false'}"
        title="${item.path}"
      >
        <div class="flex items-center gap-2 min-w-0">
          <span class="shrink-0">${iconSvg}</span>
          <span class="truncate">${item.name}</span>
        </div>
        ${!item.isDir ? `
          <button 
            type="button" 
            class="action-play text-dark-subtle hover:text-brand-300 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" 
            data-action="play-media" 
            data-path="${item.path}" 
            title="Load media"
          >
            ${Icons.play('w-3 h-3')}
          </button>
        ` : ''}
      </div>
    `;
  }
}

if (typeof window !== "undefined") {
  window.WhoSaidComponents = window.WhoSaidComponents || {};
  window.WhoSaidComponents.FileTreeNode = FileTreeNode;
}
