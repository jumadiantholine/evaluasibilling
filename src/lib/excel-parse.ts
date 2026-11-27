"use client";

import * as XLSX from "xlsx";
import type { DpmInput, SorekInput, UploadJenis } from "@/lib/types";

/** Normalisasi nama kolom: buang non-alfanumerik, huruf besar */
function norm(s: unknown): string {
  return String(s ?? "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

interface SheetMatrix {
  matrix: unknown[][];
  headerRowIdx: number;
  headerMap: Record<string, number>;
}

// Alias nama kolom (file sumber kadang beda penamaan)
const HEADER_ALIASES: Record<string, string[]> = {
  BLTH: ["BLTH", "BTH"],
  TARIP: ["TARIP", "TARIF"],
  PEMKWH: ["PEMKWH", "PEMKWHREK"],
  DLPDLM: ["DLPDLM", "DLPDLM"],
};

function resolveKey(map: Record<string, number>, name: string): number | undefined {
  const aliases = HEADER_ALIASES[name] ?? [name];
  for (const a of aliases) if (a in map) return map[a];
  return undefined;
}

/** Cari baris header di 12 baris pertama berdasarkan kolom wajib */
function findHeader(matrix: unknown[][], required: string[]): SheetMatrix | null {
  for (let r = 0; r < Math.min(12, matrix.length); r++) {
    const row = matrix[r] ?? [];
    const headerMap: Record<string, number> = {};
    row.forEach((cell, c) => {
      const k = norm(cell);
      if (k && !(k in headerMap)) headerMap[k] = c;
    });
    const all = required.every((k) => resolveKey(headerMap, k) !== undefined);
    if (all) return { matrix, headerRowIdx: r, headerMap };
  }
  return null;
}

/** Ambil kolom dengan alias */
function col(H: Record<string, number>, name: string): number {
  const idx = resolveKey(H, name);
  if (idx === undefined) return -1;
  return idx;
}

function toNum(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/,/g, "."));
  return Number.isFinite(n) ? n : 0;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(v);
  return String(v).trim();
}

export interface ParsedFile {
  kind: "SOREK" | "DPM";
  jenis: UploadJenis;
  blth: string;
  rowCount: number;
  sorekRows?: SorekInput[];
  dpmRows?: DpmInput[];
  preview: Array<Record<string, unknown>>;
}

