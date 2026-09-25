import { mistral } from "@/lib/ai/claude-client";

// ─── Modèles Mistral (remplace CLAUDE_MODELS) ────────────────────────────────

export const MISTRAL_MODELS = {
  POWERFUL: "mistral-large-latest",
  FAST: "mistral-small-latest",
} as const;

// Alias pour compatibilité avec les imports existants (messaging/index.ts)
export const CLAUDE_MODELS = MISTRAL_MODELS;

// ─── Shim Anthropic → Mistral ─────────────────────────────────────────────────
// Préserve l'interface anthropic.messages.create() pour messaging/index.ts
// sans modifier ce fichier.

export const anthropic = {
  messages: {
    create: async (params: {
      model: string;
      max_tokens: number;
      system?: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    }) => {
      const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> =
        params.system
          ? [{ role: "system", content: params.system }, ...params.messages]
          : params.messages;

      const response = await mistral.chat.complete({
        model: params.model,
        maxTokens: params.max_tokens,
        messages,
      });

      const rawContent = response.choices[0]?.message?.content;
      const text = typeof rawContent === "string" ? rawContent : "";
      return {
        content: [{ type: "text" as const, text }],
      };
    },
  },
};
