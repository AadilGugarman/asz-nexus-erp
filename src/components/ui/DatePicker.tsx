import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  variant?: 'emerald' | 'violet' | 'sky' | 'amber';
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  className = '',
  disabled = false,
  variant = 'emerald',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverId = useRef(`dp-${Math.random().toString(36).substr(2, 6)}`).current;

  // Internal view state
  const [viewDate, setViewDate] = useState(() => {
    return value ? new Date(value) : new Date();
  });

  const selectedDate = useMemo(() => (value ? new Date(value) : null), [value]);

  const updatePosition = useCallback(() => {
    if (containerRef.current) setRect(containerRef.current.getBoundingClientRect());
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

  const handleDateSelect = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const calendarDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const days = [];
    
    // Previous month days
    const prevMonthDays = daysInMonth(year, month - 1);
    const firstDay = firstDayOfMonth(year, month);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false,
      });
    }

    // Current month days
    const currentMonthDays = daysInMonth(year, month);
    for (let i = 1; i <= currentMonthDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // Next month days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false,
      });
    }

    return days;
  }, [viewDate]);

  const themes = {
    emerald: {
      accent: 'emerald',
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500',
      hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/10',
      border: 'border-emerald-500/20',
      ring: 'focus-within:ring-emerald-500/10',
    },
    violet: {
      accent: 'violet',
      text: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-500',
      hover: 'hover:bg-violet-50 dark:hover:bg-violet-500/10',
      border: 'border-violet-500/20',
      ring: 'focus-within:ring-violet-500/10',
    },
    sky: {
      accent: 'sky',
      text: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-500',
      hover: 'hover:bg-sky-50 dark:hover:bg-sky-500/10',
      border: 'border-sky-500/20',
      ring: 'focus-within:ring-sky-500/10',
    },
    amber: {
      accent: 'amber',
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500',
      hover: 'hover:bg-amber-50 dark:hover:bg-amber-500/10',
      border: 'border-amber-500/20',
      ring: 'focus-within:ring-amber-500/10',
    },
  };

  const t = themes[variant];

  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    return selectedDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [selectedDate]);

  const weekday = useMemo(() => {
    if (!selectedDate) return '';
    return selectedDate.toLocaleDateString('en-IN', { weekday: 'long' });
  }, [selectedDate]);

  return (
    <div className={cn('relative w-full', className)} ref={containerRef}>
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 block">
          {label}
        </span>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border transition-all text-left',
          'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800',
          'hover:border-slate-300 dark:hover:border-slate-700',
          isOpen && cn('ring-2 border-transparent', t.ring, `border-${t.accent}-500/50`),
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <CalendarIcon className={cn('w-3.5 h-3.5', t.text)} />
        <span className="flex-1 truncate">
          {formattedDate || 'Select date'}
        </span>
        {value && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase font-bold">
            {weekday}
          </span>
        )}
      </button>

      {isOpen && rect && createPortal(
        <div
          id={popoverId}
          style={{
            position: 'fixed',
            top: rect.bottom + 8,
            left: Math.min(rect.left, window.innerWidth - 280 - 16),
            width: 280,
            zIndex: 9999,
          }}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Calendar Header */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <button
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}
              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <span className="text-xs font-bold dark:text-white text-slate-900 uppercase tracking-tight">
              {viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </span>
            <button
              onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}
              className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>

          {/* Weekdays */}
          <div className="grid grid-cols-7 gap-0 p-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <span key={d} className="text-[10px] font-bold text-center py-2 text-slate-400 uppercase">
                {d}
              </span>
            ))}
            
            {calendarDays.map((day, i) => {
              const isSelected = selectedDate && 
                day.date.getDate() === selectedDate.getDate() &&
                day.date.getMonth() === selectedDate.getMonth() &&
                day.date.getFullYear() === selectedDate.getFullYear();
              
              const isToday = new Date().toDateString() === day.date.toDateString();

              return (
                <button
                  key={i}
                  onClick={() => handleDateSelect(day.date)}
                  className={cn(
                    'aspect-square flex items-center justify-center text-[11px] rounded-lg transition-all relative',
                    !day.isCurrentMonth && 'text-slate-300 dark:text-slate-600',
                    day.isCurrentMonth && !isSelected && 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
                    isSelected && cn('text-white font-bold', t.bg, 'shadow-lg shadow-emerald-500/20'),
                    isToday && !isSelected && cn('text-emerald-500 font-bold')
                  )}
                >
                  {day.date.getDate()}
                  {isToday && !isSelected && (
                    <span className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
            <button
              onClick={() => handleDateSelect(new Date())}
              className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1"
            >
              Today
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
