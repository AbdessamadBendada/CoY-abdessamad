---
Statut: VALIDÉ
Version: 1.0
Date: 2026-09-10
Priorité: P1 — Spec de contenu, implémentation code hors périmètre
Dépendances : aucune (fichier autonome dans ce dépôt)
---

# Spec — Templates sectoriels Mode & Décoration

> ⚠️ **Ce fichier est une spécification de contenu, pas du code.** Il documente les 8 nouveaux gabarits de scénarios de récupération WinBack (4 Mode + 4 Décoration).

## Correction de conception (round 2, ADR-017)

La spec initiale envisageait une structure `minPlan: STARTER | CROISSANCE | EXPERT` par gabarit, sur le modèle historique de `scenario-templates.ts`. **Retirée.** ADR-017 a aboli le gating par palier (palier unique COY, 25 scénarios et les 7 leviers comportementaux pour tous les tenants, `isPlanEligible` retourne `true` inconditionnellement). Les 8 gabarits ci-dessous sont tous disponibles au palier unique, différenciés uniquement par signal déclencheur, plage de score, canal et ton — jamais par palier.

---

## Gabarits Mode (4)

### `mode-taille-non-conforme`
- **Nom** : Retour taille — Seconde chance
- **Description** : Cible une cliente ayant retourné un article pour cause de taille non conforme, sans réachat dans les 60 jours suivants
- **Plage de score churn** : 60-79
- **Canal** : Email
- **Ton** : Empathique, non culpabilisant sur le retour
- **Compensation suggérée** : Code promo modéré ou guide des tailles personnalisé

### `mode-qualite-decue`
- **Nom** : Déception qualité — Maintien relation
- **Description** : Cible un client ayant exprimé (ticket SAV) une déception sur la qualité perçue vs le prix
- **Plage de score churn** : 60-79
- **Canal** : Email
- **Ton** : Reconnaissance du problème, sans excuse générique

### `mode-silence-post-retour`
- **Nom** : Silence après retour — Réengagement
- **Description** : Cible une cliente qui a retourné un article sans laisser de commentaire, et n'a pas recommandé depuis (signal de déception silencieuse, cœur du persona Léa)
- **Plage de score churn** : 80-89
- **Canal** : Email — amendement chantier B (10/09/2026) : `CoyTemplate.channel` dans `src/config/scenario-templates.ts` est une valeur unique (`"EMAIL" | "SMS" | null`), pas un tableau. "Email + SMS" ne peut pas être représenté simultanément ; Email retenu comme canal primaire, pas de perte fonctionnelle (le template `mode-risque-critique` ci-dessous couvre le canal SMS pour le score le plus critique).
- **Ton** : Direct, orienté seconde chance

### `mode-risque-critique`
- **Nom** : Risque critique — Urgence calibrée
- **Description** : Cliente à très haut risque de départ (plusieurs retours + silence prolongé), avant qu'elle ne se tourne vers une alternative (seconde main ou concurrent)
- **Plage de score churn** : 90+
- **Canal** : SMS
- **Ton** : Urgence calibrée, compensation plus significative

---

## Gabarits Décoration (4)

### `deco-colis-abime`
- **Nom** : Colis abîmé — Rattrapage immédiat
- **Description** : Cible un client ayant signalé un produit endommagé à la livraison
- **Plage de score churn** : 70-89
- **Canal** : Email
- **Ton** : Réactif, orienté résolution rapide (remplacement/remboursement clair)

### `deco-retard-livraison`
- **Nom** : Retard livraison — Transparence proactive
- **Description** : Cible un client dont la livraison dépasse significativement le délai annoncé sur un produit volumineux
- **Plage de score churn** : 60-79
- **Canal** : Email
- **Ton** : Transparent, sans excuse générique sur le transporteur

### `deco-silence-post-reclamation`
- **Nom** : Silence après réclamation — Dernière tentative
- **Description** : Cible un client qui n'a plus répondu après un premier message de suivi post-incident (cœur du persona Nicolas — l'occasion de rattrapage rare)
- **Plage de score churn** : 80-89
- **Canal** : Email
- **Ton** : Direct, rappel explicite de l'enjeu de la relation

### `deco-montage-difficile`
- **Nom** : Montage difficile — Support renforcé
- **Description** : Cible un client ayant signalé une difficulté de montage/assemblage ou des pièces manquantes
- **Plage de score churn** : 60-79
- **Canal** : Email
- **Ton** : Pratique, orienté support (lien tutoriel, contact SAV senior)

---

## Notes pour l'implémentation code (hors périmètre de ce document)

- Interface à respecter : `CoyTemplate` (`src/config/scenario-templates.ts`), champ `sectors: string[]` avec les libellés exacts qui remplaceront `Tenant.sector` pour Mode et Décoration (à définir lors de la migration code — actuellement aucune valeur n'existe en base pour ces deux secteurs).
- ⚠️ Dette signalée (hors périmètre) : `Tenant.sector` est une chaîne libre répliquée sous plusieurs encodages incohérents dans le code (libellés longs, clés courtes `check-attribution.ts`/`scoring.ts`) — la migration Mode/Décoration devra choisir une source de vérité unique plutôt que reproduire cette incohérence pour 2 secteurs de plus.
- `subjectTemplate`/`contentTemplate` volontairement omis de cette spec, comme pour les templates existants — le marchand rédige son propre message, le gabarit ne fixe que le déclencheur/ton/canal.
