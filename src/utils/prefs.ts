export function getViewPref(key: string, fallback: 'cards'|'list'='cards'): 'cards'|'list' {
  try { return (localStorage.getItem(key) as any) || fallback; } catch { return fallback; }
}
export function setViewPref(key: string, val: 'cards'|'list') {
  try { localStorage.setItem(key, val); } catch {}
}