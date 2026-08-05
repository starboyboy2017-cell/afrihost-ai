# Architecture.md — Référence unique d'architecture d'AfriHost AI

> **Document de référence unique** pour toute décision et tout développement du projet. Ce document fait foi.
> Les documents `docs/` restent détaillés et cités ici. Toute évolution d'architecture doit passer par un
> **ADR** (`docs/adr/`) puis être reportée ici.
> Version : 1.0 — Phase 0 (fondation) validée.

---

## 1. Vision & positionnement

AfriHost AI est un **PMS (Property Management System) SaaS multihôtel** moderne, inspiré des meilleurs
standards internationaux (Oracle Opera, Mews, Cloudbeds, Apaleo, HotelKey), **adapté aux hôtels d'Afrique** :
multi-devise, multi-langue, paiement Mobile Money, exigences fiscales locales, **et connectivité intermittente**.

**Positionnement technique :** greenfield (ADR-014), monolithe modulaire (ADR-001), offline-first (ADR-011).

---

## 2. Principes directeurs (non négociables)

1. **Multihôtel dès le départ** : isolation stricte par `hotelId` + RLS PostgreSQL (ADR-005).
2. **Un seul système de vérité** : pas de duplication de données ; les modules référencent (FK) et accèdent
   via les services du module propriétaire.
3. **RBAC complet** : chaque action = permission `module.action`, contrôlée au niveau route et au niveau BD.
4. **Journal d'audit append-only** pour toute action importante (ADR-012).
5. **Offline-first** : lecture/écriture locales, synchronisation automatique à la reconnexion (ADR-011/013).
6. **Architecture modulaire** : module = bounded context symétrique, frontières strictes (ADR-006).
7. **Event Bus** de domaine pour découpler les modules (pas de dépendances fortes entre modules).
8. **Montants en minor units (int)** + devise explicite (ADR-007).
9. **Conformité RGPD** : consentement, export, anonymisation.

---

## 3. Stack technique (outils modernes et gratuits)

| Couche | Technologie | Justification |
|--------|-------------|--------------|
| Frontend | **Next.js 14 (App Router)** + React + TypeScript | SSR/ISR, DX, un seul déploiement |
| Styling | **Tailwind CSS** + shadcn/ui | rapide, cohérent |
| API | Next.js **Route Handlers** (BFF) | agrège, protège les secrets |
| ORM | **Prisma** | typage, migrations, seed |
| BD | **PostgreSQL** (Supabase) | relationnel, robuste |
| Backend BaaS | **Supabase** (Auth, Storage, Realtime) | RLS, zero-ops |
| Déploiement | **Vercel** | previews, CDN, CI/CD |
| CI/CD | **GitHub Actions** | lint, test, build, migrate |
| Tests | Vitest (unitaire) + Playwright (e2e) | qualité |
| Offline | **IndexedDB (Dexie.js)** + moteur de sync | mode hors-ligne |
| Notifications | WhatsApp Business Cloud API, SendGrid, Twilio | canaux |
| Paiements | Paystack / Flutterwave / mobile money | terrain africain |

---

## 4. Vue d'ensemble (niveaux)

```
Clients : Web PMS │ Portail client │ Mobile (PWA)
          │
          ▼  HTTPS
Next.js (App Router) = BFF + Route Handlers
  ├─ Noyau applicatif : modules métiers (frontières strictes)
  ├─ EventBus (découplage inter-modules)
  ├─ RBAC (permissions)
  └─ Audit append-only
          │
          ▼
Supabase : PostgreSQL + RLS │ Auth │ Storage │ Realtime
          │
          ▼  (intégrations externes)
WhatsApp/Email/SMS │ Channel Manager │ Paiements │ IA │ BI

Niveau client offline : IndexedDB (source locale) + Outbox → sync à la reconnexion
```

---

## 5. Hiérarchie des tenants

```
Organisation (1) ──< (n) Hôtel
Hôtel ──< Chambre, TypeChambre, Réservation, Client(fiche locale), Facture, Paiement, ...
Organisation ──< Utilisateur (via Membership → hôtel + rôle)
Organisation ──< Client (historique fidélité global)
```

- **Organisation** : société mère / chaîne. Globale.
- **Hôtel** : établissement (devise, langue, fuseau, taxes, adresse, options).
- **Utilisateur** : identité globale, **affecté à 1..n hôtels** avec un **rôle** par affectation (`Membership`).
- **Client** : profil global à l'org + fiche locale par hôtel.

---

## 6. Structure d'un module (symétrie ADR-006)

```
module/
├─ contracts/    DTO partagés + types + enums + événements de domaine
├─ services/     logique métier (règles, statuts, validations) — cœur
├─ repositories/ accès BD (Prisma), aucune logique métier
├─ handlers/     route handlers (API) — couche transport
├─ jobs/         tâches planifiées / files
├─ rbac/         permissions propres au module
└─ ui/           composants d'écran
```

