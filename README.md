# CEK DPM — Aplikasi Evaluasi Billing

Aplikasi web untuk evaluasi billing pelanggan listrik (logic mengikuti file Excel **CEK DPM F2 v1.0**). Upload file Excel DPM & SOREK, lalu semua perhitungan evaluasi berjalan otomatis dengan hasil yang bisa difilter, dicari, dilihat detailnya, dan di-export kembali ke Excel.

Dibangun dengan **Next.js 16 + TypeScript + Tailwind + shadcn/ui + Prisma**, siap deploy ke **Vercel** dengan database **Supabase (PostgreSQL)** — panduan lengkap: [README-DEPLOY.md](README-DEPLOY.md).

## Fitur

- **5 menu upload** (upload jenis + BLTH yang sama otomatis menimpa data lama):
  - **SOREK** — rekening bulan lalu (BLTH, IDPEL, TARIP, DAYA, JAMNYALA, PEMKWH)
  - **MCR** — DPM pelanggan umum ULP Muncar (`mcr.xls`, 57 kolom DPM standar)
  - **PEC MCR** — DPM pelanggan pecahan/mutasi (`pec mcr.xls`)
  - **DPM INI / DPM LALU** — pelanggan besar/potensial (AMR) bulan ini & bulan lalu
- **2 mode evaluasi**:
  - **SINGLE (pelanggan umum)**: EMIN, KWH INI, JN LALU/REAL, GAP, PROSENTASE, cek stan mundur, cek pecahan PD/GAMET, DLPD
  - **AMR (pelanggan besar)**: TOTAL KWH, BATAS KVARH 62%, KELB KVARH, RASIO KVARH, RP EMIN/LWBP/WBP/KVARH/REKENING sesuai tabel RPKWH, keputusan BUAT BA, CEK FX vs master, KENAIKAN vs DPM LALU
- **Dashboard hasil**: statistik, filter status anomali, pencarian IDPEL/nama, detail per pelanggan, export Excel
- **Riwayat** upload & evaluasi
- File dibaca langsung di browser (SheetJS) dan dikirim bertahap ke server — aman untuk file besar & batas body Vercel

## Struktur

```
src/app/page.tsx                 halaman utama (4 tab)
src/components/eval/             komponen UI (upload, dashboard, riwayat, panduan)
src/lib/evaluation.ts            mesin evaluasi (logika Excel CEK DPM)
src/lib/excel-parse.ts           parser Excel di browser
src/lib/refdata.ts               tabel RPKWH & MASTER FX
src/app/api/                     API: uploads, evaluate, runs, results, export
prisma/schema.prisma             skema database
supabase/schema.sql              SQL pembuat tabel di Supabase
README-DEPLOY.md                 panduan GitHub → Supabase → Vercel
scripts/switch-supabase.sh      ganti provider Prisma ke postgresql
```

## Menjalankan lokal

```bash
bun install          # atau npm install
bun run db:push      # buat database SQLite lokal
bun run dev          # http://localhost:3000
```

## Deploy ke Vercel + Supabase

Lihat [README-DEPLOY.md](README-DEPLOY.md) — ringkasnya: jalankan `supabase/schema.sql` di SQL Editor Supabase, `bash scripts/switch-supabase.sh`, push ke GitHub, import di Vercel, set `DATABASE_URL` (pooler 6543), deploy.
