---
Statut: Validé
Version: 1.0
Priorité: P1
Dépendances: detection-insatisfaction.md, flux-agentique.md
Dernière mise à jour: 2026-02-26
---

# Module : Scoring Churn (0-100)

## Objectif

Calculer un score de risque de churn de 0 à 100 pour chaque client détecté comme potentiellement insatisfait. Le score est hybride : 70% algorithmique (pondération fixe) + 30% IA (ajustement contextuel).

---

## Formule de scoring

```
Score Final = Score Algorithmique de Base x Facteur d'Ajustement IA

Score Algorithmique (0-100) :
  Sentiment (30%) + Réclamations (25%) + LTV (20%) + Résolution (15%) + Ancienneté (10%)

Facteur IA : 0.8 à 1.2 (ajustement contextuel par Mistral Large)
```

---

## Grille de scoring algorithmique

### Composante Sentiment (30 points max)

| Score sentiment | Points |
|----------------|--------|
| -1.0 à -0.8 (très négatif) | 30 |
| -0.8 à -0.5 (négatif) | 22 |
| -0.5 à -0.2 (légèrement négatif) | 14 |
| -0.2 à 0.0 (neutre-) | 7 |
| 0.0 à +1.0 (positif) | 0 |

### Composante Réclamations 90 jours (25 points max)

| Nombre de tickets | Points |
|-------------------|--------|
| 0 | 0 |
| 1 | 8 |
| 2 | 15 |
| 3 | 20 |
| 4+ | 25 |

### Composante LTV (20 points max)

Plus le client est précieux, plus le score est élevé (on veut prioriser les clients à forte valeur).

| Percentile LTV du tenant | Points |
|--------------------------|--------|
| Top 10% | 20 |
| Top 20% | 16 |
| Top 50% | 12 |
| Bottom 50% | 6 |
| Bottom 20% | 3 |

### Composante Délai de Résolution (15 points max)

| Délai moyen résolution | Points |
|------------------------|--------|
| > 72h | 15 |
| 48-72h | 12 |
| 24-48h | 8 |
| 12-24h | 4 |
| < 12h | 0 |

### Composante Ancienneté (10 points max)

| Ancienneté client | Points | Logique |
|-------------------|--------|---------|
| < 3 mois | 3 | Nouveau, pas encore fidèle |
| 3-6 mois | 5 | En cours de fidélisation |
| 6-12 mois | 7 | Client régulier |
| 12-24 mois | 10 | Client fidèle, perte grave |
| > 24 mois | 8 | Très fidèle, plus résilient |

---

## Ajustement IA

Claude Sonnet analyse le contexte complet et applique un multiplicateur entre 0.8 et 1.2 :

### Facteurs d'augmentation du score
- Le client mentionne un concurrent
- Menace de plainte publique (avis Google, réseaux sociaux)
- Ton résigné (départ silencieux = plus dangereux que la colère)
- Plusieurs problèmes cumulés en peu de temps
- Le client a déjà été récupéré par le passé (fatigue)

### Facteurs de diminution du score
- Client très fidèle et première plainte
- Problème facilement résolvable (retard ponctuel)
- Le client exprime encore de l'engagement ("j'aime votre marque mais...")

### Performance
- Modèle : Mistral Large (`mistral-large-latest`)
- Latence cible : < 3s

---

## Interprétation des scores

| Plage | Niveau de risque | Action recommandée |
|-------|-----------------|-------------------|
| 0-30 | Faible | Aucune action. Stockage du score uniquement. |
| 31-50 | Modéré | Aucune action automatique. Visible dans le dashboard. |
| 51-64 | Élevé | Notification au tenant (digest quotidien). Pas d'action automatique. |
| 65-79 | Haut | Action de récupération déclenchée (email). Seuil par défaut. |
| 80-89 | Très haut | Action prioritaire (email + SMS si disponible). Notification temps réel. |
| 90-100 | Critique | Action immédiate. Escalade humaine recommandée. Notification temps réel. |

**Seuil configurable** : le tenant peut ajuster le seuil de déclenchement (par défaut 65). Minimum autorisé : 50. Maximum autorisé : 90.

---

## Score de confiance

Le score de confiance (0.00 à 1.00) évalue la fiabilité du scoring.

