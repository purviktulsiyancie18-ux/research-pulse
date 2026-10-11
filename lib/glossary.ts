// Short meanings for abbreviations (shown inline) and longer explanations (shown in ⓘ tooltips).

/** arXiv category code → short meaning, shown right next to the code. */
export const CATEGORY_LABELS: Record<string, string> = {
  "cs.AI": "Artificial Intelligence",
  "cs.CL": "Language AI",
  "cs.CV": "Computer Vision",
  "cs.LG": "Machine Learning",
  "cs.IR": "Search & Retrieval",
  "cs.MA": "Multi-Agent Systems",
  "cs.RO": "Robotics",
  "cs.SE": "Software Engineering",
  "cs.PL": "Programming Languages",
  "cs.CR": "Cybersecurity",
  "cs.DB": "Databases",
  "cs.DC": "Cloud Computing",
  "cs.HC": "Human–Computer Interaction",
  "cs.NE": "Neural Computing",
  "cs.SD": "Sound",
  "cs.CY": "Ethics & Society",
  "cs.GT": "Game Theory",
  "cs.SI": "Social Networks",
  "eess.AS": "Audio & Speech",
  "eess.IV": "Image & Video",
  "eess.SP": "Signal Processing",
  "eess.SY": "Control Systems",
  "stat.ML": "Statistical ML",
  "q-fin.CP": "Computational Finance",
  "q-bio.QM": "Quantitative Biology",
};

export const categoryLabel = (code: string) => CATEGORY_LABELS[code] ?? "";

/** The AI's suggestion on each paper (advice only — not the user's own feedback). */
export const VERDICT_LABELS: Record<string, string> = {
  READ: "Suggested: read in full",
  CLIENT: "Suggested: share with a client",
  FYI: "Suggested: for your information",
};

/** Plain words shown instead of internal status names. */
export const PROGRESS_LABELS: Record<string, string> = {
  queued: "Waiting",
  fetching: "Collecting papers",
  enriching: "Checking authors & likes",
  ranking: "AI scoring",
  done: "Done",
  failed: "Failed",
  skipped: "Skipped",
};

export const TIPS = {
  arxiv: "arXiv is a free website where researchers post new papers. It is where Research Pulse gets them.",
  score: "Final score out of 10, combining AI significance, topic fit, community likes, author seniority and released code. See the Scoring tab.",
  whyRanked: "The reasons this paper scored well — from the AI's judgement and signals like upvotes (Hugging Face likes), author h-index (how often their work is cited) and released code.",
  preview: "Not sent yet. Its papers can still appear in Monday's brief until you email it or mark it as delivered.",
  delivered: "Sent. Papers in this brief will never appear in a future brief.",
  headline: "A 2–3 sentence summary of the most important developments across all topics, written by Gemini AI.",
  feedback: "Useful = more like this · Not useful = never show again · Bookmark = save to Bookmarks (also counts as Useful).",
  closestMiss: "The best paper in this topic that scored just below your pass mark.",
  alsoRelevant: "This paper fits more than one topic. It is shown once, under the topic where it scored highest.",
};

/** arXiv categories grouped for the category picker (plain-English label first, code second). */
export const CATEGORY_GROUPS: { label: string; items: [string, string][] }[] = [
  {
    label: "Language & knowledge",
    items: [["cs.CL", "Language AI"], ["cs.IR", "Search & Retrieval"], ["cs.DL", "Digital libraries"], ["cs.HC", "Human–computer interaction"], ["cs.SD", "Sound"], ["eess.AS", "Audio & speech"]],
  },
  {
    label: "Learning & reasoning",
    items: [["cs.AI", "Artificial Intelligence"], ["cs.LG", "Machine learning"], ["stat.ML", "Statistical ML"], ["cs.NE", "Neural & evolutionary"], ["cs.MA", "Multi-agent systems"], ["cs.LO", "Logic"], ["q-bio.QM", "Quantitative biology"]],
  },
  {
    label: "Vision & robotics",
    items: [["cs.CV", "Computer Vision"], ["cs.RO", "Robotics"], ["eess.IV", "Image & video"], ["cs.GR", "Graphics"], ["eess.SP", "Signal processing"]],
  },
  {
    label: "Software & systems",
    items: [["cs.SE", "Software engineering"], ["cs.PL", "Programming languages"], ["cs.DC", "Distributed computing"], ["cs.DB", "Databases"], ["cs.CR", "Security"], ["cs.AR", "Hardware"], ["cs.PF", "Performance"], ["eess.SY", "Control systems"]],
  },
  {
    label: "Society & business",
    items: [["cs.CY", "Computers & society"], ["cs.SI", "Social networks"], ["cs.GT", "Game theory"], ["econ.GN", "Economics"], ["q-fin.CP", "Computational finance"]],
  },
];

for (const g of CATEGORY_GROUPS) for (const [code, label] of g.items) CATEGORY_LABELS[code] ??= label;
