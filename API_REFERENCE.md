# API_REFERENCE.md — AfriHost AI

> **Référence des API — Module 36.**

Ce document liste les **endpoints**, l'**authentification**, les **permissions**, les **paramètres**,
des **exemples** et les **codes d'erreur**. Deux familles : **API internes** (staff) et **API publiques**
(développeurs tiers, OAuth2/API Keys/JWT/Webhooks).

---

## 1. Authentification & permissions

- **API internes** : chaque route appelle `requireAuthAndPermission("<perm>")`. Contexte résolu via
  Supabase Auth (JWT) → `AccessContext` (organisationId, hotelId, userId).
- **API publiques** : `POST /api/publicapi/auth` avec `clientId`/`secret` → contexte OAuth2/API Key/JWT.
  Rate limiting par minute.

Permissions principales (extrait) : `settings.view`, `reservations.create`, `guests.view`,
`payments.create`, `billing.consolidate`, `crm.view`, `loyalty.view`, `notifications.send`,
`ai.assistant`, `channel.sync`, `portal.self_reservation`, `events.manage`, `bi.view`,
`admin.manage`, `publicapi.manage`, `mobile.manage`, `saas.plans`, `saasadmin.hotels`,
`saasadmin.impersonation`, `devops.health`, `certification.audit`.

## 2. Codes d'erreur normalisés

| HTTP | Signification |
|---|---|
| 400 | Validation échouée / requête invalide |
| 401 | Non authentifié / identifiants invalides / 2FA requis |
| 403 | Accès inter-hôtel refusé / permission manquante |
| 404 | Ressource introuvable |
| 409 | Conflit (déjà existant, salle indisponible, solde insuffisant) |
| 429 | Rate limit dépassé |

## 3. Endpoints métiers principaux (API internes)

### Réservations & Front Desk
- `GET/POST /api/reservations` ; `POST /api/reservations/:id/cancel` (reservations.*)
- `GET/POST /api/frontdesk/availability` (frontdesk.*)

### Housekeeping / Maintenance / Transport
- `GET/POST /api/housekeeping/tasks` ; `/api/maintenance/requests` ; `/api/transport/transfers`

### POS / Cuisine / Caisse / Stock
- `POST /api/pos/orders` ; `/api/kitchen/orders` ; `/api/cash/sessions` ; `/api/inventory/movements`

### Comptabilité & Billing
- `GET/POST /api/accounting/journals` ; `/api/billing/folios` ; `POST /api/billing/payments`

### CRM / Fidélité / Notifications / IA
- `/api/crm/guests/:id/360`, `/api/crm/campaigns` ; `/api/loyalty/programs`, `/api/loyalty/earn` ;
  `/api/notifications/send`, `/api/notifications/events` ; `/api/ai/assistant`, `/api/ai/predictions`

### Channel / Portail / Événements / BI / Admin
- `/api/channel/sync/*` ; `/api/portal/*` ; `/api/events/*` ; `/api/bi/kpis` ; `/api/admin/config`

### Mobile
- `/api/mobile/devices`, `/api/mobile/push`, `/api/mobile/sync`, `/api/mobile/dashboard`

### Super Administration (modules 32-35, réservés Super Admin)
- `/api/saas/*` (plans, subscriptions, invoices, payments, manual-payments, payment-methods, coupons)
- `/api/saasadmin/*` (hotels, licenses, support, monitoring, backups, impersonation, dashboard)
- `/api/bootstrap/*` (init, login, change-password, 2fa)
- `/api/devops/*` (health, security, secrets, backups/integrity, readiness)
- `/api/certification/*` (audit, journey, certify, stats)

## 4. API publiques (Module 30)

| Endpoint | Méthode | Rôle |
|---|---|---|
| `/api/publicapi/apps` | GET/POST | applications tierces (publicapi.manage/view) |
| `/api/publicapi/apps/:id/credentials` | GET/POST | credentials (secret une fois) |
| `/api/publicapi/auth` | POST | authentification OAuth2/API Key/JWT |
| `/api/publicapi/webhooks` | GET/POST | enregistrer un webhook |
| `/api/publicapi/webhooks/dispatch` | POST | déclencher un événement |
| `/api/publicapi/marketplace` | GET/POST | marketplace de connecteurs |
| `/api/publicapi/logs` | GET | journal des accès |

### Exemple d'authentification
```json
POST /api/publicapi/auth
{ "clientId": "af_xxxxxxxx", "secret": "<secret>" }
→ 200 { "auth": { "appId": "...", "scopes": ["reservations.read"], "hotels": [] } }
```

### Exemple webhook
```json
POST /api/publicapi/webhooks
{ "appId": "...", "url": "https://partner.example.com/hook", "events": ["reservation.created"] }
```

## 5. Webhooks & événements
Le catalogue d'événements (`@afrihost/core/events/event-catalog.ts`) définit les événements métier
(`reservation.created`, `payment.received`, `loyalty.points_earned`, `channel.synced`, `saas.payment_validated`…).
Les webhooks d'applications tierces souscrivent à ces événements ; la livraison est mise en file avec retry.