### Facteurs de réduction
| Facteur | Pénalité |
|---------|----------|
| Message < 20 caractères | -0.20 |
| Langue non française | -0.10 |
| Pas d'historique d'achat | -0.15 |
| Premier contact (pas d'historique tickets) | -0.05 |
| Intent classification incertaine (< 0.7) | -0.15 |
| Sentiment analysis incertaine (< 0.7) | -0.15 |
| Ironie détectée | -0.10 |

### Facteurs de bonus
| Facteur | Bonus |
|---------|-------|
| Profil riche (> 5 commandes + tickets) | +0.05 |
| CSAT explicite disponible | +0.10 |

### Comportement selon confiance

| Confiance | Comportement |
|-----------|-------------|
| >= 0.85 | Action automatique (si mode auto activé) |
| 0.70-0.84 | Action auto OU validation humaine (selon config) |
| 0.50-0.69 | Stockage du score, pas d'action. Notification si score > 80 |
| < 0.50 | Score stocké, marqué "low_confidence", pas d'action ni notification |

---

## Réévaluation du score

Le score d'un client est recalculé quand :

| Événement | Comportement |
|-----------|-------------|
| Nouveau ticket | Recalcul complet |
| Mise à jour ticket | Recalcul si nouveau message client (pas agent) |
| CSAT reçu | Recalcul avec bonus confiance |
| Commande passée | Score remis à 0 (le client a acheté = pas churné) |
| Action WinBack convertie | Score remis à 0 + customer.recovery_count++ |

---

---

## Scoring Produit (V2 — tout tenant CoY)

> **Disponibilité** : tout tenant CoY (ADR-017 — palier unique, pas de gating par palier).
> **Décision** : 26/04/2026 — CoYia. Disponibilité mise à jour 08/09/2026 (ADR-017).
> **Prérequis** : permission `order_details` GET activée sur la clé Webservice PrestaShop ; `line_items` dans le payload Shopify.

### Principe

Le scoring produit n'introduit **pas de nouvelle composante pondérée** dans la formule V1 (les 5 composantes totalisent 100 points). Il enrichit le **contexte transmis à Mistral Large** pour affiner le multiplicateur IA (0.8 → 1.2).

La formule algorithmique reste inchangée. Le produit est un signal contextuel, pas un 6e pilier.

### Signaux produits analysés

| Signal | Source données | Impact sur l'ajustement IA |
|--------|---------------|---------------------------|
| Catégorie récurrente soudainement absente | `order_details` + historique commandes | Facteur d'augmentation (signal départ silencieux) |
| Retour/remboursement sur même produit (≥2×) | `order_details` + `order_histories` | Facteur d'augmentation fort (insatisfaction produit confirmée) |
| Baisse panier moyen >30% sur 3 dernières commandes | `order_details` | Facteur d'augmentation modéré |
| Réservation click&collect jamais retirée >7j | `order_histories` + `order_states` | CONFIRMED → PENDING (correction état) + facteur d'augmentation |

### Gating plan

```typescript
// Dans l'agent scoring — activé pour tout tenant CoY (ADR-017)
if (tenant.plan === "COY") {
  const productContext = await fetchOrderDetails(tenantId, customerId);
  // enrichir le prompt Mistral avec productContext
}
```

### Calibration

Les poids exacts du multiplicateur produit seront calibrés après **200+ conversations beta réelles** — voir section 🔵 À surveiller.

---

## Correction order_states dynamiques (V2 — tous plans)

> **Décision** : 26/04/2026 — applicable à toutes les intégrations e-commerce (PrestaShop + Shopify).

### Problème actuel

`mapPrestaShopStatus()` hardcode les IDs d'états PS par défaut. Les clients avec click&collect ou réservation utilisent des **états personnalisés** (ex : "En attente de retrait", "Réservé", "Annulé en boutique") qui tombent tous dans `"CONFIRMED"` — incorrect.

### Fix V2

Appel `GET /api/order_states` au moment de la sync → map dynamique `id → label → OrderStatus` par analyse sémantique des labels (Mistral Small ou règles regex) :

```
label contient "annul" → CANCELLED
label contient "retrait" ou "livré" ou "remis" → DELIVERED
label contient "attente" ou "en cours" → PENDING
label contient "retour" → RETURNED
```

---

## Historique des changements

| Date | Changement | Auteur |
|------|-----------|--------|
| 2026-04-26 | Ajout section scoring produit V2 (Croissance+) + correction order_states dynamiques | CoYia |
| 2026-09-08 | Palier unique CoY (ADR-017) : scoring produit V2 ouvert à tout tenant CoY, gating par palier retiré | CoYia |
| 2026-02-26 | Création du module scoring churn V1 | CoYia |
