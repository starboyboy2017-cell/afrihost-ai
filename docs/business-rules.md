# Business Rules — Règles métiers de AfriHost AI

> **Document de référence des règles métiers**, préalable au code. Toute règle énoncée ici est **exécutoire**.
> Ce document complète `docs/05-regles-metiers.md` (aperçu) et sera mis à jour module par module.
> Version : 1.0 — **MVP** (périmètre validé) + extensions futures signalées **[EXT]**.

---

## BR-0 — Périmètre du MVP (validé)

Le MVP couvre le **cœur du métier hôtelier** :

> Paramètres généraux → multi-hôtels → utilisateurs/rôles/permissions → types de chambres & chambres →
> états des chambres → réservations → planning → check-in/check-out → housekeeping → clients →
> paiements de base → journal d'audit.

Hors MVP (ajoutés ensuite) : restaurant/POS, comptabilité avancée, CRM/fidélité, channel manager, IA,
portail, mobile, événements, BI, API publique. **[EXT]**

**Exigence transversale MVP :** mode **offline-first** (fonctionne hors connexion, sync à la reconnexion) — ADR-011.

---

## BR-1 — Rôles & acteurs

| Code rôle | Libellé | Périmètre | Accès MVP |
|-----------|---------|-----------|-----------|
| `PLATFORM_ADMIN` | Super Admin plateforme | plateforme entière | tout (hors périmètre client) |
| `ORG_ADMIN` | Admin organisation | tous les hôtels de l'org | tout |
| `HOTEL_MANAGER` | Directeur d'hôtel | un hôtel | tout sur son hôtel |
| `FRONT_DESK` | Réceptionniste | un hôtel | réservations, check-in/out, clients, planning, paiements |
| `HOUSEKEEPING` | Gouvernante | un hôtel | états chambres, housekeeping |
| `ACCOUNTING` | Comptable/caissier | un hôtel | paiements, rapports, journal |

> Chaque utilisateur a un rôle **par hôtel** (via `Membership`). Un utilisateur peut être `FRONT_DESK` sur un
> hôtel et `HOTEL_MANAGER` sur un autre.

### Règles de permissions
- **BR-1.1** Une action = permission `module.action`. Chaque route/écran vérifie la permission.
- **BR-1.2** Les rôles système (`PLATFORM_ADMIN`, `ORG_ADMIN`, `HOTEL_MANAGER`, `FRONT_DESK`, `HOUSEKEEPING`,
  `ACCOUNTING`) sont seedés, non supprimables.
- **BR-1.3** `ORG_ADMIN` est le seul habilité à gérer les utilisateurs et les rôles de son organisation.
- **BR-1.4** Toute action financière (paiement, remise, annulation avec remboursement) requiert un rôle
  autorisé (`FRONT_DESK`, `ACCOUNTING`, `HOTEL_MANAGER`) et est tracée.
- **BR-1.5** `HOUSEKEEPING` ne peut **jamais** modifier une réservation, un paiement ou une facture.

---

## BR-2 — Multihôtel & sélection

- **BR-2.1** Un utilisateur n'accède qu'aux hôtels listés dans ses `Membership`.
- **BR-2.2** L'**hôtel actif** est mémorisé en session ; toutes les vues affichent les données de l'hôtel actif.
- **BR-2.3** Un hôtel peut être **désactivé** (`isActive=false`) — alors inutilisable jusqu'à réactivation.
- **BR-2.4** Chaque hôtel porte ses propres **devise, langue, fuseau, taux de taxe, adresse, coordonnées**.
- **BR-2.5** RLS : toute lecture inter-hôtel est impossible (filtre `hotelId` au niveau BD).

---

## BR-3 — Chambres & types de chambres

- **BR-3.1** Un **type de chambre** = catégorie (Standard, Suite...) avec `baseRate`, capacité, équipements.
- **BR-3.2** Une **chambre** appartient à un type et un seul, avec un `number` unique par hôtel.
- **BR-3.3** Le **tarif de référence** vit sur le type de chambre ; une réservation gèle son **prix facturé**
  (valeur de transaction, pas une duplication du catalogue).
- **BR-3.4** Suppression d'un type de chambre impossible s'il possède des chambres ou un historique.

