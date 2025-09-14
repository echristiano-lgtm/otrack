export function isAdminEnabled(): boolean {
  return localStorage.getItem('MEOS_ADMIN_ENABLED') === '1';
}
export function setAdminEnabled(v: boolean) {
  localStorage.setItem('MEOS_ADMIN_ENABLED', v ? '1' : '0');
}
export function getAdminToken(): string {
  return localStorage.getItem('MEOS_ADMIN_TOKEN') || '';
}
export function setAdminToken(token: string) {
  localStorage.setItem('MEOS_ADMIN_TOKEN', token);
}