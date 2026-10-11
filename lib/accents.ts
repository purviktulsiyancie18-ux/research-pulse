// Domain accent colours (fill / AA ink / tint), assigned by domain id, wrapping after six.

export interface Accent {
  name: string;
  fill: string;
  ink: string;
  tint: string;
  border: string;
}

const ACCENTS: Accent[] = [
  { name: "sky", fill: "#0EA5E9", ink: "#0369A1", tint: "rgba(14,165,233,0.12)", border: "rgba(14,165,233,0.30)" },
  { name: "pink", fill: "#EC4899", ink: "#BE185D", tint: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.30)" },
  { name: "teal", fill: "#14B8A6", ink: "#0F766E", tint: "rgba(20,184,166,0.12)", border: "rgba(20,184,166,0.30)" },
  { name: "amber", fill: "#F59E0B", ink: "#B45309", tint: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.30)" },
  { name: "lime", fill: "#84CC16", ink: "#4D7C0F", tint: "rgba(132,204,22,0.12)", border: "rgba(132,204,22,0.30)" },
  { name: "coral", fill: "#FF6B6B", ink: "#C53030", tint: "rgba(255,107,107,0.12)", border: "rgba(255,107,107,0.30)" },
];

export function accentFor(domainId: number): Accent {
  return ACCENTS[(((domainId - 1) % ACCENTS.length) + ACCENTS.length) % ACCENTS.length];
}

export type DomainIconName = "bot" | "code" | "database" | "scan" | "brain" | "lightbulb";

/** Pick an icon from the domain's name; falls back by id. */
export function iconFor(name: string, domainId: number): DomainIconName {
  const n = name.toLowerCase();
  if (/agent|autonom/.test(n)) return "bot";
  if (/code|program|software/.test(n)) return "code";
  if (/retriev|rag|search|knowledge/.test(n)) return "database";
  if (/vision|image|video|inspect|robot/.test(n)) return "scan";
  return domainId % 2 ? "brain" : "lightbulb";
}