### États d'une chambre (BR-4)
- **BR-4.1** États : `AVAILABLE`, `RESERVED`, `OCCUPIED`, `DIRTY`, `CLEANING`, `INSPECTED`,
  `OUT_OF_ORDER`, `OUT_OF_SERVICE`.
- **BR-4.2** Transitions autorisées :
  - `AVAILABLE → RESERVED` (réservation confirmée)
  - `RESERVED → OCCUPIED` (check-in) ; `RESERVED → AVAILABLE` (annulation)
  - `OCCUPIED → DIRTY` (check-out)
  - `DIRTY → CLEANING → INSPECTED → AVAILABLE` (housekeeping)
  - `* → OUT_OF_ORDER / OUT_OF_SERVICE` (maintenance) — [ménage non requis]
- **BR-4.3** Une chambre `OUT_OF_SERVICE` n'est **jamais** affectée à une réservation.
- **BR-4.4** Chaque changement d'état est journalisé (`RoomStatusHistory`).

---

## BR-5 — Réservations

- **BR-5.1** Référence de réservation `bookingRef` unique (ex : `AH-2026-00042`).
- **BR-5.2** Statuts : `PROVISIONAL`, `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED`, `NO_SHOW`, `WAITLIST`.
- **BR-5.3** Transitions autorisées :
  - `PROVISIONAL → CONFIRMED | CANCELLED`
  - `CONFIRMED → CHECKED_IN | CANCELLED | NO_SHOW`
  - `CHECKED_IN → CHECKED_OUT | CANCELLED`
  - `WAITLIST → PROVISIONAL`
  - Toute autre transition est **rejetée**.
- **BR-5.4** Validité : `departureDate > arrivalDate` ; durée ≥ 1 nuit ; capacité cohérente
  (adultes+enfants ≤ capacité du type).
- **BR-5.5** **Disponibilité** : une chambre ne peut être réservée si déjà occupée/réservée sur la même
  période → aucune double-réservation.
- **BR-5.6** **Overbooking** : interdit par défaut ; l'option est un réglage d'hôtel limité à `HOTEL_MANAGER`
  **[EXT]**.
- **BR-5.7** Tarif = `nb nuits × taux − remise + taxes`, montants en **minor units** (ADR-007).
- **BR-5.8** Annulation : politique par hôtel (frais/remboursement) ; enregistrée sur la réservation.

---

## BR-6 — Check-in / Check-out

- **BR-6.1** Le **check-in** requiert une réservation `CONFIRMED` et une chambre assignée.
  → `CONFIRMED → CHECKED_IN` ; chambre `RESERVED → OCCUPIED` ; créer/activer la consommation.
- **BR-6.2** Le **check-out** requiert une réservation `CHECKED_IN`. → `CHECKED_IN → CHECKED_OUT` ;
  chambre `OCCUPIED → DIRTY` ; clôturer la facture.
