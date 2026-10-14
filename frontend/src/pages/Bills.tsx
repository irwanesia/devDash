import { useMemo, useState } from 'react';
import {
  IonButton, IonCard, IonCardContent, IonChip, IonContent, IonFab, IonFabButton,
  IonHeader, IonIcon, IonInput, IonItem, IonItemOption, IonItemOptions, IonItemSliding,
  IonLabel, IonList, IonModal, IonPage, IonSelect, IonSelectOption, IonTextarea,
  IonTitle, IonToolbar,
} from '@ionic/react';
import { add, calendarOutline } from 'ionicons/icons';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, nowISO, todayStr, type Reminder } from '../db/database';
import { formatRp, formatTanggal, newId } from '../utils/helpers';
import { apakahTerlambat, kelompokkan, tandaiLunas, totalBelumLunasBulanIni, unduhICS, type Kelompok } from '../features/reminders/reminderService';

const KATEGORI: Reminder['category'][] = ['tagihan', 'dp_proyek', 'langganan', 'lainnya'];
const ULANG: Reminder['repeat_rule'][] = ['tidak', 'mingguan', 'bulanan', 'tahunan'];
const URUTAN: Kelompok[] = ['Terlambat', 'Minggu ini', 'Bulan ini', 'Nanti', 'Lunas'];

export default function Bills() {
  const hariIni = todayStr();
  const [modal, setModal] = useState(false);
  const [judul, setJudul] = useState('');
  const [kategori, setKategori] = useState<Reminder['category']>('tagihan');
  const [nominal, setNominal] = useState('');
  const [jatuhTempo, setJatuhTempo] = useState(hariIni);
  const [ulang, setUlang] = useState<Reminder['repeat_rule']>('tidak');
  const [catatan, setCatatan] = useState('');

  const daftar = useLiveQuery(() => db.reminders.filter((r) => !r.deleted_at).sortBy('due_date'), [], []);
  const projects = useLiveQuery(() => db.projects.filter((p) => !p.deleted_at).toArray(), [], []);
  const [proyekId, setProyekId] = useState('');

  const grup = useMemo(() => {
    const m = new Map<Kelompok, Reminder[]>();
    (daftar ?? []).forEach((r) => {
      const k = kelompokkan(r, hariIni);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    });
    return m;
  }, [daftar, hariIni]);

  const total = totalBelumLunasBulanIni(daftar ?? [], hariIni);

  const simpan = async () => {
    if (!judul.trim() || !jatuhTempo) return;
    await db.reminders.add({
      id: newId(),
      title: judul.trim(),
      category: kategori,
      amount: nominal ? parseInt(nominal.replace(/\D/g, ''), 10) : null,
      due_date: jatuhTempo,
      repeat_rule: ulang,
      remind_days_before: 3,
      status: 'belum',
      paid_at: null,
      project_id: proyekId || null,
      notes: catatan.trim(),
      updated_at: nowISO(),
      deleted_at: null,
    });
    setJudul(''); setNominal(''); setCatatan(''); setUlang('tidak'); setProyekId('');
    setModal(false);
  };

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Tagihan</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardContent>
            <strong>Total belum lunas bulan ini: <span className="mono">{formatRp(total)}</span></strong>
          </IonCardContent>
        </IonCard>

        {URUTAN.map((k) => {
          const isi = grup.get(k) ?? [];
          if (isi.length === 0) return null;
          return (
            <div key={k}>
              <h3>{k} ({isi.length})</h3>
              <IonList>
                {isi.map((r) => (
                  <IonItemSliding key={r.id}>
                    <IonItem>
                      <IonLabel>
                        <h3>{r.title}</h3>
                        <p><span className="mono">{formatTanggal(r.due_date)} · {formatRp(r.amount)}</span></p>
                        <p className="muted">{r.category}{r.repeat_rule !== 'tidak' ? ` · 🔁 ${r.repeat_rule}` : ''}{r.notes ? ` · ${r.notes}` : ''}</p>
                      </IonLabel>
                      {apakahTerlambat(r, hariIni)
                        ? <IonChip color="danger">Terlambat</IonChip>
                        : r.status === 'lunas'
                          ? <IonChip color="success">Lunas</IonChip>
                          : <IonChip color="warning">Belum</IonChip>}
                      {r.status === 'belum' && (
                        <IonButton size="small" onClick={() => void tandaiLunas(r.id)}>Lunas</IonButton>
                      )}
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption onClick={() => unduhICS(r)}>
                        <IonIcon icon={calendarOutline} /> .ics
                      </IonItemOption>
                      <IonItemOption color="danger" onClick={() => void db.reminders.update(r.id, { deleted_at: nowISO() })}>
                        Hapus
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                ))}
              </IonList>
            </div>
          );
        })}

        {(daftar?.length ?? 0) === 0 && (
          <p className="empty-state">Belum ada tagihan. Contoh: Wifi bulanan, DP proyek. Ketuk + untuk menambah.</p>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setModal(true)} aria-label="Tambah tagihan">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={modal} onDidDismiss={() => setModal(false)}>
          <IonHeader><IonToolbar><IonTitle>Tagihan baru</IonTitle></IonToolbar></IonHeader>
          <IonContent className="ion-padding">
            <IonItem><IonInput label="Judul" value={judul} onIonInput={(e) => setJudul(String(e.detail.value ?? ''))} /></IonItem>
            <IonItem>
              <IonSelect label="Kategori" value={kategori} onIonChange={(e) => setKategori(e.detail.value)}>
                {KATEGORI.map((k) => <IonSelectOption key={k} value={k}>{k}</IonSelectOption>)}
              </IonSelect>
            </IonItem>
            <IonItem><IonInput label="Nominal (Rp)" inputMode="numeric" value={nominal} onIonInput={(e) => setNominal(String(e.detail.value ?? ''))} /></IonItem>
            <IonItem><IonInput label="Jatuh tempo" type="date" value={jatuhTempo} onIonInput={(e) => setJatuhTempo(String(e.detail.value ?? ''))} /></IonItem>
            <IonItem>
              <IonSelect label="Ulang" value={ulang} onIonChange={(e) => setUlang(e.detail.value)}>
                {ULANG.map((u) => <IonSelectOption key={u} value={u}>{u}</IonSelectOption>)}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonSelect label="Terkait proyek (opsional)" value={proyekId} onIonChange={(e) => setProyekId(String(e.detail.value ?? ''))}>
                <IonSelectOption value="">—</IonSelectOption>
                {(projects ?? []).map((p) => <IonSelectOption key={p.id} value={p.id}>{p.name}</IonSelectOption>)}
              </IonSelect>
            </IonItem>
            <IonItem><IonTextarea label="Catatan" value={catatan} onIonInput={(e) => setCatatan(String(e.detail.value ?? ''))} /></IonItem>
            <IonButton expand="block" onClick={() => void simpan()}>Simpan</IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setModal(false)}>Batal</IonButton>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}
