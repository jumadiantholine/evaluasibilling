// Tipe data bersama aplikasi Evaluasi Billing (CEK DPM)

export type UploadJenis = "SOREK" | "MCR" | "PEC" | "AMR_INI" | "AMR_LALU";

export const UPLOAD_JENIS_LIST: UploadJenis[] = ["SOREK", "MCR", "PEC", "AMR_INI", "AMR_LALU"];

export interface SorekInput {
  blth: string;
  idpel: string;
  tarif?: string | null;
  daya: number;
  jamNyala: number;
  pemKwh: number;
}

export interface DpmInput {
  blth: string;
  idpel: string;
  nama?: string | null;
  unitup?: string | null;
  tarif?: string | null;
  daya: number;
  fkmKwh: number;
  fkmKvarh: number;
  slalwbp: number;
  lwbpCabut: number;
  lwbpPasang: number;
  sahlwbp: number;
  lwbpPakai: number;
  slawbp: number;
  wbpCabut: number;
  wbpPasang: number;
  sahwbp: number;
  wbpPakai: number;
  kvarhCabut: number;
  kvarhPasang: number;
  sahkvarh: number;
  kvarhPakai: number;
  slakvarh: number;
  thblmut?: string | null;
  dlpd?: string | null;
  dlpdLm?: string | null;
}

export interface EvalResultDTO {
  id: string;
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
  foundSorek?: boolean;
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

export interface RunStats {
  total: number;
  byStatus: Record<string, number>;
  byDlpd: Record<string, number>;
  totalKwh?: number;
  totalRpRekening?: number;
  foundSorek: number;
  missingSorek: number;
}

export interface UploadRowCountInfo {
  id: string;
  jenis: string;
  blth: string;
  fileName: string;
  rowCount: number;
  createdAt: string;
}

export const JENIS_INFO: Record<
  UploadJenis,
  { label: string; desc: string; header: string[]; required: boolean }
> = {
  SOREK: {
    label: "SOREK (Rekening Bulan Lalu)",
    desc: "Daftar rekening bulan lalu dari pembayaran: BLTH, IDPEL, TARIP, DAYA, JAMNYALA, PEMKWH.",
    header: ["BLTH", "IDPEL", "TARIP", "DAYA", "JAMNYALA", "PEMKWH"],
    required: true,
  },
  MCR: {
    label: "MCR — DPM Pelanggan Umum (ULP Muncar)",
    desc: "File mcr.xls hasil download DPM pelanggan umum/tunggal ULP Muncar (57 kolom: BLTH, IDPEL, SLALWBP, LWBPPAKAI, dst).",
    header: ["BLTH", "IDPEL", "SLALWBP", "LWBPPAKAI"],
    required: true,
  },
  PEC: {
    label: "PEC MCR — DPM Pelanggan Pecahan/Mutasi",
    desc: "File pec mcr.xls berisi pelanggan ada mutasi (DLPD: J REKENING PECAHAN / K KWH NOL).",
    header: ["BLTH", "IDPEL", "SLALWBP", "LWBPPAKAI"],
    required: false,
  },
  AMR_INI: {
    label: "DPM INI — Pelanggan Besar/Potensial (AMR)",
    desc: "DPM bulan berjalan pelanggan besar/potensial (LWBP + WBP + KVARH lengkap).",
    header: ["BLTH", "IDPEL", "SLALWBP", "LWBPPAKAI", "KVARHPAKAI"],
    required: false,
  },
  AMR_LALU: {
    label: "DPM LALU — Pelanggan Besar (bulan lalu, opsional)",
    desc: "DPM bulan lalu pelanggan besar untuk perbandingan jam nyala & kenaikan beban.",
    header: ["BLTH", "IDPEL", "SLALWBP", "LWBPPAKAI"],
    required: false,
  },
};

// ============ Status evaluasi (kategori cepat) ============
export const SINGLE_STATUSES = [
  "NORMAL",
  "STAN TERBALIK",
  "SOREK TIDAK ADA",
  "REK PECAHAN PD",
  "REK PECAHAN GAMET",
  "TURUN >50%",
  "NAIK >100%",
  "KWH NOL",
  "KWH < 40 JAM",
  "EMIN DIPAKAI",
] as const;

export const AMR_STATUSES = [
  "NORMAL",
  "BUAT BA",
  "STAN TERBALIK",
  "FX SALAH",
  "KVARH LAMPAU BATAS",
  "TURUN >50%",
  "NAIK >100%",
  "EMIN DIPAKAI",
] as const;

export const STATUS_COLORS: Record<string, string> = {
  NORMAL: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "STAN TERBALIK": "bg-red-100 text-red-800 border-red-200",
  "SOREK TIDAK ADA": "bg-amber-100 text-amber-800 border-amber-200",
  "REK PECAHAN PD": "bg-orange-100 text-orange-800 border-orange-200",
  "REK PECAHAN GAMET": "bg-orange-100 text-orange-800 border-orange-200",
  "TURUN >50%": "bg-rose-100 text-rose-800 border-rose-200",
  "NAIK >100%": "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  "KWH NOL": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "KWH < 40 JAM": "bg-lime-100 text-lime-800 border-lime-200",
  "EMIN DIPAKAI": "bg-teal-100 text-teal-800 border-teal-200",
  "BUAT BA": "bg-red-100 text-red-800 border-red-200",
  "FX SALAH": "bg-red-100 text-red-800 border-red-200",
  "KVARH LAMPAU BATAS": "bg-orange-100 text-orange-800 border-orange-200",
};

export function fmtNum(v?: number | null, digits = 2): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  if (Math.abs(v) >= 1000) return Math.round(v).toLocaleString("id-ID");
  return v.toLocaleString("id-ID", { maximumFractionDigits: digits });
}

export function fmtPct(v?: number | null): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return (v * 100).toFixed(1) + "%";
}

export function fmtRp(v?: number | null): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "-";
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}
