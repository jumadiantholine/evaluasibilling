"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ============================================================
   CEK DPM - Evaluasi Billing : Pusat Upload
   - Pilih ULP (5 unit) + BLTH terlebih dahulu
   - Upload MCR / PEC MCR / SOREK dengan template standar
   ============================================================ */

type Ulp = { code: string; name: string };

const ULP_OPTIONS: Ulp[] = [
  { code: "51670", name: "Banyuwangi Kota" },
  { code: "51671", name: "Rogojampi" },
  { code: "51672", name: "Muncar" },
  { code: "51673", name: "Genteng" },
  { code: "51675", name: "Jajag" },
];

type Jenis = "MCR" | "PEC" | "SOREK";

type MenuInfo = {
  jenis: Jenis;
  title: string;
  subtitle: string;
  desc: string;
  template: string;
  icon: string;
  accent: string;
  note?: string;
};

const MENUS: MenuInfo[] = [
  {
    jenis: "MCR",
    title: "Upload MCR",
    subtitle: "Meter Close Report",
    desc: "Data pembacaan meter pelanggan ULP terpilih pada BLTH berjalan.",
    template: "/templates/template-mcr.xlsx",
    icon: "M",
    accent: "bg-blue-600 hover:bg-blue-700",
  },
  {
    jenis: "PEC",
    title: "Upload PEC MCR",
    subtitle: "Pelanggan Mutasi",
    desc: "Data pelanggan yang mengalami mutasi (pasang/cabut/pindah) pada BLTH.",
    template: "/templates/template-pec-mcr.xlsx",
    icon: "P",
    accent: "bg-amber-600 hover:bg-amber-700",
  },
  {
    jenis: "SOREK",
    title: "Upload Sorek",
    subtitle: "Rekening Pelanggan",
    desc: "Data rekening terbit (jam nyala & pemakaian kWh) hasil export sorek.",
    template: "/templates/template-sorek.xlsx",
    icon: "S",
    accent: "bg-emerald-600 hover:bg-emerald-700",
    note: "SOREK umumnya memakai BLTH satu bulan SEBELUM MCR (mis. MCR 202611 → SOREK 202610).",
  },
];

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

type MonthOpt = { value: string; label: string };

function monthOptions(): MonthOpt[] {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth();
  const out: MonthOpt[] = [];
  for (let i = 0; i < 24; i++) {
    out.push({
      value: `${y}${String(m + 1).padStart(2, "0")}`,
      label: `${BULAN[m]} ${y}`,
    });
    m -= 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
  }
  return out;
}

type UploadResult = {
  ok: boolean;
  rowCount?: number;
  issues?: string[];
  preview?: Record<string, unknown>[];
  error?: string;
};

type HistoryRow = {
  id: number;
  ulp: string;
  blth: string;
  jenis: string;
  filename: string | null;
  row_count: number | null;
  uploaded_at: string;
};

type MenuState = {
  file: File | null;
  status: "idle" | "uploading" | "done" | "error";
  result: UploadResult | null;
};

const EMPTY_STATE: MenuState = { file: null, status: "idle", result: null };

