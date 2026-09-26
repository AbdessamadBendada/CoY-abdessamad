import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/features/auth/server";
import { prisma } from "@/shared/db/prisma";

// ─── GET /api/invoices/[id]/facturx ──────────────────────────────────────────
// Télécharge le XML Factur-X d'une facture.
// Auth requise — vérifie que la facture appartient au tenant de l'utilisateur.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, tenantId: user.tenant.id },
    select: { id: true, number: true, facturxXml: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  }

  if (!invoice.facturxXml) {
    return NextResponse.json(
      { error: "XML Factur-X non disponible pour cette facture" },
      { status: 404 }
    );
  }

  const filename = `facture-${invoice.number.replace(/[^a-zA-Z0-9-]/g, "_")}.xml`;

  return new NextResponse(invoice.facturxXml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
