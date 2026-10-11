// The five scoring ingredients, with their chart colour and a one-line source.
export type IngredientKey = "sig" | "rel" | "comm" | "auth" | "code";

export const INGREDIENTS: { key: IngredientKey; name: string; color: string; source: string }[] = [
  { key: "sig", name: "Significance", color: "#2563EB", source: "Gemini AI rates how important or new the paper is" },
  { key: "rel", name: "Relevance", color: "#0284C7", source: "Gemini AI rates how well it fits the topic" },
  { key: "comm", name: "Community buzz", color: "#EC4899", source: "Hugging Face upvotes (likes)" },
  { key: "auth", name: "Author seniority", color: "#F59E0B", source: "Highest author h-index, from Semantic Scholar" },
  { key: "code", name: "Code released", color: "#0F766E", source: "The authors published their code" },
];