- **BR-6.3** Un **no-show** (non-arrivée à l'échéance) → `CONFIRMED → NO_SHOW`, chambre libérée, pénalité
  éventuelle.
- **BR-6.4** Un check-in/out effectué **hors-ligne** est enregistré localement puis synchronisé (ADR-011) ;
  une fois consommé, il ne peut être réappliqué (idempotence).

---

## BR-7 — Housekeeping (ménage)

- **BR-7.1** Une tâche de ménage est créée quand une chambre passe `OCCUPIED → DIRTY` (check-out).
- **BR-7.2** Statuts tâche : `PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → VERIFIED`.
- **BR-7.3** Priorités : `LOW / MEDIUM / HIGH / URGENT`.
- **BR-7.4** `HOUSEKEEPING` peut assigner/exécuter ; `HOTEL_MANAGER`/`FRONT_DESK` peuvent vérifier.
- **BR-7.5** Une chambre ne redevient `AVAILABLE` qu'après `VERIFIED` (inspection).
- **BR-7.6** La création de tâche est **automatique** au check-out (automatisation).

---

## BR-8 — Clients (guests)

- **BR-8.1** Un client appartient à l'**organisation** (historique global), avec une fiche locale par hôtel.
- **BR-8.2** Clé d'unicité : `email` par organisation ; doublons détectés à la création.
- **BR-8.3** Création depuis une réservation (nouveau client) ou préexistante (recherche par email/téléphone).
- **BR-8.4** Chaque séjour enrichit l'historique du client (dates, montants, préférences).
- **BR-8.5** Consentement (RGPD) : le client peut demander export/suppression (anonymisation).

---

## BR-9 — Paiements (base, MVP)

- **BR-9.1** Méthodes : `CASH`, `CARD`, `MOBILE_MONEY`, `BANK_TRANSFER`, `ONLINE`, `POS_TERMINAL`.
- **BR-9.2** Statuts : `PENDING → AUTHORIZED → PAID`, ou `FAILED`/`VOID`/`REFUNDED`.
- **BR-9.3** Un paiement **référence** une réservation (ou facture) sans dupliquer ses lignes.
- **BR-9.4** Montant en minor units + devise explicite ; taux de change gelé à l'encaissement.
- **BR-9.5** **Mobile Money** natif (MTN MoMo, Orange Money, Moov) ; paiement hors-ligne mis en file,
  confirmé à la sync.
- **BR-9.6** On ne stocke **jamais** de numéro de carte (PCI) — uniquement des références fournisseur.
- **BR-9.7** Règlement partiel autorisé ; le solde est tracé.

---

## BR-10 — Journal d'audit

- **BR-10.1** Toute mutation d'écriture (create/update/delete) est journalisée.
- **BR-10.2** Journal **append-only** (immuable) — aucune mise à jour ni suppression (ADR-012).
- **BR-10.3** Enregistre : `actor`, `action`, `entité`, `avant/après` (JSON), `ip`, `userAgent`, `hotel`, `time`.
- **BR-10.4** Consultable par `ORG_ADMIN` / `HOTEL_MANAGER` / `ACCOUNTING` selon périmètre.
- **BR-10.5** L'audit est **actif dès la Phase 0** (pas seulement au module 13).

---

## BR-11 — Automatisations (MVP)

| Déclencheur | Condition | Action |
|-------------|-----------|--------|
| Réservation confirmée | toujours | notifier client, préparer housekeeping |
| Arrivée J-1 | `CONFIRMED` | pré-assigner chambre si possible |
| Non-arrivée | heure d'échéance atteinte | → `NO_SHOW`, libérer chambre, pénalité |
| Check-out | toujours | créer tâche housekeeping, libérer chambre |
| Chambre sale | check-out | générer tâche `MEDIUM` |
| Paiement reçu | toujours | marquer facture payée |
| Réservation annulée | toujours | libérer chambre, remboursement selon politique |

> Moteur d'automatisation livré en Phase 0 (tables `Automation`/`AutomationRule`) pour que tous les modules s'y
> branchent.

---

## BR-12 — Notifications (MVP)

| Canal | Usage MVP | Fournisseur |
|-------|-----------|-------------|
| WhatsApp | confirmation, rappel, check-out | WhatsApp Business Cloud API |
| Email | confirmation, reçu | SendGrid |
| SMS | urgences, rappel | Twilio |

- **BR-12.1** Canal prioritaire : **WhatsApp** (dominant en Afrique).
- **BR-12.2** Templates multi-langue/multi-devise versionnés.
- **BR-12.3** Statuts : `QUEUED → SENT → DELIVERED → FAILED` (+ retry).
- **BR-12.4** En mode **hors-ligne**, les notifications sont mises en file et envoyées à la sync.

---

## BR-13 — Règles transversales (non-négociables)

1. **Aucune écriture sans audit.**
2. **Aucun accès inter-hôtel** (RLS + contrôle applicatif).
3. **Montants en minor units**, devise toujours explicite.
4. **Toute mutation monétaire** passe par un service financier dédié.
5. **Changements de statut** via la machine à états du service, jamais un `UPDATE` libre.
6. **Multi-langue / multi-devise** par hôtel.
7. **Offline-first** : lecture et écriture locales, sync à la reconnexion (ADR-011).
8. **Conformité RGPD** : consentement, export, anonymisation.
9. **Audit append-only** (ADR-012).
10. **IDs UUID v7 côté client** + `updatedAt` + soft-delete pour la sync (ADR-013).

---

## Glossaire
- **PMS** : Property Management System.
- **RLS** : Row Level Security (isolation multitenant en base).
- **LWW** : Last-Write-Wins (résolution de conflit de sync).
- **Minor units** : représentation d'un montant en unités divisibles (centimes).
- **OTA** : Online Travel Agency (Booking, Expedia...).
