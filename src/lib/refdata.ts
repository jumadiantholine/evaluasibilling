import { db } from "@/lib/db";

// Tabel referensi sesuai sheet RPKWH & MASTER FX pada file Excel CEK DPM
export const RPKWH_DEFAULT: Record<string, { lwbp: number; wbp: number; kvarh: number; ppj: number }> = {
  I2: { lwbp: 972, wbp: 1458, kvarh: 1057, ppj: 3 },
  I3: { lwbp: 1035.78, wbp: 1553.67, kvarh: 1114.74, ppj: 3 },
  LI3: { lwbp: 1090.78, wbp: 1608.67, kvarh: 1114.74, ppj: 3 },
  B2: { lwbp: 1444.7, wbp: 0, kvarh: 0, ppj: 10 },
  B3: { lwbp: 1035.78, wbp: 1553.67, kvarh: 1114.74, ppj: 10 },
  P2: { lwbp: 1415.01, wbp: 2122.52, kvarh: 1522.88, ppj: 0 },
  P3: { lwbp: 1699.53, wbp: 0, kvarh: 0, ppj: 0 },
  S1: { lwbp: 900, wbp: 0, kvarh: 0, ppj: 0 },
  S2: { lwbp: 735, wbp: 1102.5, kvarh: 925, ppj: 0 },
  S2K: { lwbp: 955.5, wbp: 1433.25, kvarh: 925, ppj: 10 },
  P1: { lwbp: 1699.53, wbp: 0, kvarh: 0, ppj: 0 },
  R3: { lwbp: 1699.53, wbp: 0, kvarh: 0, ppj: 10 },
  LB2: { lwbp: 1931, wbp: 1316.85, kvarh: 0, ppj: 10 },
  I1: { lwbp: 1112, wbp: 0, kvarh: 0, ppj: 3 },
  L: { lwbp: 1644.52, wbp: 0, kvarh: 0, ppj: 10 },
  I3P: { lwbp: 1035.78, wbp: 1553.67, kvarh: 1114.74, ppj: 3 },
  I4: { lwbp: 996.74, wbp: 996.74, kvarh: 996.74, ppj: 3 },
  C: { lwbp: 1444.68, wbp: 1444.68, kvarh: 1444.68, ppj: 10 },
};

export const MASTER_FX_DEFAULT: Array<{ daya: number; fx: number }> = [
  { daya: 6600, fx: 1 },
  { daya: 10600, fx: 1 },
  { daya: 13200, fx: 1 },
  { daya: 16500, fx: 1 },
  { daya: 23000, fx: 1 },
  { daya: 33000, fx: 1 },
  { daya: 41500, fx: 1 },
  { daya: 53000, fx: 20 },
  { daya: 66000, fx: 20 },
  { daya: 82500, fx: 30 },
  { daya: 105000, fx: 40 },
  { daya: 131000, fx: 40 },
  { daya: 147000, fx: 50 },
  { daya: 164000, fx: 50 },
  { daya: 197000, fx: 60 },
  { daya: 240000, fx: 400 },
  { daya: 345000, fx: 400 },
  { daya: 555000, fx: 800 },
  { daya: 690000, fx: 800 },
  { daya: 865000, fx: 1000 },
  { daya: 1110000, fx: 1600 },
  { daya: 1385000, fx: 1600 },
  { daya: 1450000, fx: 2000 },
  { daya: 1730000, fx: 2000 },
  { daya: 2180000, fx: 3000 },
  { daya: 2400000, fx: 4000 },
  { daya: 2770000, fx: 4000 },
  { daya: 4330000, fx: 6000 },
  { daya: 8660000, fx: 10000 },
  { daya: 13500000, fx: 16000 },
];

export interface TariffMap {
  [tarif: string]: { lwbp: number; wbp: number; kvarh: number; ppj: number };
}

export interface FxMap {
  [daya: number]: number;
}

/** Pastikan tabel referensi terisi (idempoten, dipanggil sebelum evaluasi). */
export async function ensureRefData(): Promise<void> {
  const cntTarif = await db.tariffRate.count();
  if (cntTarif === 0) {
    await db.tariffRate.createMany({
      data: Object.entries(RPKWH_DEFAULT).map(([tarif, r]) => ({
        tarif,
        lwbp: r.lwbp,
        wbp: r.wbp,
        kvarh: r.kvarh,
        ppj: r.ppj,
      })),
    });
  }
  const cntFx = await db.masterFx.count();
  if (cntFx === 0) {
    await db.masterFx.createMany({ data: MASTER_FX_DEFAULT });
  }
}

export async function getTariffMap(): Promise<TariffMap> {
  await ensureRefData();
  const rows = await db.tariffRate.findMany();
  const map: TariffMap = {};
  for (const r of rows) map[r.tarif] = { lwbp: r.lwbp, wbp: r.wbp, kvarh: r.kvarh, ppj: r.ppj };
  return map;
}

export async function getFxMap(): Promise<FxMap> {
  await ensureRefData();
  const rows = await db.masterFx.findMany();
  const map: FxMap = {};
  for (const r of rows) map[r.daya] = r.fx;
  return map;
}
