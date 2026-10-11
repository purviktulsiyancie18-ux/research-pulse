"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PROGRESS_LABELS } from "@/lib/glossary";
import { RetryDomainButton } from "./RetryDomainButton";

export interface RunItem {
  id: string;
  status: string;
  started: string; // "11 Oct, 16:16 IST"
  trigger: string; // "Manual" | "Weekly (automatic)"
  mode: string;
  window: string;
  summary: string; // "87s · 299 scanned · 8 included · 10 AI calls"
  error: string | null;
  briefId: string | null;
  footer: string;
  topics: { id: number; name: string; status: string; detail: string; error?: string }[];
}

const STATUS: Record<string, string> = {
  succeeded: "bg-success/12 text-success-ink",
  partial: "bg-amber/14 text-amber-ink",
  failed: "bg-error/10 text-error-ink",
  running: "bg-primary-tint text-primary-hover",
  queued: "bg-[#EEF0F6] text-body",
  skipped: "bg-[#EEF0F6] text-body",
  done: "bg-success/12 text-success-ink",
  fetching: "bg-primary-tint text-primary-hover",
  enriching: "bg-primary-tint text-primary-hover",
  ranking: "bg-primary-tint text-primary-hover",
};

function Badge({ status, wide }: { status: string; wide?: boolean }) {
  return (
    <span className={`pill justify-center text-[11px] tracking-[0.06em] uppercase ${STATUS[status] ?? STATUS.queued} ${wide ? "min-w-[98px]" : ""}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}

export function RunsList({ runs }: { runs: RunItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!runs.length) return <div className="card text-center text-[15px] text-muted-text">No runs yet.</div>;
  return (
    <div className="card flex flex-col gap-1 p-3!">
      {runs.map((r) => {
        const isOpen = open === r.id;
        return (
          <div key={r.id} className={`rounded-panel transition-colors ${isOpen ? "bg-panel" : ""}`}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : r.id)}
              className="flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-2 rounded-panel px-4 py-3.5 text-left hover:bg-panel"
            >
              <Badge status={r.status} wide />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[15px] font-bold text-heading">
                  {r.started} · {r.trigger}
                </span>
                <span className="block text-[12px] text-muted-text">
                  {r.mode} · {r.window}
                </span>
              </span>
              <span className="text-[12px] text-muted-text font-tabular">{r.summary}</span>
              <ChevronDown size={18} className={`text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <div className="px-4 pb-4">
                {r.error && <p className="mb-3 rounded-panel border border-error/35 bg-error/8 px-4 py-3 text-[14px] font-medium text-error-ink">{r.error}</p>}
                {r.topics.length > 0 && (
                  <div className="divide-y divide-divider rounded-panel border border-line bg-surface">
                    {r.topics.map((t) => (
                      <div key={t.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-semibold text-heading">{t.name}</span>
                          <span className={`block text-[12px] ${t.error ? "text-error-ink" : "text-muted-text"}`}>{t.error ?? t.detail}</span>
                        </span>
                        <span className={`pill py-0.5 text-[11px] ${STATUS[t.status] ?? STATUS.queued}`}>{PROGRESS_LABELS[t.status] ?? t.status}</span>
                        {(t.status === "failed" || t.status === "skipped") && r.briefId && <RetryDomainButton runId={r.id} domainId={t.id} name={t.name} />}
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-3 flex flex-wrap items-center gap-x-3 text-[12px] text-muted-text">
                  {r.footer}
                  {r.briefId && (
                    <Link href={`/briefs/${r.briefId}`} className="inline-flex items-center gap-1 font-display font-semibold text-primary hover:text-primary-hover">
                      Open brief <ArrowRight size={13} />
                    </Link>
                  )}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
