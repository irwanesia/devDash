# Deploy Lokal → Netlify (drag & drop, tanpa Git)

Hasil akhir: URL permanen `https://nama-kamu.netlify.app` yang bisa dibuka dan
di-install di HP. Tanpa backend (mode lokal/offline penuh). Kalau nanti butuh
sinkron, lanjutkan ke `deploy-cloudflare-pythonanywhere.md` Bagian B.

> Yang di-upload adalah **isi folder `frontend/dist/`** (hasil build), BUKAN
> folder `frontend/`. Folder `frontend/` berisi kode sumber — Netlify tak bisa
> menjalankannya langsung lewat drag & drop.

## 1. Build di laptop

```bash
cd /media/irwan/DATA/01-Projects/Mobile/devDash/frontend
npm run build
ls dist/
```

Wajib muncul: `index.html`, `manifest.webmanifest`, `sw.js`, `_redirects`,
folder `assets/`, ikon-ikon. Total ±3 MB.

> Setiap ada perubahan kode, ulangi `npm run build` lalu ulangi langkah 2
> (atau pindah ke deploy via Git agar otomatis — lihat bagian 4).

## 2. Upload via Netlify Drop

1. Login https://app.netlify.com (daftar gratis bila belum).
2. Buka https://app.netlify.com/drop
3. Buka file manager → masuk ke `devDash/frontend/dist/` → **seret folder
   `dist` (atau semua isinya)** ke area drop di browser.
4. Tunggu upload ±1 menit → dapat URL `https://acak-xxxx.netlify.app`.
5. (Disarankan) **Site settings → Change site name** → ganti mis.
   `devdash-kamu` → URL jadi `https://devdash-kamu.netlify.app`.

## 3. Coba di HP

1. Buka URL Netlify di Chrome HP.
2. Cek 5 tab + tambah 1 data → matikan internet → tutup-buka lagi
   (data harus tetap ada = IndexedDB + service worker jalan).
3. Install: Chrome ⋮ → *Tambahkan ke Layar utama* / *Install aplikasi*.
4. Sinkron/login **belum bisa** di tahap ini (tak ada backend) — normal.
   Isi Pengaturan → Alamat server belakangan setelah backend ada.

## 4. Update berikutnya (dua pilihan)

- **Tetap drag & drop**: `npm run build` → seret ulang `dist` ke
  halaman site-mu (Deploys → drag & drop area). Deploy lama tetap tersimpan
  dan bisa di-rollback.
- **Naik kelas ke Git** (disarankan bila sering ubah): push repo ke GitHub →
  Netlify **Add new site → Import an existing project** → Build settings:
  Base directory `frontend`, Build command `npm run build`,
  Publish directory `frontend/dist`. Sejak itu tiap `git push` = deploy otomatis.

## 5. Troubleshooting

| Gejala | Obat |
| --- | --- |
| Refresh `/proyek` → *Page not found* | `_redirects` tak ikut ter-upload (pastikan ada di `dist/` sebelum menyeret) |
| Layar putih setelah update | Hard refresh / tab Incognito (service worker + cache versi lama); lalu deploy baru menimpa |
| File ditolak / gagal upload | Pastikan yang diseret isi `dist/`, bukan `node_modules/` atau `frontend/` |
| Mau pindah host | File yang sama bisa di-upload ke Cloudflare Pages/Vercel/GitHub Pages tanpa build ulang |
