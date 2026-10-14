# DevDash — Dashboard Pribadi Developer

Aplikasi PWA offline-first untuk satu developer: **proyek + tugas, checklist
harian + streak, pengingat tagihan berulang, jadwal belajar** — dirangkum dalam
satu layar **"Hari ini"**. Bahasa antarmuka: Indonesia.

## Fitur

- **Hari ini**: sapaan, progres checklist, tagihan mendekat, tugas jatuh tempo,
  jadwal belajar — + pull-to-refresh untuk sinkron.
- **Proyek**: CRUD proyek & tugas, progres otomatis, prioritas, tenggat,
  kategori buatan sendiri + filter.
- **Harian**: template rutinitas (tambah/ubah/nonaktifkan/hapus), checklist per
  tanggal dengan navigasi kemarin/besok, **tanggal mulai berlaku** (susun list
  besok malam ini), streak ambang 50–100%, riwayat 14 hari.
- **Tagihan**: nominal Rupiah, ulang mingguan/bulanan/tahunan, tandai lunas
  (otomatis buat periode berikut), status terlambat, grup Terlambat/Minggu
  ini/Bulan ini/Nanti/Lunas, total bulan ini, ekspor `.ics`, badge + notifikasi.
- **Belajar**: jadwal mingguan (multi-hari, jam, durasi), tandai selesai per
  tanggal, statistik sesi & menit minggu ini.
- **Pengaturan**: light/dark mode, kategori, akun (register/login JWT),
  sinkronisasi manual + otomatis saat online, ekspor/impor JSON.
- **PWA**: install ke home screen, jalan penuh offline (IndexedDB + service worker).

## Arsitektur

Offline-first: UI baca/tulis **IndexedDB (Dexie)**. Server hanya salinan untuk
backup + sinkronisasi antar perangkat (last-write-wins, soft delete).

```
[Ionic PWA] <-> [Dexie / IndexedDB] --sync--> [Flask API] <-> [SQLite]
```

## Tech stack

Frontend: Ionic React 9 + TypeScript + Vite · `vite-plugin-pwa` · Dexie ·
React Context/hooks · font Inter + JetBrains Mono (self-host).
Backend: Flask 3 + SQLAlchemy + Migrate · JWT (access 15 mnt + refresh 30 hari)
· Marshmallow · flask-cors · werkzeug hash · SQLite.

## Menjalankan lokal

```bash
# Frontend (http://localhost:5173)
cd frontend && npm install && npm run dev

# Backend (http://127.0.0.1:5000)
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp -n .env.example .env   # isi JWT_SECRET_KEY
export $(grep -v '^#' .env | xargs)
.venv/bin/flask --app run:app db upgrade
.venv/bin/python run.py
```

Tes: `cd frontend && npm run build` · `cd backend && .venv/bin/python -m pytest tests/ -q`

## Dokumen

- `PRD.md` — spesifikasi (5 fase, sudah selesai semua).
- `DECISIONS.md` — log keputusan yang menyimpang dari PRD.
- `docs/deploy-netlify-lokal.md` — deploy frontend (drag & drop / GitHub).
- `docs/deploy-cloudflare-pythonanywhere.md` — URL permanen + backend sinkron.
- `docs/capacitor-apk.md` — bungkus jadi APK (ditunda, dokumen siap).
