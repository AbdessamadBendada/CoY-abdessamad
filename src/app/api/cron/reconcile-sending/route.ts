import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runReconcileSending } from "@/features/messaging/reconcile";

// ─── Auth Vercel Cron ─────────────────────────────────────────────────────────

function authenticateCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[cron/reconcile-sending] CRON_SECRET non défini");
    return false;
  }
  const auth = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(auth);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ─── GET /api/cron/reconcile-sending ─────────────────────────────────────────
//
// Thin wrapper sur lib/jobs/reconcile-sending — gardé pour tests manuels.
// La logique métier est exécutée par Trigger.dev (*/5 * * * *).

export async function GET(request: NextRequest) {
  if (!authenticateCron(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runReconcileSending());
  } catch (err) {
    console.error("[cron/reconcile-sending] erreur interne:", err);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
