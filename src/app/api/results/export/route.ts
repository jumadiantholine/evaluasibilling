import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";

// GET /api/results/export?runId=...&status=...&q=... — download hasil evaluasi (xlsx)
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const runId = sp.get("runId");
    if (!runId) return NextResponse.json({ error: "runId wajib" }, { status: 400 });
    const run = await db.evalRun.findUnique({ where: { id: runId } });
    if (!run) return NextResponse.json({ error: "run tidak ditemukan" }, { status: 404 });

    const status = sp.get("status");
    const q = sp.get("q");
    const where: Prisma.EvalResultWhereInput = { runId };
    if (status) {
      const list = status.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length) where.status = { in: list };
    }
    if (q) where.OR = [{ idpel: { contains: q } }, { nama: { contains: q } }];

    const rows = await db.evalResult.findMany({ where, orderBy: { idpel: "asc" } });

    const isAmr = run.mode === "AMR";
    const header = isAmr
      ? [
          "IDPEL", "NAMA", "UNITUP", "TARIF", "DAYA",
          "LWBP PAKAI (kWh)", "WBP PAKAI (kWh)", "TOTAL KWH",
          "KWH EMIN", "KWH REK (MAX EMIN)", "BATAS KVARH", "KVARH PAKAI", "KELB KVARH", "RASIO KVARH",
          "RP EMIN", "RP LWBP", "RP WBP", "RP KVARH", "RP TOTAL PAK", "RP REKENING",
          "BUAT BA", "CEK FX", "CEK STAN LWBP", "CEK STAN WBP", "CEK STAN KVARH", "LWBP VS WBP",
          "KWH LALU (DPM LALU)", "KWH LALU (SOREK)", "JN LALU", "JN REAL", "KENAIKAN", "GAP", "DLPD", "STATUS",
        ]
      : [
          "IDPEL", "NAMA", "UNITUP", "TARIF", "DAYA",
          "STAN LALU", "STAN CABUT", "STAN PASANG", "STAN INI",
          "KWH", "KWH EMIN", "KWH INI (MAX EMIN)",
          "DLPD", "DLPD LM", "CEK STAN",
          "DAYA LALU", "KWH LALU (SOREK)", "JN LALU", "JN REAL",
          "GAP", "PROSENTASE", "CEK PECAHAN", "GAP EMIN", "PD BONGKAR PASANG",
          "CEK STAN PASANG", "PECAHAN VS INI", "ADA SOREK", "SUMBER", "STATUS",
        ];

    const data = rows.map((r) => {
      const base: Record<string, string | number | null> = {
        IDPEL: r.idpel, NAMA: r.nama, UNITUP: r.unitup, TARIF: r.tarif, DAYA: r.daya,
        STATUS: r.status,
      };
      if (isAmr) {
        Object.assign(base, {
          "LWBP PAKAI (kWh)": r.lwbpPakai, "WBP PAKAI (kWh)": r.wbpPakai, "TOTAL KWH": r.kwh,
          "KWH EMIN": r.kwhEmin, "KWH REK (MAX EMIN)": r.kwhIni, "BATAS KVARH": r.batasKvarh,
          "KVARH PAKAI": r.kvarhPakai, "KELB KVARH": r.kelbKvarh, "RASIO KVARH": r.rasioKvarh,
          "RP EMIN": r.rpEmin, "RP LWBP": r.rpLwbp, "RP WBP": r.rpWbp, "RP KVARH": r.rpKvarh,
          "RP TOTAL PAK": r.rpTotalPak, "RP REKENING": r.rpRekening, "BUAT BA": r.buatBa,
          "CEK FX": r.cekFx, "CEK STAN LWBP": r.cekStan, "CEK STAN WBP": r.cekStanWbp,
          "CEK STAN KVARH": r.cekStanKvarh, "LWBP VS WBP": r.cekLwbpVsWbp,
          "KWH LALU (DPM LALU)": r.kwhLaluDpm, "KWH LALU (SOREK)": r.kwhLalu,
          "JN LALU": r.jnLalu, "JN REAL": r.jnReal, "KENAIKAN": r.kenaikan, "GAP": r.gap,
          DLPD: r.dlpd,
        });
      } else {
        Object.assign(base, {
          "STAN LALU": r.stanLalu, "STAN CABUT": r.stanCabut, "STAN PASANG": r.stanPasang, "STAN INI": r.stanIni,
          KWH: r.kwh, "KWH EMIN": r.kwhEmin, "KWH INI (MAX EMIN)": r.kwhIni,
          DLPD: r.dlpd, "DLPD LM": r.dlpdLm, "CEK STAN": r.cekStan,
          "DAYA LALU": r.dayaLalu, "KWH LALU (SOREK)": r.kwhLalu, "JN LALU": r.jnLalu, "JN REAL": r.jnReal,
          GAP: r.gap, PROSENTASE: r.prosentase, "CEK PECAHAN": r.cekPecahan, "GAP EMIN": r.gapEmin,
          "PD BONGKAR PASANG": r.pdBongkarPasang, "CEK STAN PASANG": r.cekStanPasang,
          "PECAHAN VS INI": r.cekPecahanVsIni, "ADA SOREK": r.foundSorek ? "YA" : "TIDAK",
          SUMBER: r.source,
        });
      }
      return base;
    });

    const ws = XLSX.utils.json_to_sheet(data, { header });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "EVALUASI");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    const fname = `EVALUASI_${run.mode}_${run.blth}.xlsx`;
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fname}"`,
      },
    });
  } catch (e) {
    console.error("export error", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
