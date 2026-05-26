import React, { useState, useRef, useEffect, useMemo } from "react";
import { MapPin, X } from "lucide-react";

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
    return options.filter(
      (opt) =>
        opt.city.toLowerCase().includes(q) ||
        opt.pincode.includes(q) ||
        opt.state.toLowerCase().includes(q)
    ).slice(0, 8);
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
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400/70 dark:text-slate-500/60 group-focus-within:text-amber-500/70 dark:group-focus-within:text-amber-400/60 transition-colors z-10">
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
          className={[
            "w-full py-2 rounded-lg border text-sm bg-white dark:bg-slate-950 shadow-sm",
            "text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500",
            "outline-none transition-all duration-200",
            icon ? "pl-9" : "pl-3",
            "pr-9",
            error
              ? "border-rose-400/60 dark:border-rose-500/40 ring-2 ring-rose-500/10"
              : "border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-amber-500/10 focus:border-amber-400/60 dark:focus:border-amber-500/40 hover:border-slate-300 dark:hover:border-slate-700",
          ].join(" ")}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              onChange("");
              inputRef.current?.focus();
            }}
            className="absolute inset-y-0 right-2.5 flex items-center p-1 rounded-md text-slate-400/60 hover:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div className={[
          "absolute z-[9999] w-full mt-1.5 overflow-hidden rounded-xl border",
          "bg-white/98 dark:bg-slate-950/98 backdrop-blur-xl",
          "border-slate-200/80 dark:border-slate-800/80",
          "shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12),0_2px_8px_-2px_rgba(0,0,0,0.06)]",
          "dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.4),0_2px_8px_-2px_rgba(0,0,0,0.2)]",
          "animate-in fade-in slide-in-from-top-1 duration-150 ease-out",
        ].join(" ")}>
          <ul className="max-h-64 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent">
            {filteredOptions.map((opt, idx) => (
              <li
                key={`${opt.city}-${opt.pincode}`}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setActiveIndex(idx)}
                className={[
                  "flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 mb-0.5 last:mb-0 border",
                  idx === activeIndex
                    ? "bg-amber-500/8 dark:bg-amber-500/10 border-amber-400/15 dark:border-amber-500/12"
                    : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/60",
                ].join(" ")}
              >
                <div className="flex items-center gap-2.5">
                  <div className={[
                    "w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors duration-150",
                    idx === activeIndex
                      ? "bg-amber-500/10 dark:bg-amber-500/12"
                      : "bg-slate-100/80 dark:bg-slate-800/60",
                  ].join(" ")}>
                    <MapPin className={[
                      "w-3.5 h-3.5",
                      idx === activeIndex
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-400 dark:text-slate-500",
                    ].join(" ")} />
                  </div>
                  <div>
                    <span className={[
                      "text-[13px] block leading-tight",
                      idx === activeIndex
                        ? "font-medium text-amber-700 dark:text-amber-300"
                        : "font-normal text-slate-700 dark:text-slate-200",
                    ].join(" ")}>
                      {opt.city}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 block mt-0.5 leading-tight">
                      {opt.state}
                    </span>
                  </div>
                </div>
                <span className={[
                  "text-[10px] font-mono px-1.5 py-0.5 rounded-md border tabular-nums",
                  idx === activeIndex
                    ? "bg-amber-500/8 dark:bg-amber-500/10 border-amber-400/15 dark:border-amber-500/12 text-amber-700 dark:text-amber-300"
                    : "bg-slate-100/80 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400",
                ].join(" ")}>
                  {opt.pincode}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-400 flex items-center gap-1.5 ml-0.5">
          <span className="w-1 h-1 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};
