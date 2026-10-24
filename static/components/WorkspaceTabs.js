/**
 * Reusable Responsive Workspace Tabs Component
 * Horizontally scrollable on mobile/tablet, full tab strip on desktop.
 */
import { Icons } from './Icons.js';

export class WorkspaceTabs {
  /**
   * Render tab strip
   * @param {Array<{id: string, label: string, icon?: string, badge?: number|string}>} tabs
   * @param {string} activeTabId
   */
  static render(tabs, activeTabId) {
    return `
      <div class="flex items-center gap-1 overflow-x-auto no-scrollbar py-1 px-1 border-b border-white/10 bg-dark-surface/40">
        ${tabs.map(tab => {
          const isActive = tab.id === activeTabId;
          const iconSvg = tab.icon && Icons[tab.icon] ? Icons[tab.icon]('w-4 h-4') : '';
          const activeClasses = isActive 
            ? 'bg-white/10 text-white font-medium border-white/20 shadow-sm' 
            : 'text-dark-muted hover:text-white hover:bg-white/5 border-transparent';
          
          return `
            <button 
              type="button" 
              class="ws-tab-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap transition-all border ${activeClasses}"
              data-tab-target="${tab.id}"
            >
              ${iconSvg}
              <span>${tab.label}</span>
              ${tab.badge !== undefined && tab.badge !== null ? `
                <span class="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-brand-500/20 text-brand-300 font-mono">${tab.badge}</span>
              ` : ''}
            </button>
          `;
        }).join('')}
      </div>
    `;
  }

  /**
   * Bind tab click events
   * @param {HTMLElement|string} container - Container element or selector
   * @param {Function} onTabChange - Callback (tabId) => void
   */
  static bind(container, onTabChange) {
    const root = typeof container === 'string' ? document.querySelector(container) : container;
    if (!root) return;

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tab-target]');
      if (!btn) return;
      
      const tabId = btn.getAttribute('data-tab-target');
      
      // Update visual active state
      root.querySelectorAll('[data-tab-target]').forEach(b => {
        b.classList.remove('bg-white/10', 'text-white', 'border-white/20', 'shadow-sm');
        b.classList.add('text-dark-muted', 'border-transparent');
      });
      btn.classList.add('bg-white/10', 'text-white', 'border-white/20', 'shadow-sm');
      btn.classList.remove('text-dark-muted', 'border-transparent');

      if (typeof onTabChange === 'function') {
        onTabChange(tabId);
      }
    });
  }
}

if (typeof window !== "undefined") {
  window.WhoSaidComponents = window.WhoSaidComponents || {};
  window.WhoSaidComponents.WorkspaceTabs = WorkspaceTabs;
}
