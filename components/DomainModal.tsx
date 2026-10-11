"use client";

import { Check, CircleCheck, Search, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { CATEGORY_GROUPS, categoryLabel } from "@/lib/glossary";
import type { Domain } from "@/lib/types";
import { Switch } from "./Controls";
import { InfoTip } from "./InfoTip";
import { TagInput } from "./TagInput";

export type DomainDraft = Omit<Domain, "id"> & { id?: number };

export function Modal({
  title,
  label,
  onClose,
  footer,
  children,
  maxWidth = 680,
}: {
  title: string;
  label?: string;
  onClose: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-heading/35 p-4 backdrop-blur-[6px] sm:p-8" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={label ?? title} className="my-auto w-full rounded-card bg-surface shadow-modal" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center gap-3 px-6 pt-6 sm:px-8 ${title ? "justify-between" : "justify-end"}`}>
          {title && <h2 className="h2">{title}</h2>}
          <button type="button" aria-label="Close" onClick={onClose} className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-body hover:bg-hover">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 sm:px-8">{children}</div>
        <div className="flex justify-end gap-2 border-t border-divider px-6 py-4 sm:px-8">{footer}</div>
      </div>
    </div>
  );
}

function CategoryPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [query, setQuery] = useState("");
  const groups = useMemo(() => {
    const known = new Set(CATEGORY_GROUPS.flatMap((g) => g.items.map(([c]) => c)));
    const extra = value.filter((c) => !known.has(c)).map((c) => [c, categoryLabel(c) || c] as [string, string]);
    const all = extra.length ? [...CATEGORY_GROUPS, { label: "Other", items: extra }] : CATEGORY_GROUPS;
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all
      .map((g) => ({ ...g, items: g.items.filter(([c, l]) => c.toLowerCase().includes(q) || l.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length);
  }, [query, value]);
  const toggle = (c: string) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);

  return (
    <div>
      <div className="mb-1.5 flex items-center">
        <span className="field-label mb-0">arXiv categories</span>
        <InfoTip text="Subject labels used on arXiv. A paper must be in one of the selected categories and also match a keyword." align="left" />
        <span className="ml-auto text-[12px] text-muted-text">{value.length} selected</span>
      </div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((c) => (
            <span key={c} className="inline-flex h-8 items-center gap-1 rounded-full bg-primary-tint pr-1 pl-3 text-[13px] font-medium text-primary-pressed">
              {categoryLabel(c) || c}
              <button type="button" aria-label={`Remove ${c}`} onClick={() => toggle(c)} className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full hover:bg-black/8">
                <X size={13} strokeWidth={2.25} />
              </button>
            </span>
          ))}
        </div>
      )}
      <label className="relative block">
        <span className="sr-only">Search categories</span>
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-text" />
        <input className="input pl-10" placeholder="Search categories, e.g. vision, cs.CL" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="mt-2 max-h-[260px] overflow-y-auto rounded-panel bg-panel p-2">
        {groups.length === 0 && <p className="px-2 py-3 text-[13px] text-muted-text">No categories match “{query}”.</p>}
        {groups.map((g) => (
          <div key={g.label} className="mb-1">
            <p className="eyebrow px-2 pt-2 pb-1 text-muted-text">{g.label}</p>
            {g.items.map(([code, label]) => {
              const on = value.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(code)}
                  className="flex min-h-10 w-full cursor-pointer items-center gap-3 rounded-icon px-2 text-left hover:bg-surface"
                >
                  <span
                    className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${
                      on ? "border-primary bg-primary text-white" : "border-line-strong bg-surface"
                    }`}
                  >
                    {on && <Check size={12} strokeWidth={3} />}
                  </span>
                  <span className="flex-1 text-[14px] text-heading">{label}</span>
                  <span className="font-mono text-[11px] text-muted-text">{code}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

type Preview = { count: number; capped: boolean; titles: { title: string; url: string }[] };

export function DomainModal({ draft, onClose, onSaved }: { draft: DomainDraft; onClose: () => void; onSaved: (msg: string) => void }) {
  const [d, setD] = useState<DomainDraft>(draft);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Preview | "loading" | string | null>(null);
  const set = <K extends keyof DomainDraft>(k: K, v: DomainDraft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function save() {
    if (!d.name.trim()) {
      setNameError(true);
      return;
    }
    if (!d.keywords.length) {
      setError("Add at least one keyword.");
      return;
    }
    setSaving(true);
    setError(null);
    const body = {
      name: d.name,
      description: d.description,
      keywords: d.keywords,
      categories: d.categories,
      exclude_keywords: d.exclude_keywords,
      priority: d.priority,
      papers_per_domain: d.papers_per_domain,
      active: d.active,
    };
    try {
      if (d.id) await api(`/api/domains/${d.id}`, { method: "PATCH", json: body });
      else await api("/api/domains", { method: "POST", json: body });
      onSaved(d.id ? `Saved “${d.name}”` : `Added “${d.name}”`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function runPreview() {
    setPreview("loading");
    try {
      setPreview(
        await api<Preview>(`/api/domains/${d.id ?? "new"}/preview`, {
          method: "POST",
          json: { keywords: d.keywords, categories: d.categories, exclude_keywords: d.exclude_keywords },
        }),
      );
    } catch (e) {
      setPreview((e as Error).message);
    }
  }

  return (
    <Modal
      title={d.id ? `Edit ${draft.name}` : "Add domain"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save domain"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <label className="field-label" htmlFor="dm-name">
            Name
          </label>
          <input
            id="dm-name"
            className={`input ${nameError ? "border-error!" : ""}`}
            value={d.name}
            onChange={(e) => {
              set("name", e.target.value);
              setNameError(false);
            }}
            placeholder="e.g. AI for Healthcare Ops"
          />
          {nameError && <p className="mt-1 text-[13px] text-error-ink">Give this domain a name.</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="dm-desc">
            What counts as relevant
          </label>
          <textarea
            id="dm-desc"
            className="input min-h-[72px]"
            value={d.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="One sentence — the AI reads this to judge which papers fit"
          />
        </div>
        <div>
          <p className="field-label">Keywords</p>
          <TagInput label="Keywords" value={d.keywords} onChange={(v) => set("keywords", v)} placeholder="Type a word or phrase, press Enter" />
        </div>
        <CategoryPicker value={d.categories} onChange={(v) => set("categories", v)} />
        <div>
          <p className="field-label">Exclude papers containing</p>
          <TagInput label="Exclude words" tone="red" value={d.exclude_keywords} onChange={(v) => set("exclude_keywords", v)} placeholder="e.g. medical" />
        </div>
        <div className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="field-label" htmlFor="dm-pri">
              Priority
            </label>
            <select id="dm-pri" className="input" value={d.priority} onChange={(e) => set("priority", e.target.value as Domain["priority"])}>
              <option value="high">High — shown first, +1 paper</option>
              <option value="normal">Normal</option>
              <option value="low">Low — 1 fewer paper</option>
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="dm-ppd">
              Papers per domain
            </label>
            <select
              id="dm-ppd"
              className="input"
              value={d.papers_per_domain ?? ""}
              onChange={(e) => set("papers_per_domain", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Use global setting</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <label className="flex min-h-11 items-center gap-2.5 font-display text-[14px] font-semibold text-heading">
            <Switch label="Active" checked={d.active} onChange={(v) => set("active", v)} /> Active
          </label>
        </div>

        <div className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[14px] text-heading">Test on the last 7 days of arXiv — no AI used.</p>
            <button type="button" className="btn btn-sm btn-secondary" onClick={runPreview} disabled={(!d.keywords.length && !d.categories.length) || preview === "loading"}>
              Run preview
            </button>
          </div>
          {preview === "loading" && (
            <div className="mt-3 flex flex-col gap-2">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3.5 w-5/6" />
            </div>
          )}
          {typeof preview === "string" && preview !== "loading" && <p className="mt-2 text-[13px] text-error-ink">{preview}</p>}
          {preview && typeof preview === "object" && (
            <div className="mt-3">
              <p className="flex items-center gap-1.5 text-[14px] font-semibold text-heading">
                {preview.count > 150 || preview.count === 0 ? (
                  <TriangleAlert size={16} className="text-amber-ink" />
                ) : (
                  <CircleCheck size={16} className="text-success-ink" />
                )}
                {preview.count}
                {preview.capped ? "+" : ""} papers matched
                {preview.count > 150 && <span className="font-normal text-amber-ink">— consider narrower keywords</span>}
                {preview.count === 0 && <span className="font-normal text-amber-ink">— try broader keywords</span>}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {preview.titles.map((t) => (
                  <li key={t.url}>
                    <a href={t.url} target="_blank" rel="noreferrer" className="text-[13px] text-primary hover:text-primary-hover hover:underline">
                      {t.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {error && <p className="text-[13px] text-error-ink">{error}</p>}
      </div>
    </Modal>
  );
}
