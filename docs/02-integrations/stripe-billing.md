# Intégration Stripe — Facturation Palier Unique CoY

> **Statut** : ✅ Validé
> **Priorité** : P1
> **Version** : 2.0 (ADR-017 — 05/09/2026)
> **Dépend de** : `architecture-globale.md`, `modele-donnees.md`, `04-business-rules/tarification-palier-unique.md`
> **Changelog v2.0** : Réécriture complète — ce document décrivait auparavant la grille 4 paliers (Essentiel/Starter/Croissance/Expert), les upgrades/downgrades et les quotas, aujourd'hui obsolètes et couverts par `tarification-palier-unique.md`. Ce fichier se concentre désormais uniquement sur le **mécanisme d'intégration Stripe réel**, tel que livré (sous-lot 4.1, `winback-app`).
> ⚠️ Aucune valeur d'environnement, aucun Price ID réel, aucun ID d'endpoint webhook, aucun secret de signature n'est reproduit dans ce document (security-reviewer, plan Plan A) — uniquement le mécanisme.

---

## 1. Objectif

Ce document décrit le mécanisme d'intégration Stripe de CoY : le Checkout à l'inscription, le webhook de conversion, la déduplication des événements, et la facturation du forfait d'entrée. Pour les prix, quotas et règles de facturation métier, voir `04-business-rules/tarification-palier-unique.md` (source de vérité).

---

## 2. Modèle tarifaire (rappel)

- **Palier unique CoY** : 899€ HT/mois, facturation mensuelle uniquement.
- **Forfait d'entrée** : 490€ HT, facturé une seule fois à la **conversion** de l'essai (pas à l'inscription), sauf dérogation accordée au cas par cas.
- **Carte bancaire requise dès l'inscription** — Stripe Checkout Session créée à l'inscription, en mode `setup` (pas de paiement immédiat), puis la subscription est activée à la conversion (J21 automatique, sauf annulation).

Un seul Price Stripe existe pour l'abonnement récurrent (`STRIPE_PRICE_COY_MONTHLY`, référencé dans `winback-app/src/config/plans.ts` — valeur réelle non reproduite ici).

---

## 3. Flux d'inscription et de conversion

```
J0 — Inscription
  → Création du tenant (plan = COY par défaut)
  → DPA signé via Yousign (onboarding, avant Checkout)
  → Stripe Checkout Session (mode setup — enregistrement de la carte, aucun prélèvement)
  → trial_ends_at = J+21

J0 à J21 — Essai
  → Accès complet aux fonctionnalités CoY, SMS désactivés (0/mois)
  → Annulation possible à tout moment depuis l'espace Client → aucun prélèvement

J21 — Conversion automatique (sauf annulation)
  → Webhook Stripe déclenche la création de la Subscription (Price COY)
  → invoice_items.create() pour le forfait d'entrée (490€ HT), sauf dérogation
  → Facture combinée : forfait d'entrée + premier mois d'abonnement
  → tenant.status = ACTIVE, quotas COY appliqués, SMS activés
```

---

## 4. Webhook Stripe — déduplication et idempotence

Chaque événement Stripe entrant est traité selon le mécanisme suivant (implémenté dans `winback-app/src/app/api/webhooks/stripe/route.ts`) :

1. **Validation de signature** : `crypto.timingSafeEqual` sur la signature Stripe, jamais une comparaison `===` directe.
2. **Déduplication** : chaque événement est enregistré dans une table `StripeWebhookEvent` (clé = `event.id` Stripe). Un événement déjà traité est ignoré silencieusement (retour 200, pas de retraitement) — évite qu'un retry Stripe ne déclenche deux fois la facturation du forfait d'entrée.
3. **Idempotence de la facturation du forfait d'entrée** : un flag `setupFeeCharged` sur le `Tenant` empêche toute double facturation, même en cas de webhook dupliqué non filtré par la table de déduplication (défense en profondeur — deux mécanismes indépendants).
4. **Traçabilité** : `lastBillingEventAt` sur le `Tenant` est mis à jour à chaque événement de facturation traité, pour diagnostiquer les cas de désynchronisation.
5. **Table de transition** : les changements de statut (`TRIAL → ACTIVE`, `ACTIVE → PAST_DUE`, `ACTIVE → CANCELLED`) sont pilotés par les événements Stripe correspondants (`customer.subscription.updated`, `invoice.payment_failed`, `customer.subscription.deleted`), jamais par une action manuelle côté application.

---

## 5. Gestion des échecs de paiement

En cas d'échec de prélèvement (`invoice.payment_failed`) :

- Relance automatique par Stripe (dunning), selon la configuration Stripe (paramétrage hors du périmètre de ce document — voir Dashboard Stripe).
- Après **7 jours calendaires** sans régularisation, l'accès au Service peut être suspendu (aligné CGV Art. 6.3).
- `tenant.status` transite vers `PAST_DUE` sur le premier échec, puis `CANCELLED` si la relance échoue définitivement.

---

## 6. Résiliation

- Résiliation demandée par le Client depuis `/dashboard/billing` → `subscriptions.cancel()` avec effet à la fin de la période mensuelle en cours (pas de résiliation immédiate, pas de prorata).
- Webhook `customer.subscription.deleted` confirme la résiliation côté application et déclenche le début du délai d'export des données (30 jours, CGV Art. 9.3).
- Réabonnement sur le même SIRET (9 premiers chiffres) : le forfait d'entrée est refacturé (nouveau contrat, `setupFeeCharged` réinitialisé pour le nouveau `Tenant`).

---

## 7. Facturation électronique (Factur-X)

Conformément à l'ordonnance n°2021-1190 et au décret n°2022-1299 :

- **1er septembre 2026** : capacité de réception de factures électroniques.
- **1er septembre 2027** : émission au format Factur-X (PDF/A-3, XML structuré, norme EN 16931) ou via une Plateforme de Dématérialisation Partenaire (PDP) agréée.

---

## 8. Ce que ce document ne couvre pas

- Les prix, quotas et règles métier de facturation → `04-business-rules/tarification-palier-unique.md`.
- Les valeurs réelles de Price ID, endpoint webhook, ou secret de signature → jamais documentées ici, uniquement dans les variables d'environnement de `winback-app` (hors CDC).
- Le mécanisme de garantie ROI 60 jours (extension, pas remboursement) → CGV Art. 10 (`03-conformite/cgv-v2_0.md`).

---

## 9. Historique des changements

| Date | Changement | Auteur |
|------|-----------|--------|
| 2026-02-26 | Création — v1.0, grille 4 paliers (Essentiel/Starter/Croissance/Expert), upgrade/downgrade, quotas | CoYia + Claude |
| 2026-09-05 | **V2.0 (ADR-017)** — Réécriture complète : palier unique CoY, mécanisme webhook réel (déduplication `StripeWebhookEvent`, `lastBillingEventAt`, `setupFeeCharged`), suppression du contenu dupliqué avec `tarification-palier-unique.md`, aucun secret reproduit | CoYia + Claude |
