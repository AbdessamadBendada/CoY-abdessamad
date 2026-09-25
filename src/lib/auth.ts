import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export const getCurrentUser = cache(async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { authUserId: user.id },
    include: { tenant: true },
  });

  return dbUser;
});

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// Pour les Route Handlers (API JSON) — ne redirige jamais, retourne null si non
// authentifié. `requireAuth()` appelle `redirect()` (conçu pour les Server
// Components/pages) ; l'utiliser dans une route API est une confusion d'archi-
// tecture qui fonctionne aujourd'hui par accident (le throw NEXT_REDIRECT est
// intercepté par un catch générique) mais reste fragile entre versions Next.js.
export async function requireAuthApi() {
  return getCurrentUser();
}

export async function requireOwner() {
  const user = await requireAuth();
  if (user.role !== "OWNER" && user.role !== "ADMIN") {
    redirect("/overview");
  }
  return user;
}
