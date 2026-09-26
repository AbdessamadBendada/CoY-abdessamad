/**
 * Retourne l'URL publique de l'application.
 *
 * Lit `NEXT_PUBLIC_APP_URL` (à définir dans `.env.local`), avec un fallback
 * sur `http://localhost:3000` pour le développement local.
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}
