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
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
            {icon}
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
          className={`w-full ${icon ? "pl-8" : "px-3"} pr-8 py-2 rounded-lg border text-xs font-medium bg-white focus:outline-none focus:ring-2 transition-all ${
            error
              ? "border-red-300 focus:ring-red-100 focus:border-red-500"
              : "border-slate-200 focus:ring-amber-100 focus:border-amber-500"
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
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <ul className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.map((opt, idx) => (
              <li
                key={`${opt.city}-${opt.pincode}`}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between transition-colors ${
                  idx === activeIndex ? "bg-amber-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className={`w-3 h-3 ${idx === activeIndex ? "text-amber-500" : "text-slate-400"}`} />
                  <div>
                    <span className={`text-xs font-semibold ${idx === activeIndex ? "text-amber-900" : "text-slate-700"}`}>
                      {opt.city}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-2">
                      {opt.state}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-medium text-slate-400">
                  {opt.pincode}
                </span>
              </li>
            ))}
          </ul>
          <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Local Suggestions</span>
            <span className="text-[9px] text-slate-400 font-medium">↑↓ to navigate</span>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-[11px] text-red-500 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-red-500" />
          {error}
        </p>
      )}
    </div>
  );
};
