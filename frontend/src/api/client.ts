/** Klien HTTP + auth (Fase 4). Token di localStorage; refresh otomatis sekali saat 401. */

const K_BASE = 'devdash-api-base';
const K_ACCESS = 'devdash-access';
const K_REFRESH = 'devdash-refresh';
const K_USER = 'devdash-user';

export const getBaseUrl = () => localStorage.getItem(K_BASE) || 'http://127.0.0.1:5000';
export const setBaseUrl = (v: string) => localStorage.setItem(K_BASE, v.replace(/\/+$/, ''));

export const getAccess = () => localStorage.getItem(K_ACCESS);
export const getRefresh = () => localStorage.getItem(K_REFRESH);
export const sudahLogin = () => !!getAccess();
export const getUser = (): { id: string; email: string; display_name: string } | null => {
  try {
    const s = localStorage.getItem(K_USER);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

function simpanSesi(access: string, refresh: string | null, user: unknown) {
  localStorage.setItem(K_ACCESS, access);
  if (refresh) localStorage.setItem(K_REFRESH, refresh);
  if (user) localStorage.setItem(K_USER, JSON.stringify(user));
}

export function keluar() {
  localStorage.removeItem(K_ACCESS);
  localStorage.removeItem(K_REFRESH);
  localStorage.removeItem(K_USER);
  localStorage.removeItem('devdash-last-sync');
}

async function refreshSekali(): Promise<boolean> {
  const refresh = getRefresh();
  if (!refresh) return false;
  try {
    const r = await fetch(`${getBaseUrl()}/api/auth/refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refresh}` },
    });
    if (!r.ok) return false;
    const body = await r.json();
    localStorage.setItem(K_ACCESS, body.access_token);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch(path: string, init: RequestInit = {}, cobaRefresh = true): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(init.headers as Record<string, string>) };
  const token = getAccess();
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`${getBaseUrl()}${path}`, { ...init, headers });
  if (r.status === 401 && cobaRefresh && token && (await refreshSekali())) {
    return apiFetch(path, init, false);
  }
  return r;
}

export async function bacaError(r: Response): Promise<string> {
  try {
    const body = await r.json();
    return body?.error?.message ?? `HTTP ${r.status}`;
  } catch {
    return `HTTP ${r.status}`;
  }
}

export async function login(email: string, password: string): Promise<void> {
  const r = await fetch(`${getBaseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error(await bacaError(r));
  const body = await r.json();
  simpanSesi(body.access_token, body.refresh_token, body.user);
}

export async function daftar(email: string, password: string, displayName: string): Promise<void> {
  const r = await fetch(`${getBaseUrl()}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name: displayName }),
  });
  if (!r.ok) throw new Error(await bacaError(r));
  await login(email, password);
}
