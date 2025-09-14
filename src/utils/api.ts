// src/utils/api.ts
// Base do backend (pode ajustar no .env: VITE_API_BASE)
export const API = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

async function postForm(url: string, fd: FormData) {
  const resp = await fetch(url, { method: 'POST', body: fd });
  if (!resp.ok) {
    // tenta extrair detalhe do FastAPI
    const errJson = await resp.json().catch(() => ({} as any));
    const detail = errJson?.detail || `${resp.status} ${resp.statusText}`;
    const e = new Error(detail) as any;
    e.status = resp.status;
    throw e;
  }
  return resp.json();
}

/** Importa evento (IOF ResultList obrigatório) e, opcionalmente, CourseData e organizador. */
export async function importEventWithCourse(params: {
  resultFile: File;
  courseFile?: File | null;
  organizer?: string;
}) {
  const fd = new FormData();
  fd.append('result', params.resultFile);
  if (params.courseFile) fd.append('course', params.courseFile);
  if (params.organizer) fd.append('organizer', params.organizer);

  // rota nova
  try {
    return await postForm(`${API}/api/events/import`, fd);
  } catch (e: any) {
    // compat: se o backend ainda não tiver a rota nova, tenta a antiga
    if (e?.status !== 404) throw e;
    const fd2 = new FormData();
    fd2.append('file', params.resultFile);
    return await postForm(`${API}/api/events/import-xml`, fd2);
  }
}

/** Blob completo do evento (classes, competidores, courseData…) */
export async function getEventBlob(id: string) {
  const r = await fetch(`${API}/api/events/${encodeURIComponent(id)}/blob`);
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err?.detail || `Blob ${r.status}`);
  }
  return r.json();
}

/** Índice de eventos { id: {id, name, date, organizer} } */
export async function listEvents() {
  const r = await fetch(`${API}/api/events`);
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err?.detail || `Falha ao listar (${r.status})`);
  }
  return r.json() as Promise<Record<string, { id: string; name: string; date?: string; organizer?: string }>>;
}

/* ============================
 * Aliases p/ compatibilidade
 * (evita quebrar imports antigos)
 * ============================ */

/** Alias do importEventWithCourse (antigo nome usado em alguns componentes) */
export async function uploadIOFXML(resultFile: File, courseFile?: File | null, organizer?: string) {
  return importEventWithCourse({ resultFile, courseFile: courseFile ?? undefined, organizer });
}

/** Alias do getEventBlob */
export async function fetchEventBlob(eid: string) {
  return getEventBlob(eid);
}

/** Alias do listEvents */
export async function fetchEventsIndex() {
  return listEvents();
}

export async function deleteEvent(eid: string, adminToken: string) {
  const r = await fetch(`${API}/api/events/${encodeURIComponent(eid)}`, {
    method: 'DELETE',
    headers: { 'x-admin-token': adminToken }
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({} as any));
    throw new Error(err?.detail || `Falha ao excluir (${r.status})`);
  }
  return r.json();
}