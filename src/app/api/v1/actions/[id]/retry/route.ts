import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthApi } from "@/lib/auth";
import { canManageTenant } from "@/lib/security/roles";

// ─── POST /api/v1/actions/[id]/retry ──────────────────────────────────────────

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuthApi();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!canManageTenant(user.role)) {
    return NextResponse.json({ error: "Droits administrateur requis" }, { status: 403 });
  }

  const { id } = await params;
  const tenantId = user.tenant.id;

  // Atomic updateMany — IDOR (tenantId) + state guard (FAILED) in a single operation.
  // Eliminates TOCTOU window between findFirst + update.
  const result = await prisma.winbackAction.updateMany({
    where: { id, tenantId, status: "FAILED" },
    data: {
      status: "SCHEDULED",
      scheduledAt: new Date(),
      failureReason: null,
      failedAt: null,
    },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Action introuvable ou non en statut FAILED" },
      { status: 422 }
    );
  }

  return NextResponse.json({ action: { id, status: "SCHEDULED" } });
}
