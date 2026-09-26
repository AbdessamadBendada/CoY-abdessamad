import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runTriggerWinbackActions } from "@/features/winback/trigger-actions";

// ─── Auth Vercel Cron ─────────────────────────────────────────────────────────

function authenticateCron(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/trigger-winback-actions] CRON_SECRET non défini");
    return false;
  }
  const expected    = `Bearer ${secret}`;
  const authBuf     = Buffer.from(auth ?? "");
  const expectedBuf = Buffer.from(expected);
  return authBuf.length === expectedBuf.length && timingSafeEqual(authBuf, expectedBuf);
}

// ─── GET /api/cron/trigger-winback-actions ────────────────────────────────────
//
// Thin wrapper sur lib/jobs/trigger-winback-actions — gardé pour tests manuels.
// La logique métier est exécutée par Trigger.dev (quotidien 5h UTC).

export async function GET(request: NextRequest) {
  if (!authenticateCron(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json(await runTriggerWinbackActions());
}
