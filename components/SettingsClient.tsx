"use client";

import { ChevronDown, CircleCheck, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { accentFor } from "@/lib/accents";
import { api } from "@/lib/client";
import { categoryLabel } from "@/lib/glossary";
import type { Domain, Settings } from "@/lib/types";
import { Segmented, Stepper, Switch } from "./Controls";
import { DomainModal, Modal, type DomainDraft } from "./DomainModal";
import { InfoTip } from "./InfoTip";
import { TagInput } from "./TagInput";
import { toast } from "./Toast";

const EMPTY: DomainDraft = {
  name: "",
  description: "",
  keywords: [],
  categories: [],
  exclude_keywords: [],
  priority: "normal",
  papers_per_domain: null,
  active: true,
};

const PRIORITY: Record<Domain["priority"], string> = {
  high: "bg-primary-tint text-primary-hover",
  normal: "bg-[#EEF0F6] text-body",
  low: "bg-teal/12 text-teal-ink",
};

function Card({ title, sub, tip, action, children }: { title: string; sub?: string; tip?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <div className="min-w-0 flex-1">
          <h2 className="h2 flex items-center">
            {title}
            {tip && <InfoTip text={tip} align="left" />}
          </h2>
          {sub && <p className="text-[14px] text-muted-text">{sub}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function SettingsClient({ domains, settings, defaultRecipient }: { domains: Domain[]; settings: Settings; defaultRecipient: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState<DomainDraft | null>(null);
  const [deleting, setDeleting] = useState<Domain | null>(null);
  const [busy, setBusy] = useState(false);
  const active = domains.filter((d) => d.active).length;

  async function toggle(d: Domain) {
    try {
      await api(`/api/domains/${d.id}`, { method: "PATCH", json: { active: !d.active } });
      toast(d.active ? `Paused “${d.name}”` : `Resumed “${d.name}”`);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  async function remove(d: Domain) {
    setBusy(true);
    try {
      await api(`/api/domains/${d.id}`, { method: "DELETE" });
      toast(`Deleted “${d.name}”`);
      setDeleting(null);
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card
        title="Domains"
        sub={`${active} active · ${domains.length - active} paused`}
        action={
          <button className="btn btn-secondary" onClick={() => setEditing({ ...EMPTY })}>
            <Plus size={17} /> Add domain
          </button>
        }
      >
        {domains.length === 0 && <p className="text-[14px] text-muted-text">No domains yet — add one to start.</p>}
        <div className="flex flex-col gap-3">
          {domains.map((d) => (
            <div key={d.id} className="panel flex flex-wrap items-start gap-4 p-4 sm:p-5">
              <div className="pt-0.5">
                <Switch label={`${d.name} active`} checked={d.active} onChange={() => toggle(d)} />
              </div>
              <div className={`min-w-0 flex-1 ${d.active ? "" : "opacity-65"}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: accentFor(d.id).fill }} />
                  <span className="font-display text-[17px] font-bold text-heading">{d.name}</span>
                  <span className={`pill py-0.5 text-[11px] ${PRIORITY[d.priority]}`}>{d.priority} priority</span>
                  {!d.active && <span className="pill bg-[#EEF0F6] py-0.5 text-[11px] text-body">Paused</span>}
                </div>
                {d.description && <p className="mt-1 text-[14px] text-body italic">{d.description}</p>}
                <p className="mt-1.5 text-[12px] leading-[18px] text-muted-text">
                  <span className="font-semibold text-body">Categories:</span> {d.categories.map((c) => `${c} · ${categoryLabel(c)}`).join(", ") || "—"}
                </p>
                <p className="text-[12px] leading-[18px] text-muted-text">
                  <span className="font-semibold text-body">Keywords:</span> {d.keywords.join(", ")}
                </p>
                {d.exclude_keywords.length > 0 && (
                  <p className="text-[12px] leading-[18px] text-muted-text">
                    <span className="font-semibold text-body">Excludes:</span> {d.exclude_keywords.join(", ")}
                  </p>
                )}
              </div>
              <div className="flex gap-2 max-sm:w-full max-sm:justify-end">
                <button className="btn btn-sm btn-ghost text-primary" onClick={() => setEditing({ ...d })}>
                  <Pencil size={14} /> Edit
                </button>
                <button className="btn btn-sm btn-danger" onClick={() => setDeleting(d)}>
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Preferences settings={settings} defaultRecipient={defaultRecipient} />

      {editing && (
        <DomainModal
          draft={editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            toast(msg);
            router.refresh();
          }}
        />
      )}

      {deleting && (
        <Modal
          title=""
          label="Delete domain"
          maxWidth={440}
          onClose={() => setDeleting(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button className="btn bg-error text-white hover:bg-error-ink" disabled={busy} onClick={() => remove(deleting)}>
                {busy ? "Deleting…" : "Delete domain"}
              </button>
            </>
          }
        >
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-error/10 text-error-ink">
              <Trash2 size={22} />
            </span>
            <p className="h3 mt-3">Delete “{deleting.name}”?</p>
            <p className="mt-1 text-[14px] text-body">Future briefs won&apos;t include it. Past briefs keep their papers.</p>
          </div>
        </Modal>
      )}
    </div>
  );
}

const STYLE_HELP: Record<Settings["ranking_style"], string> = {
  breakthroughs: "Fewer, stronger papers: leans on significance, stricter pass mark, at most 3 per domain.",
  balanced: "The recommended mix of significance, relevance and signals.",
  broad: "More papers: leans on relevance, looser pass mark, 2 extra per domain.",
};

function Preferences({ settings, defaultRecipient }: { settings: Settings; defaultRecipient: string | null }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(settings);
  const [saved, setSaved] = useState<Settings>(settings);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [advanced, setAdvanced] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((x) => ({ ...x, [k]: v }));
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);

  async function save() {
    setState("saving");
    try {
      const body = { ...s, recipient_email: s.recipient_email ?? "", client_lens: s.client_lens ?? "" };
      await api("/api/settings", { method: "PATCH", json: body });
      setSaved(s);
      setState("saved");
      toast("Preferences saved");
      router.refresh();
    } catch (e) {
      setState("idle");
      toast((e as Error).message, "error");
    }
  }

  async function togglePause(v: boolean) {
    set("delivery_paused", v);
    setSaved((x) => ({ ...x, delivery_paused: v }));
    try {
      await api("/api/settings", { method: "PATCH", json: { delivery_paused: v } });
      toast(v ? "Monday delivery paused" : "Monday delivery resumed");
      router.refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <>
      <Card title="Delivery">
        <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <p className="flex items-center font-display text-[15px] font-semibold text-heading">
            Every Monday, 5:30–6:29 AM IST (India Standard Time)
            <InfoTip text="The schedule is fixed by the system (set in the code). Use the switch to pause a week; the next brief covers everything since the last one sent." align="left" />
          </p>
          <label className="flex items-center gap-2.5 text-[14px] font-medium text-heading">
            <Switch label="Pause Monday delivery" checked={s.delivery_paused} onChange={togglePause} />
            Pause Monday delivery
          </label>
        </div>
        <div className="mt-4 max-w-md">
          <label className="field-label" htmlFor="st-email">
            Recipient email
          </label>
          <input
            id="st-email"
            type="email"
            className="input"
            value={s.recipient_email ?? ""}
            placeholder={defaultRecipient ?? "you@example.com"}
            onChange={(e) => set("recipient_email", e.target.value)}
          />
        </div>
      </Card>

      <Card title="What gets included">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="field-label">Papers per domain</p>
            <Stepper label="papers per domain" value={s.papers_per_domain} min={1} max={8} onChange={(v) => set("papers_per_domain", v)} />
          </div>
          <div>
            <p className="field-label">Days to look back</p>
            <Stepper label="days to look back" value={s.lookback_days} min={1} max={31} onChange={(v) => set("lookback_days", v)} />
            <p className="helper">Used by “Last N days” and your first brief.</p>
          </div>
          <div className="sm:col-span-2">
            <div className="flex items-center">
              <label className="field-label mb-0" htmlFor="st-thr">
                Significance threshold
              </label>
              <InfoTip text="Your pass mark: the minimum score out of 10 a paper needs to be included. Higher = stricter, fewer papers." align="left" />
              <span className="pill ml-auto bg-primary-tint text-primary-hover font-tabular">{s.significance_threshold.toFixed(1)}</span>
            </div>
            <input
              id="st-thr"
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={s.significance_threshold}
              onChange={(e) => set("significance_threshold", Number(e.target.value))}
              className="mt-3 w-full accent-primary"
            />
            <p className="helper">Your pass mark — papers scoring below {s.significance_threshold.toFixed(1)} are left out.</p>
          </div>
          <div className="sm:col-span-2">
            <p className="field-label">Ranking style</p>
            <Segmented
              label="Ranking style"
              value={s.ranking_style}
              onChange={(v) => set("ranking_style", v)}
              options={[
                { value: "breakthroughs", label: "Breakthroughs only" },
                { value: "balanced", label: "Balanced" },
                { value: "broad", label: "Broad" },
              ]}
            />
            <p className="helper">{STYLE_HELP[s.ranking_style]}</p>
          </div>
          <div>
            <p className="field-label">Reading time cap</p>
            <Segmented
              label="Reading time cap"
              value={String(s.reading_minutes)}
              onChange={(v) => set("reading_minutes", Number(v))}
              options={[
                { value: "5", label: "5 min" },
                { value: "10", label: "10 min" },
              ]}
            />
          </div>
        </div>
      </Card>

      <Card title="Writing style">
        <p className="field-label">Detail level</p>
        <div role="radiogroup" aria-label="Detail level" className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["short", "Short", "One-line summary"],
              ["standard", "Standard", "Summary, key finding, why it matters, client angle"],
              ["detailed", "Detailed", "Adds method & limitations"],
            ] as const
          ).map(([v, label, desc]) => {
            const on = s.detail_level === v;
            return (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => set("detail_level", v)}
                className={`cursor-pointer rounded-panel border-[1.5px] p-4 text-left transition ${on ? "border-primary bg-primary-tint" : "border-line-strong bg-surface hover:border-primary/50"}`}
              >
                <span className={`block font-display text-[15px] font-bold ${on ? "text-primary-hover" : "text-heading"}`}>{label}</span>
                <span className="mt-0.5 block text-[13px] leading-5 text-muted-text">{desc}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 max-w-md">
          <label className="field-label" htmlFor="st-lens">
            Client lens
          </label>
          <input
            id="st-lens"
            className="input"
            value={s.client_lens ?? ""}
            placeholder="e.g. banking — tailors the client angle"
            onChange={(e) => set("client_lens", e.target.value || null)}
          />
        </div>
      </Card>

      <Card title="Watch-list" tip="Papers that mention any author, lab or term listed here get a +1.5 score boost.">
        <div className="flex flex-col gap-4">
          <div>
            <p className="field-label">Authors</p>
            <TagInput label="Authors" tone="sky" value={s.watchlist_authors} onChange={(v) => set("watchlist_authors", v)} placeholder="e.g. Yann LeCun" />
          </div>
          <div>
            <p className="field-label">Labs / organisations</p>
            <TagInput label="Labs" value={s.watchlist_orgs} onChange={(v) => set("watchlist_orgs", v)} placeholder="e.g. Google DeepMind" />
          </div>
          <div>
            <p className="field-label">Benchmarks / terms</p>
            <TagInput label="Terms" tone="pink" value={s.watchlist_terms} onChange={(v) => set("watchlist_terms", v)} placeholder="e.g. SWE-bench" />
          </div>
        </div>
      </Card>

      <section className="card">
        <button type="button" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)} className="flex w-full cursor-pointer items-center justify-between text-left">
          <span className="h2">Advanced</span>
          <ChevronDown size={22} className={`text-muted-text transition-transform duration-200 ${advanced ? "rotate-180" : ""}`} />
        </button>
        {advanced && (
          <div className="mt-5 flex flex-col gap-1">
            {[
              { label: "arXiv", desc: "Where papers come from — always on", checked: true, disabled: true, on: () => {} },
              {
                label: "Semantic Scholar",
                desc: "Author seniority",
                checked: s.sources.semantic_scholar,
                on: (v: boolean) => set("sources", { ...s.sources, semantic_scholar: v }),
              },
              { label: "Hugging Face", desc: "Community likes", checked: s.sources.huggingface, on: (v: boolean) => set("sources", { ...s.sources, huggingface: v }) },
              {
                label: "Email manual refreshes by default",
                desc: "Pre-ticks “Email this brief when ready”",
                checked: s.email_manual_refresh_default,
                on: (v: boolean) => set("email_manual_refresh_default", v),
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-4 border-b border-divider py-3 last:border-0">
                <span className="flex-1">
                  <span className="block text-[15px] font-medium text-heading">{row.label}</span>
                  <span className="block text-[12px] text-muted-text">{row.desc}</span>
                </span>
                <Switch label={row.label} checked={row.checked} disabled={row.disabled} onChange={row.on} />
              </div>
            ))}
            <div className="mt-3 max-w-[220px]">
              <label className="field-label" htmlFor="st-cool">
                Refresh cooldown (minutes)
              </label>
              <input
                id="st-cool"
                type="number"
                min={0}
                max={240}
                className="input"
                value={s.refresh_cooldown_minutes}
                onChange={(e) => set("refresh_cooldown_minutes", Number(e.target.value))}
              />
            </div>
          </div>
        )}
      </section>

      <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white/90 px-5 py-3 shadow-card backdrop-blur-md">
        <span className="text-[14px]" aria-live="polite">
          {dirty ? (
            <span className="font-medium text-amber-ink">Unsaved changes</span>
          ) : state === "saved" ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-success-ink">
              <CircleCheck size={16} /> Saved
            </span>
          ) : (
            <span className="text-muted-text">All changes saved</span>
          )}
        </span>
        <button className="btn btn-primary" onClick={save} disabled={!dirty || state === "saving"}>
          {state === "saving" ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </>
  );
}
