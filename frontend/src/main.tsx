import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

/* Ionic CSS inti */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';

import './theme/variables.css';
import App from './App.tsx';
import { db } from './db/database';
import { seedJikaKosong } from './utils/helpers';
import { pasangAutoSync } from './api/sync';

// Tema tersimpan (default: light, revisi dari dark)
const tema = localStorage.getItem('devdash-theme') || 'light';
document.body.className = tema;
document.querySelector('meta[name="theme-color"]')?.setAttribute(
  'content',
  tema === 'dark' ? '#0F1115' : '#F6F7F9',
);

// Seed awal (idempotent)
void seedJikaKosong().catch((e) => console.error('seed gagal', e));

// Hapus CSS bawaan Vite yang konflik bila ada
void db.open().catch((e) => console.error('dexie gagal dibuka', e));

// Sinkronisasi otomatis saat dibuka / kembali online (hanya bila sudah login)
pasangAutoSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
// Catatan: #boot dihapus dari dalam App (useEffect) agar hanya hilang bila render sukses.
