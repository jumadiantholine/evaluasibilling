import { NextRequest, NextResponse } from "next/server";
import { runEvaluation } from "@/lib/evaluation";

// POST /api/evaluate — { mode: "SINGLE" | "AMR", blthDpm, blthSorek }
export async function POST(req: NextRequest) {
  try {
    const { mode, blthDpm, blthSorek } = await req.json();
    if (!mode || !blthDpm) return NextResponse.json({ error: "mode dan blthDpm wajib" }, { status: 400 });
    const res = await runEvaluation(mode, blthDpm, blthSorek ?? null);
    return NextResponse.json(res);
  } catch (e) {
    console.error("evaluate error", e);
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 400 });
  }
}
