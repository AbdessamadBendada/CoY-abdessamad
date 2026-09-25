import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runCleanupCooldowns } from "@/lib/jobs/cleanup-cooldowns";

// ─── Auth Vercel Cron ─────────────────────────────────────────────────────────

function authenticateCron(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/cleanup-cooldowns] CRON_SECRET non défini");
    return false;
  }
  const expected    = `Bearer ${secret}`;
  const authBuf     = Buffer.from(auth ?? "");
  const expectedBuf = Buffer.from(expected);
  return authBuf.length === expectedBuf.length && timingSafeEqual(authBuf, expectedBuf);
}

// ─── GET /api/cron/cleanup-cooldowns ─────────────────────────────────────────
//
// Thin wrapper sur lib/jobs/cleanup-cooldowns — gardé pour tests manuels.
// La logique métier est exécutée par Trigger.dev (quotidien 3h UTC).

export async function GET(request: NextRequest) {
  if (!authenticateCron(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json(await runCleanupCooldowns());
}
