---
Statut: Validé
Version: 2.0
Priorité: P1
Dépendances: actions-recuperation.md, modele-donnees.md
Dernière mise à jour: 2026-09-08
---

# Module : Free Trial & Gestion des Quotas

## Objectif

Permettre à chaque PME de tester WinBack Agent pendant 21 jours, carte bancaire requise à l'inscription (conversion automatique à J21, sans action requise), avec les quotas du palier unique CoY pour démontrer la valeur du produit en conditions réelles.

---

## Paramètres du Trial (ADR-017)

| Paramètre | Valeur | Décision |
|-----------|--------|----------|
| Durée | 21 jours | Suffisant pour un cycle complet d'analyse + action |
| Carte bancaire | Requise à l'inscription | Checkout Stripe en mode `setup`, conversion auto à J21 sauf annulation — ADR-017 |
| Forfait d'entrée (490€ HT) | Facturé à la conversion (J21), pas à l'inscription | ADR-017 |
| Conversion cible | 18% | Benchmark SaaS B2B niche |
| Limite 1 trial par entreprise | Oui | Vérification par domaine email |

---

## Quotas Trial — palier unique CoY (ADR-017)

Le trial applique les quotas du palier CoY (`TRIAL_LIMITS`, `04-business-rules/limit-quotas.md`), à l'exception des SMS, désactivés pendant l'essai.

| Ressource | Quota Trial | Quota CoY (après conversion) |
|-----------|-------------|-------------------------------|
| Clients trackés | 10 000 | 10 000 |
| Actions/mois | 1 500 | 1 500 |
| SMS/mois | 0 (activés à la conversion) | 350 |
| Scénarios personnalisables | 25 | 25 |
| Utilisateurs dashboard | 1 | 1 (V1 — RBAC multi-utilisateurs en V2) |
| Intégrations | Illimitées | Illimitées |

---

## Parcours Trial

```
[1. Inscription]
  → Email professionnel uniquement (pas de @gmail, @hotmail, etc.)
  → Vérification email
  → Carte bancaire enregistrée via Stripe Checkout (mode setup) — aucun prélèvement avant J21
  → Signature DPA (Yousign) intégrée à l'onboarding, avant Checkout
      |
      v
[2. Onboarding guidé]
  → Connexion de la 1ère intégration (Gorgias OU Shopify OU PrestaShop)
  → Import initial des données clients (sync)
  → Premier score de churn calculé en < 5min (objectif "Time to Value")
      |
      v
[3. Phase active (21 jours)]
  → Détection automatique des insatisfactions
  → Scoring churn
  → Propositions d'actions de récupération (mode MANUEL uniquement en trial)
  → Dashboard ROI basique (4 KPIs)
      |
      v
[4. Fin du trial]
  → J-7 : email rappel "Votre trial se termine dans 7 jours"
  → J-3 : email avec résumé des résultats + rappel de la conversion automatique
  → J-1 : email "Dernières 24h" + visuel du CA sauvé
  → J21 : conversion automatique — carte débitée (forfait 490€ HT + 1er mois 899€ HT), sauf annulation avant J21
      |
      v
[5. Conversion ou annulation]
  → Conversion (comportement par défaut) : activation complète du palier CoY, données conservées
  → Annulation avant J21 : aucun débit, données conservées 30 jours puis supprimées (RGPD)
```

---

## Restrictions du Trial

| Fonctionnalité | Disponible en Trial | Raison |
|----------------|-------------------|--------|
| Mode validation manuelle | Oui | Pour démontrer le produit sans risque |
| Mode automatique | Non | Sécurité — le tenant doit valider manuellement |
| Sciences comportementales | Loss Aversion + Réciprocité seulement | Montrer la valeur, limiter le scope |
| Dashboard ROI | 4 KPIs basiques uniquement | Teaser pour les fonctions avancées |
| Export CSV | Non | Réservé après conversion |
| SMS | Non (0/mois) | Activés à la conversion |
| Support | Email (réponse 48h) | SLA limité en trial |

---

## Gestion des quotas — palier unique CoY

### Compteurs

Les quotas sont suivis dans la table `usage_counters` (voir modele-donnees.md), avec une ligne par tenant par mois.

### Vérification des quotas

Avant chaque action du pipeline :

```
1. Lire usage_counters du tenant pour le mois en cours
2. Comparer avec les limites CoY (TRIAL_LIMITS ou COY_LIMITS)
3. Si quota atteint :
   → Bloquer l'action
   → Enregistrer "quota_exceeded" dans ai_decision_logs
   → Si premier dépassement du mois : envoyer notification au tenant
4. Si quota à 90% :
   → Envoyer notification "Vous avez utilisé 90% de votre quota"
```

### Alertes de quota

| Seuil | Action |
|-------|--------|
| 80% | Badge jaune dans le dashboard |
| 90% | Email de notification au tenant |
| 100% | Blocage + email + bandeau rouge dashboard |

---

## Reset des quotas

- **Mensuel** : les compteurs `actions_sent`, `emails_sent`, `sms_sent` sont remis à 0 le 1er de chaque mois (cron `usage-reset` à 00h01)
- **Trial** : les quotas trial sont fixes pour toute la durée des 21 jours (pas de reset)

---

## Emails du cycle Trial

| Jour | Email | Objet | Objectif |
|------|-------|-------|----------|
| J0 | Bienvenue | "Bienvenue sur WinBack Agent" | Onboarding, connecter l'intégration |
| J1 | Premier score | "Votre premier score de churn est prêt" | Engagement, montrer la valeur |
| J7 | Résumé semaine 1 | "Votre semaine 1 avec WinBack" | Résultats, encourager l'utilisation |
| J14 | Mi-parcours | "Il vous reste 7 jours de trial" | Récap + rappel de la conversion automatique |
| J18 | Rappel | "Plus que 3 jours" | Urgence douce + résumé CA sauvé |
| J-2 | Dernier rappel | "Votre abonnement CoY démarre dans 2 jours" | Rappel de la conversion automatique et du montant débité |
| J21 | Conversion | "Bienvenue dans votre abonnement CoY" | Confirmation de conversion, résumé des résultats trial |
| J28 (si annulé) | Relance | "Vos données seront supprimées dans 23 jours" | Loss aversion sur les données/résultats |

---

## Historique des changements

| Date | Changement | Auteur |
|------|-----------|--------|
| 2026-02-26 | Création du module free trial et quotas V1 | CoYia |
| 2026-09-08 | V2.0 — Palier unique CoY (ADR-017) : CB requise à l'inscription, conversion automatique à J21, forfait 490€ facturé à la conversion, quotas alignés sur TRIAL_LIMITS/COY_LIMITS | CoYia |
