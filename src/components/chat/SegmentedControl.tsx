import React from "react";

interface SegmentedControlProps {
  options: { label: string; value: string; disabled?: boolean }[];
  value: string;
  onChange: (val: string) => void;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange }) => {
  return (
    <div className="inline-flex bg-bg-soft p-1 rounded-lg">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            disabled={opt.disabled}
            onClick={() => onChange(opt.value)}
            className={`
              relative px-4 py-1.5 text-[13.5px] font-bold rounded-md transition-all duration-200 select-none
              ${isActive ? "text-brand shadow-sm bg-white" : "text-text-muted hover:text-text-primary"}
              ${opt.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
            `}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};
