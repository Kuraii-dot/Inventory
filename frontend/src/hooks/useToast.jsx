// frontend/src/hooks/useToast.js
// Replaces: showToast() function in front/js/items.js
// PHP showed inline alert divs; vanilla JS used DOM-injected toasts.
// React version uses state-driven toasts rendered in a portal.

import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    // mirrors: setTimeout(() => toast.remove(), 4000) in items.js
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  return { toasts, showToast };
}

// ToastContainer component — replaces the .toast-container DOM element
export function ToastContainer({ toasts }) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`
            px-4 py-3 rounded-lg font-medium text-white shadow-lg min-w-[200px] text-center
            animate-[slideIn_0.3s_ease]
            ${t.type === 'success' ? 'bg-green-600' : 'bg-red-600'}
          `}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}