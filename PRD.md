# PRD: DevDash — Personal Dashboard untuk Developer

> Dokumen ini ditulis sebagai acuan vibe coding. Baca seluruhnya sebelum menulis kode. Kerjakan per fase (lihat bagian 12), jangan melompat.

## 1. Ringkasan

**DevDash** adalah aplikasi PWA pribadi untuk seorang developer: mencatat proyek, checklist harian, pengingat tagihan, dan jadwal belajar dalam satu dashboard "Hari ini". Dipakai sendiri, harus bisa berjalan **offline**, dan punya backend Flask + SQLite untuk login, backup, dan sinkronisasi.

- **Pengguna**: 1 orang (pemilik), bisa dikembangkan multi-user lewat login.
- **Platform**: PWA (bisa di-install ke home screen HP), dipakai juga di desktop browser.
- **Bahasa antarmuka**: Indonesia.
- **Tujuan sekunder**: media belajar (Flask API, JWT, offline-first, PWA).

## 2. Tujuan dan Bukan Tujuan

**Tujuan**
1. Satu layar "Hari ini" yang merangkum semua yang harus diperhatikan.
2. Checklist harian yang reset otomatis, dengan riwayat dan streak.
3. Pengingat tagihan (wifi, DP proyek) dengan nominal, jatuh tempo, dan ulang berkala.
4. Manajemen proyek ringan dengan progres.
5. Jadwal belajar mingguan.
6. Bisa dipakai penuh tanpa internet; sinkron ke server saat online.

**Bukan tujuan (v1)**
- Kolaborasi multi-user, berbagi proyek, komentar.
- Integrasi pembayaran, invoice, atau akuntansi.
- Aplikasi native di Play Store / App Store (boleh nanti lewat Capacitor).
- Push notification server-side yang andal saat aplikasi tertutup (lihat bagian 9).

## 3. Tech Stack (keputusan final)

| Lapisan | Pilihan | Alasan |
| --- | --- | --- |
| Frontend | Ionic React + TypeScript + Vite | Komponen bergaya app mobile, ekosistem besar |
| PWA | `vite-plugin-pwa` (Workbox) | Manifest + service worker |
| Data lokal | IndexedDB via **Dexie** | Offline-first, API sederhana |
| State | React Context + hooks (tanpa Redux) | Aplikasi kecil |
| Routing | Ionic Router (React Router v6, bawaan `@ionic/react-router` v9) | Navigasi tab dan stack |
| Backend | Flask 3 + Flask-SQLAlchemy + Flask-Migrate | Sesuai skill pengguna |
| Database | SQLite (file `devdash.db`) | Sederhana, cukup untuk 1 pengguna |
| Auth | `flask-jwt-extended` (access + refresh token) | Cocok untuk SPA/PWA |
| Validasi | Marshmallow atau Pydantic | Validasi input API |
| CORS | `flask-cors` | Frontend dan backend beda origin saat dev |
| Password | `werkzeug.security` (hash bawaan) | Cukup aman untuk skala ini |

## 4. Arsitektur

**Prinsip: offline-first.** Aplikasi membaca dan menulis ke IndexedDB. Server hanya menjadi salinan untuk backup dan sinkronisasi antar perangkat.

```
[ Ionic PWA ]  <->  [ Dexie / IndexedDB ]   (sumber data utama di perangkat)
      |
      |  sync (saat online + sudah login)
      v
[ Flask API ]  <->  [ SQLite ]
```

**Aturan sinkronisasi (v1, sederhana)**
- Semua record punya `id` (UUID dibuat di klien), `updated_at`, `deleted_at` (soft delete), dan `synced_at` (hanya di klien).
- Sinkronisasi dua arah dengan strategi **last-write-wins** berdasarkan `updated_at`.
- Endpoint `POST /api/sync`: klien mengirim perubahan sejak sinkronisasi terakhir, server membalas perubahan dari server.
- Aplikasi tetap berfungsi penuh tanpa login. Login hanya mengaktifkan sinkronisasi.

**Struktur folder**

```
devdash/
├── PRD.md
├── backend/
│   ├── app/
│   │   ├── __init__.py        # create_app()
│   │   ├── config.py
│   │   ├── extensions.py      # db, migrate, jwt, cors
│   │   ├── models/            # satu file per tabel
│   │   ├── routes/            # auth.py, projects.py, tasks.py, ...
│   │   ├── schemas/           # validasi Marshmallow/Pydantic
│   │   └── services/          # logika bisnis (sync, recurrence)
│   ├── migrations/
│   ├── tests/
│   ├── requirements.txt
│   └── run.py
└── frontend/
    ├── public/                # ikon PWA
    ├── src/
    │   ├── db/                # skema Dexie
    │   ├── api/               # klien HTTP + sync
    │   ├── features/          # today, projects, daily, bills, study, auth
    │   ├── components/        # komponen bersama
    │   ├── theme/             # variables.css, tokens
    │   ├── hooks/
    │   └── App.tsx
    ├── vite.config.ts
    └── package.json
```

## 5. Modul dan Kebutuhan Fungsional

### 5.1 Dashboard "Hari ini" (halaman utama)
Menampilkan, dalam satu layar yang bisa di-scroll:
- Sapaan + tanggal hari ini.
- **Checklist harian**: progres (mis. 4/7) + daftar item yang bisa dicentang langsung.
- **Tagihan mendekat**: yang jatuh tempo hari ini, terlambat, dan 7 hari ke depan.
- **Tugas proyek jatuh tempo**: hari ini dan terlambat.
- **Jadwal belajar hari ini**.
- Ringkasan streak checklist.

**Kriteria selesai**: semua data tampil tanpa internet; mencentang item langsung memperbarui progres tanpa reload.

### 5.2 Proyek
- CRUD proyek: nama, deskripsi, klien (opsional), status (`ide`, `berjalan`, `ditunda`, `selesai`), tanggal mulai, target selesai, nilai proyek (opsional), catatan.
- CRUD tugas di dalam proyek: judul, deskripsi, prioritas (`rendah`, `sedang`, `tinggi`), tenggat (opsional), status (`todo`, `doing`, `done`).
- **Progres proyek** dihitung otomatis: tugas `done` / total tugas, ditampilkan sebagai persen dan progress bar.
- Filter berdasarkan status; urutkan berdasarkan target selesai.
- Tugas bisa juga dibuat tanpa proyek (tugas lepas / inbox).
- **Kategori**: pengguna bisa membuat kategori sendiri (nama + warna), misalnya "Kerja", "Freelance", "Belajar", "Pribadi". Satu proyek dan satu tugas boleh punya **satu** kategori (opsional). Tugas yang tidak punya kategori sendiri mengikuti kategori proyeknya.
- Kategori bisa ditambah, diubah, dan dihapus dari layar Pengaturan atau langsung dari form proyek/tugas. Menghapus kategori tidak menghapus proyek atau tugasnya; kategori mereka menjadi kosong.
- Daftar proyek dan tugas bisa difilter berdasarkan kategori (chip filter di bagian atas daftar).

**Kriteria selesai**: menambah/menyelesaikan tugas langsung mengubah persen progres proyek.

### 5.3 Checklist Harian
- **Template rutinitas**: daftar item tetap (mis. "Review PR", "Commit kode", "Olahraga") dengan urutan, bisa ditambah/ubah/nonaktifkan. Setiap template punya **tanggal mulai berlaku** (opsional, revisi pasca-Fase 4): template hanya muncul pada tanggal tersebut dan setelahnya, sehingga list besok bisa disusun malam ini tanpa mengganggu nilai hari ini.
- Setiap hari, item aktif muncul sebagai checklist baru dengan semua status belum dicentang (dibuat secara lazy saat pertama kali dibuka hari itu, bukan lewat cron).
- Halaman Harian punya **navigasi tanggal** (kemarin/besok, ketuk riwayat untuk melompat): checklist tanggal lain bisa dilihat dan dicentang per tanggal (revisi pasca-Fase 4).
- Riwayat: tabel `daily_logs` menyimpan centang per tanggal.
- **Streak**: jumlah hari berturut-turut di mana checklist dianggap "berhasil". Sebuah hari dianggap berhasil jika persen item yang dicentang mencapai **ambang** (default **80%**, bisa diubah di Pengaturan antara 50% dan 100%). Contoh: dari 10 item, centang 8 atau lebih = hari berhasil dan streak bertambah 1; centang 7 = streak kembali ke 0.
- Halaman riwayat: kalender atau daftar 30 hari terakhir dengan persen selesai.

**Kriteria selesai**: pindah hari (ubah tanggal perangkat) menghasilkan checklist baru; hari sebelumnya tetap tersimpan di riwayat.

### 5.4 Pengingat dan Tagihan
- Field: judul, kategori (`tagihan`, `dp_proyek`, `langganan`, `lainnya`), nominal (opsional, Rupiah), tanggal jatuh tempo, aturan ulang (`tidak`, `mingguan`, `bulanan`, `tahunan`), pengingat H-berapa hari (default H-3; dashboard menampilkan yang ≤7 hari + terlambat — revisi pasca-Fase 4, field H- custom belum ada UI), status (`belum`, `lunas`), catatan, terkait proyek (opsional, untuk DP).
- Menandai **lunas** pada pengingat berulang otomatis membuat jatuh tempo berikutnya.
- Status turunan: `terlambat` jika lewat jatuh tempo dan belum lunas.
- Daftar dikelompokkan: Terlambat, Minggu ini, Bulan ini, Nanti, Lunas.
- Ringkasan total nominal belum lunas bulan ini.
- Notifikasi: lihat bagian 9.

**Kriteria selesai**: pengingat bulanan "Wifi" yang ditandai lunas otomatis muncul lagi bulan depan dengan status belum.

### 5.5 Jadwal Belajar
- Field: topik, hari (satu atau lebih dari Senin–Minggu), jam mulai, durasi (menit), target/catatan, link sumber (opsional), aktif atau tidak.
- Tampilan mingguan (per hari) dan daftar "Hari ini".
- Tandai sesi **sudah dikerjakan** per tanggal (disimpan di `study_logs`).
- Statistik sederhana: jumlah sesi selesai minggu ini dan total menit belajar.

**Kriteria selesai**: sesi yang dijadwalkan Senin hanya muncul di "Hari ini" pada hari Senin, dan tanda selesai tersimpan per tanggal.

### 5.6 Autentikasi dan Sinkronisasi (opsional, untuk belajar)
- Registrasi, login, logout, refresh token.
- Aplikasi **boleh dipakai tanpa login** (mode lokal). Setelah login, tombol "Sinkronkan" dan sinkronisasi otomatis saat online aktif.
- Pengaturan: ubah password, ekspor data (JSON), impor data (JSON), hapus semua data lokal.
- Token disimpan di penyimpanan lokal; access token berumur pendek (mis. 15 menit), refresh token lebih panjang (mis. 30 hari).

**Kriteria selesai**: data yang dibuat offline di perangkat A muncul di perangkat B setelah keduanya sinkron.

## 6. Model Data

Semua tabel punya kolom umum: `id` (UUID string), `user_id`, `created_at`, `updated_at`, `deleted_at` (nullable). Berikut kolom khusus per tabel.

| Tabel | Kolom khusus |
| --- | --- |
| `users` | `email` (unik), `password_hash`, `display_name` |
| `categories` | `name` (unik per pengguna), `color` (kode hex), `sort_order` |
| `projects` | `name`, `description`, `client`, `status`, `start_date`, `target_date`, `value_amount`, `notes`, `category_id` (nullable) |
| `tasks` | `project_id` (nullable), `category_id` (nullable), `title`, `description`, `priority`, `status`, `due_date`, `sort_order` |
| `daily_templates` | `title`, `sort_order`, `is_active` |
| `daily_logs` | `log_date`, `template_id`, `is_done`, `done_at` (unik pada `log_date` + `template_id`) |
| `reminders` | `title`, `category`, `amount`, `due_date`, `repeat_rule`, `remind_days_before`, `status`, `paid_at`, `project_id` (nullable), `notes` |
| `study_schedules` | `topic`, `weekdays` (JSON array 0–6), `start_time`, `duration_min`, `goal`, `resource_url`, `is_active` |
| `study_logs` | `schedule_id`, `log_date`, `is_done`, `done_at` |

Catatan implementasi:
- Nominal disimpan sebagai **integer Rupiah** (tanpa desimal).
- Tanggal disimpan sebagai string ISO `YYYY-MM-DD`; waktu sebagai ISO 8601 UTC.
- Skema Dexie di klien mencerminkan tabel di atas (tanpa `user_id` jika belum login).

## 7. API (Flask)

Prefiks `/api`. Respons JSON. Semua endpoint selain auth membutuhkan header `Authorization: Bearer <access_token>`.

| Metode | Endpoint | Fungsi |
| --- | --- | --- |
| POST | `/auth/register` | Buat akun |
| POST | `/auth/login` | Login, balas access + refresh token |
| POST | `/auth/refresh` | Tukar refresh token dengan access token baru |
| GET | `/auth/me` | Profil pengguna |
| POST | `/sync` | Kirim perubahan klien, terima perubahan server (lihat bagian 4) |
| GET / POST | `/projects` | Daftar / buat proyek |
| GET / PUT / DELETE | `/projects/<id>` | Detail / ubah / hapus proyek |
| GET / POST | `/tasks` | Daftar (filter `project_id`, `status`, `due`) / buat tugas |
| PUT / DELETE | `/tasks/<id>` | Ubah / hapus tugas |
| GET / POST | `/categories` | Daftar / buat kategori |
| PUT / DELETE | `/categories/<id>` | Ubah / hapus kategori (item yang memakainya menjadi tanpa kategori) |
| GET / POST | `/daily/templates` | Daftar / buat template rutinitas |
| PUT / DELETE | `/daily/templates/<id>` | Ubah / hapus template |
| GET | `/daily/logs?from=&to=` | Riwayat checklist |
| PUT | `/daily/logs` | Set centang untuk tanggal + template |
| GET / POST | `/reminders` | Daftar (filter `status`, `from`, `to`) / buat pengingat |
| PUT / DELETE | `/reminders/<id>` | Ubah / hapus pengingat |
| POST | `/reminders/<id>/pay` | Tandai lunas, buat jatuh tempo berikutnya bila berulang |
| GET / POST | `/study/schedules` | Daftar / buat jadwal belajar |
| PUT / DELETE | `/study/schedules/<id>` | Ubah / hapus jadwal |
| PUT | `/study/logs` | Tandai sesi selesai untuk tanggal tertentu |
| GET | `/export` | Ekspor semua data pengguna (JSON) |

Aturan umum API:
- Hapus = soft delete (isi `deleted_at`).
- Setiap tulis memperbarui `updated_at` di server.
- Error seragam: `{"error": {"code": "...", "message": "..."}}` dengan status HTTP yang sesuai.
- Validasi di sisi server untuk semua input; jangan percaya klien.

## 8. Desain UI

### 8.1 Gaya
Bersih, padat informasi, bernuansa alat developer. **Light mode sebagai default** (revisi: awalnya dark), dark mode tersedia sebagai opsi manual di Pengaturan.

### 8.2 Font
- **UI**: Inter (400, 500, 600).
- **Angka, nominal, tanggal, kode**: JetBrains Mono (400, 500) agar rapi dan terasa "developer".
- Muat font secara lokal (self-host) agar tetap tampil saat offline.

### 8.3 Warna (design tokens)

| Token | Dark | Light | Pemakaian |
| --- | --- | --- | --- |
| `--bg` | `#0F1115` | `#F6F7F9` | Latar halaman |
| `--surface` | `#171A21` | `#FFFFFF` | Kartu, list |
| `--surface-2` | `#1F2430` | `#EEF0F4` | Elemen tersier, input |
| `--border` | `#2A3040` | `#DDE1E8` | Garis pemisah |
| `--text` | `#E6E8EE` | `#14171F` | Teks utama |
| `--text-muted` | `#8B93A7` | `#5B6475` | Teks sekunder |
| `--primary` | `#6C8CFF` | `#3D5AFE` | Aksi utama, tab aktif |
| `--success` | `#3DD68C` | `#12A150` | Selesai, lunas |
| `--warning` | `#F5B544` | `#B7791F` | Mendekati jatuh tempo |
| `--danger` | `#FF6B6B` | `#D93636` | Terlambat, hapus |

