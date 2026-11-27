"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { fmtNum } from "@/lib/types";
import { Trash2, FileSpreadsheet, BarChart3 } from "lucide-react";

interface UploadInfo {
  id: string;
  jenis: string;
  blth: string;
  fileName: string;
  rowCount: number;
  createdAt: string;
}

interface RunInfo {
  id: string;
  blth: string;
  mode: "SINGLE" | "AMR";
  blthSorek?: string | null;
  createdAt: string;
  stats?: { total?: number; byStatus?: Record<string, number> };
  _count?: { results: number };
}

const JENIS_LABEL: Record<string, string> = {
  SOREK: "SOREK",
  MCR: "MCR (umum)",
  PEC: "PEC MCR",
  AMR_INI: "DPM AMR (ini)",
  AMR_LALU: "DPM AMR (lalu)",
};

export function HistoryTab() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: upData } = useQuery<{ uploads: UploadInfo[] }>({
    queryKey: ["uploads"],
    queryFn: async () => (await fetch("/api/uploads")).json(),
  });
  const { data: runsData } = useQuery<{ runs: RunInfo[] }>({
    queryKey: ["runs"],
    queryFn: async () => (await fetch("/api/runs")).json(),
  });

  const delUpload = async (id: string) => {
    await fetch(`/api/uploads?id=${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["uploads"] });
    toast({ title: "Upload dihapus" });
  };

  const delRun = async (id: string) => {
    await fetch(`/api/runs/${id}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["runs"] });
    qc.invalidateQueries({ queryKey: ["results"] });
    toast({ title: "Run evaluasi dihapus" });
  };

  const uploads = upData?.uploads ?? [];
  const runs = runsData?.runs ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Data Terupload</CardTitle>
          <CardDescription className="text-xs">Upload dengan jenis + BLTH yang sama akan otomatis menimpa (replace) data lama.</CardDescription>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">Belum ada file terupload.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead>Jenis</TableHead><TableHead>BLTH</TableHead><TableHead>File</TableHead>
                  <TableHead className="text-right">Baris</TableHead><TableHead>Waktu</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {uploads.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell><Badge variant="outline" className="text-[10px]">{JENIS_LABEL[u.jenis] ?? u.jenis}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{u.blth}</TableCell>
                    <TableCell className="text-xs max-w-60 truncate" title={u.fileName}>{u.fileName}</TableCell>
                    <TableCell className="text-right text-xs">{fmtNum(u.rowCount, 0)}</TableCell>
                    <TableCell className="text-xs text-stone-500">{new Date(u.createdAt).toLocaleString("id-ID")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => delUpload(u.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-700" /> Riwayat Evaluasi</CardTitle>
          <CardDescription className="text-xs">Menjalankan evaluasi untuk BLTH + mode yang sama akan menimpa hasil sebelumnya.</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-stone-400 py-4 text-center">Belum ada evaluasi yang dijalankan.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-stone-50">
                  <TableHead>BLTH</TableHead><TableHead>Mode</TableHead><TableHead>BLTH SOREK</TableHead>
                  <TableHead className="text-right">Pelanggan</TableHead><TableHead>Perlu Verifikasi</TableHead><TableHead>Waktu</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((r) => {
                  const anomali = (r.stats?.total ?? 0) - (r.stats?.byStatus?.["NORMAL"] ?? 0);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.blth}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.mode === "SINGLE" ? "Umum" : "Besar/AMR"}</Badge></TableCell>
                      <TableCell className="font-mono text-xs text-stone-500">{r.blthSorek ?? "—"}</TableCell>
                      <TableCell className="text-right text-xs">{fmtNum(r._count?.results ?? r.stats?.total ?? 0, 0)}</TableCell>
                      <TableCell className="text-xs">{anomali > 0 ? <span className="text-rose-600 font-medium">{fmtNum(anomali, 0)}</span> : "0"}</TableCell>
                      <TableCell className="text-xs text-stone-500">{new Date(r.createdAt).toLocaleString("id-ID")}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => delRun(r.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
