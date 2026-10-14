# Deploy Lokal → Netlify (tanpa backend)

Hasil akhir: URL permanen `https://nama-kamu.netlify.app` yang bisa dibuka dan
di-install di HP. Tanpa backend (mode lokal/offline penuh). Kalau nanti butuh
sinkron, lanjutkan ke `deploy-cloudflare-pythonanywhere.md` Bagian B.

Dua cara, pilih salah satu:

- **Opsi A — drag & drop**: tanpa Git, tiap update diulang manual. Cocok untuk coba sekali.
- **Opsi B — integrasi GitHub** (disarankan): tiap `git push` = deploy otomatis.

## Opsi A: drag & drop

> Yang di-upload adalah **isi folder `frontend/dist/`** (hasil build), BUKAN
> folder `frontend/`. Folder `frontend/` berisi kode sumber — Netlify tak bisa
> menjalankannya langsung lewat drag & drop.

### A.1. Build di laptop

```bash
cd /media/irwan/DATA/01-Projects/Mobile/devDash/frontend
npm run build
ls dist/
```

Wajib muncul: `index.html`, `manifest.webmanifest`, `sw.js`, `_redirects`,
folder `assets/`, ikon-ikon. Total ±3 MB. Setiap ada perubahan kode, ulangi
perintah ini lalu ulangi A.2.

### A.2. Upload via Netlify Drop

1. Login https://app.netlify.com (daftar gratis bila belum).
2. Buka https://app.netlify.com/drop
3. Buka file manager → masuk ke `devDash/frontend/dist/` → **seret folder
   `dist` (atau semua isinya)** ke area drop di browser.
4. Tunggu upload ±1 menit → dapat URL `https://acak-xxxx.netlify.app`.
5. (Disarankan) **Site settings → Change site name** → ganti mis.
   `devdash-kamu` → URL jadi `https://devdash-kamu.netlify.app`.

## Opsi B: integrasi GitHub (otomatis)

Syarat: repo sudah di-push ke GitHub (punyamu: `irwanesia/devDash` — sudah).

1. Netlify → **Add new site → Import an existing project** → pilih repo `devDash`.
2. Isi build settings (wajib, tidak otomatis):
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. **Deploy**. Tunggu ±2 menit → dapat URL permanen.
4. Sejak ini tiap `git push` ke `main` = rebuild + tayang ulang otomatis.
   Deploy lama tersimpan dan bisa di-rollback (Deploys → pilih versi → Publish).

> File `_redirects` ikut otomatis dari `frontend/public/` → refresh di rute
> `/proyek`, `/harian`, dsb. tidak 404. Tidak perlu konfigurasi redirect manual.

## Coba di HP (berlaku untuk kedua opsi)

1. Buka URL Netlify di Chrome HP.
2. Cek 5 tab + tambah 1 data → matikan internet → tutup-buka lagi
   (data harus tetap ada = IndexedDB + service worker jalan).
3. Install: Chrome ⋮ → *Tambahkan ke Layar utama* / *Install aplikasi*.
4. Sinkron/login **belum bisa** di tahap ini (tak ada backend) — normal.
   Isi Pengaturan → Alamat server belakangan setelah backend ada.

## Troubleshooting

| Gejala | Obat |
| --- | --- |
| Refresh `/proyek` → *Page not found* | Opsi A: `_redirects` tak ikut ter-upload (pastikan ada di `dist/` sebelum menyeret). Opsi B: pastikan file `frontend/public/_redirects` ada di repo |
| Layar putih setelah update | Hard refresh / tab Incognito (service worker + cache versi lama); deploy baru menimpa setelahnya |
| Build GitHub gagal di Netlify | Buka deploy log; umum: salah Base directory (harus `frontend`) atau Publish directory (harus `dist`, bukan `frontend/dist`) |
| File ditolak / gagal upload (Opsi A) | Pastikan yang diseret isi `dist/`, bukan `node_modules/` atau `frontend/` |
| Mau pindah host | File yang sama bisa di-upload ke Cloudflare Pages/Vercel/GitHub Pages tanpa build ulang |
