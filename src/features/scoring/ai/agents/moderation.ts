import { trackClaude } from "@/features/scoring/ai/claude-client";

const MODEL = "mistral-large-latest";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ModerationInput {
  channel: "EMAIL" | "SMS";
  subject: string | null;
  content: string;
  tenantName: string;
}

export interface ModerationResult {
  finalSubject: string | null;
  finalContent: string;
  wasModified: boolean;
  corrections: string[];
  complianceLog: string;
  degraded: boolean; // true = moteur Mistral indisponible (catch ou parse-fail)
}

// ─── Règles RGPD 2026 embarquées ─────────────────────────────────────────────

const RGPD_RULES_EMAIL = `
RÈGLES OBLIGATOIRES — Email commercial France (RGPD 2026 / AI Act / CNIL / FEVAD)

1. LIEN DE DÉSABONNEMENT (L.34-5 CPCE) :
   Le contenu doit contenir "{{OPT_OUT_URL}}" OU une phrase de désabonnement.
   Si absent → ajouter "Pour ne plus recevoir nos messages : {{OPT_OUT_URL}}" en pied de message.

2. MENTION IA OBLIGATOIRE (AI Act 2026 Art. 52 — transparence) :
   Le contenu doit contenir une mention indiquant que le message a été généré avec l'IA.
   Formulation acceptée : "Message personnalisé avec l'assistance de notre IA"
   Si absente → l'ajouter en pied de message (après le texte principal).

3. VOUVOIEMENT OBLIGATOIRE (standard commercial français) :
   Aucun "tu", "te", "ton", "ta", "tes" ne doit s'adresser au client.
   Si tutoiement détecté → convertir en vouvoiement équivalent.

4. IDENTIFICATION DE L'EXPÉDITEUR (RGPD Art. 13) :
   Le nom de la boutique doit figurer dans le corps ou l'objet.
   Si absent → l'ajouter naturellement dans le texte.

5. INTERDICTION DE PROMESSES TROMPEUSES (Code de la consommation Art. L.121-1 / FEVAD) :
   Aucune affirmation garantissant un résultat ("garantit", "assure", "promis", "100%").
   Si détecté → atténuer avec "nous espérons", "notre objectif est de".

6. INTERDICTION D'INVENTER DES DÉTAILS SUR LA COMMANDE :
   Ne pas mentionner de numéro de commande, de produit ou de problème spécifique
   qui ne figurait pas dans le message original.
   Si détecté → supprimer ou remplacer par une formulation générale.
`.trim();

const RGPD_RULES_SMS = `
RÈGLES OBLIGATOIRES — SMS commercial France (ARCEP / CNIL délibération 2013-378 / AI Act 2026 Art. 52)

1. MENTION STOP OBLIGATOIRE (CNIL) :
   Le SMS doit se terminer par "STOP [NOM_BOUTIQUE]" ou "STOP pour ne plus recevoir".
   Si absente → ajouter "STOP ${String("NOM_BOUTIQUE")}" en fin de SMS.

2. IDENTIFICATION EXPÉDITEUR :
   Le nom de la boutique doit apparaître en début de SMS ou dans le corps.
   Si absent → l'ajouter au début ("Bonjour, [NomBoutique] vous contacte...").

3. MENTION IA OBLIGATOIRE (AI Act 2026 Art. 52) :
   Le SMS doit contenir une mention IA courte.
   Formulation acceptée : "IA assistée" (en fin de SMS, avant STOP).
   Si absente → l'ajouter avant le STOP.

4. LONGUEUR :
   Un SMS standard = 160 caractères. Au-delà, il est facturé comme SMS long (multi-parts).
   Ne pas réduire artificiellement si le message dépasse 160 chars, mais le signaler dans corrections[].

5. VOUVOIEMENT OBLIGATOIRE :
   Aucun "tu", "te", "ton", "ta", "tes" adressé au client.
   Si tutoiement → convertir.

6. INTERDICTION DE PROMESSES TROMPEUSES :
   Mêmes règles que pour l'email. Atténuer si nécessaire.
`.trim();