**Règle** : un module ne lit jamais la table d'un autre module directement côté applicatif — il passe par la
fonction publique du module propriétaire ou une vue de lecture dédiée. L'**EventBus** permet les réactions
sans couplage.

---

## 7. Sécurité multitenant (RLS)

- Chaque table métier porte `hotelId`.
- Helpers SQL : `auth_hotel_id()`, `auth_org_id()` (déduits du JWT/session).
- Policies RLS : `INSERT`/`SELECT`/`UPDATE`/`DELETE` filtrés par `hotel_id = auth_hotel_id()`.
- `AuditLog` : append-only (INSERT + SELECT, pas d'UPDATE/DELETE).
- Même si une API est compromise, PostgreSQL refuse tout accès inter-hôtel.

---

## 8. Offline-first (résumé — voir ADR-011/013)

```
Navigateur : UI ⇄ IndexedDB (source locale) ⇄ Outbox (écritures en attente)
                                │ sync (worker) en ligne
                                ▼
                       Serveur (PostgreSQL) — source de vérité distante
```

- Lecture/écriture **toujours** sur la base locale → UI réactive hors-ligne.
- **Outbox** : écritures poussées à la reconnexion, dans l'ordre.
- **Conflits** : LWW sur `updatedAt` + idempotence métier.
- **IDs** : UUID v7 côté client (ADR-013) + soft-delete (`deletedAt`).
- Indicateur UI « hors-ligne / X en attente / synchronisé ».

---

## 9. Event Bus (découplage inter-modules)

- Pattern **publish/subscribe** interne (TypeScript).
- Les modules **émettent** des événements de domaine (`reservation.confirmed`, `payment.received`, ...).
- Les modules **s'abonnent** pour réagir, sans référence directe à l'émetteur.
- Événements clés : voir BusinessRules.md §5.4.

Exemple :
```ts
// émetteur (module réservations)
await bus.publish("reservation.confirmed", { reservationId, hotelId });

// abonné (module housekeeping)
bus.subscribe("reservation.confirmed", async (evt) => { /* créer tâche */ });
```

---

## 10. Déploiement & DevOps

| Élément | Cible |
|---------|-------|
| App | Vercel (front + API), previews par branche |
| BD | Supabase (PostgreSQL managé, backups auto, PITR) |
| Auth/Storage/Realtime | Supabase |
| CI/CD | GitHub Actions (lint → test → build → migrate → deploy) |
| Monitoring | Sentry + Vercel Analytics |
| Env | local / staging / production, `.env` jamais versionnés |

---

## 11. Référence des documents

| Document | Rôle |
|----------|------|
| **`Architecture.md`** (ce fichier) | Référence d'architecture unique |
| **`BusinessRules.md`** | Référence des règles métiers unique |
| `docs/adr/README-ADR.md` + `docs/adr/*` | Décisions d'architecture (14 ADR) |
| `database/schema.prisma` | Schéma de données maître |
| `roadmap/feuille-de-route.md` | Ordre de développement |
| `docs/06-stack-outils.md` | Stack détaillée |
| `docs/modules/` | Spécifications module par module |

## 12. Statut d'avancement
- ✅ Architecture validée par le client.
- ✅ ADR 001–014 acceptés.
- ✅ **Phase 0 — Fondation livrée** : multihôtel (RLS), RBAC complet **extensible** (11 rôles), audit
  append-only, offline/sync, Event Bus, architecture modulaire. 36 tests verts.
- ✅ **Module 1 — Paramètres généraux livré** : service + validation + audit + événements + API + écran.
- ✅ **Module 2 — Gestion multihôtels livré** : création/modification/désactivation, sélecteur, paramètres
  par établissement, isolation RLS, rôles/permissions par hôtel (Membership). Migration versionnée + rollback doc.
- ✅ **Module 3 — Gestion des réservations livré** : machine à états (PROVISIONAL→CONFIRMED→CHECKED_IN→CHECKED_OUT,
  CANCELLED, NO_SHOW, WAITLIST), tarification, disponibilité/double-réservation, bookingRef unique,
  isolation métier + RLS, API + écran. 61 tests verts.
- ✅ **Module 4 — Journal d'audit (consultation) livré** : lecture avec filtres, export CSV, API
  `GET /api/audit` + écran, append-only, isolation par hôtel.
- ✅ **Module Guests (Clients) livré** : création, modification, archivage (soft-delete), identité,
  historique des séjours, recherche rapide, RBAC + isolation par hôtel.
  **78 tests verts** (RLS validé sur la base réelle).
- ✅ **Module 5 — Types de chambres & tarifs flexibles livré** : tarification évolutive (RatePlan BASE/
  SEASONAL/WEEKEND/PROMOTIONAL, prix par devise, restrictions), isolation RLS vérifiée sur la base réelle,
  jeu de démonstration multi-hôtels.
- ✅ **Module 6 — Chambres & inventaire physique livré** : machine à états des chambres (8 états), lien
  types de chambres (Module 5), historique des états, isolation RLS vérifiée sur la base réelle, jeu de démo
  (2 hôtels × 7 chambres). **100 tests verts.**
- ✅ **Module 7 — Check-in / Check-out livré** : flux complet (check-in/out, prolongation, changement de
  chambre, état temps réel), séjours (Stay/RoomAssignment), isolation RLS vérifiée, jeu de démo.
  **110 tests verts.**
- ✅ **Module 8 — Tableau de disponibilité (Front Desk) livré** : vue par hôtel temps réel (séjours actifs +
  états des chambres), filtres, recherche, indicateurs visuels, actions contextuelles, isolation RLS
  vérifiée. **119 tests verts.**
- ✅ **Module 9 — Housekeeping livré** : génération auto au check-out, affectation/réaffectation, cycle de
  statut, horodatage des étapes, journal d'audit, notifications temps réel, isolation RLS vérifiée.
  **129 tests verts.**
- ✅ **Module 10 — Maintenance & interventions livré** : tickets (cycle Open→Closed), liaison chambre,
  mise hors service auto + restauration à la clôture, sync temps réel, isolation RLS vérifiée.
- ✅ **Module 11 — Blanchisserie livré** : types de linge, cycle complet, lots de lavage (interne/externe),
  pertes, seuils de stock, isolation RLS vérifiée.
- ✅ **Module 12 — Transport livré** : véhicules (internes/externes), chauffeurs, transferts (cycle de
  statut), affectation auto/manuelle, facturation au folio, isolation RLS vérifiée.
- ✅ **Module 13 — POS Restaurant livré** : points de vente (restaurant/bar/room service), menus, commandes,
  encaissements multi-moyens, remboursements/annulations tracés, chiffre d'affaires auto, isolation RLS
  vérifiée.
- ✅ **Module 14 — Cuisine (KDS) livré** : ordres de préparation intégrés au POS, répartition par poste,
  priorités, cycle New→Served, modifications/annulations tracées, temps réel, isolation RLS vérifiée.
- ✅ **Module 15 — Caisse livré** : caisses (multiples), sessions ouverture/fermeture, mouvements
  multi-moyens, clôture + réconciliation, rapports financiers, isolation RLS vérifiée.
- ✅ **Module 16 — Pourboires livré** : enregistrement au paiement, individuel/collectif, règles
  configurables par hôtel, validation, distribution, suivi des montants, isolation RLS vérifiée.
- ✅ **Module 17 — Remises, promotions & coupons livré** : moteur de règles flexible (POS/RESERVATION/BILLING),
  plafonds par rôle, conditions, génération/validation coupons, isolation RLS vérifiée.
- ✅ **Module 18 — Stock & inventaire livré** : articles, fournisseurs, entrepôts, commandes, réceptions,
  mouvements, inventaires, seuils/alertes, décrémentation auto, isolation RLS vérifiée.
- ✅ **Module 19 — Comptabilité générale livré** : plan comptable configurable (**SYSCOHADA révisé /
  OHADA / UEMOA** par configuration), journaux, écritures auto, périodes, rapprochements, centres de
  coûts, balance, grand livre. Règles configurables multi-juridictions.
- ✅ **Module 20 — Paiements & facturation livré** : folios clients (tous types de frais), encaissements
  multimoyens, partiels/acomptes/cautions/remboursements/différés, transfert/fusion de folios, facturation
  consolidée, passerelles configurables (Stripe/Flutterwave/Paystack/Mobile Money), sync comptabilité
  SYSCOHADA. **249 tests verts.**
- ✅ **Module 21 — CRM livré** : vue 360 client, segmentation dynamique, campagnes multicanal, préférences,
  notes/tâches/rappels, opportunités, entreprises/agences, architecture extensible pour la fidélité future.
  **261 tests verts.**
- ⏳ **Module 22 — Programme de fidélité** (après validation du Module 21).

## 13. RBAC & extensibilité
- **Permissions : définies par migration (versionnées)** — registre `module.action` (source unique dans
  `packages/core/src/rbac/permissions.ts`), seedées en base via la migration
  `20260804010000_seed_permissions_roles` (69 permissions globales).
- **Rôles : définis par migration + trigger multihôtel** — 11 rôles système par organisation, créés
  automatiquement à la création d'une organisation (fonction `afrihost_seed_org_roles` + trigger
  `trg_org_seed_roles`). Chaque organisation/hôtel a ses propres rôles (isolation).
- **Nouveaux rôles créables depuis l'admin sans modifier le code** (choix des permissions via le panneau,
  en base `Role`/`RolePermission`/`Membership`).
- Générateur de migration : `packages/core/scripts/gen-permissions-migration.mjs` (le seed SQL est dérivé du
  code → ne peut pas diverger).
- Packages : `@afrihost/core` (infrastructure) + `@afrihost/domain` (modules métier).
