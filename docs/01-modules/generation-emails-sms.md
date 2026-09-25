---
Statut: Validé
Version: 1.0
Priorité: P1
Dépendances: actions-recuperation.md, sciences-comportementales.md
Dernière mise à jour: 2026-02-26
---

# Module : Génération de Messages de Récupération

## Objectif

Générer des emails et SMS de récupération personnalisés, psychologiquement optimisés, conformes à la réglementation française (AI Act, RGPD, CNIL).

---

## Modèle IA utilisé

| Canal | Modèle | Latence cible |
|-------|--------|---------------|
| Email | Mistral Large (`mistral-large-latest`) | < 4s |
| SMS | Mistral Large (`mistral-large-latest`) | < 2s |

---

## Règles de génération — Email

### Contraintes absolues

1. **Vouvoiement** par défaut (sauf config tenant `use_vouvoiement: false`)
2. **Ton** défini par le scénario : `empathique`, `empathique_urgent`, `direct`, `direct_urgent`
3. **Longueur** : 150-300 mots
4. **Un seul CTA** clair et visible
5. **Mention AI Act obligatoire** en pied de mail (petits caractères) : `"Ce message a été personnalisé avec l'assistance de notre outil de relation client."`
6. **Signature humaine** : nom du service client de la marque (pas "WinBack Agent")
7. **Mots interdits** : churn, rétention, algorithme, IA, intelligence artificielle, machine learning, scoring, automatique
8. **Personnalisation** : mentionner le problème spécifique du client
9. **Compensation** : doit sembler généreuse mais pas suspecte

### Structure email type

```
Objet : [Personnalisé, max 60 caractères, pas de MAJUSCULES abusives]

Bonjour [Prénom],

[Paragraphe 1 — Reconnaissance du problème]
Montrer qu'on a compris la situation spécifique du client.

[Paragraphe 2 — Trigger comportemental]
Appliquer le trigger psychologique sélectionné (voir sciences-comportementales.md).

[Paragraphe 3 — Compensation + CTA]
Présenter l'offre de récupération avec un lien/code clair.

[Signature]
L'équipe [Nom de la marque]

---
Ce message a été personnalisé avec l'assistance de notre outil de relation client.
```

---

## Règles de génération — SMS

### Contraintes absolues

1. **Max 160 caractères** (1 SMS, pas de concaténation)
2. **Préfixe `[Pub]`** en début de SMS (obligation légale française CNIL)
3. **Vouvoiement** par défaut
4. **Un lien court** (via raccourcisseur)
5. **Code promo** si applicable
6. **Pas de mention AI Act** dans le SMS (pas d'espace, mention sur la page de destination)

### Structure SMS type

```
[Pub] Bonjour [Prénom], [message personnalisé court]. Code -[X]% : [CODE]. Valable [X]j : [lien] STOP au [numéro]
```

**STOP SMS** : obligation légale — le lien de désinscription doit être fonctionnel et traité en < 24h.

---

## Validation du contenu avant envoi

### Checklist automatique

| Vérification | Action si échec |
|-------------|----------------|
| Mots interdits présents | Regénérer le message (1 retry) |
| Mention AI Act absente (email) | Ajouter automatiquement |
| Compensation > max configuré | Bloquer + alerte |
| Objet email > 60 caractères | Tronquer intelligemment |
| SMS > 160 caractères | Regénérer (1 retry) |
| Lien CTA manquant | Bloquer + alerte |
| Préfixe [Pub] manquant (SMS) | Ajouter automatiquement |
| STOP manquant (SMS) | Ajouter automatiquement |

### Limite de regénération
- Maximum 1 regénération par action
- Si la 2e tentative échoue aussi → action BLOQUÉE + alerte admin
- Log dans `ai_decision_logs` avec `decision_outcome: "content_validation_failed"`

---

## Templates de fallback

Si Mistral API est indisponible (après 3 retries), utiliser des templates statiques :

### Email fallback

```
Objet : [Prénom], nous souhaitons nous excuser

Bonjour [Prénom],

Nous avons pris connaissance de votre récente expérience avec [Marque]
et nous en sommes sincèrement désolés.

Pour vous remercier de votre fidélité, nous vous offrons [compensation]
sur votre prochaine commande avec le code [CODE].

Ce code est valable pendant [X] jours.

À très bientôt,
L'équipe [Marque]

---
Ce message a été personnalisé avec l'assistance de notre outil de relation client.
```

### SMS fallback

```
[Pub] Bonjour [Prénom], -[X]% sur votre prochaine commande [Marque] avec le code [CODE]. Valable [X]j. STOP au [numéro]
```

---

## Personnalisation par tone

| Tone | Caractéristiques | Quand utiliser |
|------|-----------------|----------------|
| `empathique` | Chaleureux, compréhensif, pas corporate | Score 65-79, premier contact |
| `empathique_urgent` | Empathique + sentiment d'urgence | Score 80-89 |
| `direct` | Concis, professionnel, orienté solution | SMS, clients B2B |
| `direct_urgent` | Direct + compensation visible immédiatement | Score 90+, SMS critique |

---

## Historique des changements

| Date | Changement | Auteur |
|------|-----------|--------|
| 2026-02-26 | Création du module génération messages V1 | CoYia |
