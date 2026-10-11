import { Bot, BookOpen, Brain, Briefcase, Code, Database, Eye, Lightbulb, ScanLine, Sparkles, TriangleAlert, type LucideIcon } from "lucide-react";
import { accentFor, iconFor, type DomainIconName } from "@/lib/accents";

const DOMAIN_ICONS: Record<DomainIconName, LucideIcon> = {
  bot: Bot,
  code: Code,
  database: Database,
  scan: ScanLine,
  brain: Brain,
  lightbulb: Lightbulb,
};

export function DomainIcon({ id, name, size = 44, radius = 12 }: { id: number; name: string; size?: number; radius?: number }) {
  const a = accentFor(id);
  const Icon = DOMAIN_ICONS[iconFor(name, id)];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size, borderRadius: radius, background: a.tint, color: a.ink }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.45)} strokeWidth={2} />
    </span>
  );
}

const VERDICT: Record<string, { label: string; cls: string; Icon: LucideIcon; tip: string }> = {
  READ: { label: "Suggested: Read in full", cls: "bg-primary text-white", Icon: BookOpen, tip: "The AI suggests reading this paper in full" },
  CLIENT: { label: "Suggested: Share with client", cls: "bg-teal/14 text-teal-ink", Icon: Briefcase, tip: "The AI suggests sharing this with a client" },
  FYI: { label: "Suggested: FYI", cls: "bg-sky/12 text-sky-ink", Icon: Eye, tip: "The AI suggests this is good to know (for your information)" },
};

export function VerdictBadge({ verdict }: { verdict: string | null }) {
  if (!verdict || !VERDICT[verdict]) {
    return (
      <span className="pill bg-amber/14 tracking-[0.04em] text-amber-ink" title="Gemini AI did not respond, so the paper's own abstract is shown.">
        <TriangleAlert size={13} strokeWidth={2.25} /> AI summary unavailable
      </span>
    );
  }
  const v = VERDICT[verdict];
  return (
    <span className={`pill tracking-[0.04em] ${v.cls}`} title={v.tip}>
      <v.Icon size={13} strokeWidth={2.25} /> {v.label}
    </span>
  );
}

export function TopPickBadge() {
  return (
    <span className="pill bg-gradient-primary tracking-[0.04em] text-white" title="Highest score of the week">
      <Sparkles size={13} strokeWidth={2.25} /> Top pick
    </span>
  );
}

const STATUS: Record<string, string> = {
  preview: "bg-amber/14 text-amber-ink",
  partial: "bg-amber/14 text-amber-ink",
  delivered: "bg-success/12 text-success-ink",
  succeeded: "bg-success/12 text-success-ink",
  failed: "bg-error/10 text-error-ink",
  running: "bg-primary-tint text-primary-hover",
  queued: "bg-[#EEF0F6] text-body",
  skipped: "bg-[#EEF0F6] text-body",
};

export function StatusBadge({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span className={`pill text-[11px] tracking-[0.06em] uppercase ${STATUS[status] ?? STATUS.queued} ${className}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}

export function Notice({ tone = "warning", children }: { tone?: "warning" | "error"; children: React.ReactNode }) {
  const cls =
    tone === "error" ? "border-error/35 bg-error/8 text-error-ink" : "border-amber/35 bg-amber/10 text-warning-text";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-3 rounded-panel border px-5 py-4 text-[14px] leading-[22px] font-medium ${cls}`}>
      <TriangleAlert size={20} strokeWidth={2} className="mt-px shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function PageHeader({ title, tip, description, wash, children }: { title: string; tip?: React.ReactNode; description?: string; wash?: string; children?: React.ReactNode }) {
  return (
    <div className="card" style={wash ? { backgroundImage: wash } : undefined}>
      <h1 className="h1 flex items-center">
        {title}
        {tip}
      </h1>
      {description && <p className="mt-1 text-[15px] leading-6 text-muted-text">{description}</p>}
      {children}
    </div>
  );
}
