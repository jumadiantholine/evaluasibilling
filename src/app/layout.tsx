import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CEK DPM · Evaluasi Billing",
  description:
    "Aplikasi evaluasi billing pelanggan — UP3 Banyuwangi, ULP Muncar.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
        {/* Kilau lembut di bagian atas halaman */}
        <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-72 bg-gradient-to-b from-blue-100/80 via-slate-50 to-transparent" />

        {/* ================= NAVBAR ================= */}
        <header className="sticky top-0 z-40 bg-white/85 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4">
            {/* Logo */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 text-[11px] font-extrabold tracking-tight text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-900/10">
              DPM
            </div>

            {/* Nama aplikasi */}
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-bold tracking-tight text-slate-900">
                CEK DPM
                <span className="mx-1 font-normal text-slate-400">·</span>
                Evaluasi Billing
              </p>
              <p className="truncate text-[11px] font-medium text-slate-500">
                UP3 Banyuwangi
                <span className="mx-1 text-slate-300">|</span>
                ULP Muncar
              </p>
            </div>

            {/* Menu kanan */}
            <nav className="ml-auto flex items-center gap-1">
              <a
                href="/"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
              >
                Beranda
              </a>
            </nav>
          </div>

          {/* Garis aksen biru-merah */}
          <div className="h-[3px] bg-gradient-to-r from-blue-700 via-sky-500 to-red-500" />
        </header>

        {/* ================= KONTEN ================= */}
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          {/*
            KALAU layout LAMA Anda berisi Toaster atau Provider atau
            komponen pembungkus lain, pindahkan dan tempel tepat di
            baris bawah komentar ini, sebelum baris children.
          */}
          {children}
        </main>

        {/* ================= FOOTER ================= */}
        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-1.5 px-4 py-6 text-center">
            <p className="text-xs font-semibold tracking-wide text-slate-700">
              CEK DPM · Evaluasi Billing Pelanggan
            </p>
            <p className="text-[11px] text-slate-400">
              UP3 Banyuwangi — ULP Muncar (51672) · Aplikasi internal
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
