import { uiEnv } from "../env.js";

/**
 * Thin fetch wrapper against the Exchange API. No auth headers — the demo
 * UI never holds secrets. Vite proxies /api → http://localhost:4021 in dev.
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${uiEnv.VITE_API_BASE_URL}${path}`;
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`API ${path} → ${res.status}`);
  }
  return (await res.json()) as T;
}
