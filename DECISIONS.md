# DECISIONS.md

Catatan keputusan di luar PRD (PRD §11 aturan #10).

## Fase 1
- **Ionic 9 + react-router-dom 6**: PRD §3 menyebut "Ionic Router (React Router v5 bawaan Ionic)". Saat implementasi (Okt 2026), `@ionic/react-router@9` mensyaratkan `react-router-dom >=6.4 <7`. Dipilih mengikuti versi terbaru Ionic (v9.0.7) + `react-router-dom@6.30`, bukan memaksa v5 yang konflik peer-deps. Rute dan `IonTabs` tetap sama perilakunya.
- **React 19**: template Vite terbaru memakai React 19.3; kompatibel dengan Ionic 9 (syarat `v18+`). Tidak diturunkan ke 18.
- **Tab Tagihan/Belajar di Fase 1 berupa placeholder**: agar struktur tab bar 5 tab (§8.4) selesai sejak awal, isi penuh menyusul Fase 2. Skema Dexie sudah mencakup semua tabel (§6) sejak Fase 1.
- **Pengaturan minimal di Fase 1**: tema + kategori + ekspor JSON sudah dibuat awal karena dibutuhkan oleh Proyek (filter kategori) dan streak (ambang). Login/sinkron tetap Fase 4.
- **Ikon PWA sementara**: PNG 192/512 + maskable dibuat generatif (huruf D). Ganti dengan desain final di Fase 5.

## Fase 2
- **Pengingat H-3 default**: PRD §5.4 menyebut default H-3 dan hari-H. Implementasi: `remind_days_before` default 3, tapi dashboard menampilkan semua yang ≤7 hari + terlambat agar "7 hari ke depan" (§5.1) terpenuhi. Field H- custom belum ada UI (disederhanakan).
- **Tahun kabisat**: `tambahPeriode` bulanan menjepit ke akhir bulan (31 Jan → 28 Feb). Tahunan 29 Feb → 1 Mar (overflow JS Date), diterima untuk v1.
- **Notifikasi**: hanya in-app card + `Notification` saat aplikasi dibuka (sesuai batasan PRD §9). Tidak ada background/push di v1. Tombol "Izinkan notifikasi" memicu `requestPermission`.
- **.ics per tagihan**: tombol di slide-item Tagihan, format `DTSTART;VALUE=DATE` all-day.

## Revisi tema (pra-Fase 3, atas permintaan pengguna)
- **Light jadi default**: `:root` memakai token light; `body.dark` tetap tersedia sebagai opsi manual di Pengaturan. `localStorage` default `light`, meta `theme-color` + manifest mengikuti (`#F6F7F9`, disinkron saat ganti tema).

## Fase 3
- **Marshmallow (bukan Pydantic)**: validasi input memakai Marshmallow 3, sesuai opsi PRD §3.
- **UUID dibuat di server untuk data via API**: klien offline-first tetap memakai UUID klien (siap dipetakan saat sinkron Fase 4); `POST /sync` belum dibuat (Fase 4).
- **Hapus kategori**: proyek/tugas yang memakainya di-set `category_id=NULL` sebelum soft-delete (PRD §5.2).
- **`daily_logs`/`study_logs` di server punya `id` UUID + `user_id`**: unik pada `(user_id, log_date, template_id)` / `(user_id, schedule_id, log_date)`; `PUT /logs` bersifat upsert.
- **Tahun kabisat server**: 29 Feb +1 tahun → 28 Feb (dijepit, sedikit beda dengan frontend JS yang overflow ke 1 Mar; diseragamkan saat Fase 4).
- **Venv di `backend/.venv`** (tidak di-commit); DB dev di `backend/instance/devdash.db` (di-gitignore).

## Fase 4
- **Kontrak `/sync`**: body `{last_synced_at, changes:{tabel:[record]}}`, balas `{changes, synced_at}`. LWW murni per `updated_at` (parse ISO, toleran `Z`), tanpa validasi Marshmallow agar record lama tetap lolos.
- **Log dicocokkan kunci alami** (`daily_logs`: tanggal+template; `study_logs`: jadwal+tanggal) karena id Dexie auto-increment ≠ UUID server. Record tanpa kunci lengkap dilewati.
- **Klien kirim delta** (`updated_at > last_sync`, full-push saat pertama), terapkan balasan hanya bila server lebih baru; `synced_at` per record ditulis tapi penentu delta tetap `last_synced_at` global.
- **Token di localStorage** (access pendek + refresh panjang), auto-refresh sekali saat 401; ganti password belum ada UI (bisa via API langsung) — dicatat sebagai keterbatasan v1.

## Fase 5
- **Font self-host**: `@fontsource/inter` (400/500/600) + `jetbrains-mono` (400/500), masuk precache SW → tampil saat offline.
- **Code-split**: halaman non-utama lazy; `Today` eager. Chunk utama tetap ~1,5 MB (Ionic) — wajar untuk PWA precache lokal.
- **Pull-to-refresh** di Hari ini hanya memicu sinkronisasi bila login (PRD §8.5).
- **Kontras**: teks bodi/muted/primary/danger lolos WCAG AA (diukur 16.7/5.6/5.1/4.6). Token `success`/`warning` PRD (#12A150/#B7791F) di atas putih hanya ~3.4 (gagal AA) — dipakai hanya sebagai isi badge/chip yang selalu disertai teks (§8.5), bukan teks bodi. Token PRD tidak diubah.
- **Capacitor tidak dikerjakan** (opsional di PRD); notifikasi tetap in-app + Notification API.

## Perbaikan layar putih (blank) pasca-Fase 5- **Penyebab 1**: `<Suspense>` membungkus semua `<Route>` di dalam `IonRouterOutlet` merusak pencocokan rute Ionic → outlet kosong. Perbaikan: lazy dibungkus per-rute (`element={<Malas>…}`), `Route` tetap anak langsung outlet.
- **Penyebab 2**: `orderBy()` Dexie pada field tanpa index (`categories.sort_order`) melempar dan merusak `liveQuery` → halaman Harian/Pengaturan kosong. Perbaikan: sort di memori (`toArray` + `sort`), hanya `where` pada field ber-index.
- **Penyebab 3**: `pastikanLogHarian` dipanggil ganda (StrictMode + view-enter) → balapan `bulkAdd` → `BulkError` unhandled. Perbaikan: guard promise per tanggal + abaikan BulkError.
- Verifikasi headless (Chrome, 6 rute): semua render berisi, nol console/page error.

## Perbaikan pasca-tunnel (laporan pengguna)
- **CORS menolak origin tunnel** → `failed to fetch` saat daftar/masuk. Perbaikan: `CORS_ORIGINS=*` di `.env` + `config.py` mendukung `"*"` (dev only).
- **Rutinitas harian bisa diubah**: geser item ke kiri → tombol Ubah (dialog), selain Aktif/Nonaktif dan Hapus.
- **Revisi UI lanjutan**: subjudul tanggal Hari ini kecil+rapat (`.judul-tanggal`), teks bantuan kecil (`.hint`), konten padding bawah 120px agar tak tertutup tab bar (terukur headless 375×667: tombol mentok di 599px < tab bar 610px), chip filter kategori tanpa "Semua" (ketuk ulang untuk lepas filter; baris chip sembunyi bila belum ada kategori).
- Pelajaran CSS: di Ionic React halaman berupa `div.ion-page`, sehingga selektor `ion-page ion-content` tidak match (0 elemen) — pakai `.ion-page ion-content::part(scroll)`.

## Sinkronisasi PRD + panduan APK
- PRD diselaraskan ke implementasi (tandai "revisi"): routing v6, light default, `mulai_tanggal` + navigasi tanggal Harian, penyederhanaan H- pengingat. DECISIONS.md tetap jadi log alasan.
- Panduan APK ditulis di `docs/capacitor-apk.md` (belum dieksekusi: butuh Android Studio + Java di mesin build; belum ada di sini).
- Panduan deploy ditulis di `docs/deploy-cloudflare-pythonanywhere.md` (Pages + PythonAnywhere). File `frontend/public/_redirects` (`/* /index.html 200`) ditambahkan agar refresh rute SPA tidak 404 di Pages.
- Panduan deploy lokal via Netlify drag & drop: `docs/deploy-netlify-lokal.md` (upload isi `dist/`, ±3 MB).
- **Susun besok malam**: `DailyTemplate.mulai_tanggal` (frontend opsional + kolom server via migrasi `145de11576e0`, ikut sync). Tab Harian punya navigasi tanggal (kemarin/besok, ketuk riwayat untuk lihat hari itu); tambah rutinitas dengan "Mulai berlaku" = besok → tak muncul & tak mengganggu nilai hari ini; daftar "Terjadwal ke depan"; streak memakai penyebut per tanggal.
