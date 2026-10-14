import { useState } from 'react';
import {
  IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCheckbox,
  IonChip, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonItemOption,
  IonItemOptions, IonItemSliding, IonLabel, IonList, IonModal, IonPage,
  IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar,
} from '@ionic/react';
import { add } from 'ionicons/icons';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'react-router-dom';
import { db, nowISO, type TaskPriority, type TaskStatus } from '../db/database';
import { formatTanggal, hitungProgres, newId } from '../utils/helpers';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [modal, setModal] = useState(false);
  const [judul, setJudul] = useState('');
  const [prioritas, setPrioritas] = useState<TaskPriority>('sedang');
  const [tenggat, setTenggat] = useState('');

  const project = useLiveQuery(() => db.projects.get(id!), [id]);
  const tugas = useLiveQuery(() => db.tasks.where('project_id').equals(id!).sortBy('sort_order'), [id], []);
  const aktif = (tugas ?? []).filter((t) => !t.deleted_at);
  const done = aktif.filter((t) => t.status === 'done').length;
  const persen = hitungProgres(done, aktif.length);

  const tambahTugas = async () => {
    if (!judul.trim()) return;
    await db.tasks.add({
      id: newId(), project_id: id!, category_id: project?.category_id ?? null,
      title: judul.trim(), description: '', priority: prioritas, status: 'todo',
      due_date: tenggat, sort_order: aktif.length, updated_at: nowISO(), deleted_at: null,
    });
    setJudul(''); setTenggat(''); setModal(false);
  };

  const setStatus = (taskId: string, status: TaskStatus) =>
    db.tasks.update(taskId, { status, updated_at: nowISO() });

  const hapus = (taskId: string) => db.tasks.update(taskId, { deleted_at: nowISO() });

  if (!project) {
    return (
      <IonPage>
        <IonHeader><IonToolbar><IonButtons slot="start"><IonBackButton defaultHref="/proyek" /></IonButtons><IonTitle>Proyek</IonTitle></IonToolbar></IonHeader>
        <IonContent className="ion-padding"><p className="empty-state">Proyek tidak ditemukan.</p></IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/proyek" /></IonButtons>
          <IonTitle>{project.name}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonCard>
          <IonCardContent>
            <IonChip>{project.status}</IonChip>{' '}
            {project.target_date && <span className="mono muted">Target {formatTanggal(project.target_date)}</span>}
            {project.description && <p>{project.description}</p>}
            <div className="progress-row">
              <strong className="mono">{done}/{aktif.length} · {persen}%</strong>
            </div>
          </IonCardContent>
        </IonCard>

        <h3>Tugas</h3>
        {aktif.length === 0 ? (
          <p className="empty-state">Belum ada tugas. Tambah tugas pertama dengan tombol +.</p>
        ) : (
          <IonList>
            {aktif.map((t) => (
              <IonItemSliding key={t.id}>
                <IonItem>
                  <IonCheckbox
                    checked={t.status === 'done'}
                    onIonChange={() => void setStatus(t.id, t.status === 'done' ? 'todo' : 'done')}
                  >
                    {t.title}
                  </IonCheckbox>
                  <IonChip slot="end" color={t.priority === 'tinggi' ? 'danger' : t.priority === 'sedang' ? 'warning' : 'medium'}>
                    {t.priority}
                  </IonChip>
                  <IonButton slot="end" fill="clear" size="small" onClick={() => void setStatus(t.id, t.status === 'doing' ? 'todo' : 'doing')}>
                    {t.status === 'doing' ? 'Todo' : 'Doing'}
                  </IonButton>
                </IonItem>
                <IonItemOptions side="end">
                  <IonItemOption color="danger" onClick={() => void hapus(t.id)}>Hapus</IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
          </IonList>
        )}

        <IonButton expand="block" onClick={() => setModal(true)}>
          <IonIcon icon={add} /> Tambah tugas
        </IonButton>

        <IonModal isOpen={modal} onDidDismiss={() => setModal(false)}>
          <IonHeader><IonToolbar><IonTitle>Tugas baru</IonTitle></IonToolbar></IonHeader>
          <IonContent className="ion-padding">
            <IonItem><IonInput label="Judul" value={judul} onIonInput={(e) => setJudul(String(e.detail.value ?? ''))} /></IonItem>
            <IonItem>
              <IonSelect label="Prioritas" value={prioritas} onIonChange={(e) => setPrioritas(e.detail.value)}>
                <IonSelectOption value="rendah">rendah</IonSelectOption>
                <IonSelectOption value="sedang">sedang</IonSelectOption>
                <IonSelectOption value="tinggi">tinggi</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonItem><IonInput label="Tenggat" type="date" value={tenggat} onIonInput={(e) => setTenggat(String(e.detail.value ?? ''))} /></IonItem>
            <IonItem><IonTextarea label="Catatan proyek" value={project.notes} readonly /></IonItem>
            <IonButton expand="block" onClick={() => void tambahTugas()}>Simpan</IonButton>
            <IonButton expand="block" fill="clear" onClick={() => setModal(false)}>Batal</IonButton>
            <IonLabel className="muted">Tugas mengikuti kategori proyek bila tanpa kategori sendiri.</IonLabel>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
}
