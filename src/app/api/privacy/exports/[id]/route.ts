import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/db/prisma";
import { requireAuthApi } from "@/features/auth/server";
import { canManageTenant } from "@/shared/security/events/roles";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthApi();
  if (!user || !canManageTenant(user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await params;
  const item = await prisma.privacyExport.findFirst({ where: { id, tenantId: user.tenant.id, expiresAt: { gt: new Date() } } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.privacyExport.update({ where: { id: item.id }, data: { downloadedAt: new Date() } });
  return new NextResponse(JSON.stringify(item.payload), { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename=privacy-export-${item.id}.json`, "Cache-Control": "no-store" } });
}
