import { useEffect, useState } from 'react';
import {
  IonButton, IonCard, IonCardContent, IonCheckbox, IonContent, IonHeader,
  IonInput, IonItem, IonItemOption, IonItemOptions, IonItemSliding, IonLabel,
  IonList, IonModal, IonPage, IonSelect, IonSelectOption, IonTextarea,
  IonTitle, IonToolbar, useIonViewWillEnter,
} from '@ionic/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, nowISO, todayStr } from '../db/database';
import { newId } from '../utils/helpers';
import { awalMinggu, jadwalHariIni, statistikMinggu, toggleSesi, NAMA_HARI } from '../features/study/studyService';

export default function Study() {
  const hariIni = todayStr();
  const weekday = new Date().getDay();
  const [jadwalHari, setJadwalHari] = useState<Awaited<ReturnType<typeof jadwalHariIni>>>([]);
  const [stat, setStat] = useState({ sesi: 0, menit: 0 });
  const [modal, setModal] = useState(false);
  const [topik, setTopik] = useState('');
  const [hari, setHari] = useState<number[]>([1]);
  const [jam, setJam] = useState('19:00');
  const [durasi, setDurasi] = useState('30');
  const [tujuan, setTujuan] = useState('');

  const semua = useLiveQuery(() => db.study_schedules.filter((s) => !s.deleted_at).toArray(), [], []);
  const logs = useLiveQuery(() => db.study_logs.where('log_date').equals(hariIni).toArray(), [hariIni], []);

  const muat = async () => {
    setJadwalHari(await jadwalHariIni(weekday));
    setStat(await statistikMinggu());
  };

  useIonViewWillEnter(() => { void muat(); });
  useEffect(() => { void muat(); }, []);

  const simpan = async () => {
    if (!topik.trim()) return;
    await db.study_schedules.add({
      id: newId(), topic: topik.trim(), weekdays: hari, start_time: jam,
      duration_min: parseInt(durasi, 10) || 30, goal: tujuan.trim(),
      resource_url: '', is_active: true, updated_at: nowISO(), deleted_at: null,
    });
    setTopik(''); setTujuan(''); setModal(false);
    void muat();
  };

  // Tampilan mingguan: 7 kolom hari
  const mingguIni = [1, 2, 3, 4, 5, 6, 0]; // Sen..Min
  const hitungPerHari = (wd: number) =>
    (semua ?? []).filter((s) => !s.deleted_at && s.is_active && s.weekdays.includes(wd)).length;

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Belajar</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardContent>
            <strong>Minggu ini: {stat.sesi} sesi · {stat.menit} menit</strong>
            <p className="muted mono">Mulai {awalMinggu()} (Senin)</p>
          </IonCardContent>
        </IonCard>

        <h3>Hari ini</h3>
        {jadwalHari.length === 0 ? (
          <p className="empty-state">Tidak ada jadwal hari ini. Tambah jadwal mingguan dengan tombol di bawah.</p>
        ) : (
          <IonList>
            {jadwalHari.map((s) => {
              const log = logs?.find((l) => l.schedule_id === s.id);
              return (
                <IonItem key={s.id}>
                  <IonCheckbox checked={!!log?.is_done} onIonChange={() => { void toggleSesi(s.id, hariIni); }}>
                    {s.topic}
                  </IonCheckbox>
                  <IonLabel slot="end" className="mono">{s.start_time} · {s.duration_min}m</IonLabel>
                </IonItem>
              );
            })}
          </IonList>
        )}

        <h3>Mingguan</h3>
        <IonList>
          {mingguIni.map((wd) => (
            <IonItem key={wd}>
              <IonLabel>{NAMA_HARI[wd]}</IonLabel>
              <span className="mono muted">{hitungPerHari(wd)} sesi</span>
            </IonItem>
          ))}
        </IonList>

        <h3>Semua jadwal</h3>
        <IonList>
          {(semua ?? []).filter((s) => !s.deleted_at).map((s) => (
            <IonItemSliding key={s.id}>
              <IonItem>
                <IonLabel>
                  <h3>{s.topic} {!s.is_active && '(nonaktif)'}</h3>
                  <p className="mono">{s.weekdays.map((w) => NAMA_HARI[w]).join(', ')} · {s.start_time} · {s.duration_min}m</p>
                  {s.goal && <p className="muted">{s.goal}</p>}
                </IonLabel>
              </IonItem>
              <IonItemOptions side="end">
                <IonItemOption onClick={() => void db.study_schedules.update(s.id, { is_active: !s.is_active, updated_at: nowISO() })}>
                  {s.is_active ? 'Nonaktif' : 'Aktif'}
                </IonItemOption>
                <IonItemOption color="danger" onClick={() => void db.study_schedules.update(s.id, { deleted_at: nowISO() })}>
                  Hapus
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>

        <IonButton expand="block" onClick={() => setModal(true)}>Tambah jadwal</IonButton>

        <IonModal isOpen={modal} onDidDismiss={() => setModal(false)}>
          <IonHeader><IonToolbar><IonTitle>Jadwal baru</IonTitle></IonToolbar></IonHeader>
          <IonContent className="ion-padding">
            <IonItem><IonInput label="Topik" value={topik} onIonInput={(e) => setTopik(String(e.detail.value ?? ''))} /></IonItem>
            <IonItem>
              <IonSelect label="Hari" multiple value={hari} onIonChange={(e) => setHari(e.detail.value)}>
                {[1, 2, 3, 4, 5, 6, 0].map((w) => <IonSelectOption key={w} value={w}>{NAMA_HARI[w]}</IonSelectOption>)}
              </IonSelect>
            </IonItem>
            <IonItem><IonInput label="Jam mulai" type="time" value={jam} onIonInput={(e) => setJam(String(e.detail.value ?? ''))} /></IonItem>
            <IonItem><IonInput label="Durasi (menit)" inputMode="numeric" value={durasi} onIonInput={(e) => setDurasi(String(e.detail.value ?? ''))} /></IonItem>
            <IonItem><IonTextarea label="Target/catatan" value={tujuan} onIonInput={(e) => setTujuan(String(e.detail.value ?? ''))} /></IonItem>
            <IonButton expand="block" onClick={() => void simpan()}>Simpan</IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setModal(false)}>Batal</IonButton>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}
