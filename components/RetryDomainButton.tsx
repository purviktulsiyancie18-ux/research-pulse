"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";

export function RetryDomainButton({ runId, domainId }: { runId: string; domainId: number }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | string>("idle");
  return (
    <span className="inline-flex items-center gap-2">
      {state !== "idle" && state !== "busy" && <span className="text-xs text-red-700">{state}</span>}
      <button
        className="btn py-0.5 text-xs"
        disabled={state === "busy"}
        onClick={async () => {
          setState("busy");
          try {
            await api(`/api/runs/${runId}/retry-domain`, { method: "POST", json: { domainId } });
            setState("idle");
            router.refresh();
          } catch (e) {
            setState((e as Error).message);
          }
        }}
      >
        {state === "busy" ? "Retrying…" : "Retry"}
      </button>
    </span>
  );
}
