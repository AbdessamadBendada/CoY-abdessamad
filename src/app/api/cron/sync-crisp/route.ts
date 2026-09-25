import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runSyncCrisp } from "@/lib/jobs/sync-crisp";

function authenticateCron(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/sync-crisp] CRON_SECRET non défini");
    return false;
  }
  const expected    = `Bearer ${secret}`;
  const authBuf     = Buffer.from(auth ?? "");
  const expectedBuf = Buffer.from(expected);
  return authBuf.length === expectedBuf.length && timingSafeEqual(authBuf, expectedBuf);
}

// ─── GET /api/cron/sync-crisp ────────────────────────────────────────────────
//
// Thin wrapper sur lib/jobs/sync-crisp — gardé pour tests manuels.
// La logique métier est exécutée par Trigger.dev (toutes les 30 min).

export async function GET(request: NextRequest) {
  if (!authenticateCron(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json(await runSyncCrisp());
}
