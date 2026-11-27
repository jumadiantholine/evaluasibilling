import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/uploads
// body: { action: "init", jenis, blth, fileName, totalRows }
//       { action: "chunk", uploadId, sorekRows? | dpmRows? }
//       { action: "finish", uploadId }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "init") {
      const { jenis, blth, fileName, totalRows } = body;
      if (!jenis || !blth) return NextResponse.json({ error: "jenis dan blth wajib" }, { status: 400 });
      // replace: hapus upload lama dengan jenis+blth sama (cascade ke baris)
      const old = await db.upload.findMany({ where: { jenis, blth } });
      for (const o of old) await db.upload.delete({ where: { id: o.id } });
      const up = await db.upload.create({
        data: { jenis, blth, fileName: fileName ?? "-", rowCount: totalRows ?? 0 },
      });
      return NextResponse.json({ uploadId: up.id });
    }

    if (action === "chunk") {
      const { uploadId, sorekRows, dpmRows } = body;
      if (!uploadId) return NextResponse.json({ error: "uploadId wajib" }, { status: 400 });
      if (sorekRows?.length) {
        const clean = sorekRows.map((r: Record<string, unknown>) => ({
          uploadId,
          blth: String(r.blth ?? ""),
          idpel: String(r.idpel ?? ""),
          tarif: r.tarif ? String(r.tarif) : null,
          daya: Number(r.daya) || 0,
          jamNyala: Number(r.jamNyala) || 0,
          pemKwh: Number(r.pemKwh) || 0,
        }));
        await db.sorekRow.createMany({ data: clean });
      }
      if (dpmRows?.length) {
        const clean = dpmRows.map((r: Record<string, unknown>) => ({
          uploadId,
          source: String(r.source ?? "MCR"),
          blth: String(r.blth ?? ""),
          idpel: String(r.idpel ?? ""),
          nama: r.nama ? String(r.nama).trim() : null,
          unitup: r.unitup ? String(r.unitup) : null,
          tarif: r.tarif ? String(r.tarif) : null,
          daya: Number(r.daya) || 0,
          fkmKwh: Number(r.fkmKwh) || 0,
          fkmKvarh: Number(r.fkmKvarh) || 0,
          slalwbp: Number(r.slalwbp) || 0,
          lwbpCabut: Number(r.lwbpCabut) || 0,
          lwbpPasang: Number(r.lwbpPasang) || 0,
          sahlwbp: Number(r.sahlwbp) || 0,
          lwbpPakai: Number(r.lwbpPakai) || 0,
          slawbp: Number(r.slawbp) || 0,
          wbpCabut: Number(r.wbpCabut) || 0,
          wbpPasang: Number(r.wbpPasang) || 0,
          sahwbp: Number(r.sahwbp) || 0,
          wbpPakai: Number(r.wbpPakai) || 0,
          kvarhCabut: Number(r.kvarhCabut) || 0,
          kvarhPasang: Number(r.kvarhPasang) || 0,
          sahkvarh: Number(r.sahkvarh) || 0,
          kvarhPakai: Number(r.kvarhPakai) || 0,
          slakvarh: Number(r.slakvarh) || 0,
          thblmut: r.thblmut ? String(r.thblmut) : null,
          dlpd: r.dlpd ? String(r.dlpd) : null,
          dlpdLm: r.dlpdLm ? String(r.dlpdLm) : null,
        }));
        await db.dpmRow.createMany({ data: clean });
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "finish") {
      const { uploadId } = body;
      const up = await db.upload.findUnique({ where: { id: uploadId } });
      if (!up) return NextResponse.json({ error: "upload tidak ditemukan" }, { status: 404 });
      const rowCount =
        up.jenis === "SOREK"
          ? await db.sorekRow.count({ where: { uploadId } })
          : await db.dpmRow.count({ where: { uploadId } });
      const updated = await db.upload.update({ where: { id: uploadId }, data: { rowCount } });
      return NextResponse.json({ upload: updated });
    }

    return NextResponse.json({ error: "action tidak dikenal" }, { status: 400 });
  } catch (e) {
    console.error("upload error", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET /api/uploads — daftar upload terbaru
export async function GET() {
  const uploads = await db.upload.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ uploads });
}

// DELETE /api/uploads?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id wajib" }, { status: 400 });
  await db.upload.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
