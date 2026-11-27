# Panduan Deploy: GitHub → Supabase → Vercel

Aplikasi **CEK DPM — Evaluasi Billing** sudah siap di-deploy.
Ikuti langkah berikut secara berurutan (±10 menit).

---

## Prasyarat

- Akun [GitHub](https://github.com) (gratis)
- Akun [Supabase](https://supabase.com) (gratis)
- Akun [Vercel](https://vercel.com) (gratis) — login dengan GitHub

## Langkah 1 — Siapkan database Supabase

1. Buat proyek baru di Supabase (pilih region terdekat, mis. Singapore).
2. Buka **SQL Editor** → **New query**.
3. Buka file `supabase/schema.sql` dari folder proyek ini, salin seluruh isinya, paste ke SQL Editor, klik **Run**.
   → 7 tabel terbuat otomatis (Upload, SorekRow, DpmRow, EvalRun, EvalResult, TariffRate, MasterFx).
4. Simpan password database yang Anda buat (dipakai di connection string).

## Langkah 2 — Push proyek ke GitHub

1. Buat repository baru di GitHub (mis. `cek-dpm-evaluasi`).
2. Dari folder proyek ini:

```bash
git init
git add .
git commit -m "CEK DPM Evaluasi Billing"
git branch -M main
git remote add origin https://github.com/<username>/cek-dpm-evaluasi.git
git push -u origin main
```

Jangan upload folder `node_modules`, `dev.log`, dan `db/` — sudah diatur di `.gitignore`.

## Langkah 3 — Ubah Prisma ke PostgreSQL (untuk Supabase)

Sebelum push (atau buat commit terpisah), jalankan:

```bash
bash scripts/switch-supabase.sh
git add prisma/schema.prisma
git commit -m "switch provider ke postgresql utk supabase"
git push
```

Ini mengubah `provider = "sqlite"` menjadi `provider = "postgresql"` di `prisma/schema.prisma`.
(Tabel sudah dibuat lewat `supabase/schema.sql` pada Langkah 1, jadi tidak perlu migrasi.)

## Langkah 4 — Deploy ke Vercel

1. Buka [vercel.com/add](https://vercel.com/new) → **Import** repository Anda.
2. Framework preset terdeteksi: **Next.js** — biarkan default.
3. Buka bagian **Environment Variables**, tambahkan satu variabel:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | connection string Supabase Anda |

   Connection string ada di: Supabase → **Project Settings → Database → Connection string → URI**.
   **Gunakan Connection Pooler (port 6543)** dan tambahkan `?pgbouncer=true&connection_limit=1` di akhir, contoh:

   ```
   postgresql://postgres.abc123xyz:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   ```

   (Rekomendasi Supabase untuk serverless seperti Vercel: pooler 6543 + connection_limit=1.)
4. Klik **Deploy** — selesai. Aplikasi online di `https://cek-dpm-evaluasi.vercel.app` (nama otomatis mengikuti repo).

Setiap `git push` ke branch `main` setelahnya akan otomatis update aplikasi online.

---

## Cara pakai aplikasi (setelah online)

1. Tab **Upload Data**:
   - **SOREK** → file rekening bulan lalu (kolom BLTH, IDPEL, TARIP, DAYA, JAMNYALA, PEMKWH — header `BTH` juga dikenali).
   - **MCR** → file `mcr.xls` DPM pelanggan umum ULP Muncar.
   - **PEC MCR** → file `pec mcr.xls` pelanggan pecahan/mutasi.
   - **DPM INI / DPM LALU** → untuk evaluasi pelanggan besar/potensial (AMR).
2. Klik **Jalankan Evaluasi** → pilih mode `SINGLE (umum)` atau `AMR (besar)`, pilih BLTH DPM & BLTH SOREK.
3. Tab **Dashboard** → filter status anomali, cari IDPEL, klik baris untuk detail lengkap, **Export Excel** untuk laporan.

Upload dengan jenis + BLTH yang sama otomatis **menimpa** data lama — aman untuk upload ulang koreksi.

## Logika evaluasi yang dijalankan aplikasi

Sesuai file Excel **CEK DPM F2 v1.0**:

- `KWH EMIN = DAYA × 40 / 1000` dan `KWH INI = MAX(KWH, EMIN)`
- `JAM NYALA = KWH / DAYA × 1000` (JN LALU dari SOREK, JN REAL dari DPM)
- `GAP = KWH INI − KWH LALU (SOREK)`, `PROSENTASE = GAP / KWH LALU`
- Cek stan mundur (`STAN INI < STAN LALU` → TERBALIK)
- Cek pecahan: DLPD `J REKENING PECAHAN` → `STAN PASANG = STAN LALU` → **PD**; selain itu **GAMET**
- AMR: `BATAS KVARH = 62% × TOTAL KWH`, `KELB KVARH` = kelebihan, `RP REKENING = MAX(RP EMIN, RP LWBP+RP WBP+RP KVARH)` sesuai tabel RPKWH, `BUAT BA` bila rasio kvarh ≥ 2, `CEK FX` vs master faktor kali meter.

Kategori status siap difilter: STAN TERBALIK, REK PECAHAN PD/GAMET, TURUN >50%, NAIK >100%, KWH NOL, KWH < 40 JAM, EMIN DIPAKAI, BUAT BA, FX SALAH, KVARH LAMPAU BATAS.

## Catatan

- Tabel referensi **RPKWH** (tarif per kWh) dan **MASTER FX** (daya → faktor kali meter) terisi otomatis saat evaluasi pertama kali dijalankan; nilainya sesuai sheet Excel Anda.
- Semua perhitungan dilakukan di server (route handler Next.js) dan data disimpan di Supabase Postgres Anda sendiri.
- File Excel dibaca **langsung di browser** (SheetJS) lalu dikirim bertahap ke server — jadi tidak kena batas ukuran body 4,5 MB Vercel; file SOREK puluhan ribu baris tetap bisa diupload.
