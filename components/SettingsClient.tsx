"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import type { Domain, Settings } from "@/lib/types";
import { TagInput } from "./TagInput";

type DomainDraft = Omit<Domain, "id"> & { id?: number };

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

const PRIORITY_STYLE = { high: "bg-red-50 text-red-700", normal: "bg-gray-100 text-gray-700", low: "bg-blue-50 text-blue-700" };

export function SettingsClient(props: { domains: Domain[]; settings: Settings; categories: string[]; defaultRecipient: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState<DomainDraft | null>(null);
  const [rowMsg, setRowMsg] = useState<string | null>(null);

  async function toggle(d: Domain) {
    try {
      await api(`/api/domains/${d.id}`, { method: "PATCH", json: { active: !d.active } });
      router.refresh();
    } catch (e) {
      setRowMsg((e as Error).message);
    }
  }
  async function remove(d: Domain) {
    if (!confirm(`Delete “${d.name}”? Its papers in past briefs will be removed from the archive too.`)) return;
    try {
      await api(`/api/domains/${d.id}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      setRowMsg((e as Error).message);
    }
  }

  return (
    <div className="grid gap-8">
      <section>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Domains</h2>
            <p className="text-sm text-muted">What gets scanned every run. Changes apply from the next run — no code needed.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setEditing({ ...EMPTY })}>
            + Add domain
          </button>
        </div>
        {rowMsg && <p className="mt-2 text-sm text-red-700">{rowMsg}</p>}
        <div className="card mt-3 divide-y divide-line">
          {props.domains.length === 0 && <p className="p-4 text-sm text-muted">No domains yet — add one to start.</p>}
          {props.domains.map((d) => (
            <div key={d.id} className={`flex flex-wrap items-center gap-3 p-3 ${d.active ? "" : "opacity-60"}`}>
              <label className="relative inline-flex cursor-pointer items-center" title={d.active ? "Active — click to pause" : "Paused — click to activate"}>
                <input type="checkbox" className="peer sr-only" checked={d.active} onChange={() => toggle(d)} />
                <span className="h-5 w-9 rounded-full bg-gray-300 transition peer-checked:bg-brand" />
                <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
              </label>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{d.name}</span>
                  <span className={`rounded px-1.5 text-[11px] font-semibold ${PRIORITY_STYLE[d.priority]}`}>{d.priority}</span>
                  {!d.active && <span className="text-xs text-muted">paused</span>}
                </div>
                <p className="truncate text-xs text-muted">
                  {d.categories.join(", ")} · {d.keywords.join(", ")}
                  {d.exclude_keywords.length > 0 && <> · excludes {d.exclude_keywords.join(", ")}</>}
                </p>
              </div>
              <div className="flex gap-1.5">
                <button className="btn py-1 text-xs" onClick={() => setEditing({ ...d })}>
                  Edit
                </button>
                <button className="btn btn-danger py-1 text-xs" onClick={() => remove(d)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <GlobalSettings settings={props.settings} defaultRecipient={props.defaultRecipient} />

      {editing && (
        <DomainModal
          draft={editing}
          categories={props.categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function DomainModal(props: { draft: DomainDraft; categories: string[]; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<DomainDraft>(props.draft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ count: number; capped: boolean; titles: { title: string; url: string }[] } | string | null>(null);
  const set = <K extends keyof DomainDraft>(k: K, v: DomainDraft[K]) => setD((x) => ({ ...x, [k]: v }));

  async function save() {
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
      props.onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function runPreview() {
    setPreview("Querying arXiv…");
    try {
      const r = await api<{ count: number; capped: boolean; titles: { title: string; url: string }[] }>(
        `/api/domains/${d.id ?? "new"}/preview`,
        { method: "POST", json: { keywords: d.keywords, categories: d.categories, exclude_keywords: d.exclude_keywords } },
      );
      setPreview(r);
    } catch (e) {
      setPreview((e as Error).message);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-black/30 p-4" onClick={props.onClose}>
      <div className="card my-8 w-full max-w-xl p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{d.id ? `Edit ${props.draft.name}` : "Add domain"}</h3>
        <div className="mt-4 grid gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. AI for Healthcare Ops" />
          </div>
          <div>
            <label className="label">What counts as relevant (one line — Gemini reads this)</label>
            <input className="input" value={d.description} onChange={(e) => set("description", e.target.value)} />
          </div>
          <div>
            <label className="label">Keywords (matched in title or abstract — any)</label>
            <TagInput value={d.keywords} onChange={(v) => set("keywords", v)} placeholder="Type and press Enter" />
          </div>
          <div>
            <label className="label">arXiv categories</label>
            <div className="flex flex-wrap gap-1">
              {props.categories.map((c) => {
                const on = d.categories.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => set("categories", on ? d.categories.filter((x) => x !== c) : [...d.categories, c])}
                    className={`rounded border px-1.5 py-0.5 font-mono text-xs ${on ? "border-brand bg-brand text-white" : "border-line text-muted"}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="label">Exclude papers containing</label>
            <TagInput value={d.exclude_keywords} onChange={(v) => set("exclude_keywords", v)} placeholder="e.g. medical" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select className="input" value={d.priority} onChange={(e) => set("priority", e.target.value as Domain["priority"])}>
                <option value="high">High (+1 slot, shown first)</option>
                <option value="normal">Normal</option>
                <option value="low">Low (−1 slot)</option>
              </select>
            </div>
            <div>
              <label className="label">Papers per domain</label>
              <select
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
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={d.active} onChange={(e) => set("active", e.target.checked)} /> Active
          </label>

          <div className="rounded-lg bg-background p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Test this query on the last 7 days of arXiv (no AI)</span>
              <button type="button" className="btn py-1 text-xs" onClick={runPreview} disabled={!d.keywords.length && !d.categories.length}>
                Preview query
              </button>
            </div>
            {typeof preview === "string" && <p className="mt-2 text-sm text-muted">{preview}</p>}
            {preview && typeof preview === "object" && (
              <div className="mt-2 text-sm">
                <p className="font-medium">
                  {preview.count}
                  {preview.capped ? "+" : ""} papers matched
                  {preview.count > 150 && <span className="font-normal text-amber-700"> — consider narrower keywords</span>}
                  {preview.count === 0 && <span className="font-normal text-amber-700"> — try broader keywords</span>}
                </p>
                <ul className="mt-1 list-disc pl-5 text-xs text-muted">
                  {preview.titles.map((t) => (
                    <li key={t.url}>
                      <a href={t.url} target="_blank" rel="noreferrer" className="hover:underline">
                        {t.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn" onClick={props.onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !d.name.trim() || !d.keywords.length}>
            {saving ? "Saving…" : "Save domain"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GlobalSettings({ settings, defaultRecipient }: { settings: Settings; defaultRecipient: string | null }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(settings);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((x) => ({ ...x, [k]: v }));

  async function save(patch?: Partial<Settings>) {
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/settings", { method: "PATCH", json: patch ?? { ...s, recipient_email: s.recipient_email ?? "" } });
      setMsg("Saved");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Brief preferences</h2>
      <p className="text-sm text-muted">Applies to every domain unless a domain overrides it.</p>

      <div className="card mt-3 grid gap-4 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-background p-3">
          <div className="text-sm">
            <p className="font-medium">Schedule: every Monday, 5:30–6:29 AM IST</p>
            <p className="text-xs text-muted">
              Fixed in vercel.json (<code>0 0 * * 1</code>). Vercel Hobby cannot change it at runtime — see README to edit.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={s.delivery_paused}
              onChange={(e) => {
                set("delivery_paused", e.target.checked);
                save({ delivery_paused: e.target.checked });
              }}
            />
            Pause Monday delivery
          </label>
        </div>

        <div>
          <label className="label">Recipient email</label>
          <input
            className="input"
            type="email"
            value={s.recipient_email ?? ""}
            placeholder={defaultRecipient ?? "you@example.com"}
            onChange={(e) => set("recipient_email", e.target.value)}
          />
          <p className="mt-1 text-xs text-muted">While sending from onboarding@resend.dev, only your Resend account email can receive.</p>
        </div>
        <div>
          <label className="label">Papers per domain</label>
          <input className="input" type="number" min={1} max={8} value={s.papers_per_domain} onChange={(e) => set("papers_per_domain", Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Significance threshold (0–10)</label>
          <input
            className="input"
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={s.significance_threshold}
            onChange={(e) => set("significance_threshold", Number(e.target.value))}
          />
        </div>
        <div>
          <label className="label">Ranking style</label>
          <select className="input" value={s.ranking_style} onChange={(e) => set("ranking_style", e.target.value as Settings["ranking_style"])}>
            <option value="breakthroughs">Breakthroughs only (fewer, stronger)</option>
            <option value="balanced">Balanced</option>
            <option value="broad">Broad (more papers)</option>
          </select>
        </div>
        <div>
          <label className="label">Reading time cap</label>
          <select className="input" value={s.reading_minutes} onChange={(e) => set("reading_minutes", Number(e.target.value))}>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
          </select>
        </div>
        <div>
          <label className="label">Detail level</label>
          <select className="input" value={s.detail_level} onChange={(e) => set("detail_level", e.target.value as Settings["detail_level"])}>
            <option value="short">Short (one-line summary)</option>
            <option value="standard">Standard</option>
            <option value="detailed">Detailed (adds method + limitations)</option>
          </select>
        </div>
        <div>
          <label className="label">Lookback days (first run / “Last N days”)</label>
          <input className="input" type="number" min={1} max={31} value={s.lookback_days} onChange={(e) => set("lookback_days", Number(e.target.value))} />
        </div>
        <div>
          <label className="label">Client lens (optional industry)</label>
          <input
            className="input"
            value={s.client_lens ?? ""}
            placeholder="e.g. banking, manufacturing"
            onChange={(e) => set("client_lens", e.target.value || null)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Watch-list: authors</label>
          <TagInput value={s.watchlist_authors} onChange={(v) => set("watchlist_authors", v)} placeholder="e.g. Yann LeCun" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Watch-list: labs / orgs</label>
          <TagInput value={s.watchlist_orgs} onChange={(v) => set("watchlist_orgs", v)} placeholder="e.g. Google DeepMind" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Watch-list: benchmarks / terms</label>
          <TagInput value={s.watchlist_terms} onChange={(v) => set("watchlist_terms", v)} placeholder="e.g. SWE-bench" />
        </div>
        <div>
          <span className="label">Signal sources</span>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked disabled /> arXiv (always on)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.sources.semantic_scholar}
              onChange={(e) => set("sources", { ...s.sources, semantic_scholar: e.target.checked })}
            />
            Semantic Scholar (author h-index, TLDR)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={s.sources.huggingface} onChange={(e) => set("sources", { ...s.sources, huggingface: e.target.checked })} />
            Hugging Face (community upvotes)
          </label>
        </div>
        <div className="grid gap-3">
          <div>
            <label className="label">Manual refresh cooldown (minutes)</label>
            <input
              className="input"
              type="number"
              min={0}
              max={240}
              value={s.refresh_cooldown_minutes}
              onChange={(e) => set("refresh_cooldown_minutes", Number(e.target.value))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.email_manual_refresh_default}
              onChange={(e) => set("email_manual_refresh_default", e.target.checked)}
            />
            Email manual refreshes by default
          </label>
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button className="btn btn-primary" onClick={() => save()} disabled={saving}>
            {saving ? "Saving…" : "Save preferences"}
          </button>
          {msg && <span className="text-sm text-muted">{msg}</span>}
        </div>
      </div>
    </section>
  );
}
