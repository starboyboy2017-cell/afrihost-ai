# 4 — Schéma de base de données (guide)

> Fichier maître : [`database/schema.prisma`](../database/schema.prisma)
> Migrations gérées par **Prisma Migrate**. Aucune écriture manuelle en base.

---

## 4.1 Principes de conception du modèle

| Principe | Application |
|----------|-------------|
| **Pas de duplication** | Chaque entité vit une seule fois. Les autres tables référencent via FK. Ex : un tarif est sur `RoomType`/rate plan, jamais recopié sur chaque réservation *en tant que donnée source* (une réservation enregistre son prix gelé, mais c'est une valeur de transaction, pas une duplication du catalogue). |
| **Multitenant** | Toute table métier porte `hotelId`. Les tables globales (organisation) ne portent que `organisationId`. |
| **Audit** | Toute mutation → `AuditLog`. Les transitions de statut → tables `*StatusHistory` (traçabilité). |
| **Montants int** | minor units (centimes) + `currency` explicite. Jamais de `float` monétaire. |
| **Soft delete** | `deletedAt` sur les maîtres pour conserver l'historique (clients, produits). |
| **Contraintes** | FK partout, `@@unique` pour les numéros (chambre, réservation, facture), `@@index` sur les requêtes chaudes (par hôtel + date/statut). |

## 4.2 Noyau multitenant (fondation non négociable)

```
Organisation 1───< Hotel 1───< (RoomType, Room, Reservation, Invoice, ...)
Organisation 1───< User 1───< Membership >─── Role 1───< RolePermission >─── Permission
Organisation 1───< Guest
```

- **User** : identité (lié à Supabase Auth via `authId`).
- **Membership** : utilisateur → hôtel → rôle. Un utilisateur peut être dans plusieurs hôtels avec des rôles différents.
- **Role / Permission / RolePermission** : RBAC fine (permission = `module.action`).
- **AuditLog** : événements horodatés.

## 4.3 Cohérence des modules monnaie/paiement (anti-doublon)

La distinction est **explicite** :

- **`billing` (Invoice/InvoiceLine)** : ce qui est *facturé* — la dette. Maître de la facturation.
- **`payments` (Payment)** : *qui a payé quoi, comment, quand* — l'encaissement.
- **`caisse`** (à ajouter) : *où est l'argent* — fonds de caisse, sessions, rapprochement.
- **`accounting`** (à ajouter) : *écritures comptables* générées à partir des paiements/factures.

Un paiement **référence** une facture (ou réservation) mais ne duplique pas ses lignes. La comptabilité **consomme** les événements de paiement (via EventBus) pour écrire ses journaux. → Aucune donnée recopiée.

## 4.4 Statuts modélisés en `enum`

- `RoomStatus` : AVAILABLE / OCCUPIED / DIRTY / CLEANING / INSPECTED / OUT_OF_ORDER / OUT_OF_SERVICE / RESERVED
- `ReservationStatus` : PROVISIONAL / CONFIRMED / CHECKED_IN / CHECKED_OUT / CANCELLED / NO_SHOW / WAITLIST
- `InvoiceStatus` : DRAFT / OPEN / PARTIALLY_PAID / PAID / VOID
- `PaymentStatus` : PENDING / AUTHORIZED / PAID / FAILED / REFUNDED / VOID
- `HousekeepingStatus` / `Priority`, `NotificationStatus` / `Channel`, `PaymentMethod` (CASH, CARD, MOBILE_MONEY, BANK_TRANSFER, CHEQUE, ONLINE, POS_TERMINAL)

> Les `enum` Prisma sont des types PostgreSQL natifs → intégrité BD.

## 4.5 Transitions de statut (règles — voir `05-regles-metiers.md`)

Exemple (réservation) :
```
PROVISIONAL → CONFIRMED → CHECKED_IN → CHECKED_OUT
     │            │            │
     └────────────┴────────────┴→ CANCELLED
CONFIRMED → NO_SHOW
```

Les transitions illégales sont **rejetées par le service métier** (et, si besoin, par un trigger BD).

## 4.6 Évolution & migrations

- Un schéma par étape de la feuille de route.
- `prisma migrate dev` en local / `prisma migrate deploy` en CI avant déploiement.
- Un `seed/` fournit un hôtel de démo + rôles + permissions + chambres.
- Les **policies RLS** (infra/supabase) sont versionnées à côté du schéma.

## 4.7 Index stratégiques (performance)

| Table | Index | Justification |
|-------|-------|---------------|
| Reservation | `(hotelId, arrivalDate)`, `(hotelId, status)`, `(guestId)` | Planning, dashboard, recherche |
| Room | `(hotelId, status)` | Disponibilité |
| Invoice | `(hotelId, status)`, `(guestId)` | Suivi facturation |
| Payment | `(hotelId, createdAt)`, `(invoiceId)` | Caisse & rapprochement |
| AuditLog | `(hotelId, createdAt)`, `(entityType, entityId)` | Journal |
| RoomStatusHistory | `(roomId, createdAt)` | Historique états |

## 4.8 RLS (aperçu des policies clés)

```sql
-- Exemple générique appliqué à chaque table métier :
create policy "tenant_isolation" on "Reservation"
  using ( hotel_id = auth_hotel_id() ); -- helper en RLS

-- Helper : résout l'hôtel courant depuis le JWT de l'utilisateur
create or replace function auth_hotel_id() returns uuid ...
```
Les fonctions `auth_hotel_id()` / `auth_org_id()` et le jeu complet de policies sont détaillés dans
`infra/supabase/` lors du développement du module **Security** (étape 37).
