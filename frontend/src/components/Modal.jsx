// frontend/src/components/Modal.jsx
// Replaces: all modal HTML + openModal()/closeModal() JS functions from items.php
// PHP: opacity-0/pointer-events-none toggling via JS
// React: conditional render with backdrop

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = 'max-w-2xl' }) {
  if (!open) return null;

  return (
    // backdrop — mirrors: modal-backdrop class with backdrop-filter blur
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* modal-content — mirrors: modal-content animation class */}
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} relative p-8 animate-[modalSlideIn_0.3s_ease] max-h-[90vh] overflow-y-auto`}>

        {/* Close button — mirrors: &times; button in every modal */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-2xl font-bold transition-colors leading-none"
        >
          &times;
        </button>

        {/* Header */}
        {title && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}