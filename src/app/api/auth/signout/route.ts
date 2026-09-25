import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/auth/signout
 *
 * Route serveur de déconnexion — SEULE approche fiable avec Supabase SSR.
 *
 * Pourquoi une route serveur est OBLIGATOIRE :
 * - Les cookies de session Supabase sont httpOnly (posés par le middleware via setAll)
 * - Le JS browser (createBrowserClient) ne peut PAS supprimer les cookies httpOnly
 * - Sans suppression serveur → le middleware voit encore les cookies → redirige vers /overview
 *   → l'utilisateur semble "ne pas pouvoir se déconnecter"
 *
 * Cette route :
 * 1. Appelle supabase.auth.signOut() côté serveur → Supabase appelle setAll avec cookies vides/expirés
 * 2. Next.js inclut les Set-Cookie headers de suppression dans la réponse
 * 3. Redirige vers /login avec les cookies déjà supprimés
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
