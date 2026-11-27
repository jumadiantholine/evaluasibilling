import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// GET /api/results?runId=...&status=a,b&q=...&dlpd=...&page=1&pageSize=25&sort=gap
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const runId = sp.get("runId");
    if (!runId) return NextResponse.json({ error: "runId wajib" }, { status: 400 });
    const status = sp.get("status");
    const q = sp.get("q");
    const dlpd = sp.get("dlpd");
    const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
    const pageSize = Math.min(200, Math.max(5, parseInt(sp.get("pageSize") ?? "25", 10)));
    const sort = sp.get("sort") ?? "default";

    const where: Prisma.EvalResultWhereInput = { runId };
    if (status) {
      const list = status.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.length) where.status = { in: list };
    }
    if (dlpd) where.dlpd = { contains: dlpd };
    if (q) {
      where.OR = [
        { idpel: { contains: q } },
        { nama: { contains: q } },
      ];
    }

    let orderBy: Prisma.EvalResultOrderByWithRelationInput[] = [{ idpel: "asc" }];
    if (sort === "gap") orderBy = [{ gap: "asc" }];
    if (sort === "gapDesc") orderBy = [{ gap: "desc" }];
    if (sort === "kwhIni") orderBy = [{ kwhIni: "desc" }];
    if (sort === "rpRekening") orderBy = [{ rpRekening: "desc" }];

    const total = await db.evalResult.count({ where });
    const rows = await db.evalResult.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return NextResponse.json({ total, rows, page, pageSize });
  } catch (e) {
    console.error("results error", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
