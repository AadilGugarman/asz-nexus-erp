import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronsUpDown, Search, Sparkles } from 'lucide-react';

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
  searchPlaceholder = 'Type to search...',
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
    if (triggerRef.current) {
      setRect(triggerRef.current.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 30);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

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

  // Compute popover position - smart flip when near bottom
  const popoverStyle = useMemo(() => {
    if (!rect) return {};
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < 240;
    return {
      position: 'fixed' as const,
      left: rect.left,
      width: Math.max(rect.width, 220),
      zIndex: 999999,
      ...(flipUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }
      ),
    };
  }, [rect]);

  const emoji = showEmoji ? getEmoji(value) : null;

  return (
    <div className="relative w-full font-sans">
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`group flex items-center justify-between w-full dark:bg-slate-950 bg-white border-2 dark:border-slate-800 border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black shadow-sm hover:border-emerald-500/60 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-300 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        {...restProps}
      >
        <span className="truncate flex items-center space-x-2">
          {emoji && value && (
            <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-base leading-none">{emoji}</span>
            </div>
          )}
          {value
            ? <span className="dark:text-white text-slate-900 tracking-tight">{value}</span>
            : <span className="dark:text-slate-500 text-slate-400 font-bold opacity-60">{placeholder}</span>
          }
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 ml-1.5 shrink-0 dark:text-slate-500 text-slate-400 group-hover:text-emerald-500 transition-all duration-300" />
      </button>

      {isOpen && rect && createPortal(
        <div
          id={popoverId}
          style={popoverStyle}
          className="dark:bg-slate-900 bg-white backdrop-blur-3xl rounded-2xl border-2 dark:border-slate-800 border-slate-200 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-300 ease-out font-sans"
        >
          {/* Search Input */}
          <div className="p-2 border-b-2 dark:border-slate-800 border-slate-100 flex items-center space-x-2 dark:bg-slate-900/50 bg-slate-50/50">
            <div className="w-7 h-7 rounded-lg bg-white dark:bg-slate-950 border dark:border-slate-800 flex items-center justify-center shrink-0 shadow-sm">
              <Search className="w-3.5 h-3.5 dark:text-emerald-400 text-emerald-500" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent border-none dark:text-white text-slate-900 text-xs outline-none focus:ring-0 py-1 dark:placeholder-slate-500 placeholder-slate-400 font-black tracking-tight"
            />
            {query && (
              <span className="text-[9px] bg-white dark:bg-slate-950 px-1.5 py-0.5 rounded-md border dark:border-slate-800 dark:text-slate-400 text-slate-500 font-black shrink-0 shadow-sm">
                {filteredOptions.length}
              </span>
            )}
          </div>

          {/* Options List */}
          <div ref={listRef} className="max-h-72 overflow-y-auto p-2 scrollbar-none">
            {filteredOptions.length === 0 && !showCreateOption ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-dashed border-slate-200 dark:border-slate-700">
                  <Search className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                </div>
                <div className="text-xs font-black text-slate-900 dark:text-white">No results for "{query}"</div>
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
                    className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all duration-300 mb-1 last:mb-0 border-2 ${
                      isActive
                        ? 'bg-emerald-600 text-white scale-[1.01] border-white/10 shadow-md shadow-emerald-600/20 z-10'
                        : isSelected
                        ? 'dark:bg-emerald-500/10 bg-emerald-50 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                        : 'dark:text-slate-200 text-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
                    }`}
                  >
                    <span className="flex items-center space-x-3 font-black tracking-tight truncate">
                      {optEmoji && (
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm border-2 ${
                          isActive 
                            ? "bg-white/20 border-white/20" 
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 group-hover:border-slate-300 dark:group-hover:border-slate-700 shadow-inner"
                        }`}>
                          <span className="text-lg leading-none shrink-0">{optEmoji}</span>
                        </div>
                      )}
                      <span className="truncate">{opt}</span>
                    </span>
                    {isSelected && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shadow-sm border-2 transition-all ${
                        isActive ? "bg-white/20 border-white/20" : "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-500/20"
                      }`}>
                        <Check className={`w-3 h-3 stroke-[3] shrink-0 ${
                          isActive ? 'text-white' : 'text-emerald-500'
                        }`} />
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
                className={`flex items-center space-x-3 px-3 py-4 rounded-xl cursor-pointer mt-3 border-2 border-dashed transition-all duration-300 ${
                  activeIndex === filteredOptions.length
                    ? 'bg-emerald-600 text-white scale-[1.01] border-white/30 shadow-lg z-10'
                    : 'dark:bg-emerald-500/5 bg-emerald-50/50 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-md border-2 ${
                  activeIndex === filteredOptions.length ? 'bg-white/20 border-white/20' : 'bg-emerald-100 dark:bg-emerald-500/20 border-emerald-500/20'
                }`}>
                  <Sparkles className="w-5 h-5 stroke-[3]" />
                </div>
                <div>
                  <div className={`text-sm font-black tracking-tight ${activeIndex === filteredOptions.length ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    Create "{query.trim()}"
                  </div>
                  <div className={`text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-60 ${activeIndex === filteredOptions.length ? 'text-white/70' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    Add new master entry
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
