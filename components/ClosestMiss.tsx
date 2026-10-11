"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function ClosestMiss({ score, passMark, title, url, summary }: { score: number; passMark: number; title: string; url: string; summary: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="-ml-3 inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-control px-3 font-display text-[14px] font-semibold text-primary hover:bg-primary/6"
      >
        Closest miss
        <ChevronDown size={16} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-1 rounded-panel border border-line bg-surface px-[18px] py-3.5">
          <p className="text-[12px] text-muted-text">
            <span className="font-display font-extrabold text-heading font-tabular">{score.toFixed(1)}/10</span> · just under your pass mark of{" "}
            {passMark.toFixed(1)}
          </p>
          <a href={url} target="_blank" rel="noreferrer" className="mt-1 block font-display text-[16px] leading-6 font-bold text-heading hover:text-primary-hover">
            {title}
          </a>
          <p className="mt-1 line-clamp-2 text-[14px] leading-[22px] text-body">{summary}</p>
        </div>
      )}
    </div>
  );
}
