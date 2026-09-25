"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotEmailPage() {
  return (
    <Card className="border-0 shadow-none lg:border lg:shadow-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Email oublié ?</CardTitle>
        <CardDescription>
          Nous pouvons vous aider à retrouver votre compte
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-sm">Essayez d&apos;abord :</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">1.</span>
              <span>
                Cherchez <strong>&ldquo;CoY&rdquo;</strong> ou{" "}
                <strong>&ldquo;CoYia&rdquo;</strong> dans votre boîte mail
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">2.</span>
              <span>
                Vérifiez vos dossiers <strong>spam</strong> et{" "}
                <strong>promotions</strong>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">3.</span>
              <span>
                Essayez les emails professionnels que vous utilisez habituellement
              </span>
            </li>
          </ul>
        </div>

        <div className="border-t pt-4 space-y-3">
          <h3 className="font-medium text-sm">Toujours bloqué ?</h3>
          <p className="text-sm text-muted-foreground">
            Contactez notre support avec le <strong>nom de votre entreprise</strong> 
            et nous retrouverons votre compte.
          </p>
          <a href="mailto:support@coyia.fr?subject=Email%20de%20connexion%20oublié%20-%20WinBack%20Agent">
            <Button variant="outline" className="w-full">
              ✉ Contacter le support
            </Button>
          </a>
          <p className="text-xs text-center text-muted-foreground">
            support@coyia.fr — Réponse sous 24h ouvrées
          </p>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="text-sm text-primary hover:underline font-medium"
          >
            ← Retour à la connexion
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
