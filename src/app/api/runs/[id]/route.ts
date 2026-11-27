import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/runs/[id] — hapus satu run evaluasi beserta hasilnya
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await db.evalRun.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ error: "run tidak ditemukan" }, { status: 404 });
  await db.evalRun.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
