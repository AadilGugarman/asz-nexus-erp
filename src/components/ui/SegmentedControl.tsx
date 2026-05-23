import React from "react";

interface Option {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  className = "",
  label,
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 w-fit">
        {options.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`
                px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200
                ${
                  isActive
                    ? "bg-white text-amber-600 shadow-sm ring-1 ring-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
