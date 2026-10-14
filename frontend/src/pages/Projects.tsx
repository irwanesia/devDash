import { useMemo, useState } from 'react';
import {
  IonButton, IonCard, IonCardContent, IonChip, IonContent, IonFab, IonFabButton,
  IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonModal, IonPage,
  IonProgressBar, IonSegment, IonSegmentButton, IonSelect, IonSelectOption,
  IonTextarea, IonTitle, IonToolbar,
} from '@ionic/react';
import { add } from 'ionicons/icons';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, nowISO, type ProjectStatus } from '../db/database';
import { formatTanggal, hitungProgres, newId } from '../utils/helpers';

const STATUS: ProjectStatus[] = ['ide', 'berjalan', 'ditunda', 'selesai'];

export default function Projects() {
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const [filterKategori, setFilterKategori] = useState<string>('semua');
  const [modalTerbuka, setModalTerbuka] = useState(false);
  const [nama, setNama] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('ide');
  const [target, setTarget] = useState('');
  const [kategoriId, setKategoriId] = useState<string>('');

  const projects = useLiveQuery(() => db.projects.filter((p) => !p.deleted_at).sortBy('target_date'), [], []);
  const tasks = useLiveQuery(() => db.tasks.filter((t) => !t.deleted_at).toArray(), [], []);
  const categories = useLiveQuery(() => db.categories.filter((c) => !c.deleted_at).sortBy('sort_order'), [], []);

  const tampil = useMemo(() => {
    return (projects ?? []).filter((p) => {
      if (filterStatus !== 'semua' && p.status !== filterStatus) return false;
      if (filterKategori !== 'semua' && (p.category_id ?? '') !== filterKategori) return false;
      return true;
    });
  }, [projects, filterStatus, filterKategori]);

  const progres = (projectId: string) => {
    const milik = (tasks ?? []).filter((t) => t.project_id === projectId);
    if (milik.length === 0) return 0;
    return hitungProgres(milik.filter((t) => t.status === 'done').length, milik.length);
  };

  const simpan = async () => {
    if (!nama.trim()) return;
    await db.projects.add({
      id: newId(),
      name: nama.trim(),
      description: deskripsi.trim(),
      client: '',
      status,
      start_date: '',
      target_date: target,
      value_amount: null,
      notes: '',
      category_id: kategoriId || null,
      updated_at: nowISO(),
      deleted_at: null,
    });
    setNama(''); setDeskripsi(''); setStatus('ide'); setTarget(''); setKategoriId('');
    setModalTerbuka(false);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar><IonTitle>Proyek</IonTitle></IonToolbar>
        {(categories ?? []).length > 0 && (
          <IonToolbar>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 8px' }}>
              {(categories ?? []).map((c) => (
                <IonChip
                  key={c.id}
                  color={filterKategori === c.id ? 'primary' : 'medium'}
                  onClick={() => setFilterKategori(filterKategori === c.id ? 'semua' : c.id)}
                  style={{ borderLeft: `4px solid ${c.color}` }}
                >
                  {c.name}
                </IonChip>
              ))}
            </div>
          </IonToolbar>
        )}
      </IonHeader>
      <IonContent className="ion-padding">
        <IonSegment value={filterStatus} onIonChange={(e) => setFilterStatus(String(e.detail.value))}>
          <IonSegmentButton value="semua">Semua</IonSegmentButton>
          <IonSegmentButton value="berjalan">Jalan</IonSegmentButton>
          <IonSegmentButton value="ide">Ide</IonSegmentButton>
          <IonSegmentButton value="selesai">Selesai</IonSegmentButton>
        </IonSegment>

        {tampil.length === 0 ? (
          <p className="empty-state">Belum ada proyek. Ketuk + untuk menambah proyek pertama.</p>
        ) : (
          tampil.map((p) => (
            <IonCard key={p.id} routerLink={`/proyek/${p.id}`}>
              <IonCardContent>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{p.name}</strong>
                  <IonChip color={p.status === 'selesai' ? 'success' : p.status === 'berjalan' ? 'primary' : 'medium'}>{p.status}</IonChip>
                </div>
                {p.description && <p className="muted">{p.description}</p>}
                <div className="progress-row">
                  <IonProgressBar value={progres(p.id) / 100} />
                  <span className="mono">{progres(p.id)}%</span>
                </div>
                {p.target_date && <p className="mono muted">Target: {formatTanggal(p.target_date)}</p>}
              </IonCardContent>
            </IonCard>
          ))
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => setModalTerbuka(true)} aria-label="Tambah proyek">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        <IonModal isOpen={modalTerbuka} onDidDismiss={() => setModalTerbuka(false)}>
          <IonHeader><IonToolbar><IonTitle>Proyek baru</IonTitle></IonToolbar></IonHeader>
          <IonContent className="ion-padding">
            <IonList>
              <IonItem><IonInput label="Nama" value={nama} onIonInput={(e) => setNama(String(e.detail.value ?? ''))} /></IonItem>
              <IonItem><IonTextarea label="Deskripsi" value={deskripsi} onIonInput={(e) => setDeskripsi(String(e.detail.value ?? ''))} /></IonItem>
              <IonItem>
                <IonSelect label="Status" value={status} onIonChange={(e) => setStatus(e.detail.value)}>
                  {STATUS.map((s) => <IonSelectOption key={s} value={s}>{s}</IonSelectOption>)}
                </IonSelect>
              </IonItem>
              <IonItem><IonInput label="Target selesai" type="date" value={target} onIonInput={(e) => setTarget(String(e.detail.value ?? ''))} /></IonItem>
              <IonItem>
                <IonSelect label="Kategori" value={kategoriId} onIonChange={(e) => setKategoriId(String(e.detail.value ?? ''))}>
                  <IonSelectOption value="">Tanpa kategori</IonSelectOption>
                  {(categories ?? []).map((c) => <IonSelectOption key={c.id} value={c.id}>{c.name}</IonSelectOption>)}
                </IonSelect>
              </IonItem>
            </IonList>
            <IonButton expand="block" onClick={() => void simpan()}>Simpan</IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setModalTerbuka(false)}>Batal</IonButton>
            <IonItem routerLink="/pengaturan" detail><IonLabel>Kelola kategori di Pengaturan</IonLabel></IonItem>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}
