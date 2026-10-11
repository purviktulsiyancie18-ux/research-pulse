"use client";

import { ArrowRight, Bot, Brain, Code, Database, Lightbulb, ScanLine, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { accentFor, iconFor, type DomainIconName } from "@/lib/accents";

const ICONS: Record<DomainIconName, LucideIcon> = { bot: Bot, code: Code, database: Database, scan: ScanLine, brain: Brain, lightbulb: Lightbulb };
const CIRC = 113.1; // 2πr, r = 18

export interface TopicLink {
  id: number;
  name: string;
  caption: string;
  failed?: boolean;
}

/** Topic pills: jump to a section; ring shows reading progress; active = section in view. */
export function TopicNav({ topics }: { topics: TopicLink[] }) {
  const [active, setActive] = useState<number | null>(topics[0]?.id ?? null);
  const [progress, setProgress] = useState<Record<number, number>>({});

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = window.innerHeight / 2;
      let current: number | null = topics[0]?.id ?? null;
      const p: Record<number, number> = {};
      for (const t of topics) {
        const el = document.getElementById(`d-${t.id}`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top < 160) current = t.id;
        p[t.id] = Math.max(0, Math.min(1, (mid - r.top) / Math.max(1, r.height)));
      }
      setActive(current);
      setProgress(p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [topics]);

  return (
    <nav aria-label="Topics in this brief" className="flex flex-col gap-2.5">
      {topics.map((t) => {
        const a = accentFor(t.id);
        const Icon = ICONS[iconFor(t.name, t.id)];
        const on = active === t.id;
        const pr = progress[t.id] ?? 0;
        return (
          <button
            key={t.id}
            type="button"
            aria-current={on ? "location" : undefined}
            onClick={() => {
              const el = document.getElementById(`d-${t.id}`);
              if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" });
            }}
            className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[22px] border py-2 pr-3.5 pl-2 text-left transition duration-200"
            style={{
              background: on ? `linear-gradient(${a.tint}, ${a.tint}), #fff` : "#fff",
              borderColor: on ? a.border : "var(--color-line)",
              boxShadow: on ? "var(--shadow-pill-active)" : "var(--shadow-pill)",
            }}
          >
            <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center">
              <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90" aria-hidden>
                <circle cx="20" cy="20" r="18" fill="none" stroke="#EDF1F8" strokeWidth="3" />
                <circle
                  cx="20"
                  cy="20"
                  r="18"
                  fill="none"
                  stroke={a.fill}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - pr)}
                />
              </svg>
              <span className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-full" style={{ background: a.tint, color: a.ink }}>
                <Icon size={15} strokeWidth={2} />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-[14px] leading-5 font-bold text-heading" style={{ textWrap: "balance" }}>
                {t.name}
              </span>
              <span className="block text-[12px] leading-4" style={{ color: t.failed ? "#B91C1C" : on ? a.ink : "var(--color-muted-text)" }}>
                {t.caption}
              </span>
            </span>
            <ArrowRight size={16} className="shrink-0 text-body" style={{ opacity: on ? 1 : 0.35, color: on ? a.ink : undefined }} />
          </button>
        );
      })}
    </nav>
  );
}
