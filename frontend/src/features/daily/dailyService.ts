import { db, nowISO, todayStr, type DailyTemplate } from '../../db/database';
import { getSetting, setSetting } from '../../db/database';
import { newId } from '../../utils/helpers';

/** Template berlaku pada tanggal tsb: aktif, tak terhapus, dan sudah masuk tanggal mulai. */
export function templateBerlaku(t: DailyTemplate, tanggal: string): boolean {
  if (!t.is_active || t.deleted_at) return false;
  const mulai = t.mulai_tanggal || '';
  return mulai === '' || mulai <= tanggal;
}

/** Pastikan ada baris daily_logs untuk semua template aktif pada tanggal tsb (lazy, PRD §5.3). */
const sedangJalan = new Map<string, Promise<void>>();
export function pastikanLogHarian(tanggal: string): Promise<void> {
  const ada = sedangJalan.get(tanggal);
  if (ada) return ada;
  const p = (async () => {
    // is_active bukan index Dexie -> pakai filter (where() akan melempar SchemaError)
    const semua = await db.daily_templates.filter((t) => !t.deleted_at).toArray();
    const aktif = semua.filter((t) => templateBerlaku(t, tanggal));
    const sudah = await db.daily_logs.where('log_date').equals(tanggal).toArray();
    const adaSet = new Set(sudah.map((l) => l.template_id));
    const kurang = aktif.filter((t) => !t.deleted_at && !adaSet.has(t.id));
    if (kurang.length === 0) return;
    try {
      await db.daily_logs.bulkAdd(
        kurang.map((t) => ({
          log_date: tanggal,
          template_id: t.id,
          is_done: false,
          done_at: null,
          updated_at: nowISO(),
        })),
      );
    } catch {
      // Balapan dua pemanggil (StrictMode/muat ganda): baris sudah dibuat pemanggil lain, abaikan.
    }
  })().finally(() => {
    sedangJalan.delete(tanggal);
  });
  sedangJalan.set(tanggal, p);
  return p;
}

export async function toggleCentang(templateId: string, tanggal: string): Promise<void> {
  const log = await db.daily_logs.where('[log_date+template_id]').equals([tanggal, templateId]).first();
  const now = nowISO();
  if (!log) {
    await db.daily_logs.add({ log_date: tanggal, template_id: templateId, is_done: true, done_at: now, updated_at: now });
  } else {
    await db.daily_logs.update(log.id!, { is_done: !log.is_done, done_at: !log.is_done ? now : null, updated_at: now });
  }
}

export async function ambangStreak(): Promise<number> {
  const v = await getSetting('streak_threshold', '80');
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(100, Math.max(50, n)) : 80;
}

export async function simpanAmbangStreak(n: number): Promise<void> {
  await setSetting('streak_threshold', String(Math.min(100, Math.max(50, n))));
}

/** Hari berhasil bila persen centang >= ambang (PRD §5.3). */
export function hariBerhasil(done: number, total: number, ambang: number): boolean {
  if (total === 0) return false;
  return (done / total) * 100 >= ambang;
}

/** Hitung streak: hari berturut-turut (termasuk/terakhir hari ini) yang berhasil. */
export async function hitungStreak(ambang: number): Promise<{ streak: number; hariIni: number; total: number }> {
  const semua = await db.daily_templates.filter((t) => !t.deleted_at).toArray();
  const berlakuHari = (tgl: string) => semua.filter((t) => templateBerlaku(t, tgl));
  const hariIniStr = todayStr();
  const total = berlakuHari(hariIniStr).length;
  if (total === 0) return { streak: 0, hariIni: 0, total: 0 };

  const logsHariIni = await db.daily_logs.where('log_date').equals(hariIniStr).toArray();
  const hariIni = logsHariIni.filter((l) => l.is_done).length;

  let streak = 0;
  const d = new Date();
  // Jika hari ini belum berhasil, streak dihitung dari kemarin (tidak memutus).
  const persenHariIni = total === 0 ? 0 : (hariIni / total) * 100;
  if (persenHariIni < ambang) d.setDate(d.getDate() - 1);

  for (let i = 0; i < 365; i++) {
    const tgl = todayStr(d);
    const logs = await db.daily_logs.where('log_date').equals(tgl).toArray();
    const done = logs.filter((l) => l.is_done).length;
    // Penyebut = template yang berlaku pada tanggal itu (template "mulai besok" tak ikut nilai masa lalu).
    const penyebut = Math.max(berlakuHari(tgl).length, logs.length, 1);
    if ((done / penyebut) * 100 >= ambang) {
      streak += 1;
    } else {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return { streak, hariIni, total };
}

export async function tambahTemplate(title: string, mulaiTanggal = ''): Promise<void> {
  const semua = await db.daily_templates.toArray();
  const max = semua.reduce((m, t) => Math.max(m, t.sort_order), -1);
  await db.daily_templates.add({
    id: newId(),
    title: title.trim(),
    sort_order: max + 1,
    is_active: true,
    mulai_tanggal: mulaiTanggal,
    updated_at: nowISO(),
    deleted_at: null,
  });
}
