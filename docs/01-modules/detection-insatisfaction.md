---
Statut: Validé
Version: 1.1
Priorité: P1
Dépendances: flux-agentique.md, modele-donnees.md
Dernière mise à jour: 2026-09-08
---

# Module 1 : Détection d'Insatisfaction

## Objectif

Détecter automatiquement les signaux d'insatisfaction dans les conversations de service client (tickets Gorgias) et les événements e-commerce (Shopify, PrestaShop) en temps réel.

---

## Sources de détection

### 1. Tickets Helpdesk (Gorgias — P1)

| Événement | Signal | Poids |
|-----------|--------|-------|
| `ticket.created` | Nouveau ticket = contact initié par le client | Déclencheur principal |
| `ticket.updated` | Message de suivi = potentielle escalade | Réévaluation du score |
| `ticket.closed` (CSAT faible) | Satisfaction explicite basse (1-2/5) | Signal fort |

### 2. Événements E-commerce (Shopify / PrestaShop — P1)

| Événement | Signal | Poids |
|-----------|--------|-------|
| `order.cancelled` | Client annule une commande | Signal fort |
| `refund.created` | Remboursement demandé | Signal fort |
| `return.requested` | Retour produit | Signal modéré |

### 3. Signaux Combinés (enrichissement)

| Signal | Détection | Poids |
|--------|-----------|-------|
| Tickets multiples en 90 jours | >= 2 tickets | Multiplicateur score |
| Inactivité prolongée | Pas de commande > 2x fréquence habituelle | Signal faible proactif |
| Baisse de fréquence d'achat | Écart vs moyenne historique | Signal faible proactif |

---

## Pipeline de détection

```
Webhook reçu
    |
    v
[1. Validation + Déduplication]
    |
    v
[2. Normalisation de l'événement]
    |
    v
[3. Classification d'Intent]
    → Appel Mistral API (mistral-small-latest)
    → 8 catégories : COMPLAINT, REFUND_REQUEST, PRODUCT_ISSUE,
      DELIVERY_ISSUE, BILLING_ISSUE, GENERAL_INQUIRY, PRAISE, SPAM
    → requires_analysis = true si catégorie à risque
    |
    v
[4. Analyse de Sentiment]
    → Appel Mistral API (mistral-large-latest)
    → Score sentiment : -1.0 à +1.0
    → Émotions détectées, intensité, ironie
    → Risque d'escalade : low/medium/high/critical
    |
    v
[5. Enrichissement Client]
    → API Shopify/PrestaShop (LTV, commandes, historique)
    → API Gorgias (tickets 90j, résolution)
    → Cache 6h pour éviter les appels redondants
    |
    v
[6. Scoring Churn]
    → Score hybride (algo 70% + IA 30%)
    → Voir module scoring-churn.md
    |
    v
[7. Score de confiance]
    → Règles déterministes (pas d'IA)
    → Seuil : >= 0.70 pour déclencher une action
    |
    v
[8. Décision]
    → Score > seuil ET confiance > 70%
        → OUI : déclencher module Actions de Récupération
        → NON : stocker le score, pas d'action
```

---

## Classification d'Intent — Détail

### Catégories et comportement

| Catégorie | requires_analysis | Exemples |
|-----------|------------------|----------|
| `COMPLAINT` | true | "Je suis déçu", "C'est inadmissible" |
| `REFUND_REQUEST` | true | "Je veux un remboursement" |
| `PRODUCT_ISSUE` | true | "Le produit est cassé", "Taille incorrecte" |
| `DELIVERY_ISSUE` | true | "Mon colis n'est pas arrivé" |
| `BILLING_ISSUE` | true | "J'ai été facturé deux fois" |
| `GENERAL_INQUIRY` | false | "Quel est le délai de livraison ?" |
| `PRAISE` | false | "Merci, tout est parfait" |
| `SPAM` | false | Messages automatiques, publicité |

### Performance
- Modèle : Mistral Small (`mistral-small-latest` — rapide et économique)
- Latence cible : < 1s

---

## Analyse de Sentiment — Détail

### Output structuré

```json
{
  "sentiment_score": -0.72,
  "sentiment_label": "negative",
  "emotions_detected": ["frustration", "disappointment"],
  "intensity": "high",
  "irony_detected": false,
  "escalation_risk": "high",
  "key_phrases": ["attends depuis 10 jours", "aucune réponse"],
  "confidence": 0.91
}
```

### Spécificités françaises

Le prompt est optimisé pour le français. Cas particuliers gérés :

| Cas | Exemple | Traitement |
|-----|---------|------------|
| Ironie | "Bravo, vraiment un service 5 étoiles" | `irony_detected: true`, sentiment inversé |
| Politesse masquante | "Merci mais j'aimerais un remboursement" | Détection du sentiment réel derrière la politesse |
| Vouvoiement formel | "Je vous serais reconnaissant de..." | Le vouvoiement ne masque pas l'insatisfaction |
| Argot / familier | "C'est nul votre truc" | Compris et correctement scoreé |
| Émoticônes | "Toujours pas reçu 😡" | Pris en compte dans l'analyse |

### Performance
- Modèle : Mistral Large (`mistral-large-latest` — plus précis pour le sentiment)
- Latence cible : < 2s

---

## Alertes et notifications

### Alertes configurables par le tenant

| Type d'alerte | Seuil par défaut | Canaux |
|---------------|-----------------|--------|
| Score churn élevé | >= 80 | Email + Dashboard |
| Score churn critique | >= 90 | Email + Dashboard + Badge |
| Nouveau client à risque | Premier score > 65 | Dashboard |
| Quota actions 90% atteint | 90% du quota mensuel | Email |

### Fréquence des alertes
- Temps réel pour les scores critiques (>= 90)
- Digest quotidien (18h00) pour les scores élevés (80-89)
- Pas de notification pour les scores < 80 (consultable dans le dashboard)

---

## Métriques de performance du module

| Métrique | Objectif | Mesure |
|----------|---------|--------|
| Taux de détection | >= 95% | Events traités / Events reçus |
| Latence totale pipeline | < 10s | Webhook reçu → score calculé |
| Précision sentiment | >= 85% | Validation manuelle beta (M5) |
| Faux positifs (score > seuil) | < 15% | Actions rejetées par le tenant / actions proposées |

---

## Quotas — palier unique CoY (ADR-017)

| Palier | Customers trackés |
|--------|------------------|
| Trial (21j, CB requise à l'inscription) | 10 000 |
| CoY (899€ HT/mois) | 10 000 |

Le volume d'événements analysés (webhooks helpdesk/e-commerce) n'est pas quotifié séparément dans le code (`limit-quotas.md`, `COY_LIMITS`) — seul le nombre de clients suivis et le nombre d'actions envoyées par mois le sont.

---

## Historique des changements

| Date | Changement | Auteur |
|------|-----------|--------|
| 2026-02-26 | Création du module détection V1 | CoYia |
