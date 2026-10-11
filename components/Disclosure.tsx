"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

/** Toggle row (with server-rendered `aside` content beside it) that reveals `children`. */
export function Disclosure({
  label,
  openLabel = "Show less",
  aside,
  children,
  defaultOpen = false,
}: {
  label: string;
  openLabel?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="no-print -ml-3 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-control px-3 font-display text-[14px] font-semibold text-primary hover:bg-primary/6"
        >
          {open ? openLabel : label}
          <ChevronDown size={16} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        {aside}
      </div>
      <div data-print-open className={open ? "block" : "hidden"}>
        {children}
      </div>
    </>
  );
}
