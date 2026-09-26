import { prisma } from "@/shared/db/prisma";
import { confirmOptOut } from "./actions";

export default async function OptOutPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ confirmed?: string }>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const customer = await prisma.customer.findUnique({
    where: { optOutToken: token },
    select: { optedOutAt: true },
  });

  if (!customer) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full rounded-2xl border bg-card p-8 text-center shadow-sm space-y-4">
          <h1 className="text-xl font-semibold">Lien invalide</h1>
          <p className="text-muted-foreground">
            Ce lien de désinscription est invalide ou a expiré.
          </p>
        </div>
      </main>
    );
  }

  const confirmed = Boolean(customer.optedOutAt) || query.confirmed === "1";

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-2xl border bg-card p-8 text-center shadow-sm space-y-5">
        {confirmed ? (
          <>
            <div className="text-4xl" aria-hidden="true">✓</div>
            <h1 className="text-xl font-semibold">Désinscription confirmée</h1>
            <p className="text-muted-foreground">
              Vous ne recevrez plus de messages de récupération de notre part.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Préférences de communication
            </p>
            <h1 className="text-2xl font-semibold">Confirmer la désinscription</h1>
            <p className="text-muted-foreground">
              Aucun changement n’a encore été effectué. Confirmez ci-dessous pour ne plus recevoir
              d’emails ou de SMS de récupération.
            </p>
            <form action={confirmOptOut}>
              <input type="hidden" name="token" value={token} />
              <button
                type="submit"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Me désinscrire
              </button>
            </form>
            <p className="text-xs text-muted-foreground">
              Vous pouvez fermer cette page pour conserver vos préférences actuelles.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
