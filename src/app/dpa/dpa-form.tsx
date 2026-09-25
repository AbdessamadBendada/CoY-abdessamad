"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { acceptDpa } from "./actions";

export function DpaForm() {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) return;
    setLoading(true);
    try {
      await acceptDpa();
    } catch {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-input"
          required
        />
        <span className="text-sm text-muted-foreground">
          J&apos;accepte les termes du DPA (Accord de Traitement des Données) et je confirme que
          mon entreprise est habilitée à signer cet accord au nom de ses clients.
          Cette signature engage juridiquement mon entreprise conformément au RGPD.
        </span>
      </label>

      <Button type="submit" disabled={!accepted || loading} className="w-full">
        {loading ? "Enregistrement…" : "Signer et accéder au tableau de bord"}
      </Button>
    </form>
  );
}
