// frontend/src/components/Modal.jsx
// Replaces: all modal HTML + openModal()/closeModal() JS functions from items.php
// PHP: opacity-0/pointer-events-none toggling via JS
// React: conditional render with backdrop

import AppIcon from './AppIcon.jsx';

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = 'max-w-2xl' }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[500] transition-opacity duration-300 p-4 md:p-6"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} relative animate-[modalSlideIn_0.3s_ease] max-h-[82dvh] overflow-hidden flex flex-col`}>
        <div className="relative shrink-0 px-5 py-4 pr-16 border-b border-slate-200 bg-white">
          {title && (
            <div>
              <h2 className="text-xl font-bold text-slate-800 leading-tight">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-1/2 right-4 -translate-y-1/2 w-9 h-9 grid place-items-center text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 bg-white hover:bg-red-50 rounded-lg transition-colors"
            aria-label="Close modal"
            title="Close"
          >
            <AppIcon name="x" size={19} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-5 py-5 md:px-6 md:py-5 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
