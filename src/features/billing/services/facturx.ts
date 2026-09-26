// ─── Générateur Factur-X MINIMUM (EN16931) ───────────────────────────────────
//
// Génère le XML Cross Industry Invoice (CII) profil MINIMUM obligatoire en France
// dès septembre 2026 (ordonnance n°2021-1190 + décret n°2022-1299).
//
// Champs BT obligatoires du profil MINIMUM :
//   BT-1  Numéro de facture
//   BT-2  Date d'émission
//   BT-3  Code type (380 = facture commerciale)
//   BT-5  Code devise (EUR)
//   BT-24 Identifiant de profil
//   BT-27 Nom du vendeur
//   BT-44 Nom de l'acheteur
//   BT-106 Montant total HT (ligne nette)
//   BT-110 Montant total TVA
//   BT-112 Montant total TTC
//   BT-115 Montant à payer

export interface FacturxInput {
  invoiceNumber: string;   // BT-1 — ex: "INV-2026-001"
  issueDate: Date;         // BT-2
  sellerName: string;      // BT-27
  buyerName: string;       // BT-44
  amountHt: number;        // BT-106 — en euros (ex: 99.17)
  amountTva: number;       // BT-110 — en euros
  amountTtc: number;       // BT-112 — en euros
  currency?: string;       // BT-5 — défaut "EUR"
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function fmtAmt(n: number): string {
  return n.toFixed(2);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function generateFacturxXml(data: FacturxInput): string {
  const currency = data.currency ?? "EUR";
  const issueDate = fmtDate(data.issueDate);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">

  <!-- ExchangedDocumentContext -->
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:factur-x.eu:1p0:minimum</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>

  <!-- ExchangedDocument -->
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXml(data.invoiceNumber)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${issueDate}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>

  <!-- SupplyChainTradeTransaction -->
  <rsm:SupplyChainTradeTransaction>

    <!-- Header Trade Agreement -->
    <ram:ApplicableHeaderTradeAgreement>
      <ram:SellerTradeParty>
        <ram:Name>${escapeXml(data.sellerName)}</ram:Name>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXml(data.buyerName)}</ram:Name>
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>

    <!-- Header Trade Delivery (obligatoire en MINIMUM même si vide) -->
    <ram:ApplicableHeaderTradeDelivery/>

    <!-- Header Trade Settlement -->
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${escapeXml(currency)}</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${fmtAmt(data.amountHt)}</ram:LineTotalAmount>
        <ram:TaxTotalAmount currencyID="${escapeXml(currency)}">${fmtAmt(data.amountTva)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${fmtAmt(data.amountTtc)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${fmtAmt(data.amountTtc)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>

  </rsm:SupplyChainTradeTransaction>

</rsm:CrossIndustryInvoice>`;
}
