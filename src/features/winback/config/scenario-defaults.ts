import type { Prisma } from "@prisma/client";
import { SECTOR_MODE, SECTOR_SPORT, SECTOR_DECORATION, SECTOR_AUTRE } from "@/config/sectors";

// Names include score range to guarantee uniqueness with @@unique([tenantId, name])
// even under concurrent seed (skipDuplicates: true handles race conditions)

type ScenarioCreateInput = Omit<Prisma.WinbackScenarioCreateManyInput, "tenantId">;

const SECTOR_LABELS: Record<string, string> = {
  [SECTOR_MODE]: "mode",
  [SECTOR_SPORT]: "sport",
  [SECTOR_DECORATION]: "décoration",
};

export function defaultScenariosForSector(
  sector: string | null,
  tenantId: string
): Prisma.WinbackScenarioCreateManyInput[] {
  const sectorLabel =
    sector && sector !== SECTOR_AUTRE
      ? Object.hasOwn(SECTOR_LABELS, sector)
        ? SECTOR_LABELS[sector]
        : sector.toLowerCase()
      : null;
  const sectorSuffix = sectorLabel ? ` (${sectorLabel})` : "";

  const scenarios: ScenarioCreateInput[] = [
    {
      name: `Risque modéré${sectorSuffix} (65-80)`,
      isActive: true,
      priority: 0,
      scoreMin: 65,
      scoreMax: 80,
      tone: "empathique",
      vouvoiement: true,
      autoSendMode: "manual",
      compensationType: "discount_percent",
      compensationValue: 10,
      compensationMaxEur: 50,
      triggersConfig: {
        triggers: [
          { id: "loss_aversion", weight: 0.8, enabled: true },
          { id: "reciprocite", weight: 0.6, enabled: true },
          { id: "urgence", weight: 0.4, enabled: false },
          { id: "social_proof", weight: 0.3, enabled: false },
          { id: "ancrage_prix", weight: 0.3, enabled: false },
          { id: "rarete", weight: 0.2, enabled: false },
          { id: "personnalisation_ton", weight: 0.2, enabled: false },
        ],
      },
    },
    {
      name: `Risque élevé${sectorSuffix} (81-100)`,
      isActive: true,
      priority: 10,
      scoreMin: 81,
      scoreMax: 100,
      tone: "empathique_urgent",
      vouvoiement: true,
      autoSendMode: "manual",
      compensationType: "discount_percent",
      compensationValue: 15,
      compensationMaxEur: 50,
      triggersConfig: {
        triggers: [
          { id: "loss_aversion", weight: 1.0, enabled: true },
          { id: "reciprocite", weight: 0.8, enabled: true },
          { id: "urgence", weight: 0.7, enabled: true },
          { id: "social_proof", weight: 0.3, enabled: false },
          { id: "ancrage_prix", weight: 0.3, enabled: false },
          { id: "rarete", weight: 0.2, enabled: false },
          { id: "personnalisation_ton", weight: 0.2, enabled: false },
        ],
      },
    },
  ];

  return scenarios.map((s) => ({ ...s, tenantId }));
}
