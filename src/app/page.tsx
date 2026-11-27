"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, LayoutDashboard, UploadCloud, History, BookOpen } from "lucide-react";
import { UploadTab } from "@/components/eval/upload-tab";
import { DashboardTab } from "@/components/eval/dashboard-tab";
import { HistoryTab } from "@/components/eval/history-tab";
import { GuideTab } from "@/components/eval/guide-tab";

export default function Home() {
  const [tab, setTab] = useState("dashboard");
  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <header className="border-b bg-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3 flex-wrap">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-lg font-bold tracking-tight text-stone-900">
              CEK DPM — Aplikasi Evaluasi Billing
            </h1>
            <p className="text-xs text-stone-500">
              Upload SOREK • MCR (ULP Muncar) • PEC MCR • DPM Pelanggan Besar/AMR → evaluasi otomatis
            </p>
          </div>
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
            Siap GitHub → Vercel + Supabase
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full max-w-2xl mb-4">
            <TabsTrigger value="dashboard" className="gap-1.5">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-1.5">
              <UploadCloud className="w-4 h-4" /> Upload Data
            </TabsTrigger>
            <TabsTrigger value="riwayat" className="gap-1.5">
              <History className="w-4 h-4" /> Riwayat
            </TabsTrigger>
            <TabsTrigger value="panduan" className="gap-1.5">
              <BookOpen className="w-4 h-4" /> Panduan
            </TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <DashboardTab onGoUpload={() => setTab("upload")} />
          </TabsContent>
          <TabsContent value="upload">
            <UploadTab onDone={() => setTab("dashboard")} />
          </TabsContent>
          <TabsContent value="riwayat">
            <HistoryTab />
          </TabsContent>
          <TabsContent value="panduan">
            <GuideTab />
          </TabsContent>
        </Tabs>
      </main>

      <footer className="border-t bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-3 text-xs text-stone-500 flex flex-wrap gap-x-4 gap-y-1 justify-between">
          <span>CEK DPM Evaluasi Billing — logika mengikuti file Excel CEK DPM F2 v1.0</span>
          <span>EMIN = DAYA × 40/1000 • BATAS KVARH = 62% × TOTAL KWH • RP sesuai tabel RPKWH</span>
        </div>
      </footer>
    </div>
  );
}
