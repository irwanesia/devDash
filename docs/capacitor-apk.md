# Panduan: DevDash jadi APK via Capacitor

Hasil akhir: file `.apk` yang bisa dipasang langsung di HP Samsung (tanpa Play Store).
Dikerjakan di **laptop** (butuh Android Studio). Estimasi sekali jalan: 30–60 menit
(+ unduh Android SDK pertama kali).

> Siklus tiap ada perubahan kode: `npm run build` → `npx cap sync` → Run/Build ulang.
> Data di APK tersimpan di WebView HP (terpisah dari Chrome) — sinkronkan dari
> server bila ingin data lama ikut pindah.

## 0. Prasyarat

1. **Android Studio** terinstal (versi terbaru; sudah termasuk Java 17+ dan Android SDK).
   Buka sekali → selesaikan setup wizard → pastikan SDK terinstal
   (Settings → Appearance → System Settings → Android SDK).
2. HP Samsung: aktifkan **Opsi developer** (Settings → Tentang ponsel → Info
   perangkat lunak → ketuk *Nomor versi* 7×), lalu aktifkan **USB debugging**.
3. Node/npm sudah ada (cek: `node -v`).

## 1. Pasang Capacitor

Di folder `frontend/`:

```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init DevDash com.devdash.app --web-dir=dist
```

`appId` (`com.devdash.app`) bebas, format domain-terbalik, **jangan diubah-ubah**
setelah APK dipasang (ganti id = dianggap aplikasi beda).

## 2. Tambah platform Android + build pertama

```bash
npm run build
npx cap add android
npx cap sync
npx cap open android
```

Perintah terakhir membuka proyek di Android Studio. Tunggu Gradle sync selesai
(pertama kali agak lama, butuh internet).

## 3. Uji langsung di HP (sebelum build APK)

1. Colok HP via USB → di HP ketuk **Izinkan** dialog otorisasi USB debugging.
2. Di Android Studio, pilih HP di dropdown device → **Run ▶**.
3. Aplikasi terinstal dan terbuka di HP. Coba: tambah proyek, checklist, matikan
   internet, buka lagi (harus tetap jalan = offline OK).

### Alamat server di HP

`http://127.0.0.1:5000` **tidak bisa** dipakai dari HP (itu alamat laptop itu
sendiri). Di aplikasi HP → Pengaturan → Alamat server, isi salah satu:

| Kebutuhan | Isi |
| --- | --- |
| Coba cepat (laptop + HP satu WiFi) | `http://192.168.X.X:5000` (IP LAN laptop; lihat via `hostname -I`) + langkah 3b di bawah |
| Jarak jauh / beda jaringan | URL https backend (tunnel sementara atau hosting permanen) |

3b. Khusus `http://` (tanpa -s): Android memblokir koneksi teks-jelas.
Tambahkan di `android/app/src/main/AndroidManifest.xml` dalam tag `<application>`:

```xml
android:usesCleartextTraffic="true"
```

Lalu Run ulang. (Untuk rilis permanen, pakai `https` agar baris ini tak perlu.)

## 4. Build file APK (debug, siap pasang)

Di Android Studio: menu **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
Hasilnya di:

```
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

Pindahkan ke HP (kabel/USB/Bluetooth/Drive), ketuk file-nya → izinkan
*Install unknown apps* → Pasang. APK debug cukup untuk pemakaian pribadi.

## 5. APK rilis bertanda tangan (opsional, disarankan)

APK debug tak bisa naik Play Store dan tiap install ulang bisa konflik tanda.
Buat sekali, pakai selamanya:

1. Android Studio → **Build → Generate Signed App Bundle / APK** → pilih **APK**.
2. **Create new** keystore (file `.jks`): isi password + alias. **Simpan file dan
   password baik-baik** — hilang = tak bisa update aplikasi lagi.
3. Build type `release` → Finish. Hasil di `.../outputs/apk/release/`.

## 6. Notifikasi lokal tagihan (opsional, PRD §9)

```bash
npm install @capacitor/local-notifications
npx cap sync
```

Contoh: jadwalkan pengingat harian tiap aplikasi dibuka (di `Today.tsx`
setelah data tagihan dimuat):

```ts
import { LocalNotifications } from '@capacitor/local-notifications';

await LocalNotifications.requestPermissions();
await LocalNotifications.schedule({
  notifications: [{
    id: 1,
    title: 'DevDash — Tagihan',
    body: `${terlambat} tagihan terlambat, ${mendekat} mendekat`,
    schedule: { every: 'day', on: { hour: 8, minute: 0 } },
  }],
});
```

Di `AndroidManifest.xml` pastikan izin notifikasi (Android 13+ memintanya saat
berjalan, plugin menanganinya lewat `requestPermissions`). Untuk notifikasi
saat aplikasi **tertutup total**, jadwalkan ulang setiap aplikasi dibuka
(seperti contoh) — pola standar aplikasi non-push.

## 7. Troubleshooting

| Gejala | Obat |
| --- | --- |
| `adb devices` kosong | Ganti kabel/port USB; di HP cabut-colok + izinkan dialog RSA; `adb kill-server && adb start-server` |
| Gradle sync gagal / Java error | Pakai JDK bawaan Android Studio (Gradle Settings → Gradle JDK → Embedded); jangan paksa Java sistem yang tua |
| `net::ERR_CLEARTEXT_NOT_ALLOWED` | Lihat langkah 3b |
| Aplikasi putih saat dibuka | `npx cap sync` lupa dijalankan setelah `npm run build`; atau cek log via `adb logcat` / Chrome `chrome://inspect` |
| Data kosong di APK padahal di Chrome ada | Wajar: WebView ≠ Chrome, penyimpanan terpisah. Login + Sinkronkan untuk menarik data server |
| Service worker bermasalah di WebView | Capacitor menyajikan via `https://localhost` sehingga SW umumnya jalan. Bila aneh, nonaktifkan PWA plugin saat build native (`VitePWA({ disable: true })` via env) |
