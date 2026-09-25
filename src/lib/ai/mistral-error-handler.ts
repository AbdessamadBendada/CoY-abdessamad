// Gestion centralisée des erreurs Mistral API
// Vérifie les status codes HTTP, pas le contenu texte (évite les faux positifs)

export function handleMistralError(error: unknown, context: string): never {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("status code 429") || msg.includes('"status":429')) {
      throw new Error(`Mistral quota dépassé [${context}] — attendre 60s puis réessayer`);
    }
    if (msg.includes("status code 401") || msg.includes('"status":401') || (msg.includes("401") && msg.toLowerCase().includes("unauthorized"))) {
      throw new Error(`MISTRAL_API_KEY invalide [${context}] — vérifier console.mistral.ai`);
    }
    if (msg.includes("status code 503") || msg.includes("status code 502") || msg.includes("status code 500")) {
      throw new Error(`Mistral serveur indisponible [${context}] — retry dans 30s`);
    }
    const causeChain: string[] = [];
    let cur: unknown = (error as { cause?: unknown }).cause;
    while (cur instanceof Error && causeChain.length < 4) {
      causeChain.push(cur.message);
      cur = (cur as { cause?: unknown }).cause;
    }
    const causeMsg = causeChain.length > 0 ? ` | ${causeChain.join(" → ")}` : "";
    throw new Error(`Mistral erreur inattendue [${context}] : ${msg}${causeMsg}`);
  }
  throw new Error(`Mistral erreur inconnue [${context}]`);
}
