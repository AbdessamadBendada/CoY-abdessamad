"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { canManageTenant } from "@/lib/security/roles";

// ─── Informations entreprise ──────────────────────────────────────────────────

const CompanySchema = z.object({
  name: z.string().min(2, "Nom requis (min 2 caractères)").max(100),
  phone: z.string().max(20).optional(),
  website: z.string().max(200).optional(),
  siret: z
    .string()
    .max(14)
    .regex(/^\d*$/, "Le SIRET doit contenir uniquement des chiffres")
    .optional(),
});

export async function updateCompanyInfo(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const user = await requireAuth();
  if (!canManageTenant(user.role)) return { error: "Droits administrateur requis." };

  const raw = {
    name: (formData.get("name") as string)?.trim() ?? "",
    phone: (formData.get("phone") as string)?.trim() || undefined,
    website: (formData.get("website") as string)?.trim() || undefined,
    siret: (formData.get("siret") as string)?.trim() || undefined,
  };

  const parsed = CompanySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  await prisma.tenant.update({
    where: { id: user.tenant.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      website: parsed.data.website ?? null,
      siret: parsed.data.siret ?? null,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

// ─── Paramètres de détection WinBack ─────────────────────────────────────────

const WinbackSchema = z.object({
  churnThreshold: z.coerce.number().int().min(50).max(90),
  cooldownDays: z.coerce.number().int().min(3).max(30),
});

export async function updateWinbackSettings(
  formData: FormData
): Promise<{ success?: boolean; error?: string }> {
  const user = await requireAuth();
  if (!canManageTenant(user.role)) return { error: "Droits administrateur requis." };

  const parsed = WinbackSchema.safeParse({
    churnThreshold: formData.get("churnThreshold"),
    cooldownDays: formData.get("cooldownDays"),
  });

  if (!parsed.success) {
    return { error: "Valeur hors limites — vérifiez les champs." };
  }

  await prisma.tenant.update({
    where: { id: user.tenant.id },
    data: {
      settings: {
        churn_threshold: parsed.data.churnThreshold,
        cooldown_days: parsed.data.cooldownDays,
      } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}
