import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/* ============================================================
   API UPLOAD CENTER - CEK DPM Evaluasi Billing
   POST : upload file MCR / PEC / SOREK (dengan ulp + blth)
   GET  : riwayat upload terbaru
   ============================================================ */

const ULP_VALID = ["51670", "51671", "51672", "51673", "51675"];

const REQUIRED: Record<string, string[]> = {
  MCR: [
    "BLTH", "IDPEL", "NOPEL", "NAMA", "UNITAP", "UNITUP",
    "KODEPOSTING", "KDKELOMPOK", "KDPROSES", "KDDK", "TARIF", "DAYA",
  ],
  PEC: [
    "BLTH", "IDPEL", "NOPEL", "NAMA", "UNITAP", "UNITUP",
    "KODEPOSTING", "KDKELOMPOK", "KDPROSES", "KDDK", "TARIF", "DAYA",
  ],
  SOREK: ["BLTH", "IDPEL", "DAYA", "JAMNYALA", "PEMKWH"], // + TARIP/TARIF
};

function norm(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

/** 202611 -> 202610 (bulan sebelumnya) */
function prevBlth(blth: string): string {
  let y = Number(blth.slice(0, 4));
  let m = Number(blth.slice(4, 6));
  m -= 1;
  if (m === 0) {
    m = 12;
    y -= 1;
  }
  return `${y}${String(m).padStart(2, "0")}`;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Environment variable Supabase belum diisi di Vercel (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)."
    );
  }
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const ulp = String(form.get("ulp") ?? "");
    const blth = String(form.get("blth") ?? "");
    const jenis = String(form.get("jenis") ?? "").toUpperCase();
    const file = form.get("file");

    /* --- validasi input dasar --- */
    if (!ULP_VALID.includes(ulp)) {
      return NextResponse.json(
        { ok: false, error: "ULP tidak valid. Pilih salah satu dari 5 ULP." },
        { status: 400 }
      );
    }
    if (!/^\d{6}$/.test(blth)) {
      return NextResponse.json(
        { ok: false, error: "BLTH tidak valid (format YYYYMM, contoh 202611)." },
        { status: 400 }
      );
    }
    if (!(jenis in REQUIRED)) {
      return NextResponse.json({ ok: false, error: "Jenis upload tidak dikenal." }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "File belum dipilih." },
        { status: 400 }
      );
    }

    /* --- baca excel --- */
    const buf = Buffer.from(await file.arrayBuffer());
    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(buf, { type: "buffer" });
    } catch {
      return NextResponse.json(
        { ok: false, error: "File tidak dapat dibaca. Pastikan file Excel (.xlsx/.xls) yang valid." },
        { status: 400 }
      );
    }
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) {
      return NextResponse.json({ ok: false, error: "File tidak berisi sheet data." }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
      defval: "",
      raw: true,
    });
    if (rows.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Sheet pertama kosong — tidak ada baris data. Unduh template standar dan isi mulai baris 2." },
        { status: 400 }
      );
    }

    /* --- cek kolom standar --- */
    const headers = Object.keys(rows[0]).map(norm);
    const required = REQUIRED[jenis];
    let missing = required.filter((r) => !headers.includes(r));
    if (jenis === "SOREK") {
      // kolom tarif boleh bernama TARIP (standar export sorek) atau TARIF
      if (!headers.includes("TARIP") && !headers.includes("TARIF")) {
        missing.push("TARIP");
      }
    }
    if (missing.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "File TIDAK SESUAI format standar " +
            jenis +
            ". Kolom wajib tidak ditemukan: " +
            missing.join(", ") +
            ". Unduh template Excel standar dari halaman (tombol 'Unduh Template'), isi sesuai kolom template, lalu upload ulang.",
        },
        { status: 400 }
      );
    }

    /* --- pemeriksaan kualitas data (peringatan, tidak menggagalkan) --- */
    const issues: string[] = [];
    const col = (name: string): string | undefined => {
      const key = Object.keys(rows[0]).find((k) => norm(k) === name);
      return key;
    };

    const blthKey = col("BLTH");
    if (blthKey) {
      const allowed = new Set<string>([blth]);
      if (jenis === "SOREK") allowed.add(prevBlth(blth));
      const nyelisih = rows.filter(
        (r) => !allowed.has(String(r[blthKey] ?? "").trim())
      ).length;
      if (nyelisih > 0) {
        issues.push(
          `${nyelisih} baris berisi BLTH berbeda dari pilihan Anda (${blth}). Pastikan ini disengaja.`
        );
      }
    }

    if (jenis === "MCR" || jenis === "PEC") {
      const unitKey = col("UNITUP");
      if (unitKey) {
        const beda = rows.filter((r) => String(r[unitKey] ?? "").trim() !== ulp).length;
        if (beda > 0) {
          issues.push(
            `${beda} baris berisi UNITUP tidak sama dengan ULP terpilih (${ulp}). File mungkin bukan milik ULP ini.`
          );
        }
      }
    }

    const idpelKey = col("IDPEL");
    if (idpelKey) {
      const kosong = rows.filter((r) => String(r[idpelKey] ?? "").trim() === "").length;
      if (kosong > 0) issues.push(`${kosong} baris tidak berisi IDPEL.`);
      const seen = new Set<string>();
      let dup = 0;
      for (const r of rows) {
        const v = String(r[idpelKey] ?? "").trim();
        if (v && seen.has(v)) dup += 1;
        else if (v) seen.add(v);
      }
      if (dup > 0) issues.push(`${dup} baris IDPEL duplikat terdeteksi.`);
    }

    /* --- simpan ke Supabase --- */
    const MAX_ROWS = 50000;
    const disimpan = rows.slice(0, MAX_ROWS);
    if (rows.length > MAX_ROWS) {
      issues.push(`File berisi ${rows.length} baris; hanya ${MAX_ROWS} baris pertama disimpan.`);
    }

    const supabase = getSupabase();
    const { error: dbError } = await supabase.from("dpm_uploads").insert({
      ulp,
      blth,
      jenis,
      filename: file.name,
      row_count: rows.length,
      data: disimpan,
    });

    if (dbError) {
      const msg = String(dbError.message ?? "");
      if (/relation|does not exist|schema/i.test(msg)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Tabel 'dpm_uploads' belum ada di Supabase. Jalankan dulu SQL pembuat tabel (lihat INSTRUKSI.txt langkah Supabase), lalu upload ulang.",
          },
          { status: 500 }
        );
      }
      if (/JWT|api key|Invalid/i.test(msg)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Koneksi Supabase ditolak (API key). Pastikan SUPABASE_SERVICE_ROLE_KEY sudah diisi di Environment Variables Vercel.",
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { ok: false, error: "Gagal menyimpan ke database: " + msg },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      rowCount: rows.length,
      issues,
      preview: rows.slice(0, 10),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Kesalahan tak terduga: " + String(e).slice(0, 200) },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("dpm_uploads")
      .select("id, ulp, blth, jenis, filename, row_count, uploaded_at")
      .order("id", { ascending: false })
      .limit(20);
    if (error) {
      return NextResponse.json({ ok: false, data: [], error: String(error.message) });
    }
    return NextResponse.json({ ok: true, data: data ?? [] });
  } catch (e) {
    return NextResponse.json({ ok: false, data: [], error: String(e).slice(0, 120) });
  }
}
