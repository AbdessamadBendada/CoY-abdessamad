import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/shared/db/prisma";
import { criticalEnvironmentIssues } from "@/shared/config/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.HEALTHCHECK_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || supplied.length !== secret.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(secret))) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const missing = criticalEnvironmentIssues();
  if (missing.length) {
    return NextResponse.json(
      { status: "not_ready", checks: { config: "failed" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready", checks: { config: "ok", database: "ok" } }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "not_ready", checks: { config: "ok", database: "failed" } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
