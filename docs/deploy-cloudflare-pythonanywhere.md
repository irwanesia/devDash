# Deploy: Frontend di Cloudflare Pages + Backend di PythonAnywhere

Hasil akhir: aplikasi permanen di `https://devdash-kamu.pages.dev` (atau domain
sendiri) + API di `https://username.pythonanywhere.com`. Keduanya paket gratis.

> Belum butuh sinkron HP↔laptop? Cukup **Bagian A** saja — aplikasi jalan penuh
> offline (data di IndexedDB HP). **Bagian B** hanya untuk login + sinkron.

## A. Frontend → Cloudflare Pages

### A.1. Siapkan repo Git (sekali saja)

```bash
cd /media/irwan/DATA/01-Projects/Mobile/devDash
git init -b main
git add PRD.md DECISIONS.md docs frontend backend
git commit -m "DevDash v1: 5 fase + revisi"
# buat repo kosong di github.com, lalu:
git remote add origin git@github.com:USERNAME/devdash.git
git push -u origin main
```

Jangan commit rahasia: pastikan `backend/.env`, `backend/.venv/`,
`backend/instance/*.db`, `frontend/dist/` **tidak** ikut (cek `.gitignore`).
Butuh file `.gitignore` root? Buat `devDash/.gitignore` berisi:

```
backend/.venv/
backend/.env
backend/instance/*.db
backend/__pycache__/
frontend/node_modules/
frontend/dist/
```

> File `frontend/public/_redirects` (sudah ada di repo, isi `/* /index.html 200`)
> **wajib ikut** — tanpanya, refresh di rute `/proyek`, `/harian`, dsb. akan 404.

### A.2. Sambungkan Pages

1. Login https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** → pilih repo `devdash`.
2. Konfigurasi build:
   - **Framework preset**: `Vite`
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - Variabel env: tidak perlu.
3. **Save and Deploy**. Tunggu ±2 menit → dapat URL `https://devdash-xxx.pages.dev`.
4. Buka URL itu di HP → uji semua tab → install ke home screen.
   Setiap `git push` ke `main` = deploy ulang otomatis.

### A.3. Domain sendiri (opsional)

Pages → **Custom domains** → ikuti wizard (perlu domain dikelola Cloudflare
atau tambah CNAME). HTTPS otomatis.

## B. Backend → PythonAnywhere (gratis)

Kenapa PA: paket free mendukung Flask + file SQLite **persisten** (tidak hilang
saat restart — masalah umum SQLite di hosting ephemeral).

### B.1. Siapkan kode di PA

1. Daftar https://www.pythonanywhere.com (paket **Beginner/free**).
2. Buka **Consoles → Bash**, jalankan:

```bash
git clone https://github.com/USERNAME/devdash.git
cd devdash/backend
mkvirtualenv --python=/usr/bin/python3.12 devdash 2>/dev/null || mkvirtualenv --python=/usr/bin/python3 devdash
pip install -r requirements.txt
```

3. Buat database + migrasi:

```bash
export JWT_SECRET_KEY="$(python -c 'import secrets; print(secrets.token_hex(32))')"
export DATABASE_URL="sqlite:////home/USERNAME/devdash/backend/devdash.db"
export CORS_ORIGINS="https://devdash-xxx.pages.dev"
python -c "import os; print('DB:', os.environ['DATABASE_URL'])"
flask --app run:app db upgrade
```

> Ganti `USERNAME` dengan username PA kamu, dan URL Pages dengan URL-mu.
> `JWT_SECRET_KEY` harus acak 64 hex — jangan pakai contoh.

### B.2. Daftarkan Web App

1. Dashboard PA → **Web** → **Add a new web app** → **Manual configuration** →
   pilih Python 3.12 (atau terbaru).
2. Di halaman web app:
   - **Virtualenv**: `/home/USERNAME/.virtualenvs/devdash`
   - **Code → WSGI configuration file**: klik, **ganti seluruh isinya**:

```python
import os
import sys

BACKEND = '/home/USERNAME/devdash/backend'
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

os.environ['JWT_SECRET_KEY'] = 'ISI_DENGAN_HEX_64_KARAKTER_TADI'
os.environ['DATABASE_URL'] = 'sqlite:////home/USERNAME/devdash/backend/devdash.db'
os.environ['CORS_ORIGINS'] = 'https://devdash-xxx.pages.dev'

from dotenv import load_dotenv  # aman bila tak ada .env
load_dotenv(os.path.join(BACKEND, '.env'))
from app import create_app
application = create_app()
```

3. Klik **Reload**, lalu buka `https://USERNAME.pythonanywhere.com/api/health`
   → harus balas `{"ok": true}`.

### B.3. Sambungkan HP

Di aplikasi HP → Pengaturan → Alamat server:

```
https://USERNAME.pythonanywhere.com
```

Daftar/Masuk → Sinkronkan. Selesai: data HP ↔ laptop sinkron via server.

### B.4. Update backend ke depan

```bash
cd ~/devdash && git pull
cd backend
workon devdash
flask --app run:app db upgrade   # bila ada migrasi baru
```

Lalu **Reload** web app di dashboard.

## C. Batasan paket gratis (jujur)

| Layanan | Batasan |
| --- | --- |
| Cloudflare Pages | 500 build/bulan, bandwidth wajar — lebih dari cukup |
| PythonAnywhere free | 1 web app; CPU terbatas (cukup untuk 1 pengguna); **tidak bisa** WebSocket/background task (tak dibutuhkan); file SQLite persisten ✅ |
| Keduanya | Tidur/cold-start seperti Render free **tidak berlaku di PA**; Pages selalu on |

## D. Troubleshooting

| Gejala | Obat |
| --- | --- |
| Refresh `/proyek` di Pages → 404 | File `frontend/public/_redirects` belum ikut deploy; cek ada di repo dan build ulang |
| HP `failed to fetch` saat login | `CORS_ORIGINS` di WSGI belum berisi URL Pages (persis) → perbaiki → Reload |
| `/api/health` 500 / Unhandled Exception | Buka **Web → Log files → Error log**; umum: salah path venv/WSGI atau `JWT_SECRET_KEY` kosong |
| Data hilang setelah reload PA | `DATABASE_URL` menunjuk path absolut di `/home/USERNAME/...` (jangan relatif); cek file `.db` ada via Files |
| Sinkron 401 terus | Token kedaluwarsa → Keluar lalu Masuk lagi di HP |
