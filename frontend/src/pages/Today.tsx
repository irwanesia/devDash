import { useEffect, useState } from 'react';
import {
  IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonCheckbox, IonChip, IonContent, IonHeader, IonIcon, IonItem, IonLabel,
  IonList, IonPage, IonProgressBar, IonRefresher, IonRefresherContent,
  IonTitle, IonToolbar, useIonViewWillEnter,
} from '@ionic/react';
import { settingsOutline } from 'ionicons/icons';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, todayStr } from '../db/database';
import { formatRp, formatTanggal, hitungProgres, sapaan } from '../utils/helpers';
import { ambangStreak, hariBerhasil, hitungStreak, pastikanLogHarian, templateBerlaku, toggleCentang } from '../features/daily/dailyService';
import { tagihanMendekat } from '../features/reminders/reminderService';
import { jadwalHariIni } from '../features/study/studyService';
import { cekDanNotifikasi, mintaIzinNotifikasi } from '../features/notify/notifyService';
import { sudahLogin } from '../api/client';
import { sinkronkan } from '../api/sync';

export default function Today() {
  const [streak, setStreak] = useState(0);
  const [ambang, setAmbang] = useState(80);
  const [notif, setNotif] = useState<string | null>(null);
  const [belajarHari, setBelajarHari] = useState<Awaited<ReturnType<typeof jadwalHariIni>>>([]);
  const hariIni = todayStr();

  const templates = useLiveQuery(() => db.daily_templates.filter((t) => !!t.is_active && !t.deleted_at).sortBy('sort_order'), [], []);  const logs = useLiveQuery(() => db.daily_logs.where('log_date').equals(hariIni).toArray(), [hariIni], []);
  const tugasJatuhTempo = useLiveQuery(
    () => db.tasks.filter((t) => !t.deleted_at && t.status !== 'done' && !!t.due_date && t.due_date <= hariIni).sortBy('due_date'),
    [hariIni],
    [],
  );
  const reminders = useLiveQuery(() => db.reminders.filter((r) => !r.deleted_at).toArray(), [], []);
  const studyLogs = useLiveQuery(() => db.study_logs.where('log_date').equals(hariIni).toArray(), [hariIni], []);

  const muat = async () => {
    await pastikanLogHarian(hariIni);
    const a = await ambangStreak();
    setAmbang(a);
    setStreak((await hitungStreak(a)).streak);
    setBelajarHari(await jadwalHariIni(new Date().getDay()));
    const hasil = await cekDanNotifikasi();
    if (hasil) setNotif(hasil.isi);
  };

  useIonViewWillEnter(() => { void muat(); });
  useEffect(() => { void muat(); }, []);

  /** Tarik-untuk-segarkan hanya memicu sinkronisasi bila login (PRD §8.5). */
  const tarikSegarkan = async (e: CustomEvent) => {
    try {
      if (sudahLogin()) await sinkronkan();
      await muat();
    } finally {
      (e.target as HTMLIonRefresherElement).complete();
    }
  };

  const berlaku = (templates ?? []).filter((t) => templateBerlaku(t, hariIni));
  const total = berlaku.length;
  const done = logs?.filter((l) => l.is_done).length ?? 0;
  const persen = hitungProgres(done, Math.max(total, 1));
  const berhasil = hariBerhasil(done, total, ambang);
  const dekat = tagihanMendekat(reminders ?? [], hariIni).slice(0, 5);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Hari ini {dekat.length > 0 && <IonBadge color="warning">{dekat.length}</IonBadge>}</IonTitle>
          <IonButton slot="end" fill="clear" routerLink="/pengaturan" aria-label="Pengaturan">
            <IonIcon icon={settingsOutline} />
          </IonButton>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={(e) => void tarikSegarkan(e)}>
          <IonRefresherContent pullingText="Tarik untuk sinkronkan" refreshingText="Menyinkronkan…" />
        </IonRefresher>
        <h2>{sapaan()} 👋</h2>
        <p className="muted mono judul-tanggal">{formatTanggal(hariIni)} · Streak: {streak} hari</p>
        {notif && (
          <IonCard color="warning">
            <IonCardContent>
              🔔 {notif}{' '}
              <IonButton size="small" fill="clear" onClick={() => void mintaIzinNotifikasi()}>
                Izinkan notifikasi
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Checklist harian — {done}/{total}</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="progress-row">
              <IonProgressBar value={total ? done / total : 0} color={berhasil ? 'success' : 'primary'} />
              <span className="mono">{persen}%</span>
            </div>
            <IonList>
              {berlaku.map((t) => {
                const log = logs?.find((l) => l.template_id === t.id);
                return (
                  <IonItem key={t.id}>
                    <IonCheckbox
                      checked={!!log?.is_done}
                      onIonChange={() => { void toggleCentang(t.id, hariIni).then(() => void muat()); }}
                    >
                      {t.title}
                    </IonCheckbox>
                  </IonItem>
                );
              })}
            </IonList>
            {total === 0 && <p className="empty-state">Belum ada rutinitas. Tambah di tab Harian.</p>}
            <IonButton fill="clear" size="small" routerLink="/harian">Kelola rutinitas</IonButton>
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Tagihan mendekat</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {dekat.length === 0 ? (
              <p className="empty-state">Tidak ada tagihan mendekat. 🎉</p>
            ) : (
              <IonList>
                {dekat.map((r) => (
                  <IonItem key={r.id} routerLink="/tagihan">
                    <IonLabel>
                      <h3>{r.title}</h3>
                      <p className="mono">{formatTanggal(r.due_date)} · {formatRp(r.amount)}</p>
                    </IonLabel>
                    <IonChip color={r.due_date < hariIni ? 'danger' : r.due_date === hariIni ? 'warning' : 'medium'}>
                      {r.due_date < hariIni ? 'Terlambat' : r.due_date === hariIni ? 'Hari ini' : r.due_date}
                    </IonChip>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Tugas jatuh tempo</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {(tugasJatuhTempo?.length ?? 0) === 0 ? (
              <p className="empty-state">Tidak ada tugas terlambat atau jatuh tempo hari ini. 🎉</p>
            ) : (
              <IonList>
                {(tugasJatuhTempo ?? []).slice(0, 5).map((t) => (
                  <IonItem key={t.id} routerLink={`/proyek`}>
                    <IonLabel>
                      <h3>{t.title}</h3>
                      <p className="mono">Tenggat: {formatTanggal(t.due_date)}</p>
                    </IonLabel>
                    <IonChip color={t.due_date < hariIni ? 'danger' : 'warning'}>{t.due_date < hariIni ? 'Terlambat' : 'Hari ini'}</IonChip>
                  </IonItem>
                ))}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Jadwal belajar hari ini ({belajarHari.length})</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            {belajarHari.length === 0 ? (
              <p className="empty-state">Tidak ada jadwal belajar hari ini.</p>
            ) : (
              <IonList>
                {belajarHari.map((s) => {
                  const sudah = studyLogs?.some((l) => l.schedule_id === s.id && l.is_done);
                  return (
                    <IonItem key={s.id} routerLink="/belajar">
                      <IonLabel>
                        <h3>{sudah ? '✅ ' : ''}{s.topic}</h3>
                        <p className="mono">{s.start_time} · {s.duration_min} menit</p>
                      </IonLabel>
                    </IonItem>
                  );
                })}
              </IonList>
            )}
          </IonCardContent>
        </IonCard>
      </IonContent>
    </IonPage>
  );
}
