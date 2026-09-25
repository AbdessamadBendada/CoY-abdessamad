---
Statut: Validé
Version: 1.0
Priorité: Fondation
Dépendances: flux-agentique.md, stack-technique.md (ADR-004)
Dernière mise à jour: 2026-02-26
---

# Modèle de Données — WinBack Agent

## Principes

1. **PostgreSQL** hébergé sur Supabase (Cloud EU MVP, self-hosted OVHcloud post-MVP)
2. **Multi-tenant** : chaque table porte un `tenant_id`, isolation via Row Level Security (RLS)
3. **Prisma** comme ORM — migrations versionnées
4. **JSONB** pour les données flexibles (metadata, triggers_config, compensation)
5. **Soft delete** avec `deleted_at` sur les tables critiques (conformité RGPD — droit à l'effacement)
6. **Timestamps UTC** partout — conversion en heure locale côté frontend uniquement
7. **UUID v4** comme clés primaires — pas d'IDs séquentiels (sécurité + multi-tenant)

---

## Diagramme Entité-Relation

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   tenants    │────<│  integrations    │     │   users          │
│              │     │                  │     │                  │
│ id (PK)      │     │ id (PK)          │     │ id (PK)          │
│ company_name │     │ tenant_id (FK)   │     │ tenant_id (FK)   │
│ plan         │     │ platform         │     │ email            │
│ status       │     │ credentials_enc  │     │ role             │
│ settings     │     │ webhook_secret   │     │ auth_provider_id │
└──────┬───────┘     └──────────────────┘     └──────────────────┘
       │
       │ 1:N
       ▼
┌──────────────────┐     ┌──────────────────┐
│   customers      │────<│   events         │
│                  │     │                  │
│ id (PK)          │     │ id (PK)          │
│ tenant_id (FK)   │     │ tenant_id (FK)   │
│ external_id      │     │ customer_id (FK) │
│ email            │     │ source_platform  │
│ ltv              │     │ event_type       │
│ churn_score      │     │ raw_payload      │
│ total_orders     │     │ processed        │
└──────┬───────────┘     └──────────────────┘
       │
       │ 1:N
       ▼
┌──────────────────┐     ┌──────────────────┐
│ recovery_actions │────<│ ai_decision_logs │
│                  │     │                  │
│ id (PK)          │     │ id (PK)          │
│ tenant_id (FK)   │     │ tenant_id (FK)   │
│ customer_id (FK) │     │ action_id (FK)   │
│ scenario_id (FK) │     │ step_type        │
│ channel          │     │ model_used       │
│ status           │     │ prompt_hash      │
│ churn_score      │     │ response_summary │
│ revenue_recovered│     │ cost_estimated   │
└──────────────────┘     └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│   scenarios      │     │  usage_counters  │
│                  │     │                  │
│ id (PK)          │     │ id (PK)          │
│ tenant_id (FK)   │     │ tenant_id (FK)   │
│ name             │     │ period_month     │
│ channel          │     │ actions_sent     │
│ triggers_config  │     │ emails_sent      │
│ compensation     │     │ sms_sent         │
│ is_active        │     │ api_calls        │
└──────────────────┘     └──────────────────┘
```

---

## Tables détaillées

### tenants

Table centrale — chaque PME cliente de WinBack.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PK, DEFAULT uuid_generate_v4() | Identifiant unique |
| `company_name` | VARCHAR(255) | NOT NULL | Nom de l'entreprise |
| `company_domain` | VARCHAR(255) | UNIQUE | Domaine web (ex: monshop.fr) |
| `plan` | ENUM | NOT NULL, DEFAULT 'coy' | `coy` (défaut, y compris en trial — ADR-017), `essentiel`, `starter`, `croissance`, `expert` conservés pour compatibilité (0 tenant sur ces valeurs au 08/09/2026), `churned` |
| `plan_started_at` | TIMESTAMPTZ | | Début de l'abonnement payant |
| `trial_started_at` | TIMESTAMPTZ | | Début du trial 21 jours |
| `trial_ends_at` | TIMESTAMPTZ | | Fin du trial (calculé : trial_started_at + 21 jours) |
| `billing_cycle` | ENUM | DEFAULT 'monthly' | `monthly` (seule valeur utilisée — palier CoY mensuel uniquement, ADR-017), `annual` conservé pour compatibilité |
| `stripe_customer_id` | VARCHAR(255) | UNIQUE | ID client Stripe |
| `stripe_subscription_id` | VARCHAR(255) | UNIQUE | ID abonnement Stripe |
| `settings` | JSONB | DEFAULT '{}' | Paramètres configurables (seuil churn, mode auto/manuel, etc.) |
| `status` | ENUM | NOT NULL, DEFAULT 'active' | `active`, `suspended`, `churned` |
| `onboarding_completed` | BOOLEAN | DEFAULT false | Onboarding terminé |
| `dpa_signed_at` | TIMESTAMPTZ | | Date de signature du DPA (Yousign) |
| `dpa_document_id` | VARCHAR(255) | | ID document Yousign |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |
| `deleted_at` | TIMESTAMPTZ | | Soft delete |

**Index** : `plan`, `status`, `stripe_customer_id`

**Settings JSONB par défaut** :

```json
{
  "churn_score_threshold": 65,
  "auto_send_mode": false,
  "auto_send_min_confidence": 0.85,
  "notification_email": true,
  "notification_slack": false,
  "default_tone": "empathique",
  "use_vouvoiement": true,
  "timezone": "Europe/Paris",
  "max_monthly_compensation_eur": 500,
  "cooldown_days": 7,
  "attribution_window_days": 30,
  "sector": "default"
}
```

---

### users

Utilisateurs du dashboard WinBack (pas les clients finaux des PME).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK tenants(id), NOT NULL | |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | |
| `full_name` | VARCHAR(255) | | |
| `role` | ENUM | NOT NULL, DEFAULT 'member' | `owner`, `admin`, `member`, `viewer` |
| `auth_provider_id` | VARCHAR(255) | UNIQUE | ID Supabase Auth |
| `last_login_at` | TIMESTAMPTZ | | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |
| `deleted_at` | TIMESTAMPTZ | | Soft delete |

**RLS** : `WHERE tenant_id = auth.jwt() -> 'tenant_id'`

**Limites** (palier unique CoY, ADR-017) :

| Palier | Utilisateurs max |
|--------|-----------------|
| Trial | 1 |
| CoY | 1 (V1 — RBAC multi-utilisateurs en V2) |

---

### integrations

Connexions aux plateformes tierces (Gorgias, Shopify, PrestaShop).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK tenants(id), NOT NULL | |
| `platform` | ENUM | NOT NULL | `gorgias`, `shopify`, `prestashop` |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' | `pending`, `active`, `error`, `disconnected` |
| `shop_domain` | VARCHAR(255) | | Domaine de la boutique |
| `credentials_encrypted` | TEXT | NOT NULL | Credentials chiffrées (AES-256-GCM) |
| `webhook_secret` | VARCHAR(255) | NOT NULL | Secret pour vérifier les webhooks entrants |
| `webhook_url` | VARCHAR(500) | | URL webhook configurée chez le provider |
| `last_sync_at` | TIMESTAMPTZ | | Dernière synchro réussie |
| `last_error` | TEXT | | Dernier message d'erreur |
| `metadata` | JSONB | DEFAULT '{}' | Infos complémentaires (version API, etc.) |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |

**Index** : `(tenant_id, platform)` UNIQUE — un seul Shopify par tenant, etc.

**Chiffrement credentials** : AES-256-GCM avec clé de chiffrement stockée dans les variables d'environnement (pas en BDD). Rotation de clé prévue trimestriellement.

---

### customers

Clients finaux des PME — ceux qu'on cherche à récupérer.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK tenants(id), NOT NULL | |
| `external_id` | VARCHAR(255) | NOT NULL | ID chez Shopify/PrestaShop/Gorgias |
| `source_platform` | ENUM | NOT NULL | `shopify`, `prestashop`, `gorgias` |
| `email` | VARCHAR(255) | | Email du client (chiffré au repos) |
| `phone` | VARCHAR(50) | | Téléphone (chiffré au repos) |
| `first_name` | VARCHAR(255) | | |
| `last_name` | VARCHAR(255) | | |
| `ltv` | DECIMAL(10,2) | DEFAULT 0 | Lifetime Value calculée |
| `total_orders` | INTEGER | DEFAULT 0 | |
| `avg_order_value` | DECIMAL(10,2) | DEFAULT 0 | |
| `first_order_at` | TIMESTAMPTZ | | |
| `last_order_at` | TIMESTAMPTZ | | |
| `total_tickets_90d` | INTEGER | DEFAULT 0 | Tickets en 90 jours |
| `churn_score` | INTEGER | CHECK (0-100) | Dernier score de churn calculé |
| `churn_score_updated_at` | TIMESTAMPTZ | | Date du dernier scoring |
| `recovery_count` | INTEGER | DEFAULT 0 | Nombre de fois récupéré |
| `is_opted_out` | BOOLEAN | DEFAULT false | Opt-out des actions WinBack |
| `opted_out_at` | TIMESTAMPTZ | | Date d'opt-out |
| `metadata` | JSONB | DEFAULT '{}' | Données enrichies (tags, segments, etc.) |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |
| `deleted_at` | TIMESTAMPTZ | | Soft delete RGPD |

**Index** :
- `(tenant_id, external_id, source_platform)` UNIQUE
- `(tenant_id, churn_score)` — pour les requêtes dashboard
- `(tenant_id, email)` — pour la déduplication
- `churn_score_updated_at` — pour le batch scoring

**Chiffrement** : `email` et `phone` chiffrés au repos via pgcrypto. Déchiffrement uniquement à la lecture pour l'envoi d'actions.

**RGPD — Droit à l'effacement** :
- Soft delete via `deleted_at` (conservation 30 jours pour audit)
- Hard delete après 30 jours via cron `rgpd-cleanup` (suppression physique irréversible)
- Purge automatique des customers sans activité depuis 24 mois

---

### events

Événements bruts reçus des plateformes (tickets Gorgias, commandes Shopify, etc.).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK tenants(id), NOT NULL | |
| `customer_id` | UUID | FK customers(id) | Peut être NULL si client non encore identifié |
| `integration_id` | UUID | FK integrations(id), NOT NULL | |
| `source_platform` | ENUM | NOT NULL | `gorgias`, `shopify`, `prestashop` |
| `event_type` | VARCHAR(100) | NOT NULL | `ticket.created`, `ticket.updated`, `order.created`, etc. |
| `external_event_id` | VARCHAR(255) | NOT NULL | ID de l'event chez le provider |
| `raw_payload` | JSONB | NOT NULL | Payload brut du webhook (preuve) |
| `normalized_payload` | JSONB | | Payload normalisé par le pipeline |
| `processed` | BOOLEAN | DEFAULT false | Traité par le pipeline |
| `processed_at` | TIMESTAMPTZ | | |
| `processing_error` | TEXT | | Message d'erreur si échec |
| `idempotency_key` | VARCHAR(255) | UNIQUE | Déduplication des webhooks |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Index** :
- `(tenant_id, external_event_id)` — déduplication
- `(tenant_id, processed, created_at)` — file de traitement
- `idempotency_key` UNIQUE

**Rétention** : les events bruts sont purgés après 90 jours (cron `purge-events`). Les `normalized_payload` sont conservés 12 mois.

---

### scenarios

Scénarios de récupération configurés par le tenant ou par défaut.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK tenants(id), NOT NULL | |
| `name` | VARCHAR(255) | NOT NULL | Ex: "Récupération post-retard livraison" |
| `description` | TEXT | | |
| `channel` | ENUM | NOT NULL | `email`, `sms`, `email_sms` |
| `churn_score_min` | INTEGER | DEFAULT 0 | Score minimum pour déclencher |
| `churn_score_max` | INTEGER | DEFAULT 100 | Score maximum |
| `triggers_config` | JSONB | NOT NULL | Triggers comportementaux + tone |
| `compensation` | JSONB | NOT NULL | Type et valeur de compensation |
| `priority` | INTEGER | DEFAULT 0 | Plus élevé = prioritaire |
| `is_active` | BOOLEAN | DEFAULT true | |
| `is_system` | BOOLEAN | DEFAULT false | Scénario par défaut (non modifiable) |
| `usage_count` | INTEGER | DEFAULT 0 | Nombre de fois utilisé |
| `conversion_count` | INTEGER | DEFAULT 0 | Conversions obtenues |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |

**triggers_config JSONB** :

```json
{
  "tone": "empathique",
  "triggers": [
    {"id": "loss_aversion", "weight": 0.8, "enabled": true},
    {"id": "reciprocity", "weight": 0.7, "enabled": true},
    {"id": "urgency", "weight": 0.5, "enabled": false}
  ],
  "email_template_hint": "apologetic",
  "max_message_length": 300
}
```

**compensation JSONB** :

```json
{
  "type": "discount_percent",
  "value": 15,
  "max_value_eur": 50,
  "code_prefix": "WINBACK",
  "validity_days": 14,
  "auto_generate_code": true,
  "conditions": "Minimum 30 EUR d'achat"
}
```

**Types de compensation supportés** :
- `discount_percent` : réduction en pourcentage
- `discount_fixed` : réduction en euros
- `free_shipping` : livraison gratuite
- `gift` : cadeau/échantillon
- `upgrade` : upgrade de service
- `custom` : compensation libre (texte)

---

### recovery_actions

Actions de récupération envoyées ou en attente.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK tenants(id), NOT NULL | |
| `customer_id` | UUID | FK customers(id), NOT NULL | |
| `event_id` | UUID | FK events(id) | Event déclencheur |
| `scenario_id` | UUID | FK scenarios(id) | Scénario utilisé |
| `channel` | ENUM | NOT NULL | `email`, `sms` |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' | Voir machine à états |
| `churn_score` | INTEGER | NOT NULL | Score au moment de la création |
| `confidence` | DECIMAL(3,2) | NOT NULL | Score de confiance (0.00-1.00) |
| `message_subject` | VARCHAR(255) | | Objet (email seulement) |
| `message_body` | TEXT | NOT NULL | Corps du message |
| `message_html` | TEXT | | Version HTML (email) |
| `compensation_type` | VARCHAR(50) | | Type de compensation offerte |
| `compensation_value` | VARCHAR(100) | | Valeur (ex: "15%", "10 EUR") |
| `compensation_code` | VARCHAR(50) | | Code promo |
| `triggers_applied` | JSONB | | Triggers comportementaux utilisés |
| `sent_at` | TIMESTAMPTZ | | |
| `delivered_at` | TIMESTAMPTZ | | |
| `opened_at` | TIMESTAMPTZ | | |
| `clicked_at` | TIMESTAMPTZ | | |
| `converted_at` | TIMESTAMPTZ | | |
| `revenue_recovered` | DECIMAL(10,2) | | CA attribué à cette action |
| `provider` | VARCHAR(50) | | Brevo, Resend, Twilio |
| `provider_message_id` | VARCHAR(255) | | ID du message chez le provider |
| `attribution_window_days` | INTEGER | DEFAULT 30 | Fenêtre d'attribution |
| `retry_count` | INTEGER | DEFAULT 0 | |
| `last_error` | TEXT | | |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |

**Status ENUM** : `pending`, `approved`, `rejected`, `sent`, `delivered`, `opened`, `clicked`, `converted`, `failed`, `expired`

**Index** :
- `(tenant_id, customer_id, created_at)` — cooldown check
- `(tenant_id, status)` — dashboard filtres
- `(tenant_id, converted_at)` — calcul ROI
- `(status, sent_at)` — cron expiration
- `provider_message_id` — webhook tracking

---

### ai_decision_logs

Registre obligatoire AI Act — trace toutes les décisions IA.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK tenants(id), NOT NULL | |
| `action_id` | UUID | FK recovery_actions(id) | Peut être NULL (scoring sans action) |
| `customer_id` | UUID | FK customers(id) | |
| `step_type` | ENUM | NOT NULL | `intent_classification`, `sentiment_analysis`, `churn_scoring`, `message_generation` |
| `model_used` | VARCHAR(100) | NOT NULL | Ex: "mistral-large-latest" |
| `model_version` | VARCHAR(50) | | |
| `prompt_hash` | VARCHAR(64) | NOT NULL | SHA-256 du prompt (traçabilité sans stocker le prompt complet) |
| `prompt_tokens` | INTEGER | | |
| `completion_tokens` | INTEGER | | |
| `total_tokens` | INTEGER | | |
| `response_summary` | JSONB | NOT NULL | Résumé structuré de la réponse (pas la réponse complète) |
| `cost_estimated` | DECIMAL(8,6) | | Coût estimé en EUR |
| `latency_ms` | INTEGER | | Temps de réponse en ms |
| `confidence` | DECIMAL(3,2) | | Score de confiance retourné |
| `decision_outcome` | VARCHAR(100) | | Ex: "action_triggered", "score_stored", "blocked_by_guardrail" |
| `guardrail_triggered` | VARCHAR(100) | | Ex: "cooldown", "opt_out", "quota_exceeded" |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Index** :
- `(tenant_id, created_at)` — audit
- `(tenant_id, step_type)` — analyse par étape
- `(customer_id)` — droit d'accès RGPD

**Rétention** : conservation obligatoire 3 ans (AI Act). Pas de soft delete.

**Conformité AI Act** :
- Chaque décision IA est loguée avec le modèle, le hash du prompt, et le résumé de la réponse
- Le client final peut demander l'accès à ses logs (droit d'accès RGPD)
- Le client final peut s'opposer au scoring automatisé (droit d'opposition)

---

### usage_counters

Compteurs de consommation par tenant par mois.

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK tenants(id), NOT NULL | |
| `period_month` | DATE | NOT NULL | Premier jour du mois (ex: 2026-03-01) |
| `events_received` | INTEGER | DEFAULT 0 | Webhooks reçus |
| `events_processed` | INTEGER | DEFAULT 0 | Events traités par le pipeline |
| `scores_calculated` | INTEGER | DEFAULT 0 | Scores de churn calculés |
| `actions_sent` | INTEGER | DEFAULT 0 | Actions envoyées (tous canaux) |
| `emails_sent` | INTEGER | DEFAULT 0 | |
| `sms_sent` | INTEGER | DEFAULT 0 | |
| `api_calls_mistral` | INTEGER | DEFAULT 0 | Appels API Mistral AI |
| `api_cost_estimated` | DECIMAL(8,4) | DEFAULT 0 | Coût API estimé en EUR |
| `revenue_recovered` | DECIMAL(10,2) | DEFAULT 0 | CA récupéré ce mois |
| `actions_converted` | INTEGER | DEFAULT 0 | Actions ayant converti |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT now() | |

**Index** : `(tenant_id, period_month)` UNIQUE

**Limites** (palier unique CoY, ADR-017 — cf. `04-business-rules/tarification-palier-unique.md`) :

| Compteur | CoY |
|----------|-----|
| actions_sent/mois | 1 500 |
| sms_sent/mois | 350 (0 en essai) |
| Customers trackés | 10 000 |

---

### dead_letter_queue

File d'attente des événements en échec (retry automatique).

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| `id` | UUID | PK | |
| `tenant_id` | UUID | FK tenants(id) | |
| `event_type` | VARCHAR(100) | NOT NULL | |
| `original_payload` | JSONB | NOT NULL | Payload original |
| `error_type` | VARCHAR(100) | NOT NULL | Ex: "api_timeout", "rate_limit" |
| `error_message` | TEXT | | |
| `retry_count` | INTEGER | DEFAULT 0 | |
| `max_retries` | INTEGER | DEFAULT 5 | |
| `first_failed_at` | TIMESTAMPTZ | NOT NULL | |
| `last_failed_at` | TIMESTAMPTZ | NOT NULL | |
| `next_retry_at` | TIMESTAMPTZ | | Retry schedulé |
| `resolved_at` | TIMESTAMPTZ | | |
| `resolution` | VARCHAR(50) | | `retried_success`, `manual`, `abandoned` |
| `created_at` | TIMESTAMPTZ | DEFAULT now() | |

**Index** : `(resolved_at, next_retry_at)` — pour le cron de retry

---

## Row Level Security (RLS)

Chaque table avec `tenant_id` a une politique RLS :

```sql
-- Exemple pour la table customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON customers
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "tenant_insert" ON customers
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "tenant_update" ON customers
  FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "tenant_delete" ON customers
  FOR DELETE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

**Tables avec RLS** : toutes sauf `dead_letter_queue` (accès admin uniquement).

---

## Migrations Prisma

```
prisma/
  migrations/
    001_init_tenants_users/
    002_integrations_customers/
    003_events_scenarios/
    004_recovery_actions/
    005_ai_logs_usage/
    006_dead_letter_queue/
    007_indexes_rls/
  schema.prisma
  seed.ts          # Données de seed (scénarios par défaut, tenant de test)
```

**Convention** : une migration par groupe logique de tables. Jamais de migration destructive sans backup préalable.

---

## Données de Seed

### Scénarios par défaut (is_system = true)

| Nom | Canal | Score min | Score max | Compensation | Tone |
|-----|-------|-----------|-----------|-------------|------|
| Récupération standard — Email | email | 65 | 79 | 10% réduction | empathique |
| Récupération urgente — Email | email | 80 | 89 | 15% réduction | empathique_urgent |
| Récupération critique — Email | email | 90 | 100 | 20% réduction + livraison gratuite | empathique_urgent |
| Récupération standard — SMS | sms | 75 | 89 | 10% réduction | direct |
| Récupération critique — SMS | sms | 90 | 100 | 15% réduction | direct_urgent |

---

## Crons de maintenance

| Cron | Fréquence | Description |
|------|-----------|-------------|
| `purge-events` | Quotidien 04h00 | Supprimer raw_payload des events > 90 jours |
| `expire-actions` | Quotidien 03h00 | Marquer actions expirées (fenêtre attribution dépassée) |
| `rgpd-cleanup` | Quotidien 05h00 | Hard delete des customers avec deleted_at > 30 jours |
| `rgpd-inactivity` | Mensuel 1er 06h00 | Soft delete customers sans activité > 24 mois |
| `dlq-retry` | Quotidien 04h30 | Retenter les éléments de la dead letter queue |
| `usage-reset` | Mensuel 1er 00h01 | Créer les compteurs du nouveau mois |
| `ai-logs-archive` | Trimestriel | Archiver les ai_decision_logs > 1 an (compression) |

---

## Performance

### Estimations de volume (par tenant moyen)

| Table | Volume M6 | Volume M12 | Croissance |
|-------|-----------|------------|------------|
| customers | 500-2 000 | 1 000-5 000 | Linéaire |
| events | 2 000-10 000 | 10 000-50 000 | Linéaire |
| recovery_actions | 100-500 | 500-2 000 | Linéaire |
| ai_decision_logs | 500-2 000 | 2 000-10 000 | Linéaire |

### Estimations globales (50-100 tenants à M12)

| Table | Volume total M12 | Taille estimée |
|-------|-----------------|----------------|
| events | 500k-5M lignes | 2-10 Go |
| ai_decision_logs | 100k-1M lignes | 500 Mo-2 Go |
| customers | 50k-500k lignes | 200 Mo-1 Go |
| recovery_actions | 25k-200k lignes | 100 Mo-500 Mo |

**Conclusion** : un VPS OVHcloud B2-15 (15 Go RAM, 160 Go SSD) est largement suffisant pour M12. Partitionnement des tables `events` et `ai_decision_logs` par mois envisageable en V2 si nécessaire.

---

## Historique des changements

| Date | Changement | Auteur |
|------|-----------|--------|
| 2026-02-26 | Création du modèle de données complet V1 | CoYia |
