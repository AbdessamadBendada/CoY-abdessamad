"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { updateWinbackSettings } from "../actions";
import {
  CHURN_SCORE_DEFAULT_THRESHOLD,
  COOLDOWN_DAYS_DEFAULT,
  COOLDOWN_DAYS_MIN,
  COOLDOWN_DAYS_MAX,
} from "@/config/constants";

interface Props {
  churnThreshold: number;
  cooldownDays: number;
}

function getRiskLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Critique uniquement", color: "#C0442A" };
  if (score >= 65) return { label: "Très haut risque", color: "#C99A30" };
  return { label: "Sensible aux signaux faibles", color: "#7A6355" };
}

export function WinbackSettingsForm({ churnThreshold, cooldownDays }: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [threshold, setThreshold] = useState(churnThreshold);
  const [cooldown, setCooldown] = useState(cooldownDays);

  const riskInfo = getRiskLabel(threshold);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setResult(null);
    startTransition(async () => {
      const r = await updateWinbackSettings(formData);
      setResult(r);
    });
  }

  return (
    <Card>
      <CardContent className="py-5">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seuil déclenchement */}
          <div className="space-y-2">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <Label htmlFor="churnThreshold">Seuil de déclenchement</Label>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: riskInfo.color }}>
                {threshold} — {riskInfo.label}
              </span>
            </div>
            <input
              id="churnThreshold"
              name="churnThreshold"
              type="range"
              min={50}
              max={90}
              step={1}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#B8A898" }}>
              <span>50 — Sensible</span>
              <span>Défaut : {CHURN_SCORE_DEFAULT_THRESHOLD}</span>
              <span>90 — Critique</span>
            </div>
            <p className="text-xs text-muted-foreground">
              CoY déclenche une action dès qu&apos;un client dépasse ce score de risque de départ.
            </p>
          </div>

          {/* Délai entre contacts */}
          <div className="space-y-2">
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <Label htmlFor="cooldownDays">Délai entre deux contacts</Label>
              <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#C99A30" }}>
                {cooldown} jour{cooldown > 1 ? "s" : ""}
              </span>
            </div>
            <input
              id="cooldownDays"
              name="cooldownDays"
              type="range"
              min={COOLDOWN_DAYS_MIN}
              max={COOLDOWN_DAYS_MAX}
              step={1}
              value={cooldown}
              onChange={(e) => setCooldown(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "#B8A898" }}>
              <span>{COOLDOWN_DAYS_MIN}j min</span>
              <span>Défaut : {COOLDOWN_DAYS_DEFAULT}j</span>
              <span>{COOLDOWN_DAYS_MAX}j max</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Délai minimum entre deux actions envoyées au même client pour éviter le surcontact.
            </p>
          </div>

          {result?.success && (
            <p className="text-sm font-medium" style={{ color: "#5C8A3A" }}>
              ✓ Paramètres mis à jour avec succès.
            </p>
          )}
          {result?.error && (
            <p className="text-sm font-medium" style={{ color: "#C0442A" }}>
              {result.error}
            </p>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isPending}
              size="sm"
              style={{ background: "#D97757", color: "#F5F0E8", border: "none" }}
            >
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
