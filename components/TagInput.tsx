"use client";

import { useState } from "react";

/** Chips input: Enter or comma adds a tag, Backspace on empty removes the last one. */
export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
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
    <div className="input flex min-h-[38px] flex-wrap items-center gap-1">
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-xs text-brand">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} className="hover:text-red-700">
            ×
          </button>
        </span>
      ))}
      <input
        className="min-w-[120px] flex-1 bg-transparent outline-none"
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
