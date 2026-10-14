/** Sinkronisasi dua arah last-write-wins (PRD §4, Fase 4).
 * Offline-first: UI tetap baca/tulis Dexie. Fungsi ini hanya dipanggil
 * saat online + sudah login (manual atau event 'online').
 */
import { db } from '../db/database';
import { apiFetch, bacaError, sudahLogin } from './client';

const K_LAST = 'devdash-last-sync';
export const getLastSync = () => localStorage.getItem(K_LAST);
const setLastSync = (v: string) => localStorage.setItem(K_LAST, v);

const TABEL = [
  'categories',
  'projects',
  'tasks',
  'daily_templates',
  'daily_logs',
  'reminders',
  'study_schedules',
  'study_logs',
] as const;

type Tabel = (typeof TABEL)[number];

type SyncStatus =
  | { state: 'idle' }
  | { state: 'syncing' }
  | { state: 'ok'; at: string; pushed: number; pulled: number }
  | { state: 'error'; message: string };

let status: SyncStatus = { state: 'idle' };
const pendengar = new Set<(s: SyncStatus) => void>();
export const onSyncStatus = (fn: (s: SyncStatus) => void) => {
  pendengar.add(fn);
  return () => { pendengar.delete(fn); };
};
function setStatus(s: SyncStatus) {
  status = s;
  pendengar.forEach((fn) => fn(s));
}
export const getSyncStatus = () => status;

/* eslint-disable @typescript-eslint/no-explicit-any */
async function bacaTabel(t: Tabel): Promise<any[]> {
  const table = (db as any)[t];
  return table.toArray();
}

function bersihUntukKirim(rows: any[], sejak: string | null): any[] {
  return rows
    .filter((r) => !sejak || (r.updated_at ?? '') > sejak)
    .map((r) => {
      const { synced_at: _s, ...rest } = r ?? {};
      return rest;
    });
}

async function terapkan(t: Tabel, rows: any[]): Promise<number> {
  if (rows.length === 0) return 0;
  const table = (db as any)[t];
  let n = 0;
  const alami =
    t === 'daily_logs'
      ? (r: any) => ({ log_date: r.log_date, template_id: r.template_id })
      : t === 'study_logs'
        ? (r: any) => ({ schedule_id: r.schedule_id, log_date: r.log_date })
        : null;
  for (const srv of rows) {
    let lokal: any = null;
    if (alami && srv.log_date) {
      const kunci = alami(srv);
      if (Object.values(kunci).every((v) => v != null)) {
        lokal = await table.where(kunci).first().catch(() => null);
      }
    } else if (srv.id != null) {
      lokal = await table.get(srv.id).catch(() => null);
    }
    if (!lokal || (srv.updated_at ?? '') > (lokal.updated_at ?? '')) {
      if (lokal && lokal.id != null && srv.id == null) srv.id = lokal.id;
      await table.put({ ...lokal, ...srv, synced_at: new Date().toISOString() });
      n += 1;
    }
  }
  return n;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function sinkronkan(): Promise<{ pushed: number; pulled: number; at: string }> {
  if (!sudahLogin()) throw new Error('Belum login. Masuk dulu untuk sinkronisasi.');
  setStatus({ state: 'syncing' });
  try {
    const sejak = getLastSync();
    const changes: Record<string, unknown[]> = {};
    let pushed = 0;
    for (const t of TABEL) {
      const rows = bersihUntukKirim(await bacaTabel(t), sejak);
      changes[t] = rows;
      pushed += rows.length;
    }
    const r = await apiFetch('/api/sync', {
      method: 'POST',
      body: JSON.stringify({ last_synced_at: sejak, changes }),
    });
    if (!r.ok) throw new Error(await bacaError(r));
    const body = await r.json();
    let pulled = 0;
    for (const t of TABEL) {
      pulled += await terapkan(t, body.changes?.[t] ?? []);
    }
    setLastSync(body.synced_at);
    setStatus({ state: 'ok', at: body.synced_at, pushed, pulled });
    return { pushed, pulled, at: body.synced_at };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sinkronisasi gagal';
    setStatus({ state: 'error', message });
    throw e;
  }
}

/** Sinkronisasi otomatis saat kembali online (pull-to-refresh di tiap daftar memicu manual). */
export function pasangAutoSync() {
  const coba = () => {
    if (navigator.onLine && sudahLogin()) void sinkronkan().catch(() => undefined);
  };
  window.addEventListener('online', coba);
  // sinkron saat aplikasi dibuka bila sudah login
  if (navigator.onLine && sudahLogin()) void sinkronkan().catch(() => undefined);
}
