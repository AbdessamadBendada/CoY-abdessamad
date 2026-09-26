"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/shared/db/prisma";
import type { Prisma } from "@prisma/client";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

export async function confirmOptOut(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "").trim();
  if (!TOKEN_PATTERN.test(token)) return;

  const customer = await prisma.customer.findUnique({
    where: { optOutToken: token },
    select: { id: true, tenantId: true, optedOutAt: true },
  });

  if (!customer) return;

  if (!customer.optedOutAt) {
    const now = new Date();
    const farFuture = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      const updated = await tx.customer.updateMany({
        where: { id: customer.id, optedOutAt: null },
        data: { optedOutAt: now, cooldownUntil: farFuture },
      });

      if (updated.count === 1) {
        await tx.auditLog.create({
          data: {
            tenantId: customer.tenantId,
            action: "CUSTOMER_OPTED_OUT",
            entityType: "Customer",
            entityId: customer.id,
            details: { source: "OPT_OUT_CONFIRMATION" } as Prisma.InputJsonValue,
          },
        });
      }
    });
  }

  redirect(`/optout/${token}?confirmed=1`);
}
