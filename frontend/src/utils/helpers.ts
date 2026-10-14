import { v4 as uuidv4 } from 'uuid';
import { db, nowISO } from '../db/database';

export const newId = () => uuidv4();

export function formatRp(n: number | null | undefined): string {
  if (n == null) return '—';
  return 'Rp ' + n.toLocaleString('id-ID');
}

export function formatTanggal(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function sapaan(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 19) return 'Selamat sore';
  return 'Selamat malam';
}

/** Progres proyek: done / total (PRD §5.2) */
export function hitungProgres(done: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}

/** Seed template bawaan bila kosong (Fase 1). */
export async function seedJikaKosong(): Promise<void> {
  const jml = await db.daily_templates.count();
  if (jml > 0) return;
  const bawaan = ['Review kode', 'Commit / push', 'Belajar 30 menit', 'Olahraga'];
  const now = nowISO();
  await db.daily_templates.bulkAdd(
    bawaan.map((title, i) => ({
      id: newId(),
      title,
      sort_order: i,
      is_active: true,
      mulai_tanggal: '',
      updated_at: now,
      deleted_at: null,
    })),
  );
}
