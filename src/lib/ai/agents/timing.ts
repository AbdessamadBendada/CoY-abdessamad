import { trackClaude } from "@/lib/ai/claude-client";

const MODEL = "mistral-small-latest"; // Mistral Small suffit pour une décision de timing

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PreviousAction {
  sentAt: Date;
  channel: string;
  openedAt?: Date | null;
  clickedAt?: Date | null;
}

export interface TimingInput {
  customerId: string;
  tenantId: string;
  requestedChannel: "EMAIL" | "SMS";
  previousActions: PreviousAction[];
  // Taux d'ouverture moyen par créneau horaire pour ce tenant
  // Clé : "lun-09" (jour-heure UTC), valeur : taux 0-1
  tenantOpenRateBySlot: Record<string, number>;
}

export interface TimingDecision {
  sendNow: boolean;
  scheduledFor?: Date;
  channel: "EMAIL" | "SMS";
  reason: string;
}

// ─── Noms des jours pour le contexte ─────────────────────────────────────────

const DAY_NAMES = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

function formatSlot(date: Date): string {
  const day = DAY_NAMES[date.getUTCDay()];
  const hour = String(date.getUTCHours()).padStart(2, "0");
  return `${day}-${hour}`;
}

// ─── Prochain créneau optimal ─────────────────────────────────────────────────

function getTopSlots(
  openRates: Record<string, number>,
  limit = 3
): string[] {
  return Object.entries(openRates)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([slot]) => slot);
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildTimingPrompt(input: TimingInput, now: Date): string {
  const currentSlot = formatSlot(now);
  const currentHourUTC = now.getUTCHours();
  const topSlots = getTopSlots(input.tenantOpenRateBySlot);

  const previousSummary =
    input.previousActions.length === 0
      ? "Aucune action précédente pour ce client."
      : input.previousActions
          .slice(-5)
          .map((a) => {
            const opened = a.openedAt ? "ouvert" : "non ouvert";
            const daysSince = Math.round(
              (now.getTime() - a.sentAt.getTime()) / 86400000
            );
            return `- ${a.channel} envoyé il y a ${daysSince}j (${opened})`;
          })
          .join("\n");

  const topSlotsText =
    topSlots.length > 0
      ? `Meilleurs créneaux d'ouverture pour cette boutique : ${topSlots.join(", ")} (UTC)`
      : "Pas encore de données de taux d'ouverture disponibles.";

  return `Vous êtes un agent d'optimisation du timing pour des emails/SMS de récupération client.

=== CONTEXTE ACTUEL ===
Heure actuelle (UTC) : ${now.toISOString()} (créneau : ${currentSlot})
Heure locale estimée France : ${currentHourUTC + 1}h (UTC+1 standard) ou ${currentHourUTC + 2}h (UTC+2 été)
Canal demandé : ${input.requestedChannel}

=== HISTORIQUE CLIENT ===
${previousSummary}

=== PERFORMANCE DE LA BOUTIQUE ===
${topSlotsText}

=== RÈGLES À APPLIQUER ===
1. EMAIL : envoyer entre 8h et 20h heure France. Meilleurs créneaux : mardi et jeudi matin (9h-11h).
2. SMS : envoyer entre 9h et 19h heure France UNIQUEMENT (CNIL — pas de SMS commercial avant 9h ni après 19h).
3. Éviter le lundi matin et le vendredi après-midi (taux d'ouverture généralement bas).
4. Si le client n'a jamais ouvert un message précédent, changer de canal (EMAIL ↔ SMS) si possible.
5. Si une action a été envoyée il y a moins de 48h, différer d'au moins 72h depuis la dernière action.
6. Si les données de la boutique indiquent un créneau optimal, l'utiliser en priorité.
7. Si l'heure actuelle est dans un créneau optimal → envoyer maintenant (sendNow: true).

=== FORMAT DE RÉPONSE ===
Répondez UNIQUEMENT avec un JSON valide, sans markdown :
{
  "sendNow": boolean,
  "scheduledFor": "ISO8601 string ou null",
  "channel": "EMAIL" | "SMS",
  "reason": "Explication courte (1-2 phrases)"
}

- Si "sendNow" est true, "scheduledFor" doit être null.
- "scheduledFor" doit être dans les prochaines 72h maximum.
- "channel" peut différer du canal demandé si une raison valable existe.`;
}

// ─── Parsing ──────────────────────────────────────────────────────────────────

function parseTimingResponse(
  raw: string,
  requestedChannel: "EMAIL" | "SMS"
): TimingDecision | null {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      sendNow?: boolean;
      scheduledFor?: string | null;
      channel?: string;
      reason?: string;
    };

    const channel =
      parsed.channel === "EMAIL" || parsed.channel === "SMS"
        ? parsed.channel
        : requestedChannel;

    if (parsed.sendNow) {
      return {
        sendNow: true,
        channel,
        reason: parsed.reason ?? "Créneau optimal actuel.",
      };
    }

    const scheduledFor = parsed.scheduledFor
      ? new Date(parsed.scheduledFor)
      : null;

    if (!scheduledFor || isNaN(scheduledFor.getTime())) {
      return {
        sendNow: true,
        channel,
        reason: "Date planifiée invalide — envoi immédiat.",
      };
    }

    // Clamp à [now, now+72h] — borne déjà annoncée dans le prompt système, jamais vérifiée
    // côté code : un LLM peut halluciner une date hors de cette fenêtre.
    const MAX_SCHEDULE_HOURS = 72;
    const maxDate = new Date(Date.now() + MAX_SCHEDULE_HOURS * 60 * 60 * 1000);
    if (scheduledFor > maxDate) scheduledFor.setTime(maxDate.getTime());
    if (scheduledFor < new Date()) scheduledFor.setTime(Date.now());

    return {
      sendNow: false,
      scheduledFor,
      channel,
      reason: parsed.reason ?? "Créneau différé.",
    };
  } catch {
    return null;
  }
}

// ─── Export principal ─────────────────────────────────────────────────────────

export async function decideActionTiming(
  input: TimingInput
): Promise<TimingDecision> {
  const now = new Date();
  const prompt = buildTimingPrompt(input, now);

  let raw: string;
  try {
    const response = await trackClaude(
      { model: MODEL, max_tokens: 256, messages: [{ role: "user", content: prompt }] },
      { agentName: "timing-agent", metadata: { customerId: input.customerId, tenantId: input.tenantId } }
    );

    raw =
      response.content[0]?.type === "text" ? response.content[0].text : "";
  } catch (err) {
    console.error("[timing] Erreur appel Claude:", err);
    // Fallback : envoyer maintenant
    return {
      sendNow: true,
      channel: input.requestedChannel,
      reason: "Timing ignoré — erreur appel Claude (envoi immédiat).",
    };
  }

  const decision = parseTimingResponse(raw, input.requestedChannel);

  if (!decision) {
    console.error("[timing] Réponse JSON malformée:", raw.substring(0, 200));
    return {
      sendNow: true,
      channel: input.requestedChannel,
      reason: "Timing ignoré — réponse malformée (envoi immédiat).",
    };
  }

  return decision;
}
