import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Check, Search, Plus, User, Phone, MapPin, Sparkles, X, ChevronDown, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CommandOption {
  id: string;
  label: string;
  subtitle?: string;
  emoji?: string;
  icon?: React.ReactNode;
}

interface CommandSelectProps {
  id?: string; // Used for persistence of recent items
  value: string; // The selected option's ID or label
  onChange: (value: string) => void;
  options: CommandOption[];
  placeholder?: string;
  onAdd?: (query: string) => void;
  creatable?: boolean;
  className?: string;
  disabled?: boolean;
  showEmoji?: boolean;
  autoFocus?: boolean;
  label?: string;
  error?: string;
  variant?: 'emerald' | 'violet' | 'sky' | 'amber';
}

export const CommandSelect: React.FC<CommandSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  onAdd,
  creatable = true,
  className = '',
  disabled = false,
  showEmoji = true,
  autoFocus = false,
  label,
  error,
  variant = 'emerald',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // ── Variant Styles ─────────────────────────────────────────────────────────
  const v = useMemo(() => {
    const themes = {
      emerald: {
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/40 dark:border-emerald-400/30',
        ring: 'ring-emerald-500/20 dark:ring-emerald-400/10',
        active: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30',
        selected: 'bg-emerald-50/90 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        check: 'bg-emerald-100 dark:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400',
        plus: 'bg-emerald-100 dark:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400',
        highlight: 'text-emerald-600 dark:text-emerald-300 font-bold',
        isViolet: false,
      },
      violet: {
        text: 'text-violet-600 dark:text-violet-400',
        border: 'border-violet-500/50 dark:border-violet-400/40',
        ring: 'ring-violet-500/25 dark:ring-violet-400/20',
        active: 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-600/40',
        selected: 'bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300',
        check: 'bg-violet-100 dark:bg-violet-500/30 text-violet-600 dark:text-violet-400',
        plus: 'bg-violet-100 dark:bg-violet-500/30 text-violet-600 dark:text-violet-400',
        highlight: 'text-violet-700 dark:text-violet-300 font-bold',
        isViolet: true,
      },
      sky: {
        text: 'text-sky-600 dark:text-sky-400',
        border: 'border-sky-500/40 dark:border-sky-400/30',
        ring: 'ring-sky-500/20 dark:ring-sky-400/10',
        active: 'bg-sky-600 text-white shadow-lg shadow-sky-600/30',
        selected: 'bg-sky-50/90 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300',
        check: 'bg-sky-100 dark:bg-sky-500/30 text-sky-600 dark:text-sky-400',
        plus: 'bg-sky-100 dark:bg-sky-500/30 text-sky-600 dark:text-sky-400',
        highlight: 'text-sky-600 dark:text-sky-300 font-bold',
        isViolet: false,
      },
      amber: {
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/40 dark:border-amber-400/30',
        ring: 'ring-amber-500/20 dark:ring-amber-400/10',
        active: 'bg-amber-600 text-white shadow-lg shadow-amber-600/30',
        selected: 'bg-amber-50/90 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
        check: 'bg-amber-100 dark:bg-amber-500/30 text-amber-600 dark:text-amber-400',
        plus: 'bg-amber-100 dark:bg-amber-500/30 text-amber-600 dark:text-amber-400',
        highlight: 'text-amber-600 dark:text-amber-300 font-bold',
        isViolet: false,
      }
    };
    return themes[variant];
  }, [variant]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const popoverId = useRef(`cmd-${Math.random().toString(36).substr(2, 6)}`).current;

  // Load recent items from localStorage if id is provided
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`recent_${id}`);
      if (saved) {
        try {
          setRecentIds(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to parse recent items', e);
        }
      }
    }
  }, [id]);

  const saveRecent = useCallback((optionId: string) => {
    if (!id) return;
    setRecentIds(prev => {
      const filtered = prev.filter(i => i !== optionId);
      const updated = [optionId, ...filtered].slice(0, 5);
      localStorage.setItem(`recent_${id}`, JSON.stringify(updated));
      return updated;
    });
  }, [id]);

  const selectedOption = useMemo(() => {
    return options.find(opt => opt.id === value || opt.label === value);
  }, [options, value]);

  // Sync query with selected option when not focused
  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedOption?.label || '');
    }
  }, [selectedOption, isOpen]);

  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Show recent items first if no query
      const recents = options.filter(opt => recentIds.includes(opt.id));
      const others = options.filter(opt => !recentIds.includes(opt.id));
      return [...recents, ...others];
    }
    
    return options.filter(opt => 
      opt.label.toLowerCase().includes(q) || 
      opt.subtitle?.toLowerCase().includes(q)
    );
  }, [options, query, recentIds]);

  const hasExactMatch = useMemo(() => {
    return options.some(opt => opt.label.toLowerCase() === query.toLowerCase().trim());
  }, [options, query]);

  const showCreateOption = creatable && query.trim().length > 0 && !hasExactMatch;
  const totalCount = filteredOptions.length + (showCreateOption ? 1 : 0);

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      setRect(containerRef.current.getBoundingClientRect());
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      
      const handleClickOutside = (event: MouseEvent) => {
        const popover = document.getElementById(popoverId);
        if (
          containerRef.current && 
          !containerRef.current.contains(event.target as Node) &&
          popover && 
          !popover.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      window.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition, popoverId]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleSelect = useCallback((option: CommandOption) => {
    onChange(option.id);
    saveRecent(option.id);
    setIsOpen(false);
    setQuery(option.label);
    inputRef.current?.blur();
  }, [onChange, saveRecent]);

  const handleCreate = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onAdd?.(trimmed);
    setIsOpen(false);
  }, [query, onAdd]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
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
        if (showCreateOption && activeIndex === filteredOptions.length) {
          handleCreate();
        } else if (filteredOptions[activeIndex]) {
          handleSelect(filteredOptions[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
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
    const flipUp = spaceBelow < 300;
    return {
      position: 'fixed' as const,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(flipUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }
      ),
    };
  }, [rect]);

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const parts = text.split(new RegExp(`(${q})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === q.toLowerCase() 
            ? v.isViolet
              ? <span key={i} className="bg-violet-100 dark:bg-violet-500/25 text-violet-800 dark:text-violet-200 px-1 rounded-md shadow-sm ring-1 ring-violet-300/40 dark:ring-violet-500/30 font-black">{part}</span>
              : <span key={i} className={cn("bg-amber-200 dark:bg-amber-500/30 text-amber-950 dark:text-amber-100 px-1 rounded-md shadow-sm ring-1 ring-amber-400/30 font-black", v.highlight)}>{part}</span>
            : part
        )}
      </>
    );
  };

  return (
    <div className={cn("relative w-full font-sans", className)} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none z-10">
          <Search className={cn(
            "w-4 h-4 transition-all duration-300",
            isOpen
              ? v.isViolet ? "text-violet-500 dark:text-violet-400 drop-shadow-[0_0_6px_rgba(139,92,246,0.6)]" : v.text
              : v.isViolet ? "text-violet-400/70 dark:text-violet-500/60 group-hover:text-violet-500 dark:group-hover:text-violet-400" : "text-slate-400 group-hover:text-slate-500"
          )} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            "w-full bg-white dark:bg-slate-950 border-2 dark:border-slate-800 border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm font-bold shadow-sm transition-all duration-300 outline-none",
            isOpen 
              ? cn(
                  "ring-4", v.ring, v.border, "border-opacity-100",
                  v.isViolet
                    ? "shadow-[0_0_0_4px_rgba(139,92,246,0.15),0_4px_20px_rgba(139,92,246,0.12)]"
                    : "shadow-md"
                )
              : v.isViolet
                ? "hover:border-violet-400/50 dark:hover:border-violet-500/40"
                : "hover:border-slate-300 dark:hover:border-slate-700",
            error ? "border-rose-500 ring-rose-500/10" : ""
          )}
        />
        <div className="absolute inset-y-0 right-3.5 flex items-center space-x-1.5 z-10">
          {query && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setQuery('');
                onChange('');
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg text-slate-400 hover:text-rose-500 transition-all"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={cn(
            "w-4 h-4 text-slate-400 transition-all duration-300",
            isOpen && cn("rotate-180", v.isViolet ? "text-violet-500 dark:text-violet-400" : v.text)
          )} />
        </div>
      </div>

      {error && (
        <p className="mt-1.5 text-[10px] text-rose-500 font-black flex items-center ml-1 uppercase tracking-wider">
          <span className="w-1 h-1 rounded-full bg-rose-500 mr-2 animate-pulse" />
          {error}
        </p>
      )}

      {isOpen && rect && createPortal(
        <div
          id={popoverId}
          style={popoverStyle}
          onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
          className={cn(
            "backdrop-blur-3xl rounded-2xl border-2 overflow-hidden animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-300 z-[9999]",
            v.isViolet
              ? "bg-white/98 dark:bg-[#1a1030] border-violet-200/60 dark:border-violet-500/20 shadow-[0_20px_60px_-10px_rgba(139,92,246,0.25),0_8px_24px_-4px_rgba(139,92,246,0.15)]"
              : "dark:bg-slate-900 bg-white border-2 dark:border-slate-800 border-slate-200 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)]"
          )}
        >
          {/* Violet variant: subtle top accent glow strip */}
          {v.isViolet && (
            <div className="h-0.5 w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-purple-500/0" />
          )}
          <div ref={listRef} className="max-h-80 overflow-y-auto p-2 scrollbar-none">
            {filteredOptions.length === 0 && !showCreateOption ? (
              <div className="py-12 text-center">
                <div className="text-3xl mb-3 opacity-50">🔍</div>
                <div className={cn("text-sm font-black", v.isViolet ? "text-violet-900 dark:text-violet-100" : "text-slate-900 dark:text-white")}>No results for "{query}"</div>
                <div className="text-[10px] text-slate-500 mt-1.5 uppercase tracking-widest font-black opacity-70">Try searching for something else</div>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.id === value || opt.label === value;
                const isActive = idx === activeIndex;
                const isRecent = !query && recentIds.includes(opt.id);

                return (
                  <div
                    key={opt.id}
                    data-idx={idx}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-1 last:mb-0 border-2",
                      isActive
                        ? v.isViolet
                          ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white scale-[1.01] border-white/10 shadow-[0_4px_16px_rgba(139,92,246,0.45)]"
                          : cn(v.active, "scale-[1.01] border-white/10")
                        : isSelected
                        ? v.isViolet
                          ? "bg-violet-50 dark:bg-violet-500/10 border-violet-200/60 dark:border-violet-500/20 shadow-[inset_0_0_0_1px_rgba(139,92,246,0.15)]"
                          : cn(v.selected, "border-current/10")
                        : v.isViolet
                          ? "hover:bg-violet-50/60 dark:hover:bg-violet-500/8 border-transparent hover:border-violet-200/40 dark:hover:border-violet-500/15 text-slate-900 dark:text-slate-100"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-900 dark:text-slate-100 border-transparent"
                    )}
                  >
                    <div className="flex items-center space-x-4 min-w-0">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm border-2",
                        isActive
                          ? "bg-white/20 border-white/20"
                          : isSelected && v.isViolet
                            ? "bg-violet-100 dark:bg-violet-500/20 border-violet-200/60 dark:border-violet-500/25"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 group-hover:border-slate-300 dark:group-hover:border-slate-700 shadow-inner"
                      )}>
                        {opt.emoji ? (
                          <span className="text-xl">{opt.emoji}</span>
                        ) : opt.icon ? (
                          <div className={cn("w-5 h-5", isActive ? "text-white" : v.text)}>{opt.icon}</div>
                        ) : (
                          <User className={cn("w-5 h-5", isActive ? "text-white" : v.isViolet ? "text-violet-500 dark:text-violet-400" : "text-slate-400")} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className={cn(
                            "text-[13px] font-black truncate tracking-tight",
                            isActive ? "text-white" : isSelected && v.isViolet ? "text-violet-700 dark:text-violet-300" : "text-slate-900 dark:text-white"
                          )}>
                            {highlightMatch(opt.label, query)}
                          </span>
                          {isRecent && (
                            <Clock className={cn("w-3 h-3", isActive ? "text-white/70" : "text-slate-400")} />
                          )}
                        </div>
                        {opt.subtitle && (
                          <div className={cn(
                            "text-[11px] font-bold truncate flex items-center mt-1 tracking-tight opacity-70",
                            isActive ? "text-white/80" : isSelected && v.isViolet ? "text-violet-600 dark:text-violet-400" : "text-slate-500 dark:text-slate-400"
                          )}>
                            {opt.subtitle.includes('@') || opt.subtitle.match(/\d{10}/) ? <Phone className="w-3 h-3 mr-1.5 shrink-0" /> : <MapPin className="w-3 h-3 mr-1.5 shrink-0" />}
                            {opt.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shadow-sm border-2 transition-all shrink-0",
                        isActive
                          ? "bg-white/20 border-white/20"
                          : v.isViolet
                            ? "bg-violet-100 dark:bg-violet-500/25 border-violet-300/50 dark:border-violet-500/30"
                            : cn(v.check, "border-current/10")
                      )}>
                        <Check className={cn("w-4 h-4 stroke-[3]", isActive ? "text-white" : v.text)} />
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
                className={cn(
                  "flex items-center space-x-4 px-4 py-5 rounded-xl cursor-pointer mt-3 border-2 border-dashed transition-all duration-300",
                  activeIndex === filteredOptions.length
                    ? v.isViolet
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white scale-[1.01] border-white/30 shadow-[0_4px_16px_rgba(139,92,246,0.45)]"
                      : cn(v.active, "scale-[1.01] border-white/30")
                    : v.isViolet
                      ? "bg-violet-50/60 dark:bg-violet-500/8 border-violet-300/40 dark:border-violet-500/20 hover:border-violet-400/50 dark:hover:border-violet-500/30 shadow-sm"
                      : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
                )}
              >
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md border-2",
                  activeIndex === filteredOptions.length ? "bg-white/20 border-white/20" : cn(v.plus, "border-current/10")
                )}>
                  <Plus className="w-6 h-6 stroke-[3]" />
                </div>
                <div>
                  <div className={cn(
                    "text-[15px] font-black tracking-tight",
                    activeIndex === filteredOptions.length ? "text-white" : "text-slate-900 dark:text-white"
                  )}>Add New "{query}"</div>
                  <div className={cn(
                    "text-[11px] font-black uppercase tracking-widest mt-0.5 opacity-60",
                    activeIndex === filteredOptions.length ? "text-white/70" : v.text
                  )}>Register as new entry</div>
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