Petakan token ini ke variabel Ionic (`--ion-color-primary`, `--ion-background-color`, dan seterusnya) di `src/theme/variables.css`. Kontras teks minimal WCAG AA.

### 8.4 Navigasi dan layar
**Tab bar bawah (5 tab)**: Hari ini · Proyek · Harian · Tagihan · Belajar.
Pengaturan/Akun diakses dari ikon di pojok kanan atas halaman "Hari ini".

| Layar | Isi utama |
| --- | --- |
| Hari ini | Kartu: progres checklist, tagihan mendekat, tugas jatuh tempo, jadwal belajar |
| Proyek (daftar) | Kartu proyek dengan status dan progress bar; tombol tambah |
| Proyek (detail) | Info proyek, daftar tugas per status, catatan |
| Harian | Checklist hari ini, streak, tombol ke riwayat dan template |
| Tagihan | Daftar dikelompokkan (Terlambat, Minggu ini, Bulan ini, Nanti, Lunas), total belum lunas |
| Belajar | Tampilan per hari dalam seminggu, tombol tandai selesai |
| Pengaturan | Tema, login/logout, sinkronisasi, ekspor/impor, ambang streak |

### 8.5 Pola interaksi
- FAB (tombol `+`) di tiap daftar untuk menambah item; form dalam modal berbentuk sheet.
- Geser item ke kiri untuk hapus, ke kanan untuk selesai (`ion-item-sliding`).
- Pull-to-refresh hanya untuk memicu sinkronisasi (bila login).
- Status ditampilkan dengan chip berwarna (token warna di atas), jangan hanya mengandalkan warna: sertakan teks atau ikon.
- Tampilan kosong (empty state) singkat dan ramah di setiap daftar.

## 9. Persyaratan PWA dan Pengingat

**PWA**
- Manifest: nama "DevDash", `display: standalone`, `theme_color` mengikuti `--bg`, ikon 192 dan 512 px (termasuk versi `maskable`).
- Service worker: precache aset aplikasi (app shell); aplikasi harus bisa dibuka penuh saat offline.
- Terapkan CSS native-feel: `viewport-fit=cover` + `env(safe-area-inset-*)`, `100dvh`, `overscroll-behavior: none`, `user-select: none` pada elemen UI, `-webkit-tap-highlight-color: transparent`, area sentuh minimal 44px.

**Pengingat (keterbatasan yang harus diterima)**
- v1: pengingat ditampilkan **di dalam aplikasi** (dashboard + badge jumlah tagihan terlambat) dan lewat **Notification API** saat aplikasi dibuka atau berjalan di latar.
- Notifikasi saat aplikasi benar-benar tertutup tidak dijamin di PWA, terutama iPhone (hanya bisa jika PWA di-install ke home screen). Jangan menjanjikan ini di UI.
- Opsi cadangan: tombol "Tambah ke kalender" (ekspor file `.ics`) untuk tagihan penting.
- Pengembangan lanjutan (di luar v1): bungkus dengan Capacitor dan pakai Local Notifications.

## 10. Persyaratan Non-Fungsional

- **Offline**: semua fitur inti (lihat, tambah, ubah, centang) jalan tanpa internet.
- **Performa**: layar "Hari ini" tampil kurang dari 1 detik setelah dibuka (data dari IndexedDB).
- **Keamanan**: password di-hash; JWT dengan masa berlaku; CORS dibatasi ke origin frontend; rahasia di file `.env` (jangan commit); validasi input di server.
- **Privasi**: data hanya milik pengguna; tidak ada analitik pihak ketiga.
- **Pengujian**: tes unit untuk logika kritis (hitung progres proyek, aturan ulang tagihan, streak, sinkronisasi) dan tes endpoint untuk API.
- **Kualitas kode**: TypeScript strict di frontend; type hints di backend; format otomatis (Prettier, Black/Ruff).

