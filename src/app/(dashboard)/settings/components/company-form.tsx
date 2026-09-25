"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCompanyInfo } from "../actions";

interface Props {
  name: string;
  email: string;
  phone: string;
  website: string;
  siret: string;
}

export function CompanyForm({ name, email, phone, website, siret }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    success?: boolean;
    error?: string;
  } | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setResult(null);
    startTransition(async () => {
      const r = await updateCompanyInfo(formData);
      setResult(r);
    });
  }

  return (
    <Card>
      <CardContent className="py-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nom */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Nom de l&apos;entreprise *</Label>
              <Input id="name" name="name" defaultValue={name} required />
            </div>

            {/* Email (readonly) */}
            <div className="space-y-1.5">
              <Label>Adresse e-mail</Label>
              <Input
                value={email}
                readOnly
                disabled
                className="bg-muted/50 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                Non modifiable ici — contactez le support.
              </p>
            </div>

            {/* Téléphone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={phone}
                placeholder="+33 6 00 00 00 00"
              />
            </div>

            {/* SIRET */}
            <div className="space-y-1.5">
              <Label htmlFor="siret">SIRET</Label>
              <Input
                id="siret"
                name="siret"
                defaultValue={siret}
                placeholder="12345678901234"
                maxLength={14}
              />
            </div>

            {/* Site web */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="website">Site web</Label>
              <Input
                id="website"
                name="website"
                defaultValue={website}
                placeholder="https://maboutique.fr"
              />
            </div>
          </div>

          {result?.success && (
            <p className="text-sm font-medium" style={{ color: "#5C8A3A" }}>
              ✓ Informations mises à jour avec succès.
            </p>
          )}
          {result?.error && (
            <p className="text-sm font-medium" style={{ color: "#EF4444" }}>
              {result.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending} size="sm">
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
