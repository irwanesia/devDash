import { useEffect, useState } from 'react';
import {
  IonButton, IonCard, IonCardContent, IonContent, IonHeader, IonInput,
  IonItem, IonLabel, IonList, IonPage, IonSelect, IonSelectOption,
  IonTitle, IonToolbar, useIonViewWillEnter,
} from '@ionic/react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, nowISO } from '../db/database';
import { newId } from '../utils/helpers';
import { daftar, getBaseUrl, getUser, keluar, login, setBaseUrl, sudahLogin } from '../api/client';
import { getLastSync, getSyncStatus, onSyncStatus, sinkronkan } from '../api/sync';

const WARNA = ['#6C8CFF', '#3DD68C', '#F5B544', '#FF6B6B', '#B388FF', '#4DD0E1'];
const TABEL_IMPOR = ['categories', 'projects', 'tasks', 'daily_templates', 'daily_logs', 'reminders', 'study_schedules', 'study_logs'] as const;

export default function Settings() {
  const [nama, setNama] = useState('');
  const [warna, setWarna] = useState(WARNA[0]);
  const [tema, setTema] = useState(document.body.className || 'light');
  const [email, setEmail] = useState('');
  const [sandi, setSandi] = useState('');
  const [namaTampil, setNamaTampil] = useState('');
  const [modeAkun, setModeAkun] = useState<'masuk' | 'daftar'>('masuk');
  const [masuk, setMasuk] = useState(sudahLogin());
  const [pengguna, setPengguna] = useState(getUser());
  const [baseUrl, setBase] = useState(getBaseUrl());
  const [pesan, setPesan] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);
  const [statusSync, setStatusSync] = useState(getSyncStatus());
  const [terakhir, setTerakhir] = useState<string | null>(getLastSync());
  const categories = useLiveQuery(() => db.categories.toArray().then((a) => a.sort((x, y) => x.sort_order - y.sort_order)), [], []);

  useIonViewWillEnter(() => {
    setMasuk(sudahLogin());
    setPengguna(getUser());
    setTerakhir(getLastSync());
  });
  useEffect(() => onSyncStatus((s) => {
    setStatusSync(s);
    if (s.state === 'ok') setTerakhir(s.at);
  }), []);

  const gantiTema = (v: string) => {
    setTema(v);
    document.body.className = v;
    localStorage.setItem('devdash-theme', v);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      'content',
      v === 'dark' ? '#0F1115' : '#F6F7F9',
    );
  };

  const tambahKategori = async () => {
    if (!nama.trim()) return;
    const semua = await db.categories.toArray();
    await db.categories.add({
      id: newId(), name: nama.trim(), color: warna,
      sort_order: semua.length, updated_at: nowISO(), deleted_at: null,
    });
    setNama('');
  };

  const kirimAkun = async () => {
    setSibuk(true);
    setPesan(null);
    try {
      setBaseUrl(baseUrl);
      if (modeAkun === 'masuk') await login(email.trim(), sandi);
      else await daftar(email.trim(), sandi, namaTampil.trim());
      setMasuk(true);
      setPengguna(getUser());
      setPesan('Masuk berhasil. Sinkronisasi aktif.');
    } catch (e) {
      setPesan(e instanceof Error ? e.message : 'Gagal masuk');
    } finally {
      setSibuk(false);
    }
  };

  const sinkronManual = async () => {
    setSibuk(true);
    setPesan(null);
    try {
      setBaseUrl(baseUrl);
      const { pushed, pulled } = await sinkronkan();
      setPesan(`Sinkron selesai: ${pushed} dikirim, ${pulled} diterima.`);
    } catch (e) {
      setPesan(e instanceof Error ? e.message : 'Sinkron gagal');
    } finally {
      setSibuk(false);
    }
  };

  const ekspor = async () => {
    const data: Record<string, unknown[]> = {};
    for (const t of TABEL_IMPOR) {
      data[t] = await (db as unknown as Record<string, { toArray: () => Promise<unknown[]> }>)[t].toArray();
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'devdash-backup.json';
    a.click();
  };

  const impor = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      for (const t of TABEL_IMPOR) {
        const rows = data[t];
        if (!Array.isArray(rows)) continue;
        const table = (db as unknown as Record<string, { bulkPut: (r: unknown[]) => Promise<void> }>)[t];
        await table.bulkPut(rows.map((r) => ({ ...(r as object), updated_at: (r as { updated_at?: string }).updated_at ?? nowISO() })));
      }
      setPesan(`Impor selesai dari ${file.name}.`);
    } catch {
      setPesan('File tidak valid.');
    }
  };

  const hapusSemua = async () => {
    if (!confirm('Hapus semua data lokal?')) return;
    await Promise.all(TABEL_IMPOR.map((t) =>
      (db as unknown as Record<string, { clear: () => Promise<void> }>)[t].clear(),
    ));
  };

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Pengaturan</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        {pesan && (
          <IonCard><IonCardContent>{pesan}</IonCardContent></IonCard>
        )}

        <IonCard><IonCardContent>
          <h3>Akun & sinkronisasi</h3>
          {masuk && pengguna ? (
            <>
              <p>Masuk sebagai <strong>{pengguna.email}</strong></p>
              <p className="muted mono">Sinkron terakhir: {terakhir ?? 'belum pernah'}</p>
              {statusSync.state === 'syncing' && <p>Menyinkronkan…</p>}
              <IonButton expand="block" disabled={sibuk} onClick={() => void sinkronManual()}>
                Sinkronkan sekarang
              </IonButton>
              <IonButton expand="block" fill="clear" onClick={() => { keluar(); setMasuk(false); setPengguna(null); }}>
                Keluar
              </IonButton>
              <p className="muted">Aplikasi tetap bisa dipakai tanpa login (mode lokal).</p>
            </>
          ) : (
            <>
              <IonItem>
                <IonSelect label="Mode" value={modeAkun} onIonChange={(e) => setModeAkun(e.detail.value)}>
                  <IonSelectOption value="masuk">Masuk</IonSelectOption>
                  <IonSelectOption value="daftar">Daftar akun baru</IonSelectOption>
                </IonSelect>
              </IonItem>
              <IonItem><IonInput label="Email" type="email" value={email} onIonInput={(e) => setEmail(String(e.detail.value ?? ''))} /></IonItem>
              <IonItem><IonInput label="Sandi" type="password" value={sandi} onIonInput={(e) => setSandi(String(e.detail.value ?? ''))} /></IonItem>
              {modeAkun === 'daftar' && (
                <IonItem><IonInput label="Nama tampil" value={namaTampil} onIonInput={(e) => setNamaTampil(String(e.detail.value ?? ''))} /></IonItem>
              )}
              <IonButton expand="block" disabled={sibuk || !email || !sandi} onClick={() => void kirimAkun()}>
                {modeAkun === 'masuk' ? 'Masuk' : 'Daftar & masuk'}
              </IonButton>
            </>
          )}
          <IonItem>
            <IonInput label="Alamat server" value={baseUrl} onIonInput={(e) => setBase(String(e.detail.value ?? ''))} />
          </IonItem>
          <p className="muted">Contoh lokal: http://127.0.0.1:5000</p>
        </IonCardContent></IonCard>

        <IonCard><IonCardContent>
          <h3>Tema</h3>
          <IonItem>
            <IonSelect label="Mode" value={tema} onIonChange={(e) => gantiTema(String(e.detail.value))}>
              <IonSelectOption value="light">Terang (default)</IonSelectOption>
              <IonSelectOption value="dark">Gelap</IonSelectOption>
              <IonSelectOption value="system">Ikuti sistem</IonSelectOption>
            </IonSelect>
          </IonItem>
        </IonCardContent></IonCard>

        <IonCard><IonCardContent>
          <h3>Kategori</h3>
          <IonList>
            {(categories ?? []).filter((c) => !c.deleted_at).map((c) => (
              <IonItem key={c.id}>
                <span style={{ width: 12, height: 12, borderRadius: 6, background: c.color, display: 'inline-block', marginRight: 8 }} />
                <IonLabel>{c.name}</IonLabel>
                <IonButton fill="clear" color="danger" size="small"
                  onClick={() => void db.categories.update(c.id, { deleted_at: nowISO() })}>
                  Hapus
                </IonButton>
              </IonItem>
            ))}
          </IonList>
          <IonItem>
            <IonInput placeholder="Nama kategori" value={nama} onIonInput={(e) => setNama(String(e.detail.value ?? ''))} />
          </IonItem>
          <IonItem>
            <IonSelect label="Warna" value={warna} onIonChange={(e) => setWarna(String(e.detail.value))}>
              {WARNA.map((w) => <IonSelectOption key={w} value={w}>{w}</IonSelectOption>)}
            </IonSelect>
          </IonItem>
          <IonButton expand="block" onClick={() => void tambahKategori()}>Tambah kategori</IonButton>
          <p className="muted">Menghapus kategori tidak menghapus proyek/tugasnya.</p>
        </IonCardContent></IonCard>

        <IonCard><IonCardContent>
          <h3>Data</h3>
          <IonButton expand="block" fill="outline" onClick={() => void ekspor()}>Ekspor JSON</IonButton>
          <IonItem>
            <IonLabel>Impor JSON</IonLabel>
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void impor(f);
                e.target.value = '';
              }}
            />
          </IonItem>
          <IonButton expand="block" fill="clear" color="danger" onClick={() => void hapusSemua()}>Hapus data lokal</IonButton>
        </IonCardContent></IonCard>
      </IonContent>
    </IonPage>
  );
}