## 11. Aturan untuk AI Coding Assistant (vibe coding)

1. Kerjakan **satu fase** dalam satu waktu (bagian 12). Jangan menambah fitur di luar PRD.
2. Sebelum menulis kode, tampilkan rencana singkat file yang akan dibuat atau diubah.
3. Gunakan struktur folder pada bagian 4; jangan mengubahnya tanpa alasan.
4. Selalu **offline-first**: UI membaca dari Dexie, bukan langsung dari API.
5. Pakai komponen Ionic bawaan (`ion-*`) sebelum membuat komponen custom.
6. Jangan menaruh warna atau ukuran font langsung di komponen; pakai token di `variables.css`.
7. Semua teks antarmuka dalam bahasa Indonesia.
8. Setelah tiap fitur, jalankan aplikasi dan uji alurnya; perbaiki error sebelum lanjut.
9. Jangan menulis rahasia (kunci JWT, password) di kode; pakai `.env` dan sediakan `.env.example`.
10. Bila ada keputusan yang tidak tercakup PRD, pilih opsi paling sederhana dan catat di `DECISIONS.md`.

## 12. Fase Pengembangan

**Fase 1 — Fondasi lokal (tanpa backend)**
- Setup Ionic React + TypeScript + Vite, tema, tab bar, `vite-plugin-pwa`.
- Skema Dexie untuk semua tabel.
- Modul Checklist Harian + Proyek/Tugas (termasuk kategori) + Dashboard "Hari ini".
- Selesai bila: bisa di-install ke HP, jalan offline, checklist reset per hari.

**Fase 2 — Tagihan dan Belajar**
- Modul Pengingat/Tagihan (termasuk aturan ulang dan tandai lunas).
- Modul Jadwal Belajar + log.
- Notification API saat aplikasi dibuka, ekspor `.ics`.
- Selesai bila: tagihan bulanan otomatis berulang, dashboard menampilkan tagihan mendekat.

**Fase 3 — Backend dan login**
- Flask app factory, model SQLAlchemy, migrasi, endpoint CRUD.
- Auth JWT (register, login, refresh).
- Tes endpoint dasar.
- Selesai bila: API bisa diuji lewat klien HTTP (mis. Postman/Thunder Client).

**Fase 4 — Sinkronisasi**
- Endpoint `/sync` dan klien sinkronisasi (last-write-wins, soft delete).
- Layar Pengaturan: login/logout, sinkron manual, ekspor/impor JSON.
- Selesai bila: data sinkron antara dua perangkat/browser.

**Fase 5 — Pemolesan**
- Light/dark mode, empty state, animasi halus, aksesibilitas.
- Pengujian akhir dan perbaikan performa.
- Opsional: bungkus Capacitor untuk notifikasi lokal.

## 13. Di Luar Cakupan (ide masa depan)

- Statistik dan grafik (produktivitas, pengeluaran per bulan).
- Lampiran file/gambar pada proyek.
- Pelacak waktu (timer per tugas).
- Pengingat berulang untuk tugas proyek.
- Multi-user dan berbagi proyek.
- Deploy: Flask di VPS atau layanan seperti Fly.io/Render, frontend sebagai situs statis.

## 14. Keputusan yang Sudah Ditetapkan

- **Ambang streak**: default 80% item checklist harian tercentang, bisa diubah di Pengaturan (50%–100%).
- **Mata uang**: hanya Rupiah (IDR), disimpan sebagai integer tanpa desimal, ditampilkan dengan format `Rp 1.500.000`.
- **Kategori**: ada, dibuat sendiri oleh pengguna (nama + warna), dipakai oleh proyek dan tugas. Pengingat/tagihan tetap memakai kategori bawaan (`tagihan`, `dp_proyek`, `langganan`, `lainnya`).

## 15. Pertanyaan Terbuka

Tidak ada saat ini.
