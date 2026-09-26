/**
 * rbac-validator.ts
 * Contrôle d'accès multi-tenant (RBAC) pour WinBack Agent.
 *
 * Règles absolues :
 * 1. Chaque vérification contrôle tenantId avant d'agir
 * 2. Aucun accès cross-tenant possible
 * 3. Les actions CRITICAL nécessitent human-in-loop (n8n)
 * 4. Rôles : OWNER / ADMIN / MEMBER (alignés sur Prisma UserRole)
 * 5. Quotas lus depuis QuotaUsage (jamais depuis Tenant direct)
 *
 * Usage :
 *   const user = await requireAuth(); // toujours en premier
 *   const result = await validateActionPermission(user, "SEND_EMAIL_RECOVERY_2H", tenantId);
 *
 * @see TECHNICAL_SPEC_V1.1 Section 3.2 — Seuils de Risque
 */

import { prisma } from "@/shared/db/prisma";
import type { UserRole } from "@prisma/client";
import { PLAN_QUOTAS } from "@/types/database";

// ============================================================
// TYPES
// ============================================================

export type WinbackActionType =
  | "UPDATE_DATABASE"
  | "ALERT_DASHBOARD"
  | "SEND_EMAIL_RECOVERY_2H"
  | "SEND_SMS_EMAIL_ESCALADE_30MIN"
  | "CANCEL_FLOW"
  | "UPDATE_QUOTAS";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RBACUser {
  id: string;
  tenantId: string;
  role: UserRole;
}

export interface RBACResult {
  allowed: boolean;
  reason?: string;
  requiresHumanApproval?: boolean;
  escalationPath?: string;
}

// Limites d'actions mensuelles par plan — ADR-015 (21/06/2026)
// Palier unique CoY depuis Plan A (05/09/2026) — COY est le défaut Prisma, y compris en trial
const ACTION_LIMITS: Record<string, number> = {
  ESSENTIEL: 100, // @deprecated — supprimé de la grille commerciale le 09/06/2026
  STARTER: 250, // @deprecated 2026-09-05 — palier unique CoY
  CROISSANCE: 750, // @deprecated 2026-09-05 — idem
  EXPERT: 2500, // @deprecated 2026-09-05 — idem
  // Palier unique CoY — dérivé de PLAN_QUOTAS, jamais de l'entrée "trial"
  // (le SMS distingue l'essai, pas les actions — voir ADR-015/Plan A)
  COY: PLAN_QUOTAS.coy.actions_limit,
};

// ============================================================
// MATRICE DE PERMISSIONS RBAC
// ============================================================

const PERMISSION_MATRIX: Record<UserRole, WinbackActionType[]> = {
  OWNER: [
    "UPDATE_DATABASE",
    "ALERT_DASHBOARD",
    "SEND_EMAIL_RECOVERY_2H",
    "SEND_SMS_EMAIL_ESCALADE_30MIN",
    "CANCEL_FLOW",
    "UPDATE_QUOTAS",
  ],
  ADMIN: [
    "UPDATE_DATABASE",
    "ALERT_DASHBOARD",
    "SEND_EMAIL_RECOVERY_2H",
    "SEND_SMS_EMAIL_ESCALADE_30MIN",
    "CANCEL_FLOW",
    "UPDATE_QUOTAS",
  ],
  MEMBER: [
    "UPDATE_DATABASE",
    "ALERT_DASHBOARD",
    "SEND_EMAIL_RECOVERY_2H",
  ],
};

// ============================================================
// VALIDATION PRINCIPALE
// ============================================================

/**
 * Vérifie si un utilisateur peut exécuter une action.
 * Prend un RBACUser issu de requireAuth() — jamais de headers HTTP forgés.
 *
 * @param user            - Utilisateur authentifié (depuis requireAuth())
 * @param actionType      - Action à valider
 * @param resourceTenantId - tenantId de la ressource cible
 * @param riskLevel       - Niveau de risque (CRITICAL → human-in-loop)
 */
export async function validateActionPermission(
  user: RBACUser,
  actionType: WinbackActionType,
  resourceTenantId: string,
  riskLevel?: RiskLevel
): Promise<RBACResult> {
  // ── 1. Isolation multi-tenant — vérification prioritaire ─────
  if (user.tenantId !== resourceTenantId) {
    console.warn("[rbac] Cross-tenant access bloqué", {
      userId: user.id,
      userTenant: user.tenantId,
      resourceTenant: resourceTenantId,
      action: actionType,
    });
    return { allowed: false, reason: "Accès cross-tenant refusé" };
  }

  // ── 2. Vérification permission par rôle ─────────────────────
  const allowedActions = PERMISSION_MATRIX[user.role] ?? [];
  if (!allowedActions.includes(actionType)) {
    console.warn("[rbac] Action refusée par rôle", {
      userId: user.id,
      role: user.role,
      action: actionType,
    });
    return {
      allowed: false,
      reason: `Le rôle ${user.role} ne peut pas exécuter ${actionType}`,
    };
  }

  // ── 3. Actions CRITICAL → human-in-loop obligatoire ─────────
  if (
    riskLevel === "CRITICAL" &&
    (actionType === "SEND_SMS_EMAIL_ESCALADE_30MIN" || actionType === "CANCEL_FLOW")
  ) {
    console.info("[rbac] Human-in-loop requis pour action CRITICAL", {
      userId: user.id,
      action: actionType,
    });
    return {
      allowed: true,
      requiresHumanApproval: true,
      escalationPath: "n8n.escalation_queue",
      reason: "Approbation humaine requise pour les actions CRITICAL",
    };
  }

  // ── 4. Vérification quota mensuel pour actions d'envoi ──────
  if (
    actionType === "SEND_EMAIL_RECOVERY_2H" ||
    actionType === "SEND_SMS_EMAIL_ESCALADE_30MIN"
  ) {
    const quotaCheck = await validateQuota(user.tenantId);
    if (!quotaCheck.allowed) {
      return { allowed: false, reason: quotaCheck.reason };
    }
  }

  return { allowed: true, requiresHumanApproval: false };
}

// ============================================================
// VÉRIFICATION OWNERSHIP CLIENT
// ============================================================

/**
 * Vérifie qu'un customer appartient au tenant de l'utilisateur.
 * À appeler avant toute opération sur un customer.
 */
export async function validateCustomerOwnership(
  tenantId: string,
  customerId: string
): Promise<boolean> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { tenantId: true },
  });
  if (!customer || customer.tenantId !== tenantId) {
    console.warn("[rbac] Customer ownership check échoué", {
      tenantId,
      customerId,
    });
    return false;
  }
  return true;
}

// ============================================================
// QUOTA (interne)
// ============================================================

/**
 * Vérifie que le tenant n'a pas épuisé son quota mensuel.
 * Lit depuis QuotaUsage (source de vérité — jamais depuis Tenant direct).
 */
async function validateQuota(
  tenantId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: true },
  });
  if (!tenant) return { allowed: false, reason: "Tenant introuvable" };

  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const quotaUsage = await prisma.quotaUsage.findFirst({
    where: { tenantId, period },
    select: { actionsCount: true },
  });

  const currentActions = quotaUsage?.actionsCount ?? 0;
  // COY, jamais STARTER (déprécié) — repli sur le seul palier actif, pas sur un
  // palier disparu de la grille commerciale.
  const limit = ACTION_LIMITS[tenant.plan] ?? ACTION_LIMITS.COY;

  if (currentActions >= limit) {
    return {
      allowed: false,
      reason: `Quota mensuel épuisé (${currentActions}/${limit} actions).`,
    };
  }
  return { allowed: true };
}

export default validateActionPermission;
