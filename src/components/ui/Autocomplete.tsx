import React, { useState, useRef, useEffect, useMemo } from "react";
import { Search, MapPin, X } from "lucide-react";

export interface AutocompleteOption {
  city: string;
  state: string;
  pincode: string;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  placeholder?: string;
  className?: string;
  error?: string;
  icon?: React.ReactNode;
  autoFocus?: boolean;
  nextFieldRef?: React.RefObject<HTMLInputElement>;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  options,
  placeholder,
  className = "",
  error,
  icon,
  autoFocus,
  nextFieldRef,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal query with value prop
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase().trim();
    // Filter by city, state or pincode
    return options.filter(
      (opt) =>
        opt.city.toLowerCase().includes(q) ||
        opt.pincode.includes(q) ||
        opt.state.toLowerCase().includes(q)
    ).slice(0, 8); // Limit to 8 suggestions for performance
  }, [options, query]);

  useEffect(() => {
    if (isOpen && filteredOptions.length > 0) {
      setActiveIndex(0);
    } else {
      setActiveIndex(-1);
    }
  }, [filteredOptions, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleSelect = (option: AutocompleteOption) => {
    onSelect(option);
    setQuery(option.city);
    setIsOpen(false);
    
    // Auto-focus next field if provided
    if (nextFieldRef?.current) {
      setTimeout(() => nextFieldRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown") setIsOpen(true);
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && filteredOptions[activeIndex]) {
          handleSelect(filteredOptions[activeIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        break;
      case "Tab":
        if (activeIndex >= 0 && filteredOptions[activeIndex]) {
          handleSelect(filteredOptions[activeIndex]);
        } else {
          setIsOpen(false);
        }
        break;
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <div className="relative group">
        {icon && (
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-amber-500 transition-colors z-10">
            {React.cloneElement(icon as React.ReactElement, { size: 14 })}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full ${icon ? "pl-10" : "px-3.5"} pr-10 py-2.5 rounded-xl border-2 text-sm font-bold bg-white dark:bg-slate-950 shadow-sm focus:outline-none transition-all duration-300 ${
            error
              ? "border-rose-500 ring-4 ring-rose-500/10"
              : "border-slate-200 dark:border-slate-800 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 dark:focus:border-amber-400"
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange("");
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-rose-500 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-[9999] w-full mt-1.5 bg-white dark:bg-slate-900 backdrop-blur-3xl rounded-2xl border-2 dark:border-slate-800 border-slate-200 shadow-[0_20px_70px_-10px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-top-2 zoom-in-95 duration-300 ease-out">
          <ul className="max-h-72 overflow-y-auto p-2 scrollbar-none">
            {filteredOptions.map((opt, idx) => (
              <li
                key={`${opt.city}-${opt.pincode}`}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`group px-3.5 py-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-all duration-300 mb-1 last:mb-0 border-2 ${
                  idx === activeIndex 
                    ? "bg-amber-600 text-white scale-[1.01] border-white/10 shadow-md shadow-amber-600/20 z-10" 
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 shadow-sm border-2 ${
                    idx === activeIndex 
                      ? "bg-white/20 border-white/20" 
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 group-hover:border-slate-300 dark:group-hover:border-slate-700 shadow-inner"
                  }`}>
                    <MapPin className={`w-4 h-4 ${idx === activeIndex ? "text-white" : "text-amber-500"}`} />
                  </div>
                  <div>
                    <span className={`text-[13px] font-black tracking-tight block ${idx === activeIndex ? "text-white" : "text-slate-900 dark:text-white"}`}>
                      {opt.city}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 block opacity-70 ${idx === activeIndex ? "text-white/80" : "text-slate-500 dark:text-slate-400"}`}>
                      {opt.state}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-black font-mono px-1.5 py-0.5 rounded-lg border-2 ${
                  idx === activeIndex ? "bg-white/20 border-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                }`}>
                  {opt.pincode}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-[10px] text-rose-500 font-black flex items-center ml-1 uppercase tracking-wider">
          <span className="w-1 h-1 rounded-full bg-rose-500 mr-2 animate-pulse" />
          {error}
        </p>
      )}
    </div>
  );
};
