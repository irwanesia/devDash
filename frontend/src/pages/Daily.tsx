import { useEffect, useMemo, useState } from 'react';
import {
  IonAlert, IonButton, IonCard, IonCardContent, IonCheckbox, IonContent, IonHeader,
  IonIcon, IonInput, IonItem, IonItemOption, IonItemOptions, IonItemSliding,
  IonLabel, IonList, IonPage, IonRange, IonTitle, IonToolbar, useIonViewWillEnter,
} from '@ionic/react';
import { add, chevronBack, chevronForward } from 'ionicons/icons';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, nowISO, todayStr } from '../db/database';
import { ambangStreak, hariBerhasil, hitungStreak, pastikanLogHarian, simpanAmbangStreak, tambahTemplate, templateBerlaku, toggleCentang } from '../features/daily/dailyService';
import { formatTanggal } from '../utils/helpers';

function geser(tanggal: string, hari: number): string {
  const d = new Date(tanggal + 'T00:00:00');
  d.setDate(d.getDate() + hari);
  return todayStr(d);
}

export default function Daily() {
  const hariIni = todayStr();
  const [lihat, setLihat] = useState(hariIni);
  const [baru, setBaru] = useState('');
  const [mulaiBaru, setMulaiBaru] = useState(hariIni);
  const [ambang, setAmbang] = useState(80);
  const [streak, setStreak] = useState(0);
  const [editId, setEditId] = useState<string | null>(null);

  const templates = useLiveQuery(() => db.daily_templates.toArray().then((a) => a.sort((x, y) => x.sort_order - y.sort_order)), [], []);
  const logs = useLiveQuery(() => db.daily_logs.where('log_date').equals(lihat).toArray(), [lihat], []);
  const riwayat = useLiveQuery(() => db.daily_logs.toArray().then((a) => a.sort((x, y) => (x.log_date < y.log_date ? 1 : -1)).slice(0, 90)), [], []);

  const muat = async () => {
    await pastikanLogHarian(lihat);
    const a = await ambangStreak();
    setAmbang(a);
    setStreak((await hitungStreak(a)).streak);
  };

  useIonViewWillEnter(() => { void muat(); });
  useEffect(() => { void muat(); }, [lihat]);

  const daftar = useMemo(
    () => (templates ?? []).filter((t) => !t.deleted_at && templateBerlaku(t, lihat)),
    [templates, lihat],
  );
  const semuaNonHapus = useMemo(() => (templates ?? []).filter((t) => !t.deleted_at), [templates]);
  const done = logs?.filter((l) => l.is_done).length ?? 0;
  const masaDepan = lihat > hariIni;

  // Kelompokkan riwayat per tanggal untuk 14 hari terakhir
  const perTanggal = new Map<string, { done: number; total: number }>();
  (riwayat ?? []).forEach((l) => {
    const e = perTanggal.get(l.log_date) ?? { done: 0, total: 0 };
    e.total += 1;
    if (l.is_done) e.done += 1;
    perTanggal.set(l.log_date, e);
  });
  const daftarTanggal = [...perTanggal.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 14);

  const simpanEdit = (judul: string) => {
    if (editId && judul.trim()) {
      void db.daily_templates.update(editId, { title: judul.trim(), updated_at: nowISO() });
    }
    setEditId(null);
  };

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Harian</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardContent>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <IonButton fill="clear" size="small" onClick={() => setLihat(geser(lihat, -1))} aria-label="Hari sebelumnya">
                <IonIcon icon={chevronBack} />
              </IonButton>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <strong>{lihat === hariIni ? 'Hari ini' : formatTanggal(lihat)}</strong>
                <div className="mono muted">{lihat}</div>
              </div>
              <IonButton fill="clear" size="small" onClick={() => setLihat(geser(lihat, 1))} aria-label="Hari berikutnya">
                <IonIcon icon={chevronForward} />
              </IonButton>
            </div>
            {lihat !== hariIni && (
              <IonButton fill="clear" size="small" expand="block" onClick={() => setLihat(hariIni)}>
                Kembali ke hari ini
              </IonButton>
            )}
            <p className="muted" style={{ marginTop: 8 }}>
              Checklist {masaDepan ? 'besok' : 'hari ini'}: {done}/{daftar.filter((t) => t.is_active).length} · Streak: {streak} hari · Ambang: {ambang}%
            </p>
            <IonItem>
              <IonRange min={50} max={100} step={5} value={ambang}
                onIonChange={(e) => { const v = Number(e.detail.value); setAmbang(v); void simpanAmbangStreak(v); }}>
                <IonLabel slot="start">50%</IonLabel>
                <IonLabel slot="end">100%</IonLabel>
              </IonRange>
            </IonItem>
          </IonCardContent>
        </IonCard>

        <IonList>
          {daftar.map((t) => {
            const log = logs?.find((l) => l.template_id === t.id);
            return (
              <IonItemSliding key={t.id}>
                <IonItem>
                  <IonCheckbox
                    checked={!!log?.is_done}
                    disabled={!t.is_active}
                    onIonChange={() => { void toggleCentang(t.id, lihat); }}
                  >
                    {t.title} {!t.is_active && '(nonaktif)'}
                    {(t.mulai_tanggal || '') > hariIni && <span className="muted"> · mulai {t.mulai_tanggal}</span>}
                  </IonCheckbox>
                </IonItem>
                <IonItemOptions side="end">
                  <IonItemOption onClick={() => setEditId(t.id)}>Ubah</IonItemOption>
                  <IonItemOption
                    onClick={() => void db.daily_templates.update(t.id, { is_active: !t.is_active, updated_at: nowISO() })}
                  >
                    {t.is_active ? 'Nonaktif' : 'Aktif'}
                  </IonItemOption>
                  <IonItemOption color="danger" onClick={() => void db.daily_templates.update(t.id, { deleted_at: nowISO() })}>
                    Hapus
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            );
          })}
        </IonList>
        {daftar.length === 0 && (
          <p className="empty-state">Tidak ada rutinitas untuk tanggal ini.</p>
        )}

        <IonItem>
          <IonInput placeholder="Rutinitas baru, mis. Baca docs" value={baru} onIonInput={(e) => setBaru(String(e.detail.value ?? ''))} />
        </IonItem>
        <IonItem>
          <IonInput label="Mulai berlaku" type="date" value={mulaiBaru} onIonInput={(e) => setMulaiBaru(String(e.detail.value ?? ''))} />
          <IonButton
            onClick={() => {
              if (!baru.trim()) return;
              void tambahTemplate(baru, mulaiBaru === hariIni ? '' : mulaiBaru).then(() => { setBaru(''); void muat(); });
            }}
          >
            <IonIcon icon={add} />
          </IonButton>
        </IonItem>
        <p className="muted hint">Untuk menyusun list besok malam ini: isi “Mulai berlaku” dengan tanggal besok.</p>

        {semuaNonHapus.some((t) => (t.mulai_tanggal || '') > hariIni) && (
          <>
            <h3>Terjadwal ke depan</h3>
            <IonList>
              {semuaNonHapus.filter((t) => (t.mulai_tanggal || '') > hariIni).map((t) => (
                <IonItem key={t.id}>
                  <IonLabel>{t.title}</IonLabel>
                  <span className="mono muted">{t.mulai_tanggal}</span>
                </IonItem>
              ))}
            </IonList>
          </>
        )}

        <h3>Riwayat 14 hari</h3>
        {daftarTanggal.length === 0 ? (
          <p className="empty-state">Belum ada riwayat.</p>
        ) : (
          <IonList>
            {daftarTanggal.map(([tgl, v]) => {
              const p = v.total ? Math.round((v.done / v.total) * 100) : 0;
              return (
                <IonItem key={tgl} button onClick={() => setLihat(tgl)}>
                  <IonLabel><span className="mono">{tgl}</span> — {v.done}/{v.total} ({p}%)</IonLabel>
                  {hariBerhasil(v.done, v.total, ambang) ? '✅' : '—'}
                </IonItem>
              );
            })}
          </IonList>
        )}

        <IonAlert
          isOpen={editId !== null}
          header="Ubah rutinitas"
          inputs={[{ name: 'judul', type: 'text', value: semuaNonHapus.find((t) => t.id === editId)?.title ?? '' }]}
          buttons={[
            { text: 'Batal', role: 'cancel', handler: () => setEditId(null) },
            { text: 'Simpan', handler: (data) => simpanEdit(String(data.judul ?? '')) },
          ]}
        />
      </IonContent>
    </IonPage>
  );
}
