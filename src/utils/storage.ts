// frontend/src/utils/storage.ts
import { buildEventIndex } from '@/utils/indexes';

const KEY = 'meos.events';

export type Store = { events: Record<string, any> };

export function ensureIndex(ev: any) {
  if (ev && !ev.__index) ev.__index = buildEventIndex(ev);
  return ev;
}

export function load(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { events: {} };
    const parsed = JSON.parse(raw);
    const store: Store = parsed?.events ? parsed : { events: {} };
    Object.values(store.events || {}).forEach(ensureIndex);
    return store;
  } catch {
    return { events: {} };
  }
}

export function save(store: Store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function upsertEvent(ev: any) {
  const s = load();
  s.events[ev.id] = ensureIndex(ev);
  save(s);
}

export function removeEvent(eid: string) {
  const s = load();
  if (s.events && s.events[eid]) {
    delete s.events[eid];
    save(s); // <- garantir que persiste
  }
}

/** (opcional) zera todo o cache local */
export function clearAll() {
  localStorage.removeItem(KEY);
}