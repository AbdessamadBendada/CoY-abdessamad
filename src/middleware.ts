import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export default async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes SAUF :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation images)
     * - favicon.ico
     * - fichiers assets (svg, png, jpg, etc.)
     * - api/webhooks/* (auth HMAC — pas de session, pas de refresh inutile)
     * - api/invoices/* (génération PDF — pas de session cookie à rafraîchir)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/invoices|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
