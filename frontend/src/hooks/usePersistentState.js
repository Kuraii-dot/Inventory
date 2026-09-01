import { useEffect, useState } from 'react';

export default function usePersistentState(storageKey, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === null ? initialValue : JSON.parse(saved);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(value)); }
    catch { /* Storage can be unavailable in restricted browser contexts. */ }
  }, [storageKey, value]);

  return [value, setValue];
}
