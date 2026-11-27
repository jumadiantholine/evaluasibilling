-- =====================================================================
-- CEK DPM — Aplikasi Evaluasi Billing
-- Skema database untuk Supabase (PostgreSQL)
-- Cara pakai: Supabase Dashboard → SQL Editor → paste seluruh file ini → Run
-- =====================================================================

-- 1. Upload (riwayat file yang diupload: SOREK / MCR / PEC / AMR_INI / AMR_LALU)
CREATE TABLE IF NOT EXISTS "Upload" (
    "id" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "blth" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- 2. Baris SOREK (rekening bulan lalu)
CREATE TABLE IF NOT EXISTS "SorekRow" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "blth" TEXT NOT NULL,
    "idpel" TEXT NOT NULL,
    "tarif" TEXT,
    "daya" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "jamNyala" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pemKwh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    CONSTRAINT "SorekRow_pkey" PRIMARY KEY ("id")
);

-- 3. Baris DPM (mcr.xls / pec mcr.xls / DPM AMR INI / DPM LALU)
CREATE TABLE IF NOT EXISTS "DpmRow" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "blth" TEXT NOT NULL,
    "idpel" TEXT NOT NULL,
    "nama" TEXT,
    "unitup" TEXT,
    "tarif" TEXT,
    "daya" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fkmKwh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fkmKvarh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slalwbp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lwbpCabut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lwbpPasang" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sahlwbp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lwbpPakai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slawbp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wbpCabut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wbpPasang" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sahwbp" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wbpPakai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kvarhCabut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kvarhPasang" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sahkvarh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kvarhPakai" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "slakvarh" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "thblmut" TEXT,
    "dlpd" TEXT,
    "dlpdLm" TEXT,
    CONSTRAINT "DpmRow_pkey" PRIMARY KEY ("id")
);

-- 4. Satu kali jalannya evaluasi
CREATE TABLE IF NOT EXISTS "EvalRun" (
    "id" TEXT NOT NULL,
    "blth" TEXT NOT NULL,
    "blthSorek" TEXT,
    "mode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stats" JSONB,
    CONSTRAINT "EvalRun_pkey" PRIMARY KEY ("id")
);

-- 5. Hasil evaluasi per pelanggan
CREATE TABLE IF NOT EXISTS "EvalResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "idpel" TEXT NOT NULL,
    "nama" TEXT,
    "unitup" TEXT,
    "tarif" TEXT,
    "daya" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kwh" DOUBLE PRECISION,
    "kwhEmin" DOUBLE PRECISION,
    "kwhIni" DOUBLE PRECISION,
    "kwhLalu" DOUBLE PRECISION,
    "dayaLalu" DOUBLE PRECISION,
    "jnLalu" DOUBLE PRECISION,
    "jnReal" DOUBLE PRECISION,
    "gap" DOUBLE PRECISION,
    "prosentase" DOUBLE PRECISION,
    "cekStan" TEXT,
    "dlpd" TEXT,
    "dlpdLm" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NORMAL',
    "source" TEXT,
    "stanLalu" DOUBLE PRECISION,
    "stanCabut" DOUBLE PRECISION,
    "stanPasang" DOUBLE PRECISION,
    "stanIni" DOUBLE PRECISION,
    "cekPecahan" TEXT,
    "gapEmin" DOUBLE PRECISION,
    "pdBongkarPasang" DOUBLE PRECISION,
    "cekStanPasang" TEXT,
    "cekPecahanVsIni" TEXT,
    "foundSorek" BOOLEAN NOT NULL DEFAULT true,
    "lwbpPakai" DOUBLE PRECISION,
    "wbpPakai" DOUBLE PRECISION,
    "kvarhPakai" DOUBLE PRECISION,
    "batasKvarh" DOUBLE PRECISION,
    "kelbKvarh" DOUBLE PRECISION,
    "rasioKvarh" DOUBLE PRECISION,
    "rpEmin" DOUBLE PRECISION,
    "rpLwbp" DOUBLE PRECISION,
    "rpWbp" DOUBLE PRECISION,
    "rpTotalKwh" DOUBLE PRECISION,
    "rpKvarh" DOUBLE PRECISION,
    "rpTotalPak" DOUBLE PRECISION,
    "rpRekening" DOUBLE PRECISION,
    "buatBa" TEXT,
    "cekFx" TEXT,
    "kwhLaluDpm" DOUBLE PRECISION,
    "kenaikan" DOUBLE PRECISION,
    "cekDpmVsSorek" DOUBLE PRECISION,
    "cekStanWbp" TEXT,
    "cekStanKvarh" TEXT,
    "cekLwbpVsWbp" TEXT,
    CONSTRAINT "EvalResult_pkey" PRIMARY KEY ("id")
);

-- 6. Tabel tarif RPKWH (otomatis terisi saat evaluasi pertama dijalankan)
CREATE TABLE IF NOT EXISTS "TariffRate" (
    "tarif" TEXT NOT NULL,
    "lwbp" DOUBLE PRECISION NOT NULL,
    "wbp" DOUBLE PRECISION NOT NULL,
    "kvarh" DOUBLE PRECISION NOT NULL,
    "ppj" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "TariffRate_pkey" PRIMARY KEY ("tarif")
);

-- 7. Master FX (daya -> faktor kali meter, otomatis terisi)
CREATE TABLE IF NOT EXISTS "MasterFx" (
    "daya" DOUBLE PRECISION NOT NULL,
    "fx" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "MasterFx_pkey" PRIMARY KEY ("daya")
);

-- Relasi + indeks
ALTER TABLE "SorekRow" ADD CONSTRAINT "SorekRow_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE;
ALTER TABLE "DpmRow" ADD CONSTRAINT "DpmRow_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE CASCADE;
ALTER TABLE "EvalResult" ADD CONSTRAINT "EvalResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "EvalRun"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "SorekRow_blth_idpel_idx" ON "SorekRow"("blth", "idpel");
CREATE INDEX IF NOT EXISTS "DpmRow_blth_idpel_idx" ON "DpmRow"("blth", "idpel");
CREATE INDEX IF NOT EXISTS "DpmRow_uploadId_idx" ON "DpmRow"("uploadId");
CREATE INDEX IF NOT EXISTS "EvalRun_blth_mode_idx" ON "EvalRun"("blth", "mode");
CREATE INDEX IF NOT EXISTS "EvalResult_runId_status_idx" ON "EvalResult"("runId", "status");
CREATE INDEX IF NOT EXISTS "EvalResult_runId_idpel_idx" ON "EvalResult"("runId", "idpel");
