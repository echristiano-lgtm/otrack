// src/utils/api.ts

// Base:
// - Em dev/local, defina VITE_API_BASE=http://127.0.0.1:8000 (.env.local)
// - Em produção com Vercel + rewrites, deixe VITE_API_BASE em branco e use caminhos relativos.
const API_BASE: string =
  (import.meta as any)?.env?.VITE_API_BASE?.toString().trim().replace(/\/+$/, "") || "";

function joinUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  // Quando API_BASE === "", retorna caminho relativo (para o proxy do Vercel)
  return `${API_BASE}${p}`;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = joinUrl(path);
  const r = await fetch(url, init);
  if (!r.ok) {
    let detail = `${r.status} ${r.statusText}`;
    try {
      const j = await r.json();
      if (j?.detail) detail = j.detail;
    } catch {
      // ignore json parse errors
    }
    const e = new Error(detail) as any;
    e.status = r.status;
    e.url = url;
    throw e;
  }
  const ct = r.headers.get("content-type") || "";
  return ct.includes("application/json") ? (r.json() as Promise<T>) : ((undefined as unknown) as T);
}

// Debug: ver no console qual base está ativa
if (typeof window !== "undefined") {
  (window as any).__API_BASE__ = API_BASE || "(relative)";
  console.log("[api] API_BASE =", (window as any).__API_BASE__);
}

/** Importa evento (IOF ResultList obrigatório) e, opcionalmente, CourseData e organizador. */
export async function importEventWithCourse(params: {
  resultFile: File;
  courseFile?: File | null;
  organizer?: string;
}) {
  const fd = new FormData();
  fd.append("result", params.resultFile);
  if (params.courseFile) fd.append("course", params.courseFile);
  if (params.organizer) fd.append("organizer", params.organizer);

  try {
    return await fetchJson<{ id: string; name: string }>("/api/events/import", { method: "POST", body: fd });
  } catch (e: any) {
    if (e?.status !== 404) throw e;
    // compat: backend antigo
    const fd2 = new FormData();
    fd2.append("file", params.resultFile);
    return await fetchJson<{ id: string; name: string }>("/api/events/import-xml", { method: "POST", body: fd2 });
  }
}

/** Blob completo do evento (classes, competidores, courseData…) */
export async function getEventBlob(id: string) {
  return fetchJson(`/api/events/${encodeURIComponent(id)}/blob`);
}

/** Índice de eventos { id: {id, name, date, organizer, ...} } */
export async function listEvents() {
  return fetchJson<Record<string, { id: string; name?: string; date?: string; organizer?: string }>>("/api/events");
}

/** Delete (rota admin) */
export async function deleteEvent(eid: string, adminToken: string) {
  return fetchJson<{ ok: boolean }>(`/api/events/${encodeURIComponent(eid)}`, {
    method: "DELETE",
    headers: { "x-admin-token": adminToken },
  });
}

/** Health */
export const getHealth = () => fetchJson<{ ok: boolean; version?: string }>("/api/health");

/* ============================
 * Aliases p/ compatibilidade
 * ============================ */

export async function uploadIOFXML(resultFile: File, courseFile?: File | null, organizer?: string) {
  return importEventWithCourse({ resultFile, courseFile: courseFile ?? undefined, organizer });
}
export async function fetchEventBlob(eid: string) {
  return getEventBlob(eid);
}
export async function fetchEventsIndex() {
  return listEvents();
}