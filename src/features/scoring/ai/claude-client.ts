import { Mistral, HTTPClient } from "@mistralai/mistralai";
import { Langfuse } from "langfuse";
import { handleMistralError } from "@/features/scoring/ai/mistral-error-handler";

// ─── Client Mistral partagé ──────────────────────────────────────────────────

// SECURITY: ne JAMAIS log `input.headers` — contient Authorization: Bearer <MISTRAL_API_KEY>.
//
// Workaround Next.js/Vercel : undici natif lit le body des Request via [kState] (symbole
// propriétaire). Un Request créé par global.Request patché par Next.js ne possède pas ce
// symbole → [kState].body = null → "expected non-null body source". Fix validé par
// security-reviewer (0 Critical/High) : extraire le body en string avant de reconstruire
// la requête avec des primitifs que undici accepte.
const vercelSafeFetcher = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  if (!(input instanceof Request)) {
    return fetch(input, init);
  }
  if (new URL(input.url).hostname !== "api.mistral.ai") {
    throw new Error("vercelSafeFetcher: hostname non autorisé");
  }
  const hasBody = input.method !== "GET" && input.method !== "HEAD";
  const bodyText = hasBody ? await input.text() : "";
  return fetch(input.url, {
    method: input.method,
    headers: input.headers,
    body: bodyText.length > 0 ? bodyText : undefined,
    signal: input.signal ?? undefined,
  });
};

export const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY ?? "",
  httpClient: new HTTPClient({ fetcher: vercelSafeFetcher }),
});

// ─── Client Langfuse (EU — RGPD natif) ───────────────────────────────────────

const langfuseEnabled =
  !!process.env.LANGFUSE_PUBLIC_KEY && !!process.env.LANGFUSE_SECRET_KEY;

const langfuse = langfuseEnabled
  ? new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
      secretKey: process.env.LANGFUSE_SECRET_KEY!,
      baseUrl: process.env.LANGFUSE_BASE_URL ?? "https://eu.cloud.langfuse.com",
      flushAt: 1,
      flushInterval: 0,
    })
  : null;

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageParams = {
  model: string;
  max_tokens: number;
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  temperature?: number;
  // system prompt → converti en message role:"system" prepend (format Mistral)
  system?: string;
};

interface TrackOptions {
  agentName: string;
  metadata?: Record<string, unknown>;
}

// Compatibilité Anthropic — les 4 agents accèdent à response.content[0].text
type AnthropicCompatMessage = {
  content: Array<{ type: "text"; text: string }>;
  usage: { input_tokens: number; output_tokens: number };
  stop_reason: string | null;
};

// ─── Helper — normalise la réponse Mistral en shape Anthropic ────────────────

type MistralResponse = Awaited<ReturnType<typeof mistral.chat.complete>>;

function toCompatMessage(response: MistralResponse): AnthropicCompatMessage {
  const choice = response.choices[0];
  const rawContent = choice?.message?.content;
  const text = typeof rawContent === "string" ? rawContent : "";
  return {
    content: [{ type: "text", text }],
    usage: {
      input_tokens: response.usage.promptTokens ?? 0,
      output_tokens: response.usage.completionTokens ?? 0,
    },
    stop_reason: choice?.finishReason ?? null,
  };
}

// ─── Wrapper tracé ────────────────────────────────────────────────────────────
//
// Remplace l'ancien wrapper Anthropic. Nom conservé pour compatibilité
// avec les 4 agents existants (scoring, timing, action-generation, moderation).

export async function trackClaude(
  params: MessageParams,
  options: TrackOptions
): Promise<AnthropicCompatMessage> {
  const messages = params.system
    ? [{ role: "system" as const, content: params.system }, ...params.messages]
    : params.messages;

  if (!langfuse) {
    try {
      const response = await mistral.chat.complete({
        model: params.model,
        maxTokens: params.max_tokens,
        temperature: params.temperature ?? undefined,
        messages,
      });
      return toCompatMessage(response);
    } catch (err) {
      handleMistralError(err, options.agentName);
    }
  }

  const trace = langfuse.trace({
    name: options.agentName,
    metadata: options.metadata,
  });

  const generation = trace.generation({
    name: options.agentName,
    model: params.model,
    input: params.messages,
    modelParameters: {
      max_tokens: params.max_tokens,
      ...(params.temperature != null ? { temperature: params.temperature } : {}),
    },
  });

  const startedAt = Date.now();

  try {
    const response = await mistral.chat.complete({
      model: params.model,
      maxTokens: params.max_tokens,
      temperature: params.temperature ?? undefined,
      messages,
    });

    const compat = toCompatMessage(response);

    generation.end({
      output: compat.content[0].text,
      usage: {
        input: compat.usage.input_tokens,
        output: compat.usage.output_tokens,
      },
      metadata: {
        latencyMs: Date.now() - startedAt,
        stopReason: compat.stop_reason,
      },
    });

    langfuse.flushAsync().catch((e) =>
      console.warn("[Langfuse] flush failed (non-fatal):", e instanceof Error ? e.message : e)
    );

    return compat;
  } catch (err) {
    generation.end({
      level: "ERROR",
      statusMessage: err instanceof Error ? err.message : String(err),
      metadata: { latencyMs: Date.now() - startedAt },
    });
    langfuse.flushAsync().catch((e) =>
      console.warn("[Langfuse] flush failed (non-fatal):", e instanceof Error ? e.message : e)
    );
    handleMistralError(err, options.agentName);
  }
}
