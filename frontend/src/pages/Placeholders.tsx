import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/react';

export function Placeholder({ judul, pesan }: { judul: string; pesan: string }) {
  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>{judul}</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        <p className="empty-state">{pesan}</p>
      </IonContent>
    </IonPage>
  );
}

export function Tagihan() {
  return <Placeholder judul="Tagihan" pesan="Modul Tagihan hadir di Fase 2: pengingat berulang, tandai lunas, dan badge terlambat." />;
}

export function Belajar() {
  return <Placeholder judul="Belajar" pesan="Modul Jadwal Belajar hadir di Fase 2: jadwal mingguan dan log sesi." />;
}
