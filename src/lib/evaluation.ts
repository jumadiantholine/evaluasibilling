import { db } from "@/lib/db";
import { getTariffMap, getFxMap } from "@/lib/refdata";
import type { DpmInput, SorekInput, RunStats } from "@/lib/types";

/**
 * Mesin Evaluasi Billing — mereplikasi logika file Excel "CEK DPM F2 v1.0".
 *
 * MODE SINGLE (pelanggan umum — mcr.xls + pec mcr.xls + SOREK):
 *   EMIN      = DAYA × 40 / 1000
 *   KWH INI   = MAX(KWH, EMIN)
 *   JN LALU   = PEMKWH(SOREK) / DAYA_LALU × 1000
 *   JN REAL   = KWH / DAYA × 1000
 *   GAP       = KWH INI − PEMKWH
 *   PROSENTASE= GAP / PEMKWH
 *   CEK PECAHAN: DLPD "J REKENING PECAHAN" → STAN PASANG = STAN LALU ? PD : GAMET
 *
 * MODE AMR (pelanggan besar/potensial):
 *   TOTAL KWH   = LWBP PAKAI + WBP PAKAI
 *   KWH REK     = MAX(TOTAL KWH, EMIN)
 *   BATAS KVARH = TOTAL KWH × 0.62
 *   KELB KVARH  = MAX(0, KVARH PAKAI − BATAS KVARH)
 *   RASIO KVARH = KVARH PAKAI / TOTAL KWH
 *   RP EMIN/LWBP/WBP/KVARH sesuai tabel RPKWH; RP REKENING = MAX(RP_TOTAL_KWH, RP_TOTAL_PAK)
 *   BA          = RASIO ≥ 2 dan RP TOTAL PAK > RP TOTAL KWH → "BUAT BA"
 *   CEK FX      = VLOOKUP(DAYA, MASTER FX) = FKM KWH ?
 *   JN LALU (DPM LALU), KENAIKAN, GAP vs SOREK
 */

type DpmRowDB = Awaited<ReturnType<typeof db.dpmRow.findFirst>>;
type SorekRowDB = Awaited<ReturnType<typeof db.sorekRow.findFirst>>;

interface EvalRowDraft {
  idpel: string;
  nama?: string | null;
  unitup?: string | null;
  tarif?: string | null;
  daya: number;
  kwh?: number | null;
  kwhEmin?: number | null;
  kwhIni?: number | null;
  kwhLalu?: number | null;
  dayaLalu?: number | null;
  jnLalu?: number | null;
  jnReal?: number | null;
  gap?: number | null;
  prosentase?: number | null;
  cekStan?: string | null;
  dlpd?: string | null;
  dlpdLm?: string | null;
  status: string;
  source?: string | null;
  stanLalu?: number | null;
  stanCabut?: number | null;
  stanPasang?: number | null;
  stanIni?: number | null;
  cekPecahan?: string | null;
  gapEmin?: number | null;
  pdBongkarPasang?: number | null;
  cekStanPasang?: string | null;
  cekPecahanVsIni?: string | null;
  foundSorek: boolean;
  lwbpPakai?: number | null;
  wbpPakai?: number | null;
  kvarhPakai?: number | null;
  batasKvarh?: number | null;
  kelbKvarh?: number | null;
  rasioKvarh?: number | null;
  rpEmin?: number | null;
  rpLwbp?: number | null;
  rpWbp?: number | null;
  rpTotalKwh?: number | null;
  rpKvarh?: number | null;
  rpTotalPak?: number | null;
  rpRekening?: number | null;
  buatBa?: string | null;
  cekFx?: string | null;
  kwhLaluDpm?: number | null;
  kenaikan?: number | null;
  cekDpmVsSorek?: number | null;
  cekStanWbp?: string | null;
  cekStanKvarh?: string | null;
  cekLwbpVsWbp?: string | null;
}