export default function HomePage() {
  const months = useMemo(monthOptions, []);
  const [ulp, setUlp] = useState<string>("");
  const [blth, setBlth] = useState<string>(months[0]?.value ?? "");
  const [menus, setMenus] = useState<Record<Jenis, MenuState>>({
    MCR: { ...EMPTY_STATE },
    PEC: { ...EMPTY_STATE },
    SOREK: { ...EMPTY_STATE },
  });
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const refreshHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/upload-center", { cache: "no-store" });
      const json = (await res.json()) as { data?: HistoryRow[] };
      setHistory(json.data ?? []);
    } catch {
      /* diamkan */
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const siap = ulp !== "" && blth !== "";

  function setMenuState(jenis: Jenis, patch: Partial<MenuState>) {
    setMenus((prev) => ({ ...prev, [jenis]: { ...prev[jenis], ...patch } }));
  }

  function pickFile(jenis: Jenis, f: File | null) {
    setMenuState(jenis, { file: f, status: "idle", result: null });
  }

  async function doUpload(jenis: Jenis) {
    const st = menus[jenis];
    if (!siap || !st.file || st.status === "uploading") return;
    setMenuState(jenis, { status: "uploading", result: null });
    try {
      const fd = new FormData();
      fd.append("ulp", ulp);
      fd.append("blth", blth);
      fd.append("jenis", jenis);
      fd.append("file", st.file);
      const res = await fetch("/api/upload-center", { method: "POST", body: fd });
      const json = (await res.json()) as UploadResult;
      setMenuState(jenis, { status: res.ok && json.ok ? "done" : "error", result: json });
      if (res.ok && json.ok) refreshHistory();
    } catch {
      setMenuState(jenis, {
        status: "error",
        result: { ok: false, error: "Gagal menghubungi server. Coba lagi." },
      });
    }
  }

  const ulpName = ULP_OPTIONS.find((u) => u.code === ulp)?.name;

  return (
    <div className="pb-16">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-800 via-blue-700 to-sky-600 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur">
            UP3 Banyuwangi · Aplikasi Internal
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            CEK DPM — Evaluasi Billing
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-blue-100 sm:text-base">
            Pilih ULP dan periode BLTH, lalu unggah file MCR, PEC MCR, dan Sorek
            sesuai template standar. Sistem memeriksa format dan menyimpan data
            secara otomatis.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {ULP_OPTIONS.map((u) => (
              <span
                key={u.code}
                className={
                  "rounded-full px-3 py-1 text-xs font-semibold transition " +
                  (ulp === u.code
                    ? "bg-white text-blue-800 shadow"
                    : "bg-white/10 text-blue-50 hover:bg-white/20")
                }
              >
                {u.name} · {u.code}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= PILIHAN KONTEKS ================= */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              1 · Pilih ULP (Unit Layanan Pelanggan)
            </label>
            <select
              value={ulp}
              onChange={(e) => setUlp(e.target.value)}
              className="w-full appearance-none rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              <option value="">— Pilih ULP —</option>
              {ULP_OPTIONS.map((u) => (
                <option key={u.code} value={u.code}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              2 · Pilih BLTH (Bulan-Tahun)
            </label>
            <select
              value={blth}
              onChange={(e) => setBlth(e.target.value)}
              className="w-full appearance-none rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 ring-1 ring-blue-100 sm:w-56">
            {siap ? (
              <>
                {ulpName}
                <span className="mx-1 text-blue-300">·</span>
                BLTH {blth}
              </>
            ) : (
              <span className="text-slate-500">Lengkapi pilihan di samping →</span>
            )}
          </div>
        </div>
      </section>

      {/* ================= KARTU UPLOAD ================= */}
      <section className="mt-8">
        <h2 className="mb-4 flex flex-wrap items-center gap-2 text-lg font-bold text-slate-800">
          3 · Pilih file untuk diunggah
          {!siap && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
              pilih ULP & BLTH dulu
            </span>
          )}
        </h2>
        <div className="grid gap-5 lg:grid-cols-3">
          {MENUS.map((m) => {
            const st = menus[m.jenis];
            return (
              <article
                key={m.jenis}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white " +
                      m.accent
                    }
                  >
                    {m.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-slate-900">{m.title}</h3>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {m.subtitle}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">{m.desc}</p>
                {m.note && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500 ring-1 ring-slate-100">
                    {m.note}
                  </p>
                )}

                <a
                  href={m.template}
                  download
                  className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Unduh Template Excel Standar
                </a>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    pickFile(m.jenis, e.dataTransfer.files?.[0] ?? null);
                  }}
                  onClick={() => inputs.current[m.jenis]?.click()}
                  className={
                    "mt-4 cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center transition " +
                    (st.file
                      ? "border-emerald-300 bg-emerald-50/60"
                      : "border-slate-300 bg-slate-50/60 hover:border-blue-400 hover:bg-blue-50/40")
                  }
                >
                  <input
                    ref={(el) => {
                      inputs.current[m.jenis] = el;
                    }}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => pickFile(m.jenis, e.target.files?.[0] ?? null)}
                  />
                  {st.file ? (
                    <div>
                      <p className="text-sm font-bold text-emerald-700">✓ {st.file.name}</p>
                      <p className="text-[11px] text-slate-500">
                        {(st.file.size / 1024 / 1024).toFixed(2)} MB — klik untuk ganti file
                      </p>
                    </div>
                  ) : (
                    <div className="text-slate-400">
                      <svg className="mx-auto mb-2 h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <p className="text-xs font-semibold">Tarik file ke sini atau klik</p>
                      <p className="text-[10px]">format .xlsx / .xls sesuai template</p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => doUpload(m.jenis)}
                  disabled={!siap || !st.file || st.status === "uploading"}
                  className={
                    "mt-4 w-full rounded-xl py-3 text-sm font-bold text-white shadow transition " +
                    m.accent +
                    " disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                  }
                >
                  {st.status === "uploading" ? "Mengunggah & memeriksa..." : "Unggah & Periksa"}
                </button>

                {st.status === "done" && st.result?.ok && (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-200">
                    <p className="text-sm font-bold text-emerald-800">
                      ✓ Berhasil — {st.result.rowCount} baris tersimpan
                    </p>
                    {(st.result.issues ?? []).length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {(st.result.issues ?? []).map((s, i) => (
                          <li key={i} className="text-[11px] leading-snug text-amber-700">
                            ⚠ {s}
                          </li>
                        ))}
                      </ul>
                    )}
                    {(st.result.preview ?? []).length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-[11px] font-bold text-emerald-800">
                          Lihat pratinjau data
                        </summary>
                        <div className="mt-2 max-h-44 overflow-auto rounded-lg bg-white ring-1 ring-slate-200">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="bg-slate-100 text-left">
                                {(st.result.preview ?? [])
                                  .slice(0, 1)
                                  .map((row) =>
                                    Object.keys(row)
                                      .slice(0, 8)
                                      .map((k) => (
                                        <th key={k} className="whitespace-nowrap px-2 py-1 font-bold text-slate-600">
                                          {k}
                                        </th>
                                      ))
                                  )}
                              </tr>
                            </thead>
                            <tbody>
                              {(st.result.preview ?? []).slice(0, 6).map((row, ri) => (
                                <tr key={ri} className="border-t border-slate-100">
                                  {Object.values(row)
                                    .slice(0, 8)
                                    .map((v, ci) => (
                                      <td key={ci} className="whitespace-nowrap px-2 py-1 text-slate-600">
                                        {String(v).slice(0, 18)}
                                      </td>
                                    ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )}
                  </div>
                )}

                {st.status === "error" && st.result && (
                  <div className="mt-4 rounded-xl bg-red-50 p-3 ring-1 ring-red-200">
                    <p className="text-xs font-bold text-red-700">✕ Gagal:</p>
                    <p className="text-[11px] leading-relaxed text-red-700">{st.result.error}</p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {/* ================= RIWAYAT ================= */}
      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Riwayat Upload Terbaru</h2>
          <button
            onClick={refreshHistory}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            {loadingHistory ? "Memuat..." : "Muat ulang"}
          </button>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Jenis</th>
                <th className="px-4 py-3">ULP</th>
                <th className="px-4 py-3">BLTH</th>
                <th className="px-4 py-3">Nama File</th>
                <th className="px-4 py-3 text-right">Jumlah Baris</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Belum ada data upload. Mulai dari pilih ULP dan BLTH di atas.
                  </td>
                </tr>
              )}
              {history.map((h) => (
                <tr key={h.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {new Date(h.uploaded_at).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[10px] font-bold " +
                        (h.jenis === "MCR"
                          ? "bg-blue-100 text-blue-700"
                          : h.jenis === "PEC"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700")
                      }
                    >
                      {h.jenis}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold text-slate-700">{h.ulp}</td>
                  <td className="px-4 py-2.5 text-slate-600">{h.blth}</td>
                  <td className="max-w-[260px] truncate px-4 py-2.5 text-slate-500">
                    {h.filename ?? "-"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-700">
                    {h.row_count ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
