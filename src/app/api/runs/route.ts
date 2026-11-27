import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/runs — daftar semua run evaluasi terbaru
export async function GET() {
  const runs = await db.evalRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { results: true } } },
  });
  return NextResponse.json({ runs });
}