/** Parse file Excel (.xls/.xlsx) untuk jenis upload tertentu (dipanggil di browser) */
export async function parseBillingFile(
  file: File,
  jenis: UploadJenis
): Promise<ParsedFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(new Uint8Array(buf), { type: "array", cellDates: false });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });
  if (!matrix.length) throw new Error("Sheet kosong / tidak terbaca");

  if (jenis === "SOREK") {
    const found = findHeader(matrix, ["BLTH", "IDPEL", "TARIP", "DAYA", "JAMNYALA", "PEMKWH"]);
    if (!found) throw new Error("Header SOREK tidak ditemukan. Pastikan kolom: BLTH, IDPEL, TARIP, DAYA, JAMNYALA, PEMKWH");
    const rows: SorekInput[] = [];
    for (let r = found.headerRowIdx + 1; r < matrix.length; r++) {
      const row = matrix[r] ?? [];
      const idpel = toStr(row[col(found.headerMap, "IDPEL")]);
      if (!/^\d{9,13}$/.test(idpel)) continue;
      rows.push({
        blth: toStr(row[col(found.headerMap, "BLTH")]),
        idpel,
        tarif: toStr(row[col(found.headerMap, "TARIP")]) || null,
        daya: toNum(row[col(found.headerMap, "DAYA")]),
        jamNyala: toNum(row[col(found.headerMap, "JAMNYALA")]),
        pemKwh: toNum(row[col(found.headerMap, "PEMKWH")]),
      });
    }
    if (!rows.length) throw new Error("Tidak ada baris data SOREK yang valid (IDPEL 9-13 digit)");
    const blths = [...new Set(rows.map((r) => r.blth))];
    return {
      kind: "SOREK",
      jenis,
      blth: blths[0],
      rowCount: rows.length,
      sorekRows: rows,
      preview: rows.slice(0, 3) as unknown as Array<Record<string, unknown>>,
    };
  }

  // DPM: MCR / PEC / AMR_INI / AMR_LALU
  const found = findHeader(matrix, ["BLTH", "IDPEL", "SLALWBP", "SAHLWBP", "LWBPPAKAI"]);
  if (!found) throw new Error("Header DPM tidak ditemukan. Pastikan file berisi kolom: BLTH, IDPEL, TARIF, DAYA, SLALWBP, LWBPPAKAI, dst (format DPM standar 57 kolom)");
  const H = found.headerMap;
  const rows: DpmInput[] = [];
  for (let r = found.headerRowIdx + 1; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const idpel = toStr(row[H["IDPEL"]]);
    if (!/^\d{9,13}$/.test(idpel)) continue;
    const blth = toStr(row[H["BLTH"]]);
    if (!blth) continue;
    rows.push({
      blth,
      idpel,
      nama: toStr(row[H["NAMA"]]) || null,
      unitup: toStr(row[H["UNITUP"]]) || null,
      tarif: toStr(row[H["TARIF"]]) || null,
      daya: toNum(row[H["DAYA"]]),
      fkmKwh: toNum(row[H["FKMKWH"]]),
      fkmKvarh: toNum(row[H["FKMKVARH"]]),
      slalwbp: toNum(row[H["SLALWBP"]]),
      lwbpCabut: toNum(row[H["LWBPCABUT"]]),
      lwbpPasang: toNum(row[H["LWBPPASANG"]]),
      sahlwbp: toNum(row[H["SAHLWBP"]]),
      lwbpPakai: toNum(row[H["LWBPPAKAI"]]),
      slawbp: toNum(row[H["SLAWBP"]]),
      wbpCabut: toNum(row[H["WBPCABUT"]]),
      wbpPasang: toNum(row[H["WBPPASANG"]]),
      sahwbp: toNum(row[H["SAHWBP"]]),
      wbpPakai: toNum(row[H["WBPPAKAI"]]),
      kvarhCabut: toNum(row[H["KVARHCABUT"]]),
      kvarhPasang: toNum(row[H["KVARHPASANG"]]),
      sahkvarh: toNum(row[H["SAHKVARH"]]),
      kvarhPakai: toNum(row[H["KVARHPAKAI"]]),
      slakvarh: toNum(row[H["SLAKVARH"]]),
      thblmut: toStr(row[H["THBLMUT"]]) || null,
      dlpd: toStr(row[H["DLPD"]]) || null,
      dlpdLm: toStr(row[H["DLPDLM"]]) || null,
    });
  }
  if (!rows.length) throw new Error("Tidak ada baris data DPM yang valid (IDPEL 9-13 digit)");
  const blths = [...new Set(rows.map((r) => r.blth))];
  const enriched = rows.map((r) => ({ ...r, source: jenis as string }));
  return {
    kind: "DPM",
    jenis,
    blth: blths[0],
    rowCount: rows.length,
    dpmRows: enriched,
    preview: enriched.slice(0, 3) as unknown as Array<Record<string, unknown>>,
  };
}

/** Kirim hasil parse ke server secara bertahap (chunk) */
export async function uploadParsedFile(
  parsed: ParsedFile,
  fileName: string,
  onProgress?: (done: number, total: number) => void
): Promise<void> {
  const initRes = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "init",
      jenis: parsed.jenis,
      blth: parsed.blth,
      fileName,
      totalRows: parsed.rowCount,
    }),
  });
  if (!initRes.ok) {
    const e = await initRes.json().catch(() => ({}));
    throw new Error(e.error ?? "Gagal memulai upload");
  }
  const { uploadId } = await initRes.json();

  const rows = parsed.sorekRows ?? parsed.dpmRows ?? [];
  const CHUNK = parsed.kind === "SOREK" ? 2000 : 800;
  let done = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const body =
      parsed.kind === "SOREK"
        ? { action: "chunk", uploadId, sorekRows: chunk }
        : { action: "chunk", uploadId, dpmRows: chunk };
    const res = await fetch("/api/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.error ?? "Gagal mengirim data");
    }
    done += chunk.length;
    onProgress?.(done, rows.length);
  }

  const fin = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "finish", uploadId }),
  });
  if (!fin.ok) {
    const e = await fin.json().catch(() => ({}));
    throw new Error(e.error ?? "Gagal menyelesaikan upload");
  }
}
