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
        className={`group flex items-center justify-between w-full dark:bg-slate-950 bg-white border dark:border-slate-700/80 border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm dark:hover:border-emerald-500/60 hover:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-150 text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        {...restProps}
      >
        <span className="truncate flex items-center space-x-1.5">
          {emoji && value && <span className="text-sm leading-none">{emoji}</span>}
          {value
            ? <span className="dark:text-white text-slate-900">{value}</span>
            : <span className="dark:text-slate-500 text-slate-400 font-normal">{placeholder}</span>
          }
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 ml-1.5 shrink-0 dark:text-slate-500 text-slate-400 group-hover:text-emerald-500 transition-colors" />
      </button>

      {isOpen && rect && createPortal(
        <div
          id={popoverId}
          style={popoverStyle}
          className="dark:bg-slate-950/95 bg-white/95 backdrop-blur-2xl rounded-xl border dark:border-slate-800 border-slate-200 shadow-2xl dark:shadow-black/40 shadow-slate-300/60 overflow-hidden animate-scale-in font-sans"
        >
          {/* Search Input */}
          <div className="p-2 border-b dark:border-slate-800/80 border-slate-100 flex items-center space-x-2 dark:bg-slate-900/60 bg-slate-50/80">
            <Search className="w-3.5 h-3.5 dark:text-slate-500 text-slate-400 ml-1 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent border-none dark:text-white text-slate-900 text-xs outline-none focus:ring-0 p-1 dark:placeholder-slate-500 placeholder-slate-400 font-medium"
            />
            {query && (
              <span className="text-[10px] dark:text-slate-600 text-slate-400 font-mono shrink-0 mr-1">
                {filteredOptions.length}
              </span>
            )}
          </div>

          {/* Options List */}
          <div ref={listRef} className="max-h-56 overflow-y-auto p-1">
            {filteredOptions.length === 0 && !showCreateOption ? (
              <div className="py-8 text-center text-xs dark:text-slate-500 text-slate-400 font-medium">
                <span className="text-2xl block mb-2">🔍</span>
                No results for "{query}"
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
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all duration-100 ${
                      isActive
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : isSelected
                        ? 'dark:bg-emerald-950/40 bg-emerald-50 text-emerald-700 dark:text-emerald-400 font-bold'
                        : 'dark:text-slate-200 text-slate-800 dark:hover:bg-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center space-x-2 font-semibold truncate">
                      {optEmoji && <span className="text-sm leading-none shrink-0">{optEmoji}</span>}
                      <span className="truncate">{opt}</span>
                    </span>
                    {isSelected && (
                      <Check className={`w-3.5 h-3.5 shrink-0 ml-2 ${
                        isActive ? 'text-white' : 'text-emerald-500'
                      }`} />
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
                className={`flex items-center space-x-2 px-3 py-2.5 rounded-lg text-xs font-bold cursor-pointer mt-1 border-t dark:border-slate-800 border-slate-100 transition-all duration-100 ${
                  activeIndex === filteredOptions.length
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'dark:bg-emerald-950/20 bg-emerald-50 text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/40 hover:bg-emerald-100'
                }`}
              >
                <div className={`p-1 rounded-md ${activeIndex === filteredOptions.length ? 'bg-white/20' : 'dark:bg-emerald-500/20 bg-emerald-200/60'}`}>
                  <Sparkles className="w-3 h-3" />
                </div>
                <span>Create new: <span className="font-black">"{query.trim()}"</span></span>
              </div>
            )}
          </div>

          {/* Keyboard hints footer */}
          <div className="px-3 py-1.5 border-t dark:border-slate-800/80 border-slate-100 flex items-center justify-between dark:bg-slate-900/40 bg-slate-50/80 text-[10px] dark:text-slate-600 text-slate-400 font-mono select-none">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
