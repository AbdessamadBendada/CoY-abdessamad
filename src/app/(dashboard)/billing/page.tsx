export const dynamic = "force-dynamic";


import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";
import { BillingTabs } from "./components/billing-tabs";
import type { InvoiceRow } from "./components/invoices-table";
import { checkROIGuarantee } from "@/lib/billing/roi-guarantee";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; cancelled?: string }>;
}) {
  const [user, { success, cancelled }] = await Promise.all([
    requireAuth(),
    searchParams,
  ]);

  const tenant = user.tenant;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [invoices, customersCount, actionsCount, smsCount, roiGuarantee] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        id: true,
        number: true,
        status: true,
        amountTtc: true,
        currency: true,
        periodStart: true,
        periodEnd: true,
        pdfUrl: true,
        facturxXml: true,
        paidAt: true,
        createdAt: true,
      },
    }),
    prisma.customer.count({ where: { tenantId: tenant.id } }),
    prisma.winbackAction.count({
      where: { tenantId: tenant.id, createdAt: { gte: monthStart } },
    }),
    prisma.winbackAction.count({
      where: { tenantId: tenant.id, channel: "SMS", createdAt: { gte: monthStart } },
    }),
    checkROIGuarantee(tenant.id), // tenantId depuis requireAuth() — jamais depuis searchParams/body
  ]);

  const serializedInvoices: InvoiceRow[] = invoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    status: inv.status,
    amountTtc: parseFloat(inv.amountTtc.toString()),
    currency: inv.currency,
    periodStart: inv.periodStart.toISOString(),
    periodEnd: inv.periodEnd.toISOString(),
    pdfUrl: inv.pdfUrl,
    facturxXml: inv.facturxXml,
    paidAt: inv.paidAt?.toISOString() ?? null,
    createdAt: inv.createdAt.toISOString(),
  }));

  const trialDaysLeft =
    tenant.status === "TRIAL" && tenant.trialEndsAt
      ? Math.max(0, differenceInDays(new Date(tenant.trialEndsAt), new Date()))
      : null;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: "0.625rem" }}>
      {/* En-tête */}
      <div style={{ flexShrink: 0 }}>
        <h2 className="text-xl font-bold tracking-tight" style={{ color: "#2B2523" }}>
          Abonnement &amp; facturation
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
          Gérez votre plan, votre cycle de facturation et consultez vos factures.
        </p>
      </div>

      {/* Bannière succès paiement */}
      {success === "1" && (
        <div
          style={{
            background: "rgba(92,138,58,0.08)",
            border: "1px solid rgba(92,138,58,0.2)",
            borderLeft: "3px solid #5C8A3A",
            borderRadius: "0.625rem",
            padding: "0.5rem 0.875rem",
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#3A6020" }}>
            Bienvenue — votre plan est maintenant actif.
          </p>
          <p style={{ fontSize: "0.75rem", color: "#5C8A3A" }}>
            CoYia surveille déjà vos clients. Vos premières alertes arriveront sous 24h.
          </p>
        </div>
      )}

      {/* Bannière annulation paiement */}
      {cancelled === "1" && (
        <div
          style={{
            background: "rgba(232,184,75,0.08)",
            border: "1px solid rgba(232,184,75,0.25)",
            borderLeft: "3px solid #C99A30",
            borderRadius: "0.625rem",
            padding: "0.5rem 0.875rem",
            flexShrink: 0,
          }}
        >
          <p style={{ fontSize: "0.82rem", fontWeight: 600, color: "#8A6A10" }}>
            Paiement annulé
          </p>
          <p style={{ fontSize: "0.75rem", color: "#C99A30" }}>
            Vous n&apos;avez pas été débité. Vous pouvez réessayer à tout moment.
          </p>
        </div>
      )}

      {/* Tabs : Plan actuel / Changer de plan / Factures */}
      <BillingTabs
        plan={tenant.plan}
        status={tenant.status}
        billingCycle={tenant.billingCycle}
        trialDaysLeft={trialDaysLeft}
        invoices={serializedInvoices}
        usage={{ customers: customersCount, actions: actionsCount, sms: smsCount }}
        roiGuarantee={roiGuarantee}
      />
    </div>
  );
}