// ─── Prompt ───────────────────────────────────────────────────────────────────

function buildModerationPrompt(input: ModerationInput): string {
  const rules = input.channel === "EMAIL" ? RGPD_RULES_EMAIL : RGPD_RULES_SMS;
  const stopPlaceholder = `STOP ${input.tenantName}`;

  const subjectSection =
    input.channel === "EMAIL" && input.subject
      ? `OBJET DE L'EMAIL : ${input.subject}\n\n`
      : "";

  return `Vous êtes un agent de conformité RGPD spécialisé en droit commercial français.
Votre rôle : vérifier et corriger un message de récupération client avant son envoi.

${rules.replace("STOP ${String(\"NOM_BOUTIQUE\")}", stopPlaceholder)}

=== MESSAGE À ANALYSER ===
Boutique : ${input.tenantName}
Canal : ${input.channel}
${subjectSection}CONTENU :
${input.content}

=== INSTRUCTIONS ===
1. Analysez le message selon les règles ci-dessus.
2. Corrigez DIRECTEMENT dans le message tout manquement.
3. Retournez TOUJOURS un message final valide et conforme.
4. Listez chaque correction effectuée (ou confirmez la conformité).

Répondez UNIQUEMENT avec un JSON valide, sans markdown, sans texte avant ou après :
{
  "finalSubject": string | null,
  "finalContent": string,
  "wasModified": boolean,
  "corrections": string[],
  "complianceLog": string
}

- "finalSubject" : objet email corrigé (null si SMS)
- "finalContent" : contenu final CONFORME (original ou corrigé)
- "wasModified" : true si au moins une correction a été faite
- "corrections" : liste des corrections effectuées (vide si déjà conforme)
- "complianceLog" : résumé de l'analyse pour audit AI Act (2-3 phrases)`;
}

// ─── Parsing robuste ──────────────────────────────────────────────────────────

function parseResponse(raw: string): ModerationResult | null {
  // Extraire le JSON même si Claude ajoute du texte parasite
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      finalSubject?: string | null;
      finalContent?: string;
      wasModified?: boolean;
      corrections?: string[];
      complianceLog?: string;
    };

    if (!parsed.finalContent) return null;

    return {
      finalSubject: parsed.finalSubject ?? null,
      finalContent: parsed.finalContent,
      wasModified: parsed.wasModified ?? false,
      corrections: Array.isArray(parsed.corrections) ? parsed.corrections : [],
      complianceLog: parsed.complianceLog ?? "Analyse de conformité effectuée.",
      degraded: false,
    };
  } catch {
    return null;
  }
}

// ─── Export principal ─────────────────────────────────────────────────────────

export async function moderateAction(
  input: ModerationInput
): Promise<ModerationResult> {
  const prompt = buildModerationPrompt(input);

  let raw: string;
  try {
    const response = await trackClaude(
      { model: MODEL, max_tokens: 1024, messages: [{ role: "user", content: prompt }] },
      { agentName: "moderation-agent", metadata: { channel: input.channel, tenantName: input.tenantName } }
    );

    raw =
      response.content[0]?.type === "text" ? response.content[0].text : "";
  } catch (err) {
    console.error("[moderation] Erreur appel Claude:", err);
    // Fallback : retourner le message original sans modification
    return {
      finalSubject: input.subject,
      finalContent: input.content,
      wasModified: false,
      corrections: [],
      complianceLog:
        "Modération ignorée — erreur appel Claude (message original envoyé).",
      degraded: true,
    };
  }

  const result = parseResponse(raw);

  if (!result) {
    console.error("[moderation] Impossible de parser la réponse Claude:", raw.substring(0, 200));
    // Fallback : message original
    return {
      finalSubject: input.subject,
      finalContent: input.content,
      wasModified: false,
      corrections: [],
      complianceLog:
        "Modération ignorée — réponse JSON malformée (message original envoyé).",
      degraded: true,
    };
  }

  return result;
}
