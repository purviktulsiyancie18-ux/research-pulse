"use client";

import { X } from "lucide-react";
import { useState } from "react";

const TONES = {
  blue: "bg-primary-tint text-primary-pressed",
  sky: "bg-sky/12 text-sky-ink",
  pink: "bg-pink/12 text-pink-ink",
  red: "bg-error/10 text-error-ink",
  teal: "bg-teal/12 text-teal-ink",
};

/** Chip input: Enter or comma adds a chip, Backspace on an empty field removes the last one. */
export function TagInput({
  value,
  onChange,
  placeholder,
  tone = "blue",
  label,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  tone?: keyof typeof TONES;
  label?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((s) => !value.includes(s));
    if (parts.length) onChange([...value, ...parts]);
    setDraft("");
  };
  return (
    <div className="flex min-h-12 w-full flex-wrap items-center gap-1.5 rounded-control border-[1.5px] border-line-strong bg-surface px-2 py-1.5 transition focus-within:border-primary focus-within:shadow-focus">
      {value.map((t) => (
        <span key={t} className={`inline-flex h-8 items-center gap-1 rounded-full pr-1 pl-3 text-[13px] font-medium ${TONES[tone]}`}>
          {t}
          <button
            type="button"
            aria-label={`Remove ${t}`}
            onClick={() => onChange(value.filter((x) => x !== t))}
            className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:bg-black/8"
          >
            <X size={13} strokeWidth={2.25} />
          </button>
        </span>
      ))}
      <input
        aria-label={label}
        className="min-h-8 min-w-[140px] flex-1 bg-transparent px-1.5 text-[15px] text-heading outline-none placeholder:text-muted"
        value={draft}
        placeholder={value.length ? "" : placeholder}
        onChange={(e) => {
          if (e.target.value.includes(",")) add(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => draft && add(draft)}
      />
    </div>
  );
}
