"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Info } from "lucide-react";
import { TONE_VALUES, COMPENSATION_TYPE_VALUES } from "@/types/scenarios";
import type { ScenarioForClient } from "./scenarios-tab";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TONE_LABELS: Record<string, string> = {
  empathique: "Empathique",
  empathique_urgent: "Empathique & urgent",
  direct: "Direct",
  direct_urgent: "Direct & urgent",
};

const COMP_LABELS: Record<string, string> = {
  discount_percent: "Remise %",
  discount_fixed: "Remise fixe (€)",
  free_shipping: "Livraison offerte",
};

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  labelMap,
}: {
  options: readonly T[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  labelMap: Record<string, string>;
}) {
  return (
    <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: "0.3rem 0.75rem",
            fontSize: "0.78rem",
            borderRadius: "0.375rem",
            border: value === opt ? "1.5px solid #D97757" : "1px solid #D1D5DB",
            background: value === opt ? "rgba(217,119,87,0.08)" : "#fff",
            color: value === opt ? "#D97757" : "#6B7280",
            cursor: "pointer",
            fontWeight: value === opt ? 600 : 400,
            transition: "all 0.12s",
          }}
        >
          {labelMap[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

function BoolToggle({
  value,
  onChange,
  trueLabel,
  falseLabel,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <div style={{ display: "flex", gap: "0.25rem" }}>
      {[
        { v: true, label: trueLabel },
        { v: false, label: falseLabel },
      ].map(({ v, label }) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          style={{
            padding: "0.3rem 0.75rem",
            fontSize: "0.78rem",
            borderRadius: "0.375rem",
            border: value === v ? "1.5px solid #D97757" : "1px solid #D1D5DB",
            background: value === v ? "rgba(217,119,87,0.08)" : "#fff",
            color: value === v ? "#D97757" : "#6B7280",
            cursor: "pointer",
            fontWeight: value === v ? 600 : 400,
            transition: "all 0.12s",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── État initial du formulaire ───────────────────────────────────────────────

export interface FormState {
  name: string;
  isActive: boolean;
  scoreMin: number;
  scoreMax: number;
  channel: "EMAIL" | "SMS" | null;
  tone: string;
  vouvoiement: boolean;
  autoSendMode: "manual" | "auto";
  compensationType: string | null;
  compensationValue: string;
  compensationMaxEur: string;
  subjectTemplate: string;
  contentTemplate: string;
}

function defaultFormState(s: ScenarioForClient | null, initial?: Partial<FormState>): FormState {
  if (s) {
    return {
      name: s.name,
      isActive: s.isActive,
      scoreMin: s.scoreMin,
      scoreMax: s.scoreMax,
      channel: s.channel,
      tone: s.tone,
      vouvoiement: s.vouvoiement,
      autoSendMode: s.autoSendMode as "manual" | "auto",
      compensationType: s.compensationType,
      compensationValue: s.compensationValue !== null ? String(s.compensationValue) : "",
      compensationMaxEur: String(s.compensationMaxEur),
      subjectTemplate: s.subjectTemplate ?? "",
      contentTemplate: s.contentTemplate ?? "",
    };
  }
  return {
    name: "",
    scoreMin: 65,
    scoreMax: 100,
    channel: null,
    tone: "empathique",
    vouvoiement: true,
    compensationType: null,
    compensationValue: "",
    compensationMaxEur: "50",
    subjectTemplate: "",
    contentTemplate: "",
    ...initial,
    // re-forcés APRÈS le spread : défense en profondeur, indépendant du template
    isActive: true as const,
    autoSendMode: "manual" as const,
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: (saved: ScenarioForClient) => void;
  scenario: ScenarioForClient | null;
  dpaSignedAt: string | null;
  initialValues?: Partial<FormState>;
}

// ─── ScenarioForm ─────────────────────────────────────────────────────────────

export function ScenarioForm({
  open,
  onClose,
  onSuccess,
  scenario,
  dpaSignedAt,
  initialValues,
}: Props) {
  const [form, setForm] = useState<FormState>(() => defaultFormState(scenario, initialValues));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [previewStale, setPreviewStale] = useState(false);

  // Réinitialiser quand le scénario change
  // initialValues omis des deps : pendingTemplate est posé avant setFormOpen(true)
  useEffect(() => {
    setForm(defaultFormState(scenario, initialValues));
    setError(null);
    setWarnings([]);
    setPreviewStale(false);
  }, [scenario, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fermeture Escape
  useEffect(() => {
    if (!open) return;
    function handleEsc(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function validate(): string | null {
    if (!form.name.trim()) return "Le nom est requis.";
    if (form.name.length > 100) return "Le nom doit faire au plus 100 caractères.";
    if (form.scoreMin >= form.scoreMax) return "Score min doit être inférieur au score max.";
    if (form.scoreMin < 0 || form.scoreMin > 99) return "Le score min doit être entre 0 et 99.";
    if (form.scoreMax < 1 || form.scoreMax > 100) return "Le score max doit être entre 1 et 100.";
    if (form.compensationType && form.compensationType !== "free_shipping" && !form.compensationValue) {
      return "La valeur de compensation est requise.";
    }
    if (
      form.compensationType === "discount_percent" &&
      Number(form.compensationValue) > 50
    ) {
      return "La remise % ne peut pas dépasser 50%.";
    }
    if (
      form.compensationType &&
      form.compensationValue &&
      form.compensationMaxEur &&
      Number(form.compensationValue) > Number(form.compensationMaxEur)
    ) {
      return "La valeur ne peut pas dépasser le plafond.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError(null);
    setWarnings([]);
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      isActive: form.isActive,
      priority: 0,
      scoreMin: Number(form.scoreMin),
      scoreMax: Number(form.scoreMax),
      channel: form.channel ?? undefined,
      tone: form.tone,
      vouvoiement: form.vouvoiement,
      autoSendMode: form.autoSendMode,
      compensationType: form.compensationType ?? undefined,
      compensationValue:
        form.compensationType && form.compensationValue
          ? Number(form.compensationValue)
          : undefined,
      compensationMaxEur: Number(form.compensationMaxEur) || 50,
      subjectTemplate: form.subjectTemplate.trim() || null,
      contentTemplate: form.contentTemplate.trim() || null,
    };

    try {
      const url = scenario
        ? `/api/settings/scenarios/${scenario.id}`
        : "/api/settings/scenarios";
      const res = await fetch(url, {
        method: scenario ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await res.json();

      if (!res.ok) {
        const issueMessage = body.issues?.[0]?.message as string | undefined;
        setError(issueMessage ?? body.error ?? "Erreur lors de la sauvegarde.");
        return;
      }

      if (body.warnings?.length) setWarnings(body.warnings);

      const raw = body.scenario;
      const saved: ScenarioForClient = {
        id: raw.id,
        name: raw.name,
        isActive: raw.isActive,
        priority: raw.priority,
        scoreMin: raw.scoreMin,
        scoreMax: raw.scoreMax,
        channel: raw.channel as "EMAIL" | "SMS" | null,
        tone: raw.tone,
        vouvoiement: raw.vouvoiement,
        autoSendMode: raw.autoSendMode,
        compensationType: raw.compensationType,
        compensationValue: raw.compensationValue !== null ? Number(raw.compensationValue) : null,
        compensationMaxEur: Number(raw.compensationMaxEur),
        triggersConfig: raw.triggersConfig as ScenarioForClient["triggersConfig"],
        usageCount: raw.usageCount,
        subjectTemplate: raw.subjectTemplate ?? null,
        contentTemplate: raw.contentTemplate ?? null,
      };

      onSuccess(saved);
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion.");
    } finally {
      setSaving(false);
    }
  }

  const showAutoSendWarning = form.autoSendMode === "auto" && !dpaSignedAt;

  if (!open) return null;
  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(43,37,35,0.45)", zIndex: 200 }}
      />
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          width: "min(95vw, 520px)",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#FFFFFF",
          borderRadius: "0.75rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          padding: "1.5rem",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "0.95rem", color: "#2B2523", margin: 0, fontWeight: 600 }}>
            {scenario ? "Modifier le scénario" : "Nouveau scénario"}
          </h2>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.25rem" }}
        >
          {/* Nom */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <Label htmlFor="sc-name" style={{ fontSize: "0.78rem", color: "#6B7280" }}>
              Nom du scénario *
            </Label>
            <Input
              id="sc-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex. : Risque élevé mode"
              maxLength={100}
              style={{ fontSize: "0.85rem" }}
              required
            />
          </div>

          {/* Plage de score */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <Label style={{ fontSize: "0.78rem", color: "#6B7280" }}>Plage de score churn *</Label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Input
                type="number"
                value={form.scoreMin}
                onChange={(e) => set("scoreMin", Number(e.target.value))}
                min={0}
                max={99}
                style={{ width: 72, fontSize: "0.85rem", textAlign: "center" }}
                aria-label="Score minimum"
              />
              <span style={{ color: "#9CA3AF", fontSize: "0.85rem" }}>—</span>
              <Input
                type="number"
                value={form.scoreMax}
                onChange={(e) => set("scoreMax", Number(e.target.value))}
                min={1}
                max={100}
                style={{ width: 72, fontSize: "0.85rem", textAlign: "center" }}
                aria-label="Score maximum"
              />
              <span style={{ fontSize: "0.72rem", color: "#B8A898" }}>sur 100</span>
            </div>
          </div>

          {/* Canal */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <Label style={{ fontSize: "0.78rem", color: "#6B7280" }}>Canal d&apos;envoi</Label>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              {(["EMAIL", "SMS", null] as const).map((c) => (
                <button
                  key={String(c)}
                  type="button"
                  onClick={() => set("channel", c)}
                  style={{
                    padding: "0.3rem 0.75rem",
                    fontSize: "0.78rem",
                    borderRadius: "0.375rem",
                    border: form.channel === c ? "1.5px solid #D97757" : "1px solid #D1D5DB",
                    background: form.channel === c ? "rgba(217,119,87,0.08)" : "#fff",
                    color: form.channel === c ? "#D97757" : "#6B7280",
                    cursor: "pointer",
                    fontWeight: form.channel === c ? 600 : 400,
                    transition: "all 0.12s",
                  }}
                >
                  {c === null ? "Auto" : c}
                </button>
              ))}
            </div>
            {form.channel === "SMS" && (
              <p style={{ fontSize: "0.72rem", color: "#C99A30", marginTop: "0.25rem" }}>
                SMS : consentement opt-in requis — vérifiez votre conformité avant activation.
              </p>
            )}
          </div>

          {/* Votre message de récupération */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
              <Label style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                Votre message de récupération
              </Label>
              <div title="Variables disponibles : {{prenom}}, {{nom}}, {{derniere_commande}}. L'IA personnalisera ces valeurs automatiquement.">
                <Info size={12} style={{ color: "#B8A898", cursor: "help" }} />
              </div>
            </div>
            {form.channel !== "SMS" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <Label style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Objet de l&apos;email</Label>
                <input
                  type="text"
                  value={form.subjectTemplate}
                  onChange={(e) => set("subjectTemplate", e.target.value)}
                  maxLength={200}
                  placeholder="Ex. : Bonjour {{prenom}}, nous avons remarqué…"
                  style={{
                    width: "100%",
                    padding: "0.4rem 0.625rem",
                    fontSize: "0.83rem",
                    border: "1px solid #D1D5DB",
                    borderRadius: "0.375rem",
                    outline: "none",
                    fontFamily: "inherit",
                    color: "#2B2523",
                    background: "#fff",
                  }}
                />
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <Label style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>
                Corps du message
              </Label>
              <textarea
                value={form.contentTemplate}
                onChange={(e) => {
                  set("contentTemplate", e.target.value);
                  setPreviewStale(false);
                }}
                maxLength={2000}
                rows={5}
                placeholder={
                  form.channel === "SMS"
                    ? "Ex. : Bonjour {{prenom}}, votre satisfaction nous tient à cœur…"
                    : "Ex. : Bonjour {{prenom}},\n\nNous avons remarqué que votre dernière expérience n'a pas été à la hauteur…"
                }
                style={{
                  width: "100%",
                  padding: "0.4rem 0.625rem",
                  fontSize: "0.83rem",
                  border: "1px solid #D1D5DB",
                  borderRadius: "0.375rem",
                  outline: "none",
                  fontFamily: "inherit",
                  color: "#2B2523",
                  background: "#fff",
                  resize: "vertical",
                  lineHeight: 1.5,
                }}
              />
            </div>

            {/* Preview live — substitution variables côté client, 0 appel API */}
            {form.contentTemplate && (
              <div
                style={{
                  borderRadius: "0.375rem",
                  border: "1px solid #E5E7EB",
                  background: "#F9FAFB",
                  padding: "0.75rem 1rem",
                }}
              >
                <p style={{ fontSize: "0.72rem", color: "#6B7280", margin: "0 0 0.375rem" }}>
                  Aperçu — variables remplacées par des exemples :
                </p>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    fontSize: "0.83rem",
                    color: "#0F1B38",
                    fontFamily: "inherit",
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {form.contentTemplate
                    .replace(/\{\{prenom\}\}/g, "Camille")
                    .replace(/\{\{nom\}\}/g, "Dumont")
                    .replace(/\{\{derniere_commande\}\}/g, "#4521")
                    .replace(/\{\{nom_boutique\}\}/g, "votre boutique")}
                </pre>
                {previewStale && (
                  <p style={{ fontSize: "0.72rem", color: "#D97757", margin: "0.375rem 0 0" }}>
                    ⚠ Paramètre modifié — le ton sera adapté à l&apos;envoi par l&apos;IA
                  </p>
                )}
                <p style={{ fontSize: "0.72rem", color: "#9CA3AF", margin: "0.375rem 0 0", fontStyle: "italic" }}>
                  Message envoyé avec l&apos;assistance de l&apos;IA CoY · Le ton sera adapté selon votre configuration
                </p>
              </div>
            )}

            <p style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>
              Guidez le ton et le fond — l&apos;IA adapte votre voix à chaque client. Variables : {"{{prenom}}"}, {"{{nom}}"}, {"{{derniere_commande}}"}.
            </p>
          </div>

          {/* Ton */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <Label style={{ fontSize: "0.78rem", color: "#6B7280" }}>Ton du message</Label>
            <SegmentedControl
              options={TONE_VALUES}
              value={form.tone as typeof TONE_VALUES[number]}
              onChange={(v) => { set("tone", v); if (form.contentTemplate) setPreviewStale(true); }}
              labelMap={TONE_LABELS}
            />
          </div>

          {/* Vouvoiement */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <Label style={{ fontSize: "0.78rem", color: "#6B7280" }}>Forme d&apos;adresse</Label>
            <BoolToggle
              value={form.vouvoiement}
              onChange={(v) => { set("vouvoiement", v); if (form.contentTemplate) setPreviewStale(true); }}
              trueLabel="Vouvoiement"
              falseLabel="Tutoiement"
            />
          </div>

          {/* Mode d'envoi */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
            <Label style={{ fontSize: "0.78rem", color: "#6B7280" }}>Mode d&apos;envoi</Label>
            <div style={{ display: "flex", gap: "0.25rem" }}>
              <button
                type="button"
                onClick={() => set("autoSendMode", "manual")}
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.78rem",
                  borderRadius: "0.375rem",
                  border: form.autoSendMode === "manual" ? "1.5px solid #D97757" : "1px solid #D1D5DB",
                  background: form.autoSendMode === "manual" ? "rgba(217,119,87,0.08)" : "#fff",
                  color: form.autoSendMode === "manual" ? "#D97757" : "#6B7280",
                  cursor: "pointer",
                  fontWeight: form.autoSendMode === "manual" ? 600 : 400,
                  transition: "all 0.12s",
                }}
              >
                Manuel
              </button>
              <button
                type="button"
                onClick={() => !showAutoSendWarning && set("autoSendMode", "auto")}
                disabled={showAutoSendWarning}
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.78rem",
                  borderRadius: "0.375rem",
                  border: form.autoSendMode === "auto" ? "1.5px solid #D97757" : "1px solid #D1D5DB",
                  background:
                    showAutoSendWarning
                      ? "#F3F4F6"
                      : form.autoSendMode === "auto"
                      ? "rgba(217,119,87,0.08)"
                      : "#fff",
                  color: showAutoSendWarning ? "#D1D5DB" : form.autoSendMode === "auto" ? "#D97757" : "#6B7280",
                  cursor: showAutoSendWarning ? "not-allowed" : "pointer",
                  fontWeight: form.autoSendMode === "auto" ? 600 : 400,
                  transition: "all 0.12s",
                }}
                title={showAutoSendWarning ? "Signez votre DPA pour activer l'envoi automatique" : undefined}
              >
                Automatique
              </button>
            </div>
            {form.autoSendMode === "manual" && (
              <p style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: "0.25rem" }}>
                Vous validez chaque envoi — aucun message ne part sans votre accord ✓
              </p>
            )}
            {showAutoSendWarning && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.375rem",
                  marginTop: "0.25rem",
                }}
              >
                <AlertTriangle size={12} style={{ color: "#C99A30", flexShrink: 0, marginTop: "0.1rem" }} />
                <p style={{ fontSize: "0.72rem", color: "#C99A30" }}>
                  Signez votre DPA pour activer l&apos;envoi automatique.{" "}
                  <a href="/dashboard/dpa" style={{ color: "#D97757", textDecoration: "underline" }}>
                    Accéder au DPA
                  </a>
                </p>
              </div>
            )}
          </div>

          {/* Compensation */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            <Label style={{ fontSize: "0.78rem", color: "#6B7280" }}>Compensation (optionnel)</Label>

            {/* Type */}
            <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => set("compensationType", null)}
                style={{
                  padding: "0.3rem 0.75rem",
                  fontSize: "0.78rem",
                  borderRadius: "0.375rem",
                  border: !form.compensationType ? "1.5px solid #D97757" : "1px solid #D1D5DB",
                  background: !form.compensationType ? "rgba(217,119,87,0.08)" : "#fff",
                  color: !form.compensationType ? "#D97757" : "#6B7280",
                  cursor: "pointer",
                  fontWeight: !form.compensationType ? 600 : 400,
                  transition: "all 0.12s",
                }}
              >
                Aucune
              </button>
              {COMPENSATION_TYPE_VALUES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { set("compensationType", c); if (c === "free_shipping") set("compensationValue", ""); }}
                  style={{
                    padding: "0.3rem 0.75rem",
                    fontSize: "0.78rem",
                    borderRadius: "0.375rem",
                    border: form.compensationType === c ? "1.5px solid #D97757" : "1px solid #D1D5DB",
                    background: form.compensationType === c ? "rgba(217,119,87,0.08)" : "#fff",
                    color: form.compensationType === c ? "#D97757" : "#6B7280",
                    cursor: "pointer",
                    fontWeight: form.compensationType === c ? 600 : 400,
                    transition: "all 0.12s",
                  }}
                >
                  {COMP_LABELS[c]}
                </button>
              ))}
            </div>

            {/* Valeur + plafond */}
            {form.compensationType && form.compensationType !== "free_shipping" && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <Label style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>
                    Valeur {form.compensationType === "discount_percent" ? "(%)" : "(€)"}
                  </Label>
                  <Input
                    type="number"
                    value={form.compensationValue}
                    onChange={(e) => set("compensationValue", e.target.value)}
                    min={0}
                    max={form.compensationType === "discount_percent" ? 50 : 10000}
                    step={form.compensationType === "discount_percent" ? 1 : 0.01}
                    placeholder={form.compensationType === "discount_percent" ? "10" : "15.00"}
                    style={{ width: 90, fontSize: "0.85rem", textAlign: "center" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <Label style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>Plafond (€)</Label>
                  <Input
                    type="number"
                    value={form.compensationMaxEur}
                    onChange={(e) => set("compensationMaxEur", e.target.value)}
                    min={0}
                    max={500}
                    step={0.01}
                    placeholder="50"
                    style={{ width: 90, fontSize: "0.85rem", textAlign: "center" }}
                  />
                </div>
              </div>
            )}
          </div>


          {/* Note ROI */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.375rem",
              background: "rgba(43,37,35,0.04)",
              borderRadius: "0.4rem",
              padding: "0.5rem 0.625rem",
            }}
          >
            <Info size={12} style={{ color: "#B8A898", flexShrink: 0, marginTop: "0.1rem" }} />
            <p style={{ fontSize: "0.72rem", color: "#9CA3AF" }}>
              Calcul ROI sur 30 jours (standard WinBack). La fenêtre d&apos;attribution est fixe.
            </p>
          </div>

          {/* Avertissements chevauchement */}
          {warnings.map((w, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.375rem",
                background: "rgba(232,184,75,0.08)",
                border: "1px solid rgba(232,184,75,0.3)",
                borderRadius: "0.4rem",
                padding: "0.5rem 0.625rem",
              }}
            >
              <AlertTriangle size={12} style={{ color: "#C99A30", flexShrink: 0, marginTop: "0.1rem" }} />
              <p style={{ fontSize: "0.72rem", color: "#C99A30" }}>{w}</p>
            </div>
          ))}

          {/* Erreur */}
          {error && (
            <p style={{ fontSize: "0.78rem", color: "#C0442A" }}>{error}</p>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto", paddingTop: "0.75rem", gap: "0.5rem" }}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              style={{ fontSize: "0.8rem" }}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving}
              style={{
                background: saving ? "#D1D5DB" : "#D97757",
                color: "#F5F0E8",
                border: "none",
                fontSize: "0.8rem",
              }}
            >
              {saving ? "Enregistrement…" : scenario ? "Mettre à jour" : "Créer le scénario"}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
}
