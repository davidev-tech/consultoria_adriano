// API client para o backend FastAPI "Gestão do Cuidado" (Render)
// Lida com cold-start emitindo eventos para um Spinner global.

const DEFAULT_API_BASE = "http://localhost:8000";

function resolveApiBase() {
  const viteBase = import.meta.env.VITE_API_BASE?.trim();
  const serverBase = globalThis.process?.env?.API_BASE?.trim();
  return (viteBase || serverBase || DEFAULT_API_BASE).replace(/\/$/, "");
}

export const API_BASE = resolveApiBase();

type Json = unknown;

const COLD_START_MS = 2500; // se demorar mais que isso, mostra "acordando servidor"

export type ApiEvent =
  | { type: "cold-start"; show: boolean }
  | { type: "error"; message: string };

const listeners = new Set<(e: ApiEvent) => void>();
export function onApiEvent(cb: (e: ApiEvent) => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function emit(e: ApiEvent) {
  listeners.forEach((l) => l(e));
}

export async function api<T>(
  path: string,
  init: RequestInit & { json?: Json } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;
  const controller = new AbortController();
  const coldTimer = setTimeout(() => emit({ type: "cold-start", show: true }), COLD_START_MS);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(headers ?? {}),
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const data = await res.json();
        detail = (data?.detail && JSON.stringify(data.detail)) || detail;
      } catch { /* noop */ }
      emit({ type: "error", message: detail });
      throw new Error(detail);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } finally {
    clearTimeout(coldTimer);
    emit({ type: "cold-start", show: false });
  }
}
