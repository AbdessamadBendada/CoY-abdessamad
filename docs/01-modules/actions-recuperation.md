---
Statut: Validé
Version: 2.0
Priorité: P1
Dépendances: scoring-churn.md, generation-emails-sms.md, sciences-comportementales.md
Dernière mise à jour: 2026-09-08
---

# Module 2 : Actions de Récupération

## Objectif

Déclencher automatiquement des actions de récupération personnalisées quand un client est détecté à risque de churn (score >= seuil + confiance >= 0.70).

---

## Machine à états

```
[PENDING] → [APPROVED] → [SENT] → [DELIVERED] → [OPENED] → [CLICKED] → [CONVERTED]
    |            |           |          |                                     |
    v            |           v          v                                     v
[REJECTED]       |       [FAILED]   [EXPIRED]                            [FIN]
                 |           |
                 |           v
                 +----→ [SENT] (retry max 3x)
```

| Status | Description | Transition suivante |
|--------|-------------|-------------------|
| `PENDING` | Action créée, en attente validation ou envoi auto | APPROVED, SENT, REJECTED |
| `APPROVED` | Validée par le tenant (mode manuel) | SENT |
| `REJECTED` | Refusée par le tenant | FIN |
| `SENT` | Envoyée via le provider (Brevo/Twilio) | DELIVERED, FAILED |
| `FAILED` | Échec d'envoi (retry auto max 3x) | SENT (retry), EXPIRED |
| `DELIVERED` | Confirmation de délivrance par le provider | OPENED, EXPIRED |
| `OPENED` | Email ouvert (pixel tracking) | CLICKED, EXPIRED |
| `CLICKED` | CTA cliqué | CONVERTED, EXPIRED |
| `CONVERTED` | Achat détecté dans la fenêtre d'attribution | FIN |
| `EXPIRED` | Fenêtre d'attribution dépassée (30 jours par défaut) | FIN |

---

## Sélection du scénario

Quand une action est déclenchée :

1. Récupérer les scénarios actifs du tenant (`is_active = true`)
2. Filtrer par plage de score churn (`churn_score BETWEEN min AND max`)
3. Filtrer par canal disponible (email + SMS, tout tenant CoY — SMS activé à la conversion, 0 en essai)
4. Prendre le scénario avec la `priority` la plus haute
5. En cas d'égalité : prendre le moins utilisé (`usage_count`)
6. Si aucun scénario ne matche : utiliser le scénario système par défaut

---

## Sélection du canal

Palier unique CoY (ADR-017) : email + SMS (350/mois, activés à la conversion — 0 pendant l'essai). Sélection intelligente selon le score de churn, l'urgence et l'historique client, sans distinction de palier.

### Règle anti-doublons canal
Un même client ne reçoit pas email ET SMS pour le même événement. Un seul canal est choisi.

---

## Compensation

### Types supportés

| Type | Exemple | Disponibilité |
|------|---------|---------|
| `discount_percent` | -15% sur prochaine commande | Tout tenant CoY |
| `discount_fixed` | -10 EUR | Tout tenant CoY |
| `free_shipping` | Livraison offerte | Tout tenant CoY |
| `gift` | Échantillon/cadeau | Tout tenant CoY |
| `custom` | Texte libre | Tout tenant CoY |

### Calibrage selon LTV

| LTV client | Compensation max suggérée |
|------------|--------------------------|
| < 100 EUR | 5-10% ou 5 EUR |
| 100-500 EUR | 10-15% ou 15 EUR |
| 500-1 000 EUR | 15-20% ou 30 EUR |
| > 1 000 EUR | 20-25% ou 50 EUR |

Le tenant configure un plafond mensuel (`max_monthly_compensation_eur` dans settings). Par défaut : 500 EUR/mois.

---

## Garde-fous (obligatoires avant chaque envoi)

| # | Garde-fou | Règle | Si déclenché |
|---|-----------|-------|-------------|
| 1 | Anti-harcèlement | Max 1 action/7j, 3/30j, 6/90j par client | BLOQUÉ + log "cooldown_active" |
| 2 | Opt-out | Client a cliqué "se désinscrire" | BLOQUÉ + log "customer_opted_out" |
| 3 | Horaires SMS | SMS entre 8h00-20h00 (heure Paris) | File d'attente pour le lendemain 9h00 |
| 4 | Contenu | Pas de mots interdits, compensation <= max | Regénérer 1x, sinon BLOQUÉ |
| 5 | Quota financier | Total compensations < budget mensuel tenant | BLOQUÉ + notification |
| 6 | Mention AI Act | Message contient la mention obligatoire | Ajout automatique avant envoi |
| 7 | Quota actions | actions_sent < 1 500/mois (quota CoY) | BLOQUÉ + notification |

---

## Mode validation humaine vs automatique

| Mode | Comportement | Recommandé pour |
|------|-------------|-----------------|
| Manuel (défaut) | Action en PENDING → notification tenant → APPROVED/REJECTED | Trial, nouveaux tenants |
| Automatique | Action envoyée directement si confiance >= 0.85 | Tout tenant CoY, après période de confiance |
| Hybride | Auto si confiance >= 0.85, sinon validation humaine | Tout tenant CoY |

Le mode est configurable dans `tenants.settings.auto_send_mode`.

---

## Retry et fallback

| Situation | Comportement |
|-----------|-------------|
| Brevo Email échoue | Retry 3x (backoff exponentiel : 0, 5min, 30min) |
| Brevo Email échoue 3x | Fallback vers Resend |
| Brevo SMS échoue | Retry 3x |
| Brevo SMS échoue 3x | Fallback vers Twilio |
| Provider indisponible > 1h | Alerte admin, actions en file d'attente |

---

## Tracking post-envoi

| Événement | Mécanisme | Mise à jour |
|-----------|-----------|-------------|
| Email ouvert | Pixel tracking (Brevo webhook) | status → OPENED, opened_at |
| Email cliqué | Lien tracké (Brevo webhook) | status → CLICKED, clicked_at |
| SMS cliqué | Lien court tracké | status → CLICKED, clicked_at |
| Achat post-action | Webhook Shopify/PrestaShop `order.created` | Vérification attribution → CONVERTED |

### Fenêtre d'attribution
- Par défaut : 30 jours
- Configurable par le tenant : 7 à 60 jours
- Un achat est attribué à WinBack uniquement si le même client achète dans la fenêtre ET après l'envoi de l'action

---

## Quotas — palier unique CoY (ADR-017)

| Palier | Actions/mois | SMS/mois |
|--------|-------------|----------|
| Trial (21j, CB requise à l'inscription) | 1 500 | 0 (activés à la conversion) |
| CoY (899€ HT/mois) | 1 500 | 350 |

---

## Historique des changements

| Date | Changement | Auteur |
|------|-----------|--------|
| 2026-02-26 | Création du module actions de récupération V1 | CoYia |
