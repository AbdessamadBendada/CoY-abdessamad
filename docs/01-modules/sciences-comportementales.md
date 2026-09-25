---
Statut: Validé
Version: 1.0
Priorité: P1
Dépendances: generation-emails-sms.md, actions-recuperation.md
Dernière mise à jour: 2026-02-26
---

# Module 3 : Sciences Comportementales

## Objectif

Intégrer des techniques de persuasion éthique (nudges comportementaux) dans les messages de récupération pour maximiser le taux de conversion, tout en restant transparent et respectueux.

---

## Principes éthiques

1. **Transparence** : le client sait qu'il reçoit un message commercial (mention AI Act + préfixe [Pub] SMS)
2. **Pas de manipulation dark pattern** : pas de fausse urgence, pas de fausse rareté
3. **Opt-out facile** : désabonnement en 1 clic
4. **Compensation réelle** : les codes promo fonctionnent réellement
5. **Bénéfice client** : chaque trigger doit offrir une valeur réelle au client

---

## Triggers comportementaux

### Catalogue complet

> Les 7 leviers ci-dessous correspondent exactement à `TRIGGER_ID_ALLOWLIST` (`winback-app/src/types/scenarios.ts`) — tous inclus, sans restriction, pour tout tenant CoY (ADR-017). "Timing Avancé" (présent dans une version antérieure de ce catalogue) n'existe pas dans l'allowlist technique et est retiré ici pour cohérence — ne pas le réintroduire sans mise à jour du code.

| # | Trigger | Description | Exemple d'application |
|---|---------|-------------|----------------------|
| 1 | **Loss Aversion** | Mettre en avant ce que le client va perdre s'il ne revient pas | "Vos 2 340 points fidélité expirent dans 14 jours" |
| 2 | **Réciprocité** | Offrir quelque chose en premier (compensation) pour créer un sentiment de dette | "En guise d'excuse, voici -15% sur votre prochaine commande" |
| 3 | **Urgence** | Créer un sentiment de temps limité (réel, pas artificiel) | "Ce code est valable 7 jours" |
| 4 | **Social Proof** | Montrer que d'autres clients sont satisfaits | "Rejoignez nos 12 000 clients satisfaits" |
| 5 | **Ancrage Prix** | Montrer la valeur de la compensation vs le prix normal | "Économisez 23 EUR (au lieu de 149 EUR, vous ne payez que 126 EUR)" |
| 6 | **Rareté** | Montrer que l'offre est limitée (stock réel, pas fictif) | "Plus que 3 exemplaires en stock" |
| 7 | **Personnalisation Ton** | Adapter le registre de langue au profil du client | Tutoiement pour les 18-25 si la marque le permet |

### Disponibilité — palier unique CoY (ADR-017)

Les 7 leviers sont inclus pour tout tenant CoY, sans gradation par palier — remplace la matrice à 4 colonnes (Essentiel/Starter/Croissance/Expert) de la v3.0.

---

## Implémentation dans les prompts

### Configuration dans le scénario

```json
{
  "triggers_config": {
    "tone": "empathique",
    "triggers": [
      {"id": "loss_aversion", "weight": 0.8, "enabled": true},
      {"id": "reciprocity", "weight": 0.7, "enabled": true},
      {"id": "urgency", "weight": 0.5, "enabled": true}
    ]
  }
}
```

### Injection dans le prompt de génération

Le prompt de génération (voir `generation-emails-sms.md`) reçoit la liste des triggers autorisés. Mistral Large décide quels triggers appliquer selon le contexte du client et retourne :

```json
{
  "triggers_applied": [
    {"trigger": "reciprocity", "phrase": "En guise d'excuse, nous vous offrons..."},
    {"trigger": "urgency", "phrase": "Ce code est valable pendant 7 jours seulement."}
  ]
}
```

### Limite de triggers par message
- **Email** : max 2-3 triggers (au-delà, le message semble forcé)
- **SMS** : max 1 trigger (espace limité)

---

## Trigger : Loss Aversion (détail)

### Principe psychologique
Les gens sont 2x plus motivés par la peur de perdre que par l'espoir de gagner (Kahneman & Tversky, 1979).

### Données nécessaires
- Points fidélité du client (si programme fidélité actif)
- Historique d'avantages utilisés
- Date d'expiration des avantages

### Exemples de phrases
- "Vos [X] points fidélité expirent le [date]"
- "Votre statut client privilégié sera désactivé sans commande d'ici le [date]"
- "Ne perdez pas vos avantages exclusifs"

### Garde-fou éthique
- Ne jamais inventer de points ou d'avantages inexistants
- Si pas de programme fidélité actif → ce trigger n'est pas applicable → ne pas l'utiliser

---

## Trigger : Réciprocité (détail)

### Principe psychologique
Quand quelqu'un nous offre quelque chose, on ressent le besoin de rendre la pareille (Cialdini, 1984).

### Implémentation
- Offrir la compensation AVANT de demander un achat
- Formuler comme un geste de bonne volonté, pas comme un pot-de-vin
- Le code/avantage est activé immédiatement, sans condition d'achat minimum si possible

### Exemples de phrases
- "En guise d'excuse pour cette situation, nous vous offrons -15%"
- "Pour compenser ce désagrément, bénéficiez de la livraison offerte"

---

## Trigger : Urgence (détail)

### Principe psychologique
Un temps limité pousse à l'action immédiate (Cialdini, 1984).

### Contrainte éthique
L'urgence doit être RÉELLE :
- Le code promo a réellement une date d'expiration
- Le stock est réellement limité (si mentionné)
- Jamais de compte à rebours factice

### Exemples de phrases
- "Ce code est valable pendant 7 jours"
- "Offre réservée jusqu'au [date réelle]"

### Ce qu'on ne fait PAS
- "Plus que 2h pour profiter de cette offre !!!" (fausse urgence)
- Compte à rebours qui se réinitialise
- "Dernière chance !" quand ce n'est pas vrai

---

## Trigger : Social Proof (détail)

### Principe psychologique
On se fie au comportement des autres pour décider (Cialdini, 1984).

### Données nécessaires
- Nombre de clients actifs du tenant (approximatif)
- Note moyenne des avis (si disponible)
- Nombre de commandes récentes

### Exemples de phrases
- "Comme [X] clients ce mois-ci, profitez de..."
- "Nos clients nous notent [X]/5 en moyenne"

### Contrainte
Les chiffres doivent être réels et vérifiables. Si pas de données disponibles → ne pas utiliser ce trigger.

---

## Mesure de l'efficacité des triggers

### Métriques par trigger

| Métrique | Calcul |
|----------|--------|
| Taux d'application | Messages contenant ce trigger / Messages total |
| Taux de conversion | Actions CONVERTED contenant ce trigger / Actions SENT contenant ce trigger |
| Lift vs sans trigger | Taux conversion avec trigger / Taux conversion sans trigger |

### Visible dans le dashboard (tout tenant CoY)
- Top 3 triggers les plus efficaces
- Suggestion d'optimisation : "Le trigger Loss Aversion convertit 2.3x mieux que la moyenne"

### A/B Testing (V2)
En V2, chaque action pourra être assignée à une variante (avec/sans trigger, trigger A vs B) pour mesurer précisément le lift de chaque technique.

---

## Historique des changements

| Date | Changement | Auteur |
|------|-----------|--------|
| 2026-02-26 | Création du module sciences comportementales V1 | CoYia |
