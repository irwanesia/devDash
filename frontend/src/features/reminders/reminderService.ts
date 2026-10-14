import { db, nowISO, todayStr, type Reminder } from '../../db/database';
import { newId } from '../../utils/helpers';

export type Kelompok = 'Terlambat' | 'Minggu ini' | 'Bulan ini' | 'Nanti' | 'Lunas';

export function tambahPeriode(tanggal: string, aturan: Reminder['repeat_rule']): string {
  // tanggal: YYYY-MM-DD
  const [y, m, d] = tanggal.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (aturan === 'mingguan') dt.setDate(dt.getDate() + 7);
  else if (aturan === 'bulanan') {
    const hari = dt.getDate();
    dt.setMonth(dt.getMonth() + 1, 1);
    const maks = new Date(dt.getFullYear(), dt.getMonth() + 1, 0).getDate();
    dt.setDate(Math.min(hari, maks));
  } else if (aturan === 'tahunan') dt.setFullYear(dt.getFullYear() + 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Status turunan: terlambat bila lewat jatuh tempo dan belum lunas (PRD §5.4). */
export function apakahTerlambat(r: Reminder, hariIni = todayStr()): boolean {
  return r.status === 'belum' && !r.deleted_at && !!r.due_date && r.due_date < hariIni;
}

export function kelompokkan(r: Reminder, hariIni = todayStr()): Kelompok {
  if (r.status === 'lunas') return 'Lunas';
  if (apakahTerlambat(r, hariIni)) return 'Terlambat';
  const due = new Date(r.due_date + 'T00:00:00');
  const now = new Date(hariIni + 'T00:00:00');
  const selisihHari = Math.floor((due.getTime() - now.getTime()) / 86400000);
  if (selisihHari <= 7) return 'Minggu ini';
  const bulanSama = r.due_date.slice(0, 7) === hariIni.slice(0, 7);
  if (bulanSama) return 'Bulan ini';
  return 'Nanti';
}

/** Tandai lunas; bila berulang, buat jatuh tempo berikutnya otomatis (PRD §5.4). */
export async function tandaiLunas(id: string): Promise<void> {
  const r = await db.reminders.get(id);
  if (!r) return;
  const now = nowISO();
  const hariIni = todayStr();
  await db.reminders.update(id, { status: 'lunas', paid_at: now, updated_at: now });
  if (r.repeat_rule !== 'tidak') {
    await db.reminders.add({
      id: newId(),
      title: r.title,
      category: r.category,
      amount: r.amount,
      due_date: tambahPeriode(r.due_date || hariIni, r.repeat_rule),
      repeat_rule: r.repeat_rule,
      remind_days_before: r.remind_days_before,
      status: 'belum',
      paid_at: null,
      project_id: r.project_id,
      notes: r.notes,
      updated_at: now,
      deleted_at: null,
    });
  }
}

export function totalBelumLunasBulanIni(daftar: Reminder[], hariIni = todayStr()): number {
  const prefix = hariIni.slice(0, 7);
  return daftar
    .filter((r) => r.status === 'belum' && !r.deleted_at && r.due_date.startsWith(prefix))
    .reduce((s, r) => s + (r.amount ?? 0), 0);
}

export function tagihanMendekat(daftar: Reminder[], hariIni = todayStr()): Reminder[] {
  const now = new Date(hariIni + 'T00:00:00');
  return daftar.filter((r) => {
    if (r.status !== 'belum' || r.deleted_at) return false;
    if (!r.due_date) return false;
    if (r.due_date <= hariIni) return true; // terlambat + hari ini
    const due = new Date(r.due_date + 'T00:00:00');
    const selisih = Math.floor((due.getTime() - now.getTime()) / 86400000);
    const ambang = r.remind_days_before ?? 3;
    return selisih <= Math.max(ambang, 7);
  });
}

/** Ekspor satu tagihan ke file .ics (PRD §9 opsi cadangan). */
export function unduhICS(r: Reminder): void {
  const dt = r.due_date.replaceAll('-', '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//DevDash//ID',
    'BEGIN:VEVENT',
    `UID:${r.id}@devdash`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART;VALUE=DATE:${dt}`,
    `SUMMARY:${escapeICS(r.title)}`,
    `DESCRIPTION:${escapeICS(`${r.category} · ${r.amount ?? ''} · ${r.notes ?? ''}`)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${r.title.replace(/\s+/g, '-').toLowerCase()}.ics`;
  a.click();
}

function escapeICS(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
