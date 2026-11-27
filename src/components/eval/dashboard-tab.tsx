"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { fmtNum, fmtPct, fmtRp, STATUS_COLORS, type EvalResultDTO } from "@/lib/types";
import {
  Search, Download, ChevronLeft, ChevronRight, Loader2, BarChart3, AlertTriangle, CheckCircle2, ArrowUpDown, Inbox,
} from "lucide-react";

interface RunInfo {
  id: string;
  blth: string;
  mode: "SINGLE" | "AMR";
  blthSorek?: string | null;
  createdAt: string;
  stats?: {
    total: number;
    byStatus?: Record<string, number>;
    byDlpd?: Record<string, number>;
    totalKwh?: number;
    totalRpRekening?: number;
    foundSorek?: number;
    missingSorek?: number;
  };
  _count?: { results: number };
}

const PAGE_SIZE = 25;

export function DashboardTab({ onGoUpload }: { onGoUpload: () => void }) {
  const { toast } = useToast();
  const [runId, setRunId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("default");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<EvalResultDTO | null>(null);

  const { data: runsData, isLoading: runsLoading } = useQuery<{ runs: RunInfo[] }>({
    queryKey: ["runs"],
    queryFn: async () => (await fetch("/api/runs")).json(),
  });
  const runs = runsData?.runs ?? [];

  const activeRun = useMemo(() => runs.find((r) => r.id === runId) ?? runs[0], [runs, runId]);
  const effRunId = activeRun?.id ?? "";
  const isAmr = activeRun?.mode === "AMR";
  const stats = activeRun?.stats;

  const queryParams = useMemo(() => {
    const sp = new URLSearchParams();
    if (effRunId) sp.set("runId", effRunId);
    if (statusFilter.length) sp.set("status", statusFilter.join(","));
    if (q.trim()) sp.set("q", q.trim());
    if (sort !== "default") sp.set("sort", sort);
    sp.set("page", String(page));
    sp.set("pageSize", String(PAGE_SIZE));
    return sp.toString();
  }, [effRunId, statusFilter, q, sort, page]);

  const { data: resultsData, isLoading: resultsLoading } = useQuery<{
    total: number;
    rows: EvalResultDTO[];
  }>({
    queryKey: ["results", queryParams],
    queryFn: async () => (await fetch(`/api/results?${queryParams}`)).json(),
    enabled: !!effRunId,
  });
  const rows = resultsData?.rows ?? [];
  const total = resultsData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const statusList = useMemo(() => {
    const entries = Object.entries(stats?.byStatus ?? {}).sort((a, b) => b[1] - a[1]);
    return entries;
  }, [stats]);

  const toggleStatus = (s: string) => {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
    setPage(1);
  };

  const exportUrl = `/api/results/export?${new URLSearchParams({
    runId: effRunId,
    ...(statusFilter.length ? { status: statusFilter.join(",") } : {}),
    ...(q.trim() ? { q: q.trim() } : {}),
  }).toString()}`;

  if (runsLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-emerald-700" /></div>;
  }

  if (!runs.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center space-y-3">
          <Inbox className="w-10 h-10 text-stone-300 mx-auto" />
          <p className="text-sm text-stone-600">Belum ada hasil evaluasi.</p>
          <p className="text-xs text-stone-400">Upload SOREK, MCR, dan PEC MCR di tab Upload Data, lalu jalankan evaluasi.</p>
          <Button onClick={onGoUpload} className="gap-2">
            <BarChart3 className="w-4 h-4" /> Mulai Upload Data
          </Button>
        </CardContent>
      </Card>
    );
  }

  const normal = stats?.byStatus?.["NORMAL"] ?? 0;
  const anomali = (stats?.total ?? 0) - normal;

  return (
    <div className="space-y-4">
      {/* Pemilih run + ringkasan */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={activeRun?.id ?? ""} onValueChange={(v) => { setRunId(v); setStatusFilter([]); setPage(1); }}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Pilih run evaluasi" />
          </SelectTrigger>
          <SelectContent>
            {runs.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                BLTH {r.blth} · {r.mode === "SINGLE" ? "Pelanggan Umum" : "Pelanggan Besar/AMR"} · {r._count?.results ?? r.stats?.total ?? 0} plg
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs text-stone-500">
          SOREK acuan: BLTH {activeRun?.blthSorek ?? "—"} · {new Date(activeRun?.createdAt ?? "").toLocaleString("id-ID")}
        </div>
        <div className="flex-1" />
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a href={exportUrl} onClick={() => toast({ title: "Menyiapkan file Excel…" })}>
            <Download className="w-4 h-4" /> Export Excel
          </a>
        </Button>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-stone-500 font-medium">Total Pelanggan</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-stone-900">{fmtNum(stats?.total, 0)}</p>
            <p className="text-xs text-stone-500">{activeRun?.mode === "AMR" ? "pelanggan besar/AMR" : "pelanggan umum Muncar"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-stone-500 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Normal</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-emerald-700">{fmtNum(normal, 0)}</p>
            <p className="text-xs text-stone-500">{stats?.total ? ((normal / stats.total) * 100).toFixed(1) : 0}% dari total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-stone-500 font-medium flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Perlu Diverifikasi</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-rose-700">{fmtNum(anomali, 0)}</p>
            <p className="text-xs text-stone-500">{stats?.missingSorek ? `${fmtNum(stats.missingSorek, 0)} tanpa SOREK` : "semua ada SOREK"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="text-xs text-stone-500 font-medium">{isAmr ? "Total RP Rekening" : "Total kWh INI"}</CardTitle></CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-2xl font-bold text-stone-900 truncate">
              {isAmr ? fmtRp(stats?.totalRpRekening) : fmtNum(stats?.totalKwh, 0) + " kWh"}
            </p>
            <p className="text-xs text-stone-500">{isAmr ? "akumulasi sebelum PPJ" : "kwh kena tagih (MAX EMIN)"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter status */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-stone-500 font-medium">Status:</span>
        {statusList.map(([s, c]) => (
          <button
            key={s}
            onClick={() => toggleStatus(s)}
            className={`text-xs px-2 py-1 rounded-full border transition-all ${STATUS_COLORS[s] ?? "bg-stone-100 text-stone-700 border-stone-200"} ${statusFilter.includes(s) ? "ring-2 ring-offset-1 ring-stone-400 font-semibold" : "opacity-80"}`}
          >
            {s} <b>({fmtNum(c, 0)})</b>
          </button>
        ))}
        {statusFilter.length > 0 && (
          <button className="text-xs underline text-stone-500" onClick={() => { setStatusFilter([]); setPage(1); }}>reset</button>
        )}
        <div className="flex-1" />
        <div className="relative w-56">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-stone-400" />
          <Input placeholder="Cari IDPEL / nama…" className="pl-8 h-9" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select value={sort} onValueChange={(v) => { setSort(v); setPage(1); }}>
          <SelectTrigger className="w-44 h-9"><ArrowUpDown className="w-3.5 h-3.5 mr-1" /> <SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Urut: IDPEL</SelectItem>
            <SelectItem value="gap">GAP terbesar turun</SelectItem>
            <SelectItem value="gapDesc">GAP terbesar naik</SelectItem>
            <SelectItem value="kwhIni">KWH INI terbesar</SelectItem>
            {isAmr && <SelectItem value="rpRekening">RP REKENING terbesar</SelectItem>}
          </SelectContent>
        </Select>
      </div>

      {/* Tabel hasil */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {isAmr ? (
                <TableRow className="bg-stone-50">
                  <TableHead>IDPEL</TableHead><TableHead>Nama</TableHead><TableHead>Tarif</TableHead>
                  <TableHead className="text-right">DAYA</TableHead><TableHead className="text-right">TOTAL KWH</TableHead>
                  <TableHead className="text-right">KVARH</TableHead><TableHead className="text-right">RASIO</TableHead>
                  <TableHead className="text-right">RP REKENING</TableHead><TableHead>BA</TableHead><TableHead>FX</TableHead><TableHead>Status</TableHead>
                </TableRow>
              ) : (
                <TableRow className="bg-stone-50">
                  <TableHead>IDPEL</TableHead><TableHead>Nama</TableHead><TableHead>Tarif</TableHead>
                  <TableHead className="text-right">DAYA</TableHead><TableHead className="text-right">KWH</TableHead>
                  <TableHead className="text-right">KWH INI</TableHead><TableHead className="text-right">KWH LALU</TableHead>
                  <TableHead className="text-right">JN LALU</TableHead><TableHead className="text-right">JN REAL</TableHead>
                  <TableHead className="text-right">GAP</TableHead><TableHead className="text-right">%</TableHead><TableHead>DLPD</TableHead><TableHead>Status</TableHead>
                </TableRow>
              )}
            </TableHeader>
            <TableBody>
              {resultsLoading ? (
                <TableRow><TableCell colSpan={13} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin inline text-emerald-700" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={13} className="text-center py-10 text-sm text-stone-400">Tidak ada baris sesuai filter</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-stone-50" onClick={() => setDetail(r)}>
                  <TableCell className="font-mono text-xs whitespace-nowrap">{r.idpel}</TableCell>
                  <TableCell className="max-w-40 truncate text-xs" title={r.nama ?? ""}>{r.nama ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.tarif ?? "—"}</Badge></TableCell>
                  <TableCell className="text-right text-xs whitespace-nowrap">{fmtNum(r.daya, 0)}</TableCell>
                  {isAmr ? (
                    <>
                      <TableCell className="text-right text-xs font-medium">{fmtNum(r.kwh, 0)}</TableCell>
                      <TableCell className="text-right text-xs">{fmtNum(r.kvarhPakai, 0)}</TableCell>
                      <TableCell className="text-right text-xs">{r.rasioKvarh != null ? r.rasioKvarh.toFixed(2) : "—"}</TableCell>
                      <TableCell className="text-right text-xs whitespace-nowrap">{fmtRp(r.rpRekening)}</TableCell>
                      <TableCell>{r.buatBa === "BUAT BA" ? <Badge className="bg-red-100 text-red-800 border-red-200 text-[10px]">BUAT BA</Badge> : <span className="text-xs text-stone-400">tidak</span>}</TableCell>
                      <TableCell className="text-xs">{r.cekFx === "BENAR" ? <span className="text-emerald-600 text-xs">✓</span> : <span className="text-red-600 text-xs font-semibold">salah</span>}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right text-xs">{fmtNum(r.kwh, 0)}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{fmtNum(r.kwhIni, 0)}</TableCell>
                      <TableCell className="text-right text-xs">{r.foundSorek ? fmtNum(r.kwhLalu, 0) : "—"}</TableCell>
                      <TableCell className="text-right text-xs">{r.jnLalu != null ? r.jnLalu.toFixed(0) : "—"}</TableCell>
                      <TableCell className="text-right text-xs">{r.jnReal != null ? r.jnReal.toFixed(0) : "—"}</TableCell>
                      <TableCell className={`text-right text-xs font-medium ${r.gap != null && r.gap < 0 ? "text-rose-600" : "text-emerald-700"}`}>{r.gap != null ? fmtNum(r.gap, 0) : "—"}</TableCell>
                      <TableCell className={`text-right text-xs ${(r.prosentase ?? 0) <= -0.5 ? "text-rose-600 font-semibold" : ""}`}>{r.prosentase != null ? fmtPct(r.prosentase) : "—"}</TableCell>
                      <TableCell className="text-[10px] text-stone-500 max-w-28 truncate" title={r.dlpd ?? ""}>{r.dlpd ?? "—"}</TableCell>
                    </>
                  )}
                  <TableCell>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border whitespace-nowrap ${STATUS_COLORS[r.status] ?? ""}`}>{r.status}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between border-t px-4 py-2">
          <span className="text-xs text-stone-500">
            Menampilkan {rows.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, total)} dari {fmtNum(total, 0)}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-stone-600">{page} / {totalPages}</span>
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Detail pelanggan */}
      <Sheet open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-base">{detail.nama ?? detail.idpel}</SheetTitle>
                <SheetDescription className="font-mono text-xs">
                  IDPEL {detail.idpel} · {detail.tarif} · {fmtNum(detail.daya, 0)} VA · UNITUP {detail.unitup ?? "—"}
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6 space-y-4 text-sm">
                <div className={`inline-block text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[detail.status] ?? ""}`}>
                  Status: {detail.status}
                </div>

                {!isAmr && (
                  <Section title="Stand Meter & Pemakaian">
                    <Row label="STAN LALU" value={fmtNum(detail.stanLalu, 3)} />
                    <Row label="STAN CABUT" value={fmtNum(detail.stanCabut, 3)} />
                    <Row label="STAN PASANG" value={fmtNum(detail.stanPasang, 3)} />
                    <Row label="STAN INI" value={fmtNum(detail.stanIni, 3)} />
                    <Row label="CEK STAN (INI ≥ LALU)" value={detail.cekStan ?? "—"} good={detail.cekStan === "BENAR"} />
                    <Row label="KWH (LWBPPAKAI)" value={fmtNum(detail.kwh, 0)} />
                    <Row label="KWH EMIN (DAYA×40/1000)" value={fmtNum(detail.kwhEmin, 0)} />
                    <Row label="KWH INI = MAX(KWH, EMIN)" value={fmtNum(detail.kwhIni, 0)} strong />
                    <Row label="GAP EMIN (KWH INI − EMIN)" value={fmtNum(detail.gapEmin, 0)} />
                  </Section>
                )}

                {isAmr && (
                  <Section title="Pemakaian & KVARH">
                    <Row label="LWBP PAKAI" value={fmtNum(detail.lwbpPakai, 0)} />
                    <Row label="WBP PAKAI" value={fmtNum(detail.wbpPakai, 0)} />
                    <Row label="TOTAL KWH" value={fmtNum(detail.kwh, 0)} strong />
                    <Row label="KWH EMIN" value={fmtNum(detail.kwhEmin, 0)} />
                    <Row label="KWH REK = MAX(TOTAL, EMIN)" value={fmtNum(detail.kwhIni, 0)} strong />
                    <Row label="BATAS KVARH (62% × TOTAL)" value={fmtNum(detail.batasKvarh, 0)} />
                    <Row label="KVARH PAKAI" value={fmtNum(detail.kvarhPakai, 0)} />
                    <Row label="KELB KVARH (kelebihan)" value={fmtNum(detail.kelbKvarh, 0)} />
                    <Row label="RASIO KVARH" value={detail.rasioKvarh != null ? detail.rasioKvarh.toFixed(3) : "—"} />
                    <Row label="BUAT BA?" value={detail.buatBa ?? "—"} bad={detail.buatBa === "BUAT BA"} />
                    <Row label="CEK FX (MASTER FX vs FKM)" value={detail.cekFx ?? "—"} good={detail.cekFx === "BENAR"} />
                  </Section>
                )}

                {isAmr && (
                  <Section title="Perhitungan Rekening (RP)">
                    <Row label="RP EMIN" value={fmtRp(detail.rpEmin)} />
                    <Row label="RP LWBP" value={fmtRp(detail.rpLwbp)} />
                    <Row label="RP WBP" value={fmtRp(detail.rpWbp)} />
                    <Row label="RP KVARH" value={fmtRp(detail.rpKvarh)} />
                    <Row label="RP TOTAL PAK" value={fmtRp(detail.rpTotalPak)} />
                    <Row label="RP REKENING (MAX)" value={fmtRp(detail.rpRekening)} strong />
                  </Section>
                )}

                <Section title="Perbandingan SOREK Bulan Lalu">
                  <Row label="ADA DI SOREK?" value={detail.foundSorek ? "YA" : "TIDAK"} good={detail.foundSorek} />
                  <Row label="DAYA LALU" value={fmtNum(detail.dayaLalu, 0)} />
                  <Row label="KWH LALU (SOREK)" value={fmtNum(detail.kwhLalu, 0)} />
                  {isAmr && <Row label="KWH LALU (DPM LALU)" value={fmtNum(detail.kwhLaluDpm, 0)} />}
                  {isAmr && <Row label="CEK DPM VS SOREK" value={fmtNum(detail.cekDpmVsSorek, 0)} />}
                  {isAmr && <Row label="KENAIKAN vs DPM LALU" value={detail.kenaikan != null ? fmtPct(detail.kenaikan) : "—"} />}
                  <Row label="JN LALU (jam)" value={detail.jnLalu != null ? detail.jnLalu.toFixed(1) : "—"} />
                  <Row label="JN REAL (jam)" value={detail.jnReal != null ? detail.jnReal.toFixed(1) : "—"} />
                  <Row label="GAP (kWh)" value={fmtNum(detail.gap, 0)} strong />
                  <Row label="PROSENTASE" value={detail.prosentase != null ? fmtPct(detail.prosentase) : "—"} strong />
                </Section>

                {!isAmr && (
                  <Section title="Cek Pecahan / Mutasi">
                    <Row label="DLPD" value={detail.dlpd ?? "—"} />
                    <Row label="DLPD LM" value={detail.dlpdLm ?? "—"} />
                    <Row label="CEK PECAHAN (PD/GAMET)" value={detail.cekPecahan ?? "—"} strong={detail.cekPecahan != null} />
                    <Row label="PD BONGKAR PASANG" value={fmtNum(detail.pdBongkarPasang, 0)} />
                    <Row label="CEK STAN PASANG" value={detail.cekStanPasang ?? "—"} good={detail.cekStanPasang === "BENAR"} />
                    <Row label="PECAHAN VS INI" value={detail.cekPecahanVsIni ?? "—"} good={detail.cekPecahanVsIni === "BENAR"} />
                  </Section>
                )}

                {isAmr && (
                  <Section title="Cek Stan AMR">
                    <Row label="CEK STAN LWBP" value={detail.cekStan ?? "—"} good={detail.cekStan === "BENAR"} />
                    <Row label="CEK STAN WBP" value={detail.cekStanWbp ?? "—"} good={detail.cekStanWbp === "BENAR"} />
                    <Row label="CEK STAN KVARH" value={detail.cekStanKvarh ?? "—"} good={detail.cekStanKvarh === "BENAR"} />
                    <Row label="LWBP VS WBP" value={detail.cekLwbpVsWbp ?? "—"} good={detail.cekLwbpVsWbp === "BENAR"} />
                  </Section>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2 border-b pb-1">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value, strong, good, bad }: { label: string; value: string; strong?: boolean; good?: boolean; bad?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-stone-500">{label}</span>
      <span className={`font-medium text-right ${strong ? "text-stone-900 font-bold" : ""} ${good ? "text-emerald-600" : ""} ${bad ? "text-red-600" : ""} ${!good && !bad && !strong ? "text-stone-800" : ""}`}>
        {value}
      </span>
    </div>
  );
}
