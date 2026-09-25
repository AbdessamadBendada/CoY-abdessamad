---
Statut: Validé
Version: 2.0
Priorité: P1
Dépendances: actions-recuperation.md, modele-donnees.md
Dernière mise à jour: 2026-09-08
---

# Module 4 : Dashboard ROI

## Objectif

Fournir un tableau de bord en temps réel montrant le ROI mesurable de WinBack Agent en euros : CA sauvé, taux de récupération, détails par client et par action.

---

## Accès — palier unique CoY (ADR-017)

| Fonctionnalité | CoY |
|----------------|-----|
| KPIs principaux (4 cartes) | Oui |
| Liste des actions (tableau) | Oui |
| Graphique CA sauvé (courbe) | Oui |
| Filtre par période | Oui |
| Détail par client | Oui |
| Comparaison périodes (M vs M-1) | Oui |
| Export CSV | Oui |
| Rapport PDF (mensuel ou personnalisé) | **Non implémenté** — aucune route, aucun bouton d'export PDF dans le code (confirmé par grep). Dette nommée dans `roadmap.md`, promesse retirée de toutes les surfaces publiques et dashboard par ADR-017, pas de date d'implémentation actée. |
| Webhook notifications | Non implémenté V1 |

---

## KPIs principaux (4 cartes)

Affichés en haut du dashboard, visibles par tous les paliers.

| Carte | Calcul | Icône |
|-------|--------|-------|
| **CA Sauvé** | SUM(revenue_recovered) des actions CONVERTED sur la période | EUR |
| **Taux de Récupération** | Actions CONVERTED / Actions SENT x 100 | % |
| **Actions ce mois** | COUNT actions SENT ce mois | Nombre |
| **ROI** | CA Sauvé / Coût abonnement WinBack | x |

### Période par défaut
- Sélectionnable pour tout tenant CoY (7j, 30j, 90j, 12 mois, personnalisé)

---

## Tableau des actions récentes

| Colonne | Description |
|---------|-------------|
| Date | Date d'envoi |
| Client | Prénom + initiale nom (ex: "Marie D.") |
| Score churn | Score au moment de l'action |
| Canal | Email ou SMS (icône) |
| Status | Badge coloré (SENT, OPENED, CLICKED, CONVERTED, EXPIRED) |
| Compensation | Code et valeur (ex: "-15% WINBACK2026") |
| CA Récupéré | Montant si CONVERTED, "-" sinon |

### Pagination
- 20 éléments par page
- Tri par défaut : date décroissante

### Filtres (tout tenant CoY)
- Par période
- Par status
- Par canal
- Par plage de score churn

---

## Graphique CA Sauvé (tout tenant CoY)

- **Type** : courbe linéaire (line chart)
- **Axe X** : jours (si période <= 90j) ou mois (si période > 90j)
- **Axe Y** : CA récupéré cumulé en EUR
- **Deuxième courbe** : nombre d'actions (axe Y secondaire)
- **Bibliothèque** : Recharts (léger, compatible React/Next.js)

---

## Détail par client (tout tenant CoY)

Page accessible en cliquant sur un client dans le tableau :

| Section | Contenu |
|---------|---------|
| Profil | Nom, email (masqué partiellement), LTV, commandes, ancienneté |
| Score churn actuel | Score + historique des scores (mini-graphe sparkline) |
| Actions WinBack | Historique de toutes les actions envoyées à ce client |
| Résultat | Converti ou non, CA attribué |
| Timeline | Frise chronologique : ticket → détection → action → résultat |

---

## Rapport PDF mensuel — non implémenté

Cette fonctionnalité (page de garde, résumé exécutif, top 10 clients récupérés, détail des actions, recommandations, comparaison M vs M-1) n'existe dans aucune surface du code (aucune route, aucun bouton, aucun cron de génération). Elle a été retirée de toutes les promesses publiques et dashboard par ADR-017. Dette nommée dans `roadmap.md` — pas de date d'implémentation actée.

---

## Export CSV (tout tenant CoY)

### Colonnes exportées
`date, client_email, client_name, churn_score, confidence, channel, status, compensation_type, compensation_value, compensation_code, revenue_recovered, sent_at, converted_at`

### Limite
- Max 10 000 lignes par export
- Un export par heure (rate limit)

---

## Widget ROI (intégrable)

Un mini-widget que le tenant peut afficher sur son site interne :

```
┌─────────────────────────────┐
│  WinBack Agent              │
│  CA sauvé ce mois: 2 340 EUR│
│  12 clients récupérés       │
│  ROI: 6.7x                  │
└─────────────────────────────┘
```

Disponible via une URL unique par tenant (token d'accès lecture seule), pour tout tenant CoY.

---

## Performances techniques

| Métrique | Objectif |
|----------|---------|
| Temps de chargement dashboard | < 2s |
| Rafraîchissement KPIs | Temps réel (polling 30s ou WebSocket) |
| Taille max export CSV | 10 000 lignes |

### Optimisations
- Vues matérialisées PostgreSQL pour les agrégations (CA sauvé par jour, par mois)
- Rafraîchissement des vues matérialisées toutes les 5 minutes via cron
- Index composites sur `(tenant_id, status, converted_at)` et `(tenant_id, created_at)`

---

## Historique des changements

| Date | Changement | Auteur |
|------|-----------|--------|
| 2026-02-26 | Création du module dashboard ROI V1 | CoYia |
| 2026-09-08 | V2.0 — Palier unique CoY (ADR-017) : matrice d'accès à 4 paliers remplacée par une grille à palier unique ; section "Rapport PDF mensuel" retirée (fonctionnalité inexistante dans le code, dette nommée dans `roadmap.md`) ; webhook notifications marqué non implémenté V1 | CoYia |
