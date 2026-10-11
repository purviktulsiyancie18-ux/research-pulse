"use client";

import { useId, useState } from "react";

/** Small ⓘ trigger (28px hit area) that reveals an explanation on hover, focus or tap. Use at most one per row. */
export function InfoTip({ text, align = "center" }: { text: string; align?: "center" | "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const pos = align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span className="no-print relative inline-flex align-middle" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label="More info"
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex h-7 w-7 cursor-help items-center justify-center rounded-full text-muted-text hover:text-primary"
      >
        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border-[1.5px] border-current font-display text-[10px] leading-none font-bold">
          i
        </span>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute bottom-full z-50 mb-1 w-[250px] max-w-[70vw] rounded-icon bg-heading px-3 py-2.5 text-left font-sans text-[13px] leading-5 font-normal tracking-normal text-white normal-case shadow-tip ${pos}`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
