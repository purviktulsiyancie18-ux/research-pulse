// Plain-language descriptions shown in brackets next to technical terms across the UI.

export const CATEGORY_LABELS: Record<string, string> = {
  "cs.AI": "Artificial Intelligence",
  "cs.CL": "Language AI / chatbots / LLMs",
  "cs.CV": "Computer Vision — images & video",
  "cs.LG": "Machine Learning",
  "cs.IR": "Information Retrieval — search",
  "cs.MA": "Multi-Agent Systems",
  "cs.RO": "Robotics",
  "cs.SE": "Software Engineering",
  "cs.PL": "Programming Languages",
  "cs.CR": "Cybersecurity",
  "cs.DB": "Databases",
  "cs.DC": "Distributed / cloud computing",
  "cs.HC": "Human–Computer Interaction",
  "cs.NE": "Neural & evolutionary computing",
  "cs.SD": "Sound",
  "cs.CY": "Computers & Society — ethics, policy",
  "cs.GT": "Game Theory",
  "cs.SI": "Social & information networks",
  "eess.AS": "Audio & speech",
  "eess.IV": "Image & video processing",
  "eess.SP": "Signal processing",
  "eess.SY": "Systems & control",
  "stat.ML": "Machine Learning — statistics side",
  "q-fin.CP": "Computational finance",
  "q-bio.QM": "Quantitative biology methods",
};

export const categoryLabel = (code: string) => CATEGORY_LABELS[code] ?? "arXiv subject category";

export const VERDICT_LABELS: Record<string, string> = {
  READ: "read it in full",
  CLIENT: "bring it to a client",
  FYI: "good to know",
};

export const PROGRESS_LABELS: Record<string, string> = {
  queued: "waiting its turn",
  fetching: "collecting papers from arXiv",
  enriching: "checking author seniority & upvotes",
  ranking: "Gemini AI is reading & scoring",
  done: "finished",
  failed: "something went wrong",
  skipped: "ran out of time — retry later",
};

/** Adds a short bracketed explanation to a "why ranked" chip. */
export function explainChip(chip: string): string {
  if (/^Senior authors \(h-index (\d+)\)$/.test(chip))
    return chip.replace(/\)$/, " — a well-cited, experienced researcher)");
  if (/^\d+ upvotes?$/.test(chip)) return `${chip} (Hugging Face community likes)`;
  if (chip === "Code released") return "Code released (authors shared their code, so results can be checked)";
  if (chip.startsWith("Watch-list: ")) return `${chip} (on your follow list in Settings)`;
  if (chip === "You found this author useful") return `${chip} (you liked their papers before)`;
  if (chip.startsWith("Keyword relevance")) return `${chip} (how often your topic keywords appear)`;
  return chip;
}
