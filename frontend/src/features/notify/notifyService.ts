import { db, todayStr } from '../../db/database';
import { tagihanMendekat } from '../reminders/reminderService';

export async function mintaIzinNotifikasi(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

/** Tampilkan pengingat di dalam aplikasi + Notification API saat dibuka (PRD §9). */
export async function cekDanNotifikasi(): Promise<{ judul: string; isi: string } | null> {
  const hariIni = todayStr();
  const semua = await db.reminders.filter((r) => !r.deleted_at).toArray();
  const dekat = tagihanMendekat(semua, hariIni);
  if (dekat.length === 0) return null;

  const terlambat = dekat.filter((r) => r.due_date < hariIni).length;
  const isi = terlambat > 0
    ? `${terlambat} tagihan terlambat, ${dekat.length - terlambat} mendekat`
    : `${dekat.length} tagihan mendekat (7 hari ke depan)`;

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('DevDash — Tagihan', { body: isi });
    } catch {
      // abaikan (mis. iOS tanpa install)
    }
  }
  return { judul: 'Tagihan perlu perhatian', isi };
}

export async function jumlahBadgeTerlambat(): Promise<number> {
  const hariIni = todayStr();
  return db.reminders.filter((r) => r.status === 'belum' && !r.deleted_at && !!r.due_date && r.due_date < hariIni).count();
}
