"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function GuideTab() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cara Pakai</CardTitle>
          <CardDescription className="text-xs">Alur kerja evaluasi billing per bulan (BLTH).</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-stone-700 space-y-2 list-none">
          <p><b>1.</b> Upload <b>SOREK</b> (rekening bulan lalu) — format kolom: BLTH, IDPEL, TARIP, DAYA, JAMNYALA, PEMKWH.</p>
          <p><b>2.</b> Upload <b>MCR</b> — file <i>mcr.xls</i> DPM pelanggan umum ULP Muncar (57 kolom DPM standar).</p>
          <p><b>3.</b> Upload <b>PEC MCR</b> — file <i>pec mcr.xls</i> pelanggan dengan mutasi/pecahan.</p>
          <p><b>4.</b> (Untuk pelanggan besar/potensial) Upload <b>DPM INI</b> dan opsional <b>DPM LALU</b> bulan sebelumnya.</p>
          <p><b>5.</b> Klik <b>Jalankan Evaluasi</b> — pilih mode (SINGLE untuk umum, AMR untuk besar) dan BLTH-nya.</p>
          <p><b>6.</b> Lihat hasil di <b>Dashboard</b>: filter status, cari IDPEL, klik baris untuk detail lengkap, lalu <b>Export Excel</b>.</p>
          <p className="text-stone-500">Upload jenis + BLTH yang sama otomatis menimpa data lama, jadi aman untuk upload ulang koreksi.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Logika Evaluasi (mengikuti Excel CEK DPM F2 v1.0)</CardTitle>
          <CardDescription className="text-xs">Rumus inti yang dipakai otomatis di aplikasi.</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-stone-700 space-y-1.5">
          <p><b>KWH EMIN</b> = DAYA × 40 / 1000 (tagihan minimum 40 jam)</p>
          <p><b>KWH INI / KWH REK</b> = MAX(KWH, EMIN)</p>
          <p><b>JAM NYALA</b> = KWH / DAYA × 1000 — JN LALU dari SOREK, JN REAL dari DPM</p>
          <p><b>GAP</b> = KWH INI − KWH LALU (SOREK); <b>PROSENTASE</b> = GAP / KWH LALU</p>
          <p><b>CEK STAN</b>: STAN INI &lt; STAN LALU → <i>TERBALIK</i> (meter mundur)</p>
          <p><b>CEK PECAHAN</b>: DLPD “J REKENING PECAHAN” → STAN PASANG = STAN LALU → <i>PD</i>; berbeda → <i>GAMET</i></p>
          <p><b>AMR — BATAS KVARH</b> = 62% × TOTAL KWH; <b>KELB KVARH</b> = kelebihan di atas batas</p>
          <p><b>AMR — RP REKENING</b> = MAX(RP EMIN, RP LWBP + RP WBP + RP KVARH) sesuai tabel tarif RPKWH</p>
          <p><b>AMR — BUAT BA</b>: RASIO KVARH ≥ 2 dan RP TOTAL PAK &gt; RP TOTAL KWH</p>
          <p><b>AMR — CEK FX</b>: FKM KWH vs tabel master faktor kali meter per DAYA</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Arti Kategori Status</CardTitle>
          <CardDescription className="text-xs">Prioritas pemeriksaan tertinggi paling atas.</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-stone-700 space-y-1.5">
          <p><b className="text-red-700">STAN TERBALIK</b> — stand meter mundur: verifikasi baca ulang / BA.</p>
          <p><b className="text-amber-700">SOREK TIDAK ADA</b> — IDPEL tidak ditemukan di file SOREK (cekp fordup / tunggakan).</p>
          <p><b className="text-orange-700">REK PECAHAN PD / GAMET</b> — rekening pecahan; PD bila stan pasang = stan lalu, selain itu GAMET (perlu BA pemutusan).</p>
          <p><b className="text-rose-700">TURUN &gt;50%</b> — pemakaian turun tajam vs bulan lalu: cek kesehatan meter / pencurian.</p>
          <p><b className="text-fuchsia-700">NAIK &gt;100%</b> — kenaikan ekstrem: cek beban pelanggan.</p>
          <p><b className="text-yellow-700">KWH NOL</b> — pemakaian nol: meter mati / rumah kosong / sengaja di-nol-kan.</p>
          <p><b className="text-lime-700">KWH &lt; 40 JAM</b> — jam nyala di bawah 40 jam.</p>
          <p><b className="text-teal-700">EMIN DIPAKAI</b> — pemakaian di bawah minimum; tagihan memakai EMIN.</p>
          <p><b className="text-red-700">BUAT BA</b> (AMR) — rasio kvarh ≥ 2: wajib berita acara pemasangan kapasitor.</p>
          <p><b className="text-red-700">FX SALAH</b> (AMR) — faktor kali meter tidak sesuai master: salah setting meter.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Deploy: GitHub → Vercel + Supabase</CardTitle>
          <CardDescription className="text-xs">Langkah singkat — panduan lengkap ada di file README-DEPLOY.md dalam proyek.</CardDescription>
        </CardHeader>
        <CardContent className="text-xs text-stone-700 space-y-1.5">
          <p><b>1.</b> Buat proyek baru di <b>supabase.com</b>, lalu jalankan <i>supabase/schema.sql</i> di SQL Editor.</p>
          <p><b>2.</b> Push folder proyek ini ke repository GitHub Anda.</p>
          <p><b>3.</b> Di <b>vercel.com</b>: Add New Project → Import repo → set Environment Variable <code className="bg-stone-100 px-1 rounded">DATABASE_URL</code> = connection string Supabase (pooler, port 6543).</p>
          <p><b>4.</b> Ubah <i>prisma/schema.prisma</i>: provider <code className="bg-stone-100 px-1 rounded">sqlite</code> → <code className="bg-stone-100 px-1 rounded">postgresql</code> (lihat komentar di file), commit & push.</p>
          <p><b>5.</b> Vercel otomatis build & deploy — selesai, aplikasi online.</p>
        </CardContent>
      </Card>
    </div>
  );
}
