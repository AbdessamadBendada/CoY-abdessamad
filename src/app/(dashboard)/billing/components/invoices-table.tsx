import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  PAID:     { label: "Payée",       bg: "rgba(92,138,58,0.12)",   color: "#5C8A3A" },
  PENDING:  { label: "En attente",  bg: "rgba(245,158,11,0.12)",  color: "#b45309" },
  DRAFT:    { label: "Brouillon",   bg: "rgba(100,116,139,0.1)",  color: "#64748B" },
  FAILED:   { label: "Échouée",     bg: "rgba(232,93,74,0.12)",   color: "#E85D4A" },
  REFUNDED: { label: "Remboursée",  bg: "rgba(100,116,139,0.1)",  color: "#64748B" },
};

export interface InvoiceRow {
  id: string;
  number: string;
  status: string;
  amountTtc: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  pdfUrl: string | null;
  facturxXml: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface Props {
  invoices: InvoiceRow[];
}

export function InvoicesTable({ invoices }: Props) {
  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune facture pour l&apos;instant. Vos factures apparaîtront ici
            après activation de votre abonnement.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currencyFmt = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  });

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  N° facture
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Période
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Statut
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Montant TTC
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  PDF
                </th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                  Factur-X
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const statusInfo =
                  STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.PENDING;
                const periodStart = format(
                  new Date(inv.periodStart),
                  "dd MMM yyyy",
                  { locale: fr }
                );
                const periodEnd = format(
                  new Date(inv.periodEnd),
                  "dd MMM yyyy",
                  { locale: fr }
                );

                return (
                  <tr
                    key={inv.id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {inv.number}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {periodStart} → {periodEnd}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        style={{ background: statusInfo.bg, color: statusInfo.color }}
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {currencyFmt.format(inv.amountTtc)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.pdfUrl ? (
                        <Link
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-xs"
                        >
                          Télécharger
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.facturxXml ? (
                        <Link
                          href={`/api/invoices/${inv.id}/facturx`}
                          className="text-primary hover:underline text-xs"
                        >
                          XML
                        </Link>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
