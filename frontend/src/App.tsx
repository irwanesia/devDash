import { Suspense, lazy, useEffect } from 'react';
import { Route, Navigate } from 'react-router-dom';
import {
  IonApp, IonIcon, IonLabel, IonRouterOutlet, IonSpinner, IonTabBar, IonTabButton, IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { calendarOutline, folderOutline, homeOutline, schoolOutline, walletOutline } from 'ionicons/icons';

import Today from './pages/Today';

// Rute non-utama dimuat malas agar layar "Hari ini" tampil <1 dtk (Fase 5)
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Daily = lazy(() => import('./pages/Daily'));
const Bills = lazy(() => import('./pages/Bills'));
const Study = lazy(() => import('./pages/Study'));
const Settings = lazy(() => import('./pages/Settings'));

setupIonicReact();

function Jatuh() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <IonSpinner />
    </div>
  );
}

/** Lazy dibungkus per-rute: Route harus anak langsung IonRouterOutlet (Fase 5 fix). */
function Malas({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<Jatuh />}>{children}</Suspense>;
}

export default function App() {
  // Render sukses -> hapus layar loading boot
  useEffect(() => {
    document.getElementById('boot')?.remove();
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route path="/hari-ini" element={<Today />} />
            <Route path="/proyek" element={<Malas><Projects /></Malas>} />
            <Route path="/proyek/:id" element={<Malas><ProjectDetail /></Malas>} />
            <Route path="/harian" element={<Malas><Daily /></Malas>} />
            <Route path="/tagihan" element={<Malas><Bills /></Malas>} />
            <Route path="/belajar" element={<Malas><Study /></Malas>} />
            <Route path="/pengaturan" element={<Malas><Settings /></Malas>} />
            <Route path="/" element={<Navigate to="/hari-ini" />} />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="hari-ini" href="/hari-ini">
              <IonIcon icon={homeOutline} />
              <IonLabel>Hari ini</IonLabel>
            </IonTabButton>
            <IonTabButton tab="proyek" href="/proyek">
              <IonIcon icon={folderOutline} />
              <IonLabel>Proyek</IonLabel>
            </IonTabButton>
            <IonTabButton tab="harian" href="/harian">
              <IonIcon icon={calendarOutline} />
              <IonLabel>Harian</IonLabel>
            </IonTabButton>
            <IonTabButton tab="tagihan" href="/tagihan">
              <IonIcon icon={walletOutline} />
              <IonLabel>Tagihan</IonLabel>
            </IonTabButton>
            <IonTabButton tab="belajar" href="/belajar">
              <IonIcon icon={schoolOutline} />
              <IonLabel>Belajar</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </IonApp>
  );
}
