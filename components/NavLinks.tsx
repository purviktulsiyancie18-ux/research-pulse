"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const PRIMARY = [
  { href: "/", label: "Brief", match: (p: string) => p === "/" || /^\/briefs\/[^/]+$/.test(p) },
  { href: "/briefs", label: "Archive", match: (p: string) => p === "/briefs" },
  { href: "/library", label: "Library", match: (p: string) => p.startsWith("/library") },
  { href: "/settings", label: "Settings", match: (p: string) => p.startsWith("/settings") },
];
const SECONDARY = [
  { href: "/runs", label: "Runs" },
  { href: "/scoring", label: "Scoring" },
];

export function NavLinks({ libraryCount, showUnlock }: { libraryCount: number; showUnlock: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="no-scrollbar -mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1">
      {PRIMARY.map((n) => {
        const on = n.match(path);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? "page" : undefined}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-control px-3.5 font-display text-[14px] font-semibold transition duration-150 ${
              on ? "bg-primary-tint text-primary-hover" : "text-body hover:bg-hover hover:text-heading"
            }`}
          >
            {n.label}
            {n.href === "/library" && libraryCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-tint px-1.5 text-[11px] font-bold text-primary-hover font-tabular">
                {libraryCount}
              </span>
            )}
          </Link>
        );
      })}
      <span className="mx-1.5 h-5 w-px shrink-0 bg-line" aria-hidden />
      {SECONDARY.map((n) => {
        const on = path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={on ? "page" : undefined}
            className={`inline-flex h-10 shrink-0 items-center rounded-control px-3 font-display text-[13px] font-semibold transition duration-150 ${
              on ? "bg-primary-tint text-primary-hover" : "text-muted-text hover:bg-hover hover:text-heading"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
      {showUnlock && (
        <Link href={`/unlock?next=${encodeURIComponent(path)}`} className="btn btn-sm btn-secondary ml-1.5 shrink-0">
          <Lock size={14} /> Unlock
        </Link>
      )}
    </nav>
  );
}
