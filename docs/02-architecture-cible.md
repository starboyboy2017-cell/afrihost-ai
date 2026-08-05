# 2 — Architecture cible (modulaire, multihôtel)

> Objectif : **un seul système de vérité**, **aucune duplication de données**, **isolation stricte entre hôtels**,
> et des **frontières de modules propres** pour permettre une évolution future (extraction de services, scaling).

---

## 2.1 Vue d'ensemble

```
                        ┌──────────────────────────────────────────────┐
                        │             CLIENTS (multi-navigateurs)      │
                        │  Web (PMS) │ Portail client │ Mobile (PWA)   │
                        └──────────────────────┬───────────────────────┘
                                               │ HTTPS
                        ┌──────────────────────▼───────────────────────┐
                        │            NEXT.JS (App Router)              │
                        │  = BFF + Route Handlers (API)                │
                        │                                              │
                        │   ┌──────────────────────────────────────┐   │
                        │   │  Noyau applicatif (domaine hôtelier) │   │
                        │   │  Modules métiers (frontières strictes)│   │
                        │   └──────────────────────────────────────┘   │
                        │  ┌────────────┐  ┌───────────┐  ┌─────────┐  │
                        │  │ Service    │  │ Auth /    │  │ Événements│ │
                        │  │ Auth JWT   │  │ RBAC/RLS  │  │ (EventBus)│ │
                        │  └────────────┘  └───────────┘  └─────────┘  │
                        └──────────────┬───────────────────────────────┘
                                       │
              ┌────────────────────────┼──────────────────────────────┐
              ▼                        ▼                              ▼
┌─────────────────────┐  ┌───────────────────────┐  ┌──────────────────────┐
│   SUPABASE (PaaS)   │  │   Intégrations externes│  │  Jobs / Files       │
│  PostgreSQL + RLS   │  │  - WhatsApp Business   │  │  - File storage      │
│  Auth + Storage     │  │  - Email (SendGrid)    │  │  - Exports (CSV/PDF) │
│  Realtime           │  │  - SMS (Twilio)        │  │  - Queue de tâches   │
│                     │  │  - Channel Managers    │  │  - LLM / IA          │
│  (Multitenant RLS)  │  │  - Paiements / POS     │  └──────────────────────┘
└─────────────────────┘  └───────────────────────┘
```

## 2.2 Principes directeurs

1. **Monolithe modulaire** (module-first), pas de microservices. Extraction future possible si besoin.
2. **Multitenant par hôtel** : chaque ligne métier porte `hotelId` (ou `organisationId`). **RLS PostgreSQL**
   garantit qu'un utilisateur ne voit jamais les données d'un autre hôtel — **même en cas de bug applicatif**.
3. **Une seule source de vérité** : une donnée (ex : un prix, une chambre, un client) n'existe qu'**une seule fois**.
   Les autres modules **référencent** (FK) et n'y accèdent que via des **services** du module propriétaire.
4. **Frontières de modules** : un module ne lit/joue jamais dans la table d'un autre module directement
   côté applicatif — il passe par une **fonction publique** du module propriétaire (service), ou par une
   **vue de lecture** dédiée. Les tables restent partagées en BD (pas de duplication), mais l'**accès est
   gouverné**.
5. **Événements de domaine** (EventBus interne) : les modules réagissent aux événements sans couplage direct
   (ex : `RESERVATION.CONFIRMED` → déclenche housekeeping, notification, comptabilité).
6. **Audit systématique** : chaque mutation d'écriture est journalisée (qui, quoi, quand, d'où).

## 2.3 Décomposition par couches (par module)

Chaque module suit la même structure interne (consistance, testabilité) :

```
module-X/
  contracts/        → types/contrats partagés (DTO) + événements de domaine émis/écoutés
  services/         → logique métier (règles, statuts, validations) — cœur
  repositories/     → accès BD (via Prisma), aucune logique métier
  handlers/         → route handlers (API) — couche transport
  jobs/             → tâches planifiées / file d'attente du module
  rbac/             → permissions propres au module (au niveau routes/actions)
  ui/               → composants d'écran (Next.js) du module
```

> Cette symétrie **module = mini-bounded context** simplifie la revue, les tests et l'extraction future.

## 2.4 Tenants & hiérarchie

- **Organisation** : société mère (chaîne) — globale, 0..n hôtels.
- **Hôtel** : établissement (propriétés locales : devise, langue, fuseau, taxes, adresse).
- **Utilisateur** : rattaché à une organisation, **affecté à 1..n hôtels**, avec un rôle par affectation.
- **Client (guest)** : appartient à une organisation (historique fidélité global), sa séjour est lié à un hôtel.

```
Organisation (1) ──< (n) Hôtel
Hôtel ──< (n) Chambre, Réservation, Facture, Employé-affectation, Produit, ...
Organisation ──< (n) Utilisateur, Client
```

## 2.5 Sécurité multitenant (RLS) — stratégie

