import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Search, Plus } from 'lucide-react';

const FRUIT_EMOJIS: Record<string, string> = {
  mango: '🥭', apple: '🍎', banana: '🍌', pomegranate: '🫐', grapes: '🍇',
  citrus: '🍊', watermelon: '🍉', orange: '🍊', lemon: '🍋', pineapple: '🍍',
  strawberry: '🍓', cherry: '🍒', peach: '🍑', pear: '🍐', kiwi: '🥝',
  coconut: '🥥', papaya: '🥭', guava: '🥝', fig: '🫐', plum: '🫐',
};

const getEmoji = (name: string): string => {
  const lower = name.toLowerCase();
  for (const [key, emoji] of Object.entries(FRUIT_EMOJIS)) {
    if (lower.includes(key)) return emoji;
  }
  return '🍃';
};

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  creatable?: boolean;
  onCreate?: (newValue: string) => void;
  className?: string;
  disabled?: boolean;
  showEmoji?: boolean;
  id?: string;
  'data-cell'?: string;
  'data-pinv-cell'?: string;
  'data-inv-cell'?: string;
}

export const Combobox: React.FC<ComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  creatable = true,
  onCreate,
  className = '',
  disabled = false,
  showEmoji = true,
  ...restProps
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const popoverId = useRef(`cb-${Math.random().toString(36).substr(2, 6)}`).current;

  const filteredOptions = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter(opt => opt.toLowerCase().includes(q));
  }, [options, query]);

  const hasExactMatch = useMemo(() => {
    return options.some(opt => opt.toLowerCase() === query.toLowerCase().trim());
  }, [options, query]);

  const showCreateOption = creatable && query.trim().length > 0 && !hasExactMatch;
  const totalCount = filteredOptions.length + (showCreateOption ? 1 : 0);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      // Reset search on open
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 30);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  const handleSelect = useCallback((selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setQuery('');
  }, [onChange]);

  const handleCreate = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onCreate?.(trimmed);
    onChange(trimmed);
    setIsOpen(false);
    setQuery('');
  }, [query, onCreate, onChange]);

  // Close on outside clicks
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      const popover = document.getElementById(popoverId);
      if (popover?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, popoverId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % totalCount);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + totalCount) % totalCount);
        break;
      case 'Enter':
        e.preventDefault();
        e.stopPropagation();
        if (showCreateOption && activeIndex === filteredOptions.length) {
          handleCreate();
        } else if (filteredOptions[activeIndex] !== undefined) {
          handleSelect(filteredOptions[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeItem = listRef.current.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement;
    activeItem?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const popoverStyle = useMemo(() => {
    if (!rect) return {};
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < 240;
    return {
      position: 'fixed' as const,
      left: rect.left,
      width: Math.max(rect.width, 200),
      zIndex: 999999,
      ...(flipUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }
      ),
    };
  }, [rect]);

  const emoji = showEmoji && value ? getEmoji(value) : null;

  return (
    <div className="relative w-full font-sans">
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={[
          'group flex items-center justify-between w-full',
          'bg-white dark:bg-slate-950',
          'border border-slate-200 dark:border-slate-800',
          'rounded-lg px-3 py-2 text-sm shadow-sm',
          'hover:border-slate-300 dark:hover:border-slate-700',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-400/60 dark:focus:border-emerald-500/40',
          'transition-all duration-200 text-left cursor-pointer',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        ].join(' ')}
        {...restProps}
      >
        <span className="truncate flex items-center gap-2">
          {emoji && (
            <span className="text-sm leading-none shrink-0">{emoji}</span>
          )}
          {value
            ? <span className="text-slate-800 dark:text-slate-100 font-medium">{value}</span>
            : <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>
          }
        </span>
        <ChevronsUpDown className={[
          'w-3.5 h-3.5 ml-2 shrink-0 transition-colors duration-200',
          isOpen
            ? 'text-emerald-500/70 dark:text-emerald-400/60'
            : 'text-slate-400/60 dark:text-slate-500/50 group-hover:text-slate-500 dark:group-hover:text-slate-400',
        ].join(' ')} />
      </button>

      {isOpen && rect && createPortal(
        <div
          id={popoverId}
          style={popoverStyle}
          className={[
            'rounded-xl border overflow-hidden z-[999999]',
            'bg-white/98 dark:bg-slate-950/98 backdrop-blur-xl',
            'border-slate-200/80 dark:border-slate-800/80',
            'shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12),0_2px_8px_-2px_rgba(0,0,0,0.06)]',
            'dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.4),0_2px_8px_-2px_rgba(0,0,0,0.2)]',
            'animate-in fade-in slide-in-from-top-1 duration-150 ease-out font-sans',
          ].join(' ')}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800/80">
            <Search className="w-3.5 h-3.5 text-slate-400/70 dark:text-slate-500/60 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none py-0.5"
            />
            {query && (
              <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                {filteredOptions.length}
              </span>
            )}
          </div>

          {/* Options list */}
          <div
            ref={listRef}
            className="max-h-64 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent"
          >
            {filteredOptions.length === 0 && !showCreateOption ? (
              <div className="py-7 text-center">
                <div className="text-xs text-slate-400 dark:text-slate-500">
                  No results{query ? ` for "${query}"` : ''}
                </div>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt === value;
                const isActive = idx === activeIndex;
                const optEmoji = showEmoji ? getEmoji(opt) : null;

                return (
                  <div
                    key={opt}
                    data-idx={idx}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={[
                      'flex items-center justify-between px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-all duration-150 mb-0.5 last:mb-0 border',
                      isActive
                        ? 'bg-emerald-500/8 dark:bg-emerald-500/10 border-emerald-400/15 dark:border-emerald-500/12'
                        : isSelected
                        ? 'bg-emerald-500/6 dark:bg-emerald-500/8 border-emerald-400/20 dark:border-emerald-500/15'
                        : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/60',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-2 truncate">
                      {optEmoji && (
                        <span className="text-sm leading-none shrink-0">{optEmoji}</span>
                      )}
                      <span className={[
                        'truncate',
                        isSelected || isActive
                          ? 'font-medium text-emerald-700 dark:text-emerald-300'
                          : 'font-normal text-slate-700 dark:text-slate-200',
                      ].join(' ')}>
                        {opt}
                      </span>
                    </span>
                    {isSelected && (
                      <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-2 bg-emerald-500/10 dark:bg-emerald-500/12">
                        <Check className="w-2.5 h-2.5 stroke-2 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {showCreateOption && (
              <div
                data-idx={filteredOptions.length}
                onClick={handleCreate}
                onMouseEnter={() => setActiveIndex(filteredOptions.length)}
                className={[
                  'flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer mt-1 border border-dashed transition-all duration-150',
                  activeIndex === filteredOptions.length
                    ? 'bg-emerald-500/8 dark:bg-emerald-500/10 border-emerald-400/20 dark:border-emerald-500/15'
                    : 'border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300/60 dark:hover:border-slate-700/60 bg-emerald-500/5 dark:bg-emerald-500/6',
                ].join(' ')}
              >
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 bg-emerald-500/8 dark:bg-emerald-500/10">
                  <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-emerald-700 dark:text-emerald-300">
                    Add "{query.trim()}"
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Create new entry
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
