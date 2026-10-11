"use client";

import { Minus, Plus } from "lucide-react";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[26px] w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-primary" : "bg-[#C3C8DB]"
      }`}
    >
      <span
        className={`absolute left-[3px] h-5 w-5 rounded-full bg-white shadow-[0_1px_3px_rgba(21,26,51,.25)] transition-transform duration-150 ${
          checked ? "translate-x-[18px]" : ""
        }`}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex max-w-full flex-wrap gap-1 rounded-full bg-hover p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`cursor-pointer rounded-full px-3.5 font-display font-semibold whitespace-nowrap transition duration-150 ${
              size === "sm" ? "min-h-9 text-[13px]" : "min-h-10 text-[14px]"
            } ${on ? "bg-primary text-white shadow-[0_4px_12px_rgba(37,99,235,0.25)]" : "text-body hover:text-heading"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  return (
    <div className="inline-flex items-center rounded-full border-[1.5px] border-line-strong bg-surface">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-body hover:bg-hover disabled:opacity-40"
      >
        <Minus size={16} />
      </button>
      <span className="min-w-8 text-center font-display text-[16px] font-bold text-heading font-tabular" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-body hover:bg-hover disabled:opacity-40"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
