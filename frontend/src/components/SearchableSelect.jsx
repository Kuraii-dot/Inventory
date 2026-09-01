import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import AppIcon from './AppIcon.jsx';

function stockClass(quantity) {
  return Number(quantity) <= 10
    ? 'bg-red-50 text-red-700 border-red-200'
    : 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

export default function SearchableSelect({
  value = '', onChange, options = [], placeholder = 'Select an option',
  searchPlaceholder = 'Type to search...', disabled = false, required = false,
  name, id, className = '', allowEmpty = true, emptyLabel,
}) {
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuStyle, setMenuStyle] = useState({});

  const normalized = useMemo(() => options.map(option => ({
    ...option,
    value: String(option.value ?? ''),
    label: String(option.label ?? ''),
  })), [options]);
  const selected = normalized.find(option => option.value === String(value ?? ''));
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return normalized;
    return normalized.filter(option =>
      `${option.label} ${option.keywords || ''}`.toLowerCase().includes(needle)
    );
  }, [normalized, query]);

  function positionMenu() {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const longestLabel = normalized.reduce((length, option) => Math.max(length, option.label.length), 0);
    const hasStockBadges = normalized.some(option => option.stock !== undefined);
    const preferredWidth = (longestLabel * 7.5) + (hasStockBadges ? 132 : 72);
    const width = Math.min(
      Math.max(0, window.innerWidth - 24),
      Math.max(rect.width, Math.min(520, preferredWidth)),
    );
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, window.innerWidth - width - 12),
    );
    const roomBelow = window.innerHeight - rect.bottom;
    const openAbove = roomBelow < 250 && rect.top > roomBelow;
    setMenuStyle({
      position: 'fixed', left, width,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + 6, maxHeight: Math.min(280, rect.top - 18) }
        : { top: rect.bottom + 6, maxHeight: Math.min(280, roomBelow - 18) }),
      zIndex: 1200,
    });
  }

  useEffect(() => {
    if (!open) return undefined;
    positionMenu();
    const reposition = () => positionMenu();
    const closeOutside = event => {
      if (!rootRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    document.addEventListener('mousedown', closeOutside);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      document.removeEventListener('mousedown', closeOutside);
    };
  }, [open]);

  function openMenu() {
    if (disabled) return;
    setQuery('');
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function choose(nextValue) {
    onChange?.(String(nextValue));
    setOpen(false);
    setQuery('');
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') { setOpen(false); setQuery(''); return; }
    if (event.key === 'ArrowDown') { event.preventDefault(); openMenu(); return; }
    if (event.key === 'Enter' && open && filtered.length) {
      event.preventDefault();
      choose(filtered[0].value);
    }
  }

  const shownValue = open ? query : (selected?.label || '');
  const menu = open && createPortal(
    <div ref={menuRef} style={menuStyle} role="listbox"
      className="overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,31,68,0.22)]">
      {allowEmpty && !query && (
        <button type="button" onMouseDown={event => event.preventDefault()} onClick={() => choose('')}
          className="flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm text-slate-500 hover:bg-slate-50">
          {emptyLabel || placeholder}
        </button>
      )}
      {filtered.length === 0 ? (
        <div className="px-3 py-5 text-center text-sm text-slate-400">No matching options</div>
      ) : filtered.map(option => (
        <button key={option.value} type="button" disabled={option.disabled} role="option"
          aria-selected={option.value === String(value ?? '')}
          onMouseDown={event => event.preventDefault()} onClick={() => choose(option.value)}
          className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
            option.value === String(value ?? '') ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-700 hover:bg-slate-50'
          }`}>
          <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">{option.label}</span>
          {option.stock !== undefined && (
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${stockClass(option.stock)}`}>
              Stock: {option.stock}
            </span>
          )}
          {option.value === String(value ?? '') && <AppIcon name="check" size={15} className="mt-0.5 shrink-0" />}
        </button>
      ))}
    </div>,
    document.body
  );

  return (
    <div ref={rootRef} className={`relative w-full ${className}`}>
      <input ref={inputRef} id={id} name={name} type="text" autoComplete="off"
        value={shownValue} required={required} disabled={disabled}
        title={selected?.label || ''}
        placeholder={open ? searchPlaceholder : placeholder}
        onFocus={openMenu}
        onClick={openMenu}
        onChange={event => { setQuery(event.target.value); if (!open) setOpen(true); }}
        onKeyDown={handleKeyDown}
        className="min-h-[42px] w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-10 text-sm text-slate-800 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        role="combobox" aria-expanded={open} aria-haspopup="listbox" aria-autocomplete="list" />
      <button type="button" tabIndex={-1} disabled={disabled} onClick={openMenu}
        aria-label="Open dropdown"
        className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-500 hover:text-blue-600 disabled:text-slate-300">
        <AppIcon name="chevronDown" size={17} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {menu}
    </div>
  );
}
