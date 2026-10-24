/**
 * Reusable Responsive Modal Component & Controller
 * Supports mobile bottom-sheet styling, centered tablet/desktop modal,
 * backdrop blur, animation classes, and keyboard accessibility (ESC).
 */
import { Icons } from './Icons.js';

export class Modal {
  /**
   * Render modal HTML structure
   * @param {Object} options
   * @param {string} options.id - Modal container ID
   * @param {string} options.title - Modal header title
   * @param {string} options.bodyHtml - Inner body content
   * @param {string} [options.footerHtml=''] - Optional footer buttons
   * @param {string} [options.maxWidth='max-w-xl'] - Max width class (e.g., max-w-md, max-w-2xl, max-w-4xl)
   * @param {string} [options.icon=''] - Optional icon key from Icons
   */
  static render({ id, title, bodyHtml, footerHtml = '', maxWidth = 'max-w-xl', icon = '' }) {
    const iconSvg = icon && Icons[icon] ? Icons[icon]('w-5 h-5 text-brand-400') : '';
    return `
      <div id="${id}" class="modal-wrapper fixed inset-0 z-50 hidden transition-opacity duration-200">
        <!-- Backdrop -->
        <div class="modal-backdrop fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" data-close-modal="${id}"></div>

        <!-- Modal Box: bottom sheet on mobile, centered card on tablet & laptop -->
        <div class="fixed inset-0 z-10 overflow-y-auto flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div class="modal-card relative w-full ${maxWidth} bg-dark-card border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transform transition-all duration-200 scale-95 sm:scale-100">
            
            <!-- Mobile Drag Indicator -->
            <div class="sm:hidden flex justify-center pt-2.5 pb-1">
              <div class="w-10 h-1 bg-white/20 rounded-full"></div>
            </div>

            <!-- Header -->
            <div class="flex items-center justify-between px-5 py-3.5 border-b border-white/10">
              <div class="flex items-center gap-2.5 min-w-0">
                ${iconSvg}
                <h3 class="text-base sm:text-lg font-semibold text-white truncate">${title}</h3>
              </div>
              <button type="button" class="ws-btn-icon text-dark-muted hover:text-white" data-close-modal="${id}" title="Close (Esc)">
                ${Icons.close('w-4 h-4')}
              </button>
            </div>

            <!-- Content Area -->
            <div class="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-sm text-dark-text">
              ${bodyHtml}
            </div>

            <!-- Optional Footer -->
            ${footerHtml ? `
              <div class="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-dark-surface/50 border-t border-white/10">
                ${footerHtml}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Open modal by ID
   */
  static open(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    // Focus first input or button if available
    setTimeout(() => {
      const focusable = el.querySelector('input:not([type="hidden"]), select, textarea, button:not([data-close-modal])');
      if (focusable) focusable.focus();
    }, 50);
  }

  /**
   * Close modal by ID
   */
  static close(modalId) {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.classList.add('hidden');
    
    // Check if any other modal is still open
    const openModals = document.querySelectorAll('.modal-wrapper:not(.hidden)');
    if (openModals.length === 0) {
      document.body.classList.remove('overflow-hidden');
    }
  }

  /**
   * Global event listener binder for modal open/close triggers and ESC key
   */
  static initGlobalListeners() {
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('[data-close-modal]');
      if (closeBtn) {
        const modalId = closeBtn.getAttribute('data-close-modal');
        Modal.close(modalId);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal-wrapper:not(.hidden)');
        openModals.forEach((m) => Modal.close(m.id));
      }
    });
  }
}

if (typeof window !== "undefined") {
  window.WhoSaidComponents = window.WhoSaidComponents || {};
  window.WhoSaidComponents.Modal = Modal;
}
