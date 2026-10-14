import { db, nowISO, todayStr } from '../../db/database';

export const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/** Jadwal aktif untuk hari tertentu (0=Min..6=Sab). */
export async function jadwalHariIni(weekday: number) {
  const semua = await db.study_schedules.filter((s) => !!s.is_active && !s.deleted_at).toArray();
  return semua.filter((s) => s.weekdays.includes(weekday)).sort((a, b) => a.start_time.localeCompare(b.start_time));
}

export async function toggleSesi(scheduleId: string, tanggal: string): Promise<void> {
  const log = await db.study_logs.where('[schedule_id+log_date]').equals([scheduleId, tanggal]).first();
  const now = nowISO();
  if (!log) {
    await db.study_logs.add({ schedule_id: scheduleId, log_date: tanggal, is_done: true, done_at: now });
  } else {
    await db.study_logs.update(log.id!, { is_done: !log.is_done, done_at: !log.is_done ? now : null });
  }
}

/** Awal minggu (Senin) untuk tanggal tertentu. */
export function awalMinggu(tanggal = todayStr()): string {
  const d = new Date(tanggal + 'T00:00:00');
  const day = d.getDay(); // 0 Min
  const mundur = (day + 6) % 7; // Senin=0
  d.setDate(d.getDate() - mundur);
  return todayStr(d);
}

export async function statistikMinggu(): Promise<{ sesi: number; menit: number }> {
  const awal = awalMinggu();
  const logs = await db.study_logs.where('log_date').aboveOrEqual(awal).toArray();
  const selesai = logs.filter((l) => l.is_done);
  let menit = 0;
  for (const l of selesai) {
    const s = await db.study_schedules.get(l.schedule_id);
    if (s && !s.deleted_at) menit += s.duration_min;
  }
  return { sesi: selesai.length, menit };
}
