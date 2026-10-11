"use client";

import { useState } from "react";

/** Small ⓘ icon that reveals an explanation on hover (desktop) or tap (mobile). */
export function InfoTip({ text, align = "center" }: { text: string; align?: "center" | "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const pos =
    align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2";
  return (
    <span
      className="no-print relative ml-1 inline-flex align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="More info"
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onBlur={() => setOpen(false)}
        className="inline-flex h-[15px] w-[15px] items-center justify-center rounded-full border border-current font-serif text-[10px] font-bold italic leading-none text-muted opacity-70 transition hover:text-brand hover:opacity-100"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute bottom-full z-40 mb-1.5 w-64 max-w-[80vw] rounded-md bg-[#17201b] px-2.5 py-1.5 text-left text-xs font-normal normal-case leading-snug tracking-normal text-white shadow-lg ${pos}`}
        >
          {text}
        </span>
      )}
    </span>
  );
}
