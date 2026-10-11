"use client";

import { useState } from "react";
import { INGREDIENTS, type IngredientKey as Key } from "@/lib/ingredients";
import { Segmented } from "./Controls";

type Style = "breakthroughs" | "balanced" | "broad";
const NAMES: Record<Style, string> = { breakthroughs: "Breakthroughs", balanced: "Balanced", broad: "Broad" };

export function StackedBar({ weights }: { weights: Partial<Record<Key, number>> }) {
  return (
    <div className="flex h-10 w-full overflow-hidden rounded-control" role="img" aria-label="Share of each ingredient in the score">
      {INGREDIENTS.filter((i) => (weights[i.key] ?? 0) > 0).map((i) => {
        const pct = Math.round((weights[i.key] ?? 0) * 100);
        return (
          <div
            key={i.key}
            className="flex items-center justify-center font-display text-[12px] font-bold text-white transition-all duration-200"
            style={{ width: `${pct}%`, background: i.color }}
            title={`${i.name}: ${pct}%`}
          >
            {pct >= 8 ? `${pct}%` : ""}
          </div>
        );
      })}
    </div>
  );
}

export function ScoringIngredients({ weights, current }: { weights: Record<Style, Record<Key, number>>; current: Style }) {
  const [style, setStyle] = useState<Style>(current);
  const w = weights[style];
  return (
    <div>
      <Segmented
        label="Ranking style"
        value={style}
        onChange={setStyle}
        options={(Object.keys(NAMES) as Style[]).map((s) => ({ value: s, label: s === current ? `${NAMES[s]} · yours` : NAMES[s] }))}
      />
      <div className="mt-4">
        <StackedBar weights={w} />
      </div>
      <div className="mt-4 grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 230px), 1fr))" }}>
        {INGREDIENTS.map((i) => (
          <div key={i.key} className="panel px-4 py-3">
            <p className="flex items-center gap-2 font-display text-[14px] font-bold text-heading">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: i.color }} />
              {i.name}
              <span className="ml-auto font-tabular" style={{ color: i.color }}>
                {Math.round(w[i.key] * 100)}%
              </span>
            </p>
            <p className="mt-0.5 text-[12px] leading-[18px] text-muted-text">{i.source}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
