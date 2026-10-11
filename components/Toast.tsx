"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

type ToastMsg = { id: number; text: string; tone: "success" | "error" };
const EVENT = "rp-toast";

/** Show a toast from any client component. */
export function toast(text: string, tone: ToastMsg["tone"] = "success") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { text, tone } }));
}

/** Mounted once in the layout; persists across client navigations. */
export function Toaster() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      const d = (e as CustomEvent<{ text: string; tone: ToastMsg["tone"] }>).detail;
      setMsg({ id: Date.now(), ...d });
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2800);
    };
    window.addEventListener(EVENT, onToast);
    return () => {
      window.removeEventListener(EVENT, onToast);
      clearTimeout(timer);
    };
  }, []);
  if (!msg) return null;
  const cls = msg.tone === "error" ? "border-error/35 bg-[#FDECEC] text-error-ink" : "border-success/35 bg-[#E7F8F1] text-success-ink";
  const Icon = msg.tone === "error" ? TriangleAlert : CircleCheck;
  return (
    <div
      key={msg.id}
      role="status"
      className={`no-print fixed bottom-6 left-1/2 z-[60] flex max-w-[90vw] -translate-x-1/2 animate-toast items-center gap-2.5 rounded-panel border px-4 py-3 text-[14px] font-medium shadow-card ${cls}`}
    >
      <Icon size={18} strokeWidth={2.25} className="shrink-0" />
      {msg.text}
    </div>
  );
}
