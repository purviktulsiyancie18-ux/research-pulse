"use client";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: Record<string, unknown>,
  ) {
    super(message);
  }
}

/** fetch JSON; on 401 send the user to the passcode page and come back afterwards. */
export async function api<T = Record<string, unknown>>(url: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.status === 401 && body.error === "Passcode required") {
    window.location.href = `/unlock?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
  if (!res.ok) throw new ApiError(String(body.error ?? `Request failed (${res.status})`), res.status, body);
  return body as T;
}
