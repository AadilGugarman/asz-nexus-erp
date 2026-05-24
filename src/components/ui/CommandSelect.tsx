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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);

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
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === q.toLowerCase() 
            ? <span key={i} className="text-emerald-500 font-black">{part}</span> 
            : part
        )}
      </span>
    );
  };

  return (
    <div className={cn("relative w-full font-sans", className)} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
          {label}
        </label>
      )}
      <div className="relative group">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <Search className={cn(
            "w-3.5 h-3.5 transition-colors",
            isOpen ? "text-emerald-500" : "text-slate-400 group-hover:text-slate-500"
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
            "w-full bg-white dark:bg-slate-950 border dark:border-slate-800 border-slate-200 rounded-xl pl-9 pr-10 py-2.5 text-xs font-semibold shadow-sm transition-all outline-none",
            isOpen ? "ring-4 ring-emerald-500/10 border-emerald-500/50" : "hover:border-slate-300 dark:hover:border-slate-700",
            error ? "border-rose-500 ring-rose-500/10" : ""
          )}
        />
        <div className="absolute inset-y-0 right-3 flex items-center space-x-1">
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
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-md text-slate-400 hover:text-rose-500 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          )}
          <ChevronDown className={cn(
            "w-3.5 h-3.5 text-slate-400 transition-transform duration-200",
            isOpen && "rotate-180 text-emerald-500"
          )} />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-[10px] text-rose-500 font-medium flex items-center">
          <span className="w-1 h-1 rounded-full bg-rose-500 mr-1.5" />
          {error}
        </p>
      )}

      {isOpen && rect && createPortal(
        <div
          id={popoverId}
          style={popoverStyle}
          onMouseDown={(e) => e.preventDefault()} // Prevent blur on click
          className="dark:bg-slate-950/90 bg-white/90 backdrop-blur-xl rounded-2xl border dark:border-slate-800 border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          <div ref={listRef} className="max-h-72 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {filteredOptions.length === 0 && !showCreateOption ? (
              <div className="py-10 text-center">
                <div className="text-2xl mb-2">✨</div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">No matches found</div>
                <div className="text-[10px] text-slate-500 mt-1">Try a different search term</div>
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
                      "group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 mb-0.5 last:mb-0",
                      isActive 
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]" 
                        : isSelected 
                        ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" 
                        : "hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-white dark:group-hover:bg-slate-700"
                      )}>
                        {opt.emoji ? (
                          <span className="text-base">{opt.emoji}</span>
                        ) : opt.icon ? (
                          opt.icon
                        ) : (
                          <User className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold truncate">
                            {highlightMatch(opt.label, query)}
                          </span>
                          {isRecent && (
                            <Clock className={cn("w-2.5 h-2.5", isActive ? "text-white/70" : "text-slate-400")} />
                          )}
                        </div>
                        {opt.subtitle && (
                          <div className={cn(
                            "text-[10px] font-medium truncate flex items-center mt-0.5",
                            isActive ? "text-white/80" : "text-slate-500"
                          )}>
                            {opt.subtitle.includes('@') || opt.subtitle.match(/\d{10}/) ? <Phone className="w-2.5 h-2.5 mr-1 shrink-0" /> : <MapPin className="w-2.5 h-2.5 mr-1 shrink-0" />}
                            {opt.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center",
                        isActive ? "bg-white/20" : "bg-emerald-500/10"
                      )}>
                        <Check className={cn("w-3 h-3", isActive ? "text-white" : "text-emerald-500")} />
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
                  "flex items-center space-x-3 px-3 py-3 rounded-xl cursor-pointer mt-2 border-t dark:border-slate-800 border-slate-100 transition-all",
                  activeIndex === filteredOptions.length 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]" 
                    : "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  activeIndex === filteredOptions.length ? "bg-white/20" : "bg-emerald-500/20"
                )}>
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-black">Add New "{query}"</div>
                  <div className={cn(
                    "text-[10px] font-medium",
                    activeIndex === filteredOptions.length ? "text-white/80" : "text-emerald-600/70"
                  )}>Create a new entry in the system</div>
                </div>
              </div>
            )}
          </div>

          <div className="px-3 py-2 border-t dark:border-slate-800 border-slate-100 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest select-none">
            <div className="flex items-center space-x-3">
              <span className="flex items-center"><span className="border dark:border-slate-700 rounded px-1 mr-1">↑↓</span> Move</span>
              <span className="flex items-center"><span className="border dark:border-slate-700 rounded px-1 mr-1">↵</span> Select</span>
            </div>
            <span className="flex items-center"><span className="border dark:border-slate-700 rounded px-1 mr-1">ESC</span> Close</span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
