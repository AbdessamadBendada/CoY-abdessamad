import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runSendScheduled } from "@/features/messaging/dispatch";

// ─── Auth Vercel Cron ─────────────────────────────────────────────────────────

function authenticateCron(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/send-scheduled] CRON_SECRET non défini");
    return false;
  }
  const expected    = `Bearer ${secret}`;
  const authBuf     = Buffer.from(auth ?? "");
  const expectedBuf = Buffer.from(expected);
  return authBuf.length === expectedBuf.length && timingSafeEqual(authBuf, expectedBuf);
}

// ─── GET /api/cron/send-scheduled ────────────────────────────────────────────
//
// Thin wrapper sur lib/jobs/send-scheduled — gardé pour tests manuels.
// La logique métier est exécutée par Trigger.dev (horaire — 0 * * * *).

export async function GET(request: NextRequest) {
  if (!authenticateCron(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json(await runSendScheduled());
}