- Table `organisations`, `hotels`, `users`, `memberships` (utilisateur ↔ hôtel ↔ rôle).
- Fonction Postgres `current_hotel_id()` / `current_user_org()` (définie par RLS et par session).
- **Politiques RLS** sur chaque table métier : `hotel_id = current_hotel_id()` (ou appartenance à l'org).
- L'API (Vercel) obtient un **JWT** via Supabase Auth ; les **claims** contiennent `org_id` et les hôtels autorisés.
- Même si une API est mal sécurisée côté applicatif, **PostgreSQL refuse** tout accès inter-hôtel.

## 2.6 Flux de bout en bout (exemple : réservation → check-in)

```
Réservation créée (Module Réservations)
   ├─ émet: reservation.confirmed
   ├─ Housekeeping lit: affecte pré-arrivée
   ├─ Comptabilité crée: compte client / pré-autorisation
   ├─ CRM/fidélité: attribue points
   └─ Notifications: WhatsApp/email confirmation au client
Check-in (Module Check-in)
   ├─ Réservation → statut "checked-in"
   ├─ Chambre → état "occupied"
   ├─ Comptabilité: active la consommation (mini-bar, resto)
   └─ événements...
```

## 2.7 Déploiement / Infra (DevOps)

| Élément | Cible | Détail |
|---------|-------|--------|
| Hébergement app | **Vercel** | Frontend + Route Handlers, déploiements auto, edge cache |
| Base de données | **Supabase** (PostgreSQL managé) | Migrations Prisma, backups auto, point-in-time recovery |
| Auth | **Supabase Auth** (GoTrue) | JWT, OAuth, email |
| Storage | **Supabase Storage** | Photos, documents, ACL par hôtel |
| Realtime | **Supabase Realtime** | Planning & notifications push temps réel |
| CI/CD | **GitHub Actions** | Lint, tests, build, migrations, déploiement Vercel |
| Monitoring | Vercel Analytics + Sentry + Postgres stats | Logs, erreurs, métriques |
| Environnements | `local`, `staging`, `production` | Variables d'env isolées, données seed de dev |

> **Documenté** : cette infra est **gratuite au départ** (plans hobby de Vercel/Supabase) et **évolutive** (scale
> avec des plans payants sans refonte). C'est un choix de **coût → vélocité → passage à l'échelle progressif**.

## 2.8 Décisions d'architecture (ADR)

Les décisions structurantes sont documentées dans [`docs/adr/`](adr/README-ADR.md) au format ADR :

| ADR | Décision | Statut |
|-----|----------|--------|
| ADR-001 | Monolithe modulaire plutôt que microservices | ✅ |
| ADR-002 | Supabase (PostgreSQL managé) comme backend & BaaS | ✅ |
| ADR-003 | Prisma comme ORM | ✅ |
| ADR-004 | Next.js App Router comme front **et** API | ✅ |
| ADR-005 | RLS multitenant par hôtel | ✅ |
| ADR-006 | Module = bounded context symétrique | ✅ |
| ADR-007 | Montants en minor units (int) | ✅ |
| ADR-008 | WhatsApp Business Cloud API = canal prioritaire | ✅ |
| ADR-009 | Paiement Mobile Money en natif | ✅ |
| ADR-010 | Paystack / Flutterwave pour les paiements | ✅ |
| ADR-011 | **Offline-first obligatoire dès le MVP** | ✅ |
| ADR-012 | **Journal d'audit append-only + infra en Phase 0** | ✅ |
| ADR-013 | **IDs UUID v7 côté client + registre de sync** | ✅ |
| ADR-014 | **Greenfield (projet neuf, sans héritage)** | ✅ |

## 2.9 Stratégie offline-first (local-first) — MVP

> Voir ADR-011 pour la justification détaillée. Résumé opérationnel :

```
   Navigateur (PWA)                          Serveur (Supabase / Vercel)
┌──────────────────────────┐      en ligne   ┌──────────────────────────────┐
│  UI (lecture/écriture)   │ ◀──────────────▶│  Route Handlers (Next.js)     │
│       │                  │                 │        │                      │
│       ▼                  │                 │        ▼                      │
│  IndexedDB (Dexie.js)    │                 │  PostgreSQL + RLS            │
│   = base locale (source) │                 │  (source de vérité distante) │
│       │                  │                 └──────────────────────────────┘
│       ▼   hors-ligne     │
│  Outbox (écritures en    │      en ligne : Sync Engine pousse l'outbox
│   file) ─────────────────┼─────────────────▶ et tire les mises à jour
└──────────────────────────┘   (worker)      (LWW sur updatedAt, ADR-013)
```

**Principes opérationnels offline :**
1. **Lecture** : toujours servie depuis IndexedDB (réactive, indépendante du réseau).
2. **Écriture** : appliquée localement + poussée dans l'**outbox** ; confirmation immédiate à l'utilisateur.
3. **Sync** : un **worker** (offline/online event) pousse l'outbox puis tire les mises à jour distantes.
4. **Conflits** : résolution **LWW** sur `updatedAt` (ADR-013) + garde-fous métier (idempotence : un
   check-in déjà consommé n'est pas réappliqué).
5. **Indicateur UI** : bannière « hors-ligne » / « X écritures en attente » / « synchronisé ».
6. **Identifiants** : UUID v7 générés côté client (ADR-013) — création hors-ligne sans collision.
7. **Sécurité** : IndexedDB chiffrée (données sensibles), accès local verrouillé par session.

> **Tests critiques MVP :** coupure réseau simulée → réservation + check-in + encaissement effectués
> hors-ligne → reconnexion → tout synchronisé et cohérent (aucune perte, aucun doublon).

## 2.10 Greenfield (ADR-014)

Aucun héritage : le projet démarre de zéro. L'audit de l'existant devient un **audit d'opportunité**
(marché/concurrents) ; les bonnes pratiques (ADR, RLS, audit, offline) sont appliquées **dès la conception**,
ce qui évite la dette future.
