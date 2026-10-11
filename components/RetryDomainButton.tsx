"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { toast } from "./Toast";

export function RetryDomainButton({ runId, domainId, name }: { runId: string; domainId: number; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn btn-sm btn-secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api(`/api/runs/${runId}/retry-domain`, { method: "POST", json: { domainId } });
          toast(`${name} retried and added to the brief`);
          router.refresh();
        } catch (e) {
          toast((e as Error).message, "error");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary" style={{ animationDuration: "0.8s" }} />
      ) : (
        <RotateCw size={14} />
      )}
      {busy ? "Retrying…" : "Retry"}
    </button>
  );
}