function num(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

// Ambil baris DPM sesuai sumber & BLTH; PEC menimpa MCR bila IDPEL sama
async function loadDpmRows(blth: string, sources: string[]): Promise<Map<string, DpmRowDB>> {
  const rows = await db.dpmRow.findMany({
    where: { blth, source: { in: sources } },
  });
  const byIdpel = new Map<string, DpmRowDB>();
  for (const r of rows) {
    const prev = byIdpel.get(r.idpel);
    if (!prev || (prev.source === "MCR" && r.source === "PEC")) byIdpel.set(r.idpel, r);
  }
  return byIdpel;
}

async function loadSorekMap(blth: string | null): Promise<Map<string, SorekRowDB>> {
  const where = blth ? { blth } : {};
  const rows = await db.sorekRow.findMany({ where });
  const byIdpel = new Map<string, SorekRowDB>();
  for (const r of rows) {
    if (!byIdpel.has(r.idpel)) byIdpel.set(r.idpel, r);
  }
  return byIdpel;
}

// ============================ EVALUASI SINGLE ============================
export function evaluateSingleRow(d: DpmRowDB, sorek: SorekRowDB | undefined): EvalRowDraft {
  const daya = num(d.daya);
  const kwh = num(d.lwbpPakai);
  const kwhEmin = (daya * 40) / 1000;
  const kwhIni = Math.max(kwh, kwhEmin);
  const stanLalu = num(d.slalwbp);
  const stanCabut = num(d.lwbpCabut);
  const stanPasang = num(d.lwbpPasang);
  const stanIni = num(d.sahlwbp);

  const cekStan = stanIni >= stanLalu ? "BENAR" : "TERBALIK";
  const dlpd = d.dlpd ?? null;
  const dlpdLm = d.dlpdLm ?? null;

  const dayaLalu = sorek ? num(sorek.daya) : null;
  const kwhLalu = sorek ? num(sorek.pemKwh) : null;
  const jnLalu = sorek && dayaLalu && dayaLalu > 0 ? (num(kwhLalu) / dayaLalu) * 1000 : null;
  const jnReal = daya > 0 ? (kwh / daya) * 1000 : null;
  const gap = sorek ? kwhIni - num(kwhLalu) : null;
  const prosentase = sorek && num(kwhLalu) !== 0 ? (num(gap) / num(kwhLalu)) * 1 : null;

  // CEK PECAHAN (rumus Excel): J REKENING PECAHAN → bandingkan STAN PASANG vs STAN LALU
  let cekPecahan: string | null = null;
  if (dlpd && dlpd.replace(/\s+/g, "").toUpperCase().includes("JREKENINGPECAHAN")) {
    cekPecahan = stanPasang === stanLalu ? "PD" : "GAMET";
  }
  const gapEmin = kwhIni - kwhEmin;
  const pdBongkarPasang = stanPasang - stanLalu;
  const cekStanPasang = stanPasang > 0 ? "SALAH" : "BENAR";
  const cekPecahanVsIni = stanIni < stanPasang ? "SALAH" : "BENAR";

  // Kategori status (urutan prioritas)
  let status = "NORMAL";
  if (cekStan !== "BENAR") status = "STAN TERBALIK";
  else if (!sorek) status = "SOREK TIDAK ADA";
  else if (cekPecahan === "PD") status = "REK PECAHAN PD";
  else if (cekPecahan === "GAMET") status = "REK PECAHAN GAMET";
  else if (prosentase !== null && prosentase <= -0.5) status = "TURUN >50%";
  else if (prosentase !== null && prosentase >= 1.0) status = "NAIK >100%";
  else if (kwh === 0) status = "KWH NOL";
  else if (jnReal !== null && jnReal < 40) status = "KWH < 40 JAM";
  else if (kwh < kwhEmin) status = "EMIN DIPAKAI";

  return {
    idpel: d.idpel,
    nama: d.nama,
    unitup: d.unitup,
    tarif: d.tarif,
    daya,
    kwh,
    kwhEmin,
    kwhIni,
    kwhLalu,
    dayaLalu,
    jnLalu,
    jnReal,
    gap,
    prosentase,
    cekStan,
    dlpd,
    dlpdLm,
    status,
    source: d.source,
    stanLalu,
    stanCabut,
    stanPasang,
    stanIni,
    cekPecahan,
    gapEmin,
    pdBongkarPasang,
    cekStanPasang,
    cekPecahanVsIni,
    foundSorek: !!sorek,
  };
}

// ============================= EVALUASI AMR =============================
export function evaluateAmrRow(
  d: DpmRowDB,
  sorek: SorekRowDB | undefined,
  dpmLalu: DpmRowDB | undefined,
  tarifMap: Record<string, { lwbp: number; wbp: number; kvarh: number; ppj: number }>,
  fxMap: Record<number, number>
): EvalRowDraft {
  const daya = num(d.daya);
  const lwbpPakai = num(d.lwbpPakai);
  const wbpPakai = num(d.wbpPakai);
  const kvarhPakai = num(d.kvarhPakai);
  const totalKwh = lwbpPakai + wbpPakai; // TOTAL KWH
  const kwhEmin = (daya * 40) / 1000;
  const kwhIni = Math.max(totalKwh, kwhEmin); // KWH REK (kolom AX)
  const batasKvarh = totalKwh * 0.62; // BATAS KVARH = TOTAL KWH × 0.62
  const kelbKvarh = Math.max(0, kvarhPakai - batasKvarh);
  const rasioKvarh = totalKwh > 0 ? kvarhPakai / totalKwh : null;

  const t = tarifMap[(d.tarif ?? "").toUpperCase()] ?? { lwbp: 0, wbp: 0, kvarh: 0, ppj: 0 };
  const rpEmin = t.lwbp * kwhEmin;
  const rpLwbp = t.lwbp * lwbpPakai;
  const rpWbp = t.wbp * wbpPakai;
  const rpTotalKwh = Math.max(rpEmin, rpLwbp + rpWbp);
  const rpKvarh = t.kvarh * kelbKvarh;
  const rpTotalPak = rpLwbp + rpWbp + rpKvarh;
  const rpRekening = Math.max(rpTotalKwh, rpTotalPak);

  const buatBa =
    rasioKvarh !== null && rasioKvarh >= 2 && rpTotalPak > rpTotalKwh ? "BUAT BA" : "TIDAK";

  const cekFx = fxMap[daya] === num(d.fkmKwh) ? "BENAR" : "SALAH";
  const cekStan = num(d.sahlwbp) >= num(d.slalwbp) ? "BENAR" : "TERBALIK";
  const cekStanWbp = num(d.sahwbp) >= num(d.slawbp) ? "BENAR" : "TERBALIK";
  const cekStanKvarh = num(d.sahkvarh) >= num(d.slakvarh) ? "BENAR" : "TERBALIK";
  const cekLwbpVsWbp = num(d.sahlwbp) >= num(d.sahwbp) ? "BENAR" : "TERBALIK";

  const kwhLaluDpm = dpmLalu ? num(dpmLalu.lwbpPakai) + num(dpmLalu.wbpPakai) : null;
  const kwhLalu = sorek ? num(sorek.pemKwh) : null; // KWH LALU SOREK
  const jnLalu = kwhLaluDpm !== null && daya > 0 ? (kwhLaluDpm / daya) * 1000 : null;
  const jnReal = daya > 0 ? (totalKwh / daya) * 1000 : null;
  const kenaikan =
    kwhLaluDpm !== null && num(kwhLaluDpm) !== 0 ? (totalKwh - num(kwhLaluDpm)) / num(kwhLaluDpm) : null;
  const gap = sorek ? totalKwh - num(kwhLalu) : null;
  const cekDpmVsSorek = kwhLaluDpm !== null && sorek ? num(kwhLalu) - num(kwhLaluDpm) : null;

  let status = "NORMAL";
  if (buatBa === "BUAT BA") status = "BUAT BA";
  else if (cekStan !== "BENAR" || cekStanWbp !== "BENAR" || cekStanKvarh !== "BENAR") status = "STAN TERBALIK";
  else if (cekFx === "SALAH") status = "FX SALAH";
  else if (kelbKvarh > 0) status = "KVARH LAMPAU BATAS";
  else if (kenaikan !== null && kenaikan <= -0.5) status = "TURUN >50%";
  else if (kenaikan !== null && kenaikan >= 1.0) status = "NAIK >100%";
  else if (totalKwh < kwhEmin) status = "EMIN DIPAKAI";

  return {
    idpel: d.idpel,
    nama: d.nama,
    unitup: d.unitup,
    tarif: d.tarif,
    daya,
    kwh: totalKwh,
    kwhEmin,
    kwhIni,
    kwhLalu,
    dayaLalu: sorek ? num(sorek.daya) : null,
    jnLalu,
    jnReal,
    gap,
    prosentase: gap !== null && num(kwhLalu) !== 0 ? (num(gap) / num(kwhLalu)) * 1 : null,
    cekStan,
    dlpd: d.dlpd ?? null,
    dlpdLm: d.dlpdLm ?? null,
    status,
    source: d.source,
    foundSorek: !!sorek,
    lwbpPakai,
    wbpPakai,
    kvarhPakai,
    batasKvarh,
    kelbKvarh,
    rasioKvarh,
    rpEmin,
    rpLwbp,
    rpWbp,
    rpTotalKwh,
    rpKvarh,
    rpTotalPak,
    rpRekening,
    buatBa,
    cekFx,
    kwhLaluDpm,
    kenaikan,
    cekDpmVsSorek,
    cekStanWbp,
    cekStanKvarh,
    cekLwbpVsWbp,
  };
}

// ============================ RUNNER ============================
export async function runEvaluation(
  mode: "SINGLE" | "AMR",
  blthDpm: string,
  blthSorek: string | null
): Promise<{ runId: string; stats: RunStats }> {
  const dpmSources = mode === "SINGLE" ? ["MCR", "PEC"] : ["AMR_INI"];
  const dpmMap = await loadDpmRows(blthDpm, dpmSources);
  if (dpmMap.size === 0) throw new Error(`Tidak ada data DPM untuk BLTH ${blthDpm} (sumber: ${dpmSources.join(", ")})`);

  const sorekMap = await loadSorekMap(blthSorek);
  if (sorekMap.size === 0) throw new Error("Data SOREK belum diupload — upload SOREK terlebih dahulu");

  const tarifMap = await getTariffMap();
  const fxMap = await getFxMap();

  let dpmLaluMap: Map<string, DpmRowDB> | null = null;
  if (mode === "AMR") {
    // Cari BLTH DPM LALU otomatis: BLTH sebelumnya yang tersedia
    const laluUploads = await db.upload.findMany({
      where: { jenis: "AMR_LALU" },
      orderBy: { blth: "desc" },
    });
    const prevBlth = prevMonth(blthDpm);
    const chosen = laluUploads.find((u) => u.blth === blthDpm) ? null : laluUploads.find((u) => u.blth === prevBlth) ?? laluUploads.find((u) => u.blth < blthDpm);
    if (chosen) dpmLaluMap = await loadDpmRows(chosen.blth, ["AMR_LALU"]);
  }

  const drafts: EvalRowDraft[] = [];
  for (const [idpel, d] of dpmMap) {
    const sorek = sorekMap.get(idpel);
    if (mode === "SINGLE") {
      drafts.push(evaluateSingleRow(d, sorek));
    } else {
      const lalu = dpmLaluMap?.get(idpel) ?? undefined;
      drafts.push(evaluateAmrRow(d, sorek, lalu, tarifMap, fxMap));
    }
  }

  // statistik
  const byStatus: Record<string, number> = {};
  const byDlpd: Record<string, number> = {};
  let totalKwhSum = 0;
  let totalRp = 0;
  let missingSorek = 0;
  for (const r of drafts) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const dl = r.dlpd?.trim() || "(kosong)";
    byDlpd[dl] = (byDlpd[dl] ?? 0) + 1;
    if (!r.foundSorek) missingSorek++;
    totalKwhSum += num(r.kwhIni);
    if (mode === "AMR") totalRp += num(r.rpRekening);
  }
  const stats: RunStats = {
    total: drafts.length,
    byStatus,
    byDlpd,
    totalKwh: totalKwhSum,
    totalRpRekening: mode === "AMR" ? totalRp : undefined,
    foundSorek: drafts.length - missingSorek,
    missingSorek,
  };

  // simpan run + hasil
  const existing = await db.evalRun.findFirst({
    where: { blth: blthDpm, mode },
    orderBy: { createdAt: "desc" },
  });
  if (existing) await db.evalRun.delete({ where: { id: existing.id } });

  const run = await db.evalRun.create({
    data: { blth: blthDpm, mode, blthSorek, stats },
  });

  // insert hasil per batch (500 baris)
  const BATCH = 500;
  for (let i = 0; i < drafts.length; i += BATCH) {
    const batch = drafts.slice(i, i + BATCH).map((r) => ({
      runId: run.id,
      idpel: r.idpel,
      nama: r.nama,
      unitup: r.unitup,
      tarif: r.tarif,
      daya: r.daya,
      kwh: r.kwh,
      kwhEmin: r.kwhEmin,
      kwhIni: r.kwhIni,
      kwhLalu: r.kwhLalu,
      dayaLalu: r.dayaLalu,
      jnLalu: r.jnLalu,
      jnReal: r.jnReal,
      gap: r.gap,
      prosentase: r.prosentase,
      cekStan: r.cekStan,
      dlpd: r.dlpd,
      dlpdLm: r.dlpdLm,
      status: r.status,
      source: r.source,
      stanLalu: r.stanLalu,
      stanCabut: r.stanCabut,
      stanPasang: r.stanPasang,
      stanIni: r.stanIni,
      cekPecahan: r.cekPecahan,
      gapEmin: r.gapEmin,
      pdBongkarPasang: r.pdBongkarPasang,
      cekStanPasang: r.cekStanPasang,
      cekPecahanVsIni: r.cekPecahanVsIni,
      foundSorek: r.foundSorek,
      lwbpPakai: r.lwbpPakai,
      wbpPakai: r.wbpPakai,
      kvarhPakai: r.kvarhPakai,
      batasKvarh: r.batasKvarh,
      kelbKvarh: r.kelbKvarh,
      rasioKvarh: r.rasioKvarh,
      rpEmin: r.rpEmin,
      rpLwbp: r.rpLwbp,
      rpWbp: r.rpWbp,
      rpTotalKwh: r.rpTotalKwh,
      rpKvarh: r.rpKvarh,
      rpTotalPak: r.rpTotalPak,
      rpRekening: r.rpRekening,
      buatBa: r.buatBa,
      cekFx: r.cekFx,
      kwhLaluDpm: r.kwhLaluDpm,
      kenaikan: r.kenaikan,
      cekDpmVsSorek: r.cekDpmVsSorek,
      cekStanWbp: r.cekStanWbp,
      cekStanKvarh: r.cekStanKvarh,
      cekLwbpVsWbp: r.cekLwbpVsWbp,
    }));
    await db.evalResult.createMany({ data: batch });
  }

  return { runId: run.id, stats };
}

/** BLTH (YYYYMM) bulan sebelumnya */
export function prevMonth(blth: string): string {
  const y = parseInt(blth.slice(0, 4), 10);
  const m = parseInt(blth.slice(4, 6), 10);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}
