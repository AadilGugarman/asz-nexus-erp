import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  Check,
  Search,
  Plus,
  User,
  Phone,
  MapPin,
  X,
  ChevronDown,
  Clock,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
  id?: string;
  value: string;
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
  variant?: "emerald" | "violet" | "sky" | "amber";
  size?: "sm" | "md";
  /** Extra attributes for the internal input (e.g. data-inv-cell) */
  inputAttributes?: React.InputHTMLAttributes<HTMLInputElement>;
}

export const CommandSelect: React.FC<CommandSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = "Select...",
  onAdd,
  creatable = true,
  className = "",
  disabled = false,
  showEmoji = true,
  autoFocus = false,
  label,
  error,
  variant = "emerald",
  size = "md",
  inputAttributes = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  // ── Variant Styles ─────────────────────────────────────────────────────────
  const v = useMemo(() => {
    const themes = {
      emerald: {
        accent: "emerald",
        triggerFocus:
          "focus-within:border-emerald-400/60 dark:focus-within:border-emerald-500/40",
        triggerRing:
          "focus-within:ring-2 focus-within:ring-emerald-500/10 dark:focus-within:ring-emerald-500/8",
        searchIcon: "text-emerald-500/70 dark:text-emerald-400/60",
        chevron: "text-emerald-500/60 dark:text-emerald-400/50",
        selectedBg: "bg-emerald-500/6 dark:bg-emerald-500/8",
        selectedBorder: "border-emerald-400/20 dark:border-emerald-500/15",
        selectedText: "text-emerald-700 dark:text-emerald-300",
        selectedSubtext: "text-emerald-600/70 dark:text-emerald-400/70",
        checkBg: "bg-emerald-500/10 dark:bg-emerald-500/12",
        checkColor: "text-emerald-600 dark:text-emerald-400",
        activeBg: "bg-emerald-500/8 dark:bg-emerald-500/10",
        activeBorder: "border-emerald-400/15 dark:border-emerald-500/12",
        highlightBg: "bg-emerald-100/80 dark:bg-emerald-500/15",
        highlightText: "text-emerald-800 dark:text-emerald-200",
        createBg: "bg-emerald-500/5 dark:bg-emerald-500/6",
        createBorder: "border-emerald-400/20 dark:border-emerald-500/15",
        createText: "text-emerald-700 dark:text-emerald-300",
        iconBg: "bg-emerald-500/8 dark:bg-emerald-500/10",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      },
      violet: {
        accent: "violet",
        triggerFocus:
          "focus-within:border-violet-400/60 dark:focus-within:border-violet-500/40",
        triggerRing:
          "focus-within:ring-2 focus-within:ring-violet-500/10 dark:focus-within:ring-violet-500/8",
        searchIcon: "text-violet-500/70 dark:text-violet-400/60",
        chevron: "text-violet-500/60 dark:text-violet-400/50",
        selectedBg: "bg-violet-500/6 dark:bg-violet-500/8",
        selectedBorder: "border-violet-400/20 dark:border-violet-500/15",
        selectedText: "text-violet-700 dark:text-violet-300",
        selectedSubtext: "text-violet-600/70 dark:text-violet-400/70",
        checkBg: "bg-violet-500/10 dark:bg-violet-500/12",
        checkColor: "text-violet-600 dark:text-violet-400",
        activeBg: "bg-violet-500/8 dark:bg-violet-500/10",
        activeBorder: "border-violet-400/15 dark:border-violet-500/12",
        highlightBg: "bg-violet-100/80 dark:bg-violet-500/15",
        highlightText: "text-violet-800 dark:text-violet-200",
        createBg: "bg-violet-500/5 dark:bg-violet-500/6",
        createBorder: "border-violet-400/20 dark:border-violet-500/15",
        createText: "text-violet-700 dark:text-violet-300",
        iconBg: "bg-violet-500/8 dark:bg-violet-500/10",
        iconColor: "text-violet-600 dark:text-violet-400",
      },
      sky: {
        accent: "sky",
        triggerFocus:
          "focus-within:border-sky-400/60 dark:focus-within:border-sky-500/40",
        triggerRing:
          "focus-within:ring-2 focus-within:ring-sky-500/10 dark:focus-within:ring-sky-500/8",
        searchIcon: "text-sky-500/70 dark:text-sky-400/60",
        chevron: "text-sky-500/60 dark:text-sky-400/50",
        selectedBg: "bg-sky-500/6 dark:bg-sky-500/8",
        selectedBorder: "border-sky-400/20 dark:border-sky-500/15",
        selectedText: "text-sky-700 dark:text-sky-300",
        selectedSubtext: "text-sky-600/70 dark:text-sky-400/70",
        checkBg: "bg-sky-500/10 dark:bg-sky-500/12",
        checkColor: "text-sky-600 dark:text-sky-400",
        activeBg: "bg-sky-500/8 dark:bg-sky-500/10",
        activeBorder: "border-sky-400/15 dark:border-sky-500/12",
        highlightBg: "bg-sky-100/80 dark:bg-sky-500/15",
        highlightText: "text-sky-800 dark:text-sky-200",
        createBg: "bg-sky-500/5 dark:bg-sky-500/6",
        createBorder: "border-sky-400/20 dark:border-sky-500/15",
        createText: "text-sky-700 dark:text-sky-300",
        iconBg: "bg-sky-500/8 dark:bg-sky-500/10",
        iconColor: "text-sky-600 dark:text-sky-400",
      },
      amber: {
        accent: "amber",
        triggerFocus:
          "focus-within:border-amber-400/60 dark:focus-within:border-amber-500/40",
        triggerRing:
          "focus-within:ring-2 focus-within:ring-amber-500/10 dark:focus-within:ring-amber-500/8",
        searchIcon: "text-amber-500/70 dark:text-amber-400/60",
        chevron: "text-amber-500/60 dark:text-amber-400/50",
        selectedBg: "bg-amber-500/6 dark:bg-amber-500/8",
        selectedBorder: "border-amber-400/20 dark:border-amber-500/15",
        selectedText: "text-amber-700 dark:text-amber-300",
        selectedSubtext: "text-amber-600/70 dark:text-amber-400/70",
        checkBg: "bg-amber-500/10 dark:bg-amber-500/12",
        checkColor: "text-amber-600 dark:text-amber-400",
        activeBg: "bg-amber-500/8 dark:bg-amber-500/10",
        activeBorder: "border-amber-400/15 dark:border-amber-500/12",
        highlightBg: "bg-amber-100/80 dark:bg-amber-500/15",
        highlightText: "text-amber-800 dark:text-amber-200",
        createBg: "bg-amber-500/5 dark:bg-amber-500/6",
        createBorder: "border-amber-400/20 dark:border-amber-500/15",
        createText: "text-amber-700 dark:text-amber-300",
        iconBg: "bg-amber-500/8 dark:bg-amber-500/10",
        iconColor: "text-amber-600 dark:text-amber-400",
      },
    };
    return themes[variant];
  }, [variant]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const popoverId = useRef(
    `cmd-${Math.random().toString(36).substr(2, 6)}`,
  ).current;

  // Load recent items from localStorage
  useEffect(() => {
    if (id) {
      const saved = localStorage.getItem(`recent_${id}`);
      if (saved) {
        try {
          setRecentIds(JSON.parse(saved));
        } catch {
          /* ignore */
        }
      }
    }
  }, [id]);

  const saveRecent = useCallback(
    (optionId: string) => {
      if (!id) return;
      setRecentIds((prev) => {
        const filtered = prev.filter((i) => i !== optionId);
        const updated = [optionId, ...filtered].slice(0, 5);
        localStorage.setItem(`recent_${id}`, JSON.stringify(updated));
        return updated;
      });
    },
    [id],
  );

  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.id === value || opt.label === value);
  }, [options, value]);

  // Reset query to empty on open, restore display label on close
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [isOpen]);

  const normalizeText = (text?: string) => text?.toLowerCase() ?? "";

  const filteredOptions = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      const recents = options.filter((opt) => recentIds.includes(opt.id));
      const others = options.filter((opt) => !recentIds.includes(opt.id));
      return [...recents, ...others];
    }
    return options.filter(
      (opt) =>
        normalizeText(opt.label).includes(q) ||
        normalizeText(opt.subtitle).includes(q),
    );
  }, [options, query, recentIds]);

  const hasExactMatch = useMemo(() => {
    const q = query.toLowerCase().trim();
    return options.some((opt) => normalizeText(opt.label) === q);
  }, [options, query]);

  const showCreateOption =
    creatable && query.trim().length > 0 && !hasExactMatch;
  const totalCount = filteredOptions.length + (showCreateOption ? 1 : 0);

  const updatePosition = useCallback(() => {
    if (containerRef.current)
      setRect(containerRef.current.getBoundingClientRect());
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
      window.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen, updatePosition, popoverId]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleSelect = useCallback(
    (option: CommandOption) => {
      onChange(option.id);
      saveRecent(option.id);
      setIsOpen(false);
      // Remove blur to allow focus to remain for subsequent Tab navigation
      // or parent-driven focus movement.
    },
    [onChange, saveRecent],
  );

  const handleCreate = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    onAdd?.(trimmed);
    setIsOpen(false);
  }, [query, onAdd]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % totalCount);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + totalCount) % totalCount);
        break;
      case "Enter":
        e.preventDefault();
        if (showCreateOption && activeIndex === filteredOptions.length) {
          handleCreate();
        } else if (filteredOptions[activeIndex]) {
          handleSelect(filteredOptions[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeItem = listRef.current.querySelector(
      `[data-idx="${activeIndex}"]`,
    ) as HTMLElement;
    activeItem?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, isOpen]);

  const popoverStyle = useMemo(() => {
    if (!rect) return {};
    const spaceBelow = window.innerHeight - rect.bottom;
    const flipUp = spaceBelow < 300;
    return {
      position: "fixed" as const,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(flipUp
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    };
  }, [rect]);

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return <>{text}</>;
    const parts = text.split(
      new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
    );
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark
              key={i}
              className={cn(
                "rounded px-0.5 not-italic font-semibold",
                v.highlightBg,
                v.highlightText,
              )}
            >
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </>
    );
  };

  // Display label for the trigger button
  const displayLabel = selectedOption?.label || value || "";

  return (
    <div
      className={cn("relative w-full font-sans", className)}
      ref={containerRef}
    >
      {label && (
        <label className="block text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 ml-0.5">
          {label}
        </label>
      )}

      {/* Trigger — shows selected value; becomes search input when open */}
      <div
        className={cn(
          "relative group flex items-center w-full rounded-lg border bg-white dark:bg-slate-950 transition-all duration-200",
          "border-slate-200 dark:border-slate-800",
          "shadow-sm",
          isOpen
            ? cn(v.triggerFocus, v.triggerRing, "border-opacity-100")
            : "hover:border-slate-300 dark:hover:border-slate-700",
          error ? "border-rose-400/60 dark:border-rose-500/40" : "",
          disabled ? "opacity-50 cursor-not-allowed" : "",
        )}
      >
        {/* Search icon */}
        <div
          className={cn(
            "absolute inset-y-0 flex items-center pointer-events-none z-10",
            size === "sm" ? "left-2.5" : "left-3",
          )}
        >
          <Search
            className={cn(
              "transition-colors duration-200",
              size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5",
              isOpen
                ? v.searchIcon
                : "text-slate-400/70 dark:text-slate-500/60",
            )}
          />
        </div>

        {/* Input — always empty on open, shows placeholder or selected label */}
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? query : displayLabel}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={isOpen ? placeholder : displayLabel ? "" : placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          readOnly={!isOpen}
          {...inputAttributes}
          className={cn(
            "w-full bg-transparent outline-none cursor-pointer",
            size === "sm"
              ? "pl-7 pr-7 py-1.5 text-xs"
              : "pl-8 pr-8 py-2 text-sm",
            isOpen ? "cursor-text" : "",
            displayLabel && !isOpen
              ? "text-slate-800 dark:text-slate-100 font-medium"
              : "text-slate-400 dark:text-slate-500",
            inputAttributes.className,
          )}
        />

        {/* Right controls */}
        <div
          className={cn(
            "absolute inset-y-0 flex items-center gap-0.5 z-10",
            size === "sm" ? "right-1.5" : "right-2.5",
          )}
        >
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setIsOpen(false);
              }}
              className="p-1 rounded-md text-slate-400/60 hover:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
            >
              <X className={size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3"} />
            </button>
          )}
          <ChevronDown
            className={cn(
              "transition-all duration-200",
              size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5",
              isOpen
                ? cn("rotate-180", v.chevron)
                : "text-slate-400/60 dark:text-slate-500/50",
            )}
          />
        </div>
      </div>

      {error && (
        <p className="mt-1 text-[11px] text-rose-500 dark:text-rose-400 flex items-center gap-1.5 ml-0.5">
          <span className="w-1 h-1 rounded-full bg-rose-500 dark:bg-rose-400 shrink-0" />
          {error}
        </p>
      )}

      {isOpen &&
        rect &&
        createPortal(
          <div
            id={popoverId}
            style={popoverStyle}
            onMouseDown={(e) => e.preventDefault()}
            className={cn(
              "rounded-xl border overflow-hidden z-9999",
              "bg-white/98 dark:bg-slate-950/98 backdrop-blur-xl",
              "border-slate-200/80 dark:border-slate-800/80",
              "shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12),0_2px_8px_-2px_rgba(0,0,0,0.06)]",
              "dark:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.4),0_2px_8px_-2px_rgba(0,0,0,0.2)]",
              "animate-in fade-in slide-in-from-top-1 duration-150",
            )}
          >
            <div
              ref={listRef}
              className="max-h-72 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 scrollbar-track-transparent"
            >
              {filteredOptions.length === 0 && !showCreateOption ? (
                <div className="py-8 text-center">
                  <AlertCircle className="mx-auto mb-2 w-8 h-8 opacity-30 text-slate-400 dark:text-slate-500" />
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    No results{query ? ` for "${query}"` : ""}
                  </div>
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
                        "flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-all duration-150 mb-0.5 last:mb-0 border",
                        isActive
                          ? cn(v.activeBg, v.activeBorder)
                          : isSelected
                            ? cn(v.selectedBg, v.selectedBorder)
                            : "border-transparent hover:bg-slate-50 dark:hover:bg-slate-900/60",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Icon / Emoji */}
                        {(opt.emoji || opt.icon || showEmoji) && (
                          <div
                            className={cn(
                              "w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors duration-150",
                              isSelected || isActive
                                ? v.iconBg
                                : "bg-slate-100/80 dark:bg-slate-800/60",
                            )}
                          >
                            {opt.emoji ? (
                              <span className="text-sm leading-none">
                                {opt.emoji}
                              </span>
                            ) : opt.icon ? (
                              <div
                                className={cn(
                                  "w-3.5 h-3.5",
                                  isSelected || isActive
                                    ? v.iconColor
                                    : "text-slate-400 dark:text-slate-500",
                                )}
                              >
                                {opt.icon}
                              </div>
                            ) : (
                              <User
                                className={cn(
                                  "w-3.5 h-3.5",
                                  isSelected || isActive
                                    ? v.iconColor
                                    : "text-slate-400 dark:text-slate-500",
                                )}
                              />
                            )}
                          </div>
                        )}

                        {/* Text */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-[13px] truncate leading-tight",
                                isSelected
                                  ? cn("font-medium", v.selectedText)
                                  : isActive
                                    ? cn("font-medium", v.selectedText)
                                    : "font-normal text-slate-700 dark:text-slate-200",
                              )}
                            >
                              {highlightMatch(opt.label, query)}
                            </span>
                            {isRecent && (
                              <Clock className="w-2.5 h-2.5 text-slate-400/60 dark:text-slate-500/60 shrink-0" />
                            )}
                          </div>
                          {opt.subtitle && (
                            <div
                              className={cn(
                                "text-[11px] truncate flex items-center gap-1 mt-0.5 leading-tight",
                                isSelected || isActive
                                  ? v.selectedSubtext
                                  : "text-slate-400 dark:text-slate-500",
                              )}
                            >
                              {opt.subtitle.includes("@") ||
                              opt.subtitle.match(/\d{10}/) ? (
                                <Phone className="w-2.5 h-2.5 shrink-0" />
                              ) : (
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                              )}
                              {opt.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Check mark */}
                      {isSelected && (
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center shrink-0 ml-2",
                            v.checkBg,
                          )}
                        >
                          <Check
                            className={cn("w-3 h-3 stroke-2", v.checkColor)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}

              {/* Create option */}
              {showCreateOption && (
                <div
                  data-idx={filteredOptions.length}
                  onClick={handleCreate}
                  onMouseEnter={() => setActiveIndex(filteredOptions.length)}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer mt-1 border border-dashed transition-all duration-150",
                    activeIndex === filteredOptions.length
                      ? cn(v.createBg, v.createBorder)
                      : cn(
                          "border-slate-200/60 dark:border-slate-800/60 hover:border-slate-300/60 dark:hover:border-slate-700/60",
                          v.createBg,
                        ),
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
                      v.iconBg,
                    )}
                  >
                    <Plus className={cn("w-3.5 h-3.5", v.iconColor)} />
                  </div>
                  <div>
                    <div
                      className={cn("text-[13px] font-medium", v.createText)}
                    >
                      Add "{query}"
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Create new entry
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
