import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Search } from 'lucide-react';
import { getAllNavItems } from '../adminNavConfig';
import type { NavSection } from '../adminNavConfig';

type AdminNavSearchProps = {
  sidebarOpen: boolean;
  sections?: NavSection[];
  onSelect?: () => void;
};

export function AdminNavSearch({ sidebarOpen, sections, onSelect }: AdminNavSearchProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [location] = useLocation();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const items = useMemo(() => getAllNavItems(sections), [sections]);
  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 10);
    const q = query.trim().toLowerCase();
    return items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) || it.path.toLowerCase().includes(q)
    );
  }, [query, items]);

  const handleSelect = useCallback(() => {
    setQuery('');
    setFocused(false);
    onSelect?.();
  }, [onSelect]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setFocused(true);
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setFocused(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  if (!sidebarOpen) return null;

  return (
    <div className="relative px-2 pb-2">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="חיפוש דף... (Ctrl+K)"
          className="admin-input w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-700/80 border border-slate-600 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {focused && (
        <div className="absolute top-full left-2 right-2 mt-1 max-h-64 overflow-y-auto rounded-lg border border-slate-600 bg-slate-800 shadow-lg z-50">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-slate-400">לא נמצאו תוצאות</div>
          ) : (
            <ul className="py-1">
              {filtered.map(({ path, label, icon: Icon }) => (
                <li key={path}>
                  <Link
                    href={path}
                    onClick={handleSelect}
                    className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-slate-700/80 transition-colors ${
                      location === path || (path !== '/admin' && location.startsWith(path))
                        ? 'text-indigo-400 bg-indigo-500/10'
                        : 'text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
