"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { parseBillingFile, uploadParsedFile } from "@/lib/excel-parse";
import { JENIS_INFO, type UploadJenis } from "@/lib/types";
import {
  FileSpreadsheet, Upload, CheckCircle2, AlertCircle, Loader2, Play, Trash2,
} from "lucide-react";

interface UploadInfo {
  id: string;
  jenis: string;
  blth: string;
  fileName: string;
  rowCount: number;
  createdAt: string;
}

interface CardState {
  phase: "idle" | "parsing" | "uploading" | "done" | "error";
  fileName?: string;
  blth?: string;
  rowCount?: number;
  progress?: number;
  error?: string;
}

const JENIS_ORDER: UploadJenis[] = ["SOREK", "MCR", "PEC", "AMR_INI", "AMR_LALU"];

const JENIS_ICON: Record<UploadJenis, string> = {
  SOREK: "🧾",
  MCR: "⚡",
  PEC: "🔁",
  AMR_INI: "🏭",
  AMR_LALU: "📅",
};

export function UploadTab({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [states, setStates] = useState<Record<string, CardState>>({});
  const [running, setRunning] = useState(false);
  const [evalMode, setEvalMode] = useState<"SINGLE" | "AMR">("SINGLE");
  const [blthDpm, setBlthDpm] = useState<string>("");
  const [blthSorek, setBlthSorek] = useState<string>("");

  const { data: uploadsData } = useQuery<{ uploads: UploadInfo[] }>({
    queryKey: ["uploads"],
    queryFn: async () => (await fetch("/api/uploads")).json(),
  });
  const uploads = uploadsData?.uploads ?? [];

  const refreshUploads = () => qc.invalidateQueries({ queryKey: ["uploads"] });

  const handleFile = useCallback(
    async (jenis: UploadJenis, file: File) => {
      setStates((s) => ({ ...s, [jenis]: { phase: "parsing", fileName: file.name } }));
      try {
        const parsed = await parseBillingFile(file, jenis);
        setStates((s) => ({
          ...s,
          [jenis]: { phase: "uploading", fileName: file.name, blth: parsed.blth, rowCount: parsed.rowCount, progress: 0 },
        }));
        await uploadParsedFile(parsed, file.name, (done, total) => {
          setStates((s) => ({
            ...s,
            [jenis]: { ...s[jenis], progress: Math.round((done / total) * 100), phase: "uploading", fileName: file.name, blth: parsed.blth, rowCount: total },
          }));
        });
        setStates((s) => ({ ...s, [jenis]: { phase: "done", fileName: file.name, blth: parsed.blth, rowCount: parsed.rowCount } }));
        refreshUploads();
        toast({
          title: `${JENIS_INFO[jenis].label} terupload`,
          description: `${parsed.rowCount.toLocaleString("id-ID")} baris, BLTH ${parsed.blth}`,
        });
      } catch (e) {
        setStates((s) => ({
          ...s,
          [jenis]: { phase: "error", fileName: file.name, error: e instanceof Error ? e.message : String(e) },
        }));
        toast({ title: "Gagal memproses file", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      }
    },
    [toast, qc]
  );

  const deleteUpload = async (id: string) => {
    await fetch(`/api/uploads?id=${id}`, { method: "DELETE" });
    refreshUploads();
    toast({ title: "Data upload dihapus" });
  };

  const dpmUploads = uploads.filter((u) => ["MCR", "AMR_INI"].includes(u.jenis));
  const sorekUploads = uploads.filter((u) => u.jenis === "SOREK");

  useEffect(() => {
    if (!blthDpm && dpmUploads.length) setBlthDpm(dpmUploads[0].blth);
  }, [dpmUploads, blthDpm]);
  useEffect(() => {
    if (!blthSorek && sorekUploads.length) setBlthSorek(sorekUploads[0].blth);
  }, [sorekUploads, blthSorek]);

  const runEval = async () => {
    if (!blthDpm || !blthSorek) {
      toast({ title: "Lengkapi data", description: "Pilih BLTH DPM dan BLTH SOREK terlebih dahulu", variant: "destructive" });
      return;
    }
    setRunning(true);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: evalMode, blthDpm, blthSorek }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal evaluasi");
      toast({
        title: `Evaluasi ${evalMode === "SINGLE" ? "pelanggan umum" : "pelanggan besar/AMR"} selesai`,
        description: `${data.stats.total.toLocaleString("id-ID")} pelanggan dievaluasi — lihat hasilnya di Dashboard`,
      });
      qc.invalidateQueries({ queryKey: ["runs"] });
      onDone();
    } catch (e) {
      toast({ title: "Evaluasi gagal", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {JENIS_ORDER.map((jenis) => {
          const st = states[jenis] ?? { phase: "idle" };
          const existing = uploads.find((u) => u.jenis === jenis);
          return (
            <Card key={jenis} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <span className="text-base">{JENIS_ICON[jenis]}</span>
                  {JENIS_INFO[jenis].label}
                  {JENIS_INFO[jenis].required && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 border-amber-300 text-amber-800">
                      wajib utk single
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs leading-relaxed">{JENIS_INFO[jenis].desc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 flex-1 flex flex-col justify-end">
                <label
                  className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/40 transition-colors block"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFile(jenis, f);
                  }}
                >
                  <input
                    type="file"
                    accept=".xls,.xlsx,.xlsm"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(jenis, f);
                      e.target.value = "";
                    }}
                  />
                  <FileSpreadsheet className="w-5 h-5 mx-auto text-emerald-700 mb-1" />
                  <span className="text-xs text-stone-600">
                    Klik atau seret file <b>.xls / .xlsx</b> ke sini
                  </span>
                </label>

                {st.phase === "parsing" && (
                  <div className="flex items-center gap-2 text-xs text-stone-600">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Membaca file…
                  </div>
                )}
                {st.phase === "uploading" && (
                  <div className="space-y-1">
                    <Progress value={st.progress ?? 0} className="h-1.5" />
                    <p className="text-xs text-stone-500">
                      Mengirim {st.progress ?? 0}% — {st.rowCount?.toLocaleString("id-ID")} baris (BLTH {st.blth})
                    </p>
                  </div>
                )}
                {st.phase === "done" && (
                  <div className="flex items-start gap-2 text-xs bg-emerald-50 border border-emerald-200 rounded-md p-2 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      {st.fileName} — {st.rowCount?.toLocaleString("id-ID")} baris, BLTH {st.blth} tersimpan
                    </span>
                  </div>
                )}
                {st.phase === "error" && (
                  <div className="flex items-start gap-2 text-xs bg-red-50 border border-red-200 rounded-md p-2 text-red-800">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{st.error}</span>
                  </div>
                )}

                {existing && st.phase !== "done" && (
                  <div className="flex items-center justify-between text-xs bg-stone-100 border rounded-md p-2">
                    <span className="text-stone-600">
                      Tersimpan: <b>{existing.fileName}</b> · {existing.rowCount.toLocaleString("id-ID")} baris · BLTH {existing.blth}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteUpload(existing.id)} title="Hapus">
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Play className="w-4 h-4 text-emerald-700" /> Jalankan Evaluasi
          </CardTitle>
          <CardDescription className="text-xs">
            SINGLE = pelanggan umum (MCR + PEC vs SOREK) · AMR = pelanggan besar/potensial (DPM INI vs SOREK, DPM LALU bila ada)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="w-36">
            <label className="text-xs text-stone-500 block mb-1">Mode evaluasi</label>
            <Select value={evalMode} onValueChange={(v) => setEvalMode(v as "SINGLE" | "AMR")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SINGLE">SINGLE (umum)</SelectItem>
                <SelectItem value="AMR">AMR (besar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <label className="text-xs text-stone-500 block mb-1">BLTH DPM (bulan ini)</label>
            <Select value={blthDpm} onValueChange={setBlthDpm}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {[...new Set(dpmUploads.map((u) => u.blth))].map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-36">
            <label className="text-xs text-stone-500 block mb-1">BLTH SOREK (bulan lalu)</label>
            <Select value={blthSorek} onValueChange={setBlthSorek}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {[...new Set(sorekUploads.map((u) => u.blth))].map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runEval} disabled={running} className="gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {running ? "Menghitung…" : "Jalankan Evaluasi"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
