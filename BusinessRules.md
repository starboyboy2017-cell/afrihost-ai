# BusinessRules.md — Référence unique des règles métiers d'AfriHost AI

> **Document de référence unique** des règles métiers. Fait foi. Toute règle énoncée ici est **exécutoire** et
> doit être implémentée telle quelle. Les détails opérationnels par module vivent dans `docs/modules/`.
> Version : 1.0 — MVP validé (Phase 0 en cours).

---

## BR-0 — Périmètre

**MVP validé** (cœur du métier hôtelier) :
> Paramètres généraux → multi-hôtels → utilisateurs/rôles/permissions → types de chambres & chambres →
> états des chambres → réservations → planning → check-in/check-out → housekeeping → clients →
> paiements de base → journal d'audit.

Hors MVP (Phases 2+) : restaurant/POS, comptabilité avancée, CRM/fidélité, channel manager, IA, portail,
mobile, événements, BI, API publique. **[EXT]**

**Exigences transversales Phase 0 (avant Module 1) :**
- ✅ Multihôtel dès le départ (RLS).
- ✅ RBAC complet + **extensible** (rôles en base, créables depuis l'admin sans code).
- ✅ Journal d'audit pour toutes les actions importantes (append-only).
- ✅ Mode hors-ligne + synchronisation automatique.
- ✅ Architecture modulaire documentée.
- ✅ Event Bus (découplage inter-modules).

**Module 1 (Paramètres généraux) — livré :**
- ✅ Service métier (validation, audit, événements) + API + écran.
- ✅ Réglages organisation & hôtel (devise, langue, fuseau, TVA, coordonnées).

**Module 2 (Gestion multihôtels) — livré :**
- ✅ Créer / modifier / désactiver des hôtels (validation + unicité slug/code + audit + événements).
- ✅ Sélecteur d'hôtels (hôtels accessibles à l'utilisateur).
- ✅ Paramètres par établissement.
- ✅ Isolation complète des données entre hôtels (RLS `03-rls-policies.sql`).
- ✅ Rôles & permissions **par hôtel** (Membership user→hôtel→rôle).
- ✅ À la création, le créateur devient propriétaire (HOTEL_OWNER) de l'hôtel.
- ✅ Migration versionnée + documentation de restauration + **script de test RLS relançable** (`04-rls-test.sql`).

**Module 3 (Gestion des réservations) — livré :**
- ✅ Machine à états (BR-5.3) : PROVISIONAL → CONFIRMED → CHECKED_IN → CHECKED_OUT ; CANCELLED, NO_SHOW, WAITLIST.
- ✅ Tarification (BR-5.7) : nuits × taux − remise + taxes, minor units.
- ✅ Disponibilité / double-réservation (BR-5.5) + `bookingRef` unique.
- ✅ Confirmation, check-in, check-out, annulation, no-show — transitions illégales rejetées.
- ✅ Isolation métier + RLS entre hôtels ; audit + événements de domaine.
- ✅ API (`reservations.*`) + écran `/reservations`.

**Module 4 (Journal d'audit) — livré :**
- ✅ Consultation avec filtres (action, entité, acteur, dates, pagination).
- ✅ Export CSV (`GET /api/audit?export=csv`), append-only (immuable).
- ✅ Isolation par hôtel (service + RLS).

**Module Guests (Clients) — livré :**
- ✅ Création (détection doublon email, BR-8.2), modification, **archivage** (soft-delete).
- ✅ Informations d'identité (nom, email, téléphone, nationalité, pièces d'identité, naissance).
- ✅ **Historique des séjours** + **recherche rapide** (nom/email/téléphone/identité).
- ✅ RBAC (`guests.*`) + isolation par hôtel.

**Module 5 (Types de chambres & tarifs flexibles) — livré :**
- ✅ **Plusieurs types de chambres par hôtel** (RoomType).
- ✅ **Plusieurs plans tarifaires** par type : `BASE` / `SEASONAL` / `WEEKEND` / `PROMOTIONAL` (par saison/période).
- ✅ **Tarifs par devise** (RatePlanPrice, multi-pays : XOF, NGN, EUR...).
- ✅ **Restrictions/promotions** futures (minNights, capacité, réservation avance).
- ✅ Résolution de prix (saison + devise), isolation par hôtel (RLS vérifié), jeu de démonstration.

**Module 6 (Chambres & inventaire physique) — livré :**
- ✅ Machine à états des chambres (BR-4.2, 8 états), lien types (Module 5), historique des états.
- ✅ Numéro unique par hôtel, type d'un autre hôtel refusé (isolation), RBAC `rooms.*`.

**Module 7 (Check-in / Check-out) — livré :**
- ✅ Check-in (CONFIRMED→CHECKED_IN, chambre RESERVED→OCCUPIED, séjour ACTIVE).
- ✅ Check-out (CHECKED_IN→CHECKED_OUT, chambre OCCUPIED→DIRTY, séjour CHECKED_OUT).
- ✅ **Prolongation de séjour** + **changement de chambre** (RoomAssignment).
- ✅ État temps réel + audit + événements (`guest.checked_in/out`) + isolation RLS vérifiée.

**Module 8 (Tableau de disponibilité Front Desk) — livré :**
- ✅ Vue par hôtel en **temps réel** (séjours actifs + états des chambres), isolation RLS vérifiée.
- ✅ Filtres (étage, type, statut, période) + recherche (numéro chambre / nom client).
- ✅ Indicateurs visuels (disponible/occupée/réservée/en nettoyage/hors service/maintenance) + compteurs.
- ✅ Actions contextuelles (fiche chambre, réservation, check-in selon RBAC).

**Module 9 (Housekeeping) — livré :**
- ✅ Génération automatique d'une tâche au **check-out** (chambre → DIRTY).
- ✅ Affectation au personnel avec priorités + **réaffectation** si l'agent indisponible.
- ✅ Cycle `PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → VERIFIED` (machine à états).
- ✅ **Horodatage de chaque étape** (création, début, fin, validation) → mesure des temps.
- ✅ Journal d'audit + notifications temps réel + isolation RLS vérifiée.

**Module 10 (Maintenance & interventions) — livré :**
- ✅ Tickets (cycle Open→Assigned→In Progress→On Hold→Resolved→Closed), priorité, assignation/réassignation.
- ✅ Liaison chambre + mise hors service auto + remise en service à la clôture.
- ✅ Sync temps réel (Front Desk/réservations/check-in-out/housekeeping) + audit + isolation RLS.

**Module 11 (Blanchisserie) — livré :**
- ✅ Types de linge + pièces avec **cycle complet** (propre→distribué→utilisé→sale→lavage→séchage→repassage→propre).
- ✅ **Lots de lavage** (dates, quantité, responsable, coût, mode interne/externe).
- ✅ **Pertes/détériorations** + **seuils de stock** (comptage par type).
- ✅ Intégration housekeeping/chambres/front desk + audit + isolation RLS vérifiée.

**Module 12 (Transport, navettes & transferts) — livré :**
- ✅ Véhicules (capacité, plaque, état, **internes ou prestataires externes**) + chauffeurs.
- ✅ Réservations de transferts (aéroport, gare, ville, personnalisé, aller-retour, multi-destination).
- ✅ **Affectation auto ou manuelle** (véhicule + chauffeur).
- ✅ Cycle de statut `REQUESTED → CONFIRMED → ASSIGNED → IN_PROGRESS → COMPLETED` + annulation.
- ✅ Synchro réservations/check-in-out/profils clients + **facturation au folio** + audit + isolation RLS.

**Module 13 (POS Restaurant) — livré :**
- ✅ **Plusieurs points de vente** (restaurant, bar, room service), menus, produits, taxes, promotions (remises).
- ✅ **Commandes** (calcul auto sous-total/taxes/remise/total) + **encaissements multi-moyens de paiement**.
- ✅ **Remboursements / annulations / modifications** avec **traçabilité** (PosOrderEvent).
- ✅ **Chiffre d'affaires automatique** + intégration réservations/chambres.
- ✅ Isolation RLS vérifiée.

**Module 14 (Cuisine — Kitchen Display System) — livré :**
- ✅ **Réception des commandes POS** + **répartition par poste** + **priorités**.
- ✅ **Cycle New → Preparing → Ready → Served** (machine à états) + **modifications/annulations** tracées.
- ✅ Mises à jour **temps réel** + intégration réservations/chambres/front desk/room service.
- ✅ Isolation RLS vérifiée.

**Module 15 (Caisse) — livré :**
- ✅ Caisses (plusieurs par hôtel) + sessions **ouverture/fermeture**.
- ✅ **Mouvements multi-moyens** (ventes, remboursements, annulations, dépenses) traçables.
- ✅ **Clôture avec réconciliation** (écart compté vs théorique) + **rapports financiers** par moyen.
- ✅ Intégration POS/folios + isolation RLS vérifiée.

**Module 16 (Pourboires) — livré :**
- ✅ Enregistrement des pourboires **lors des paiements** + **individuel/collectif**.
- ✅ **Règles de répartition configurables par hôtel** (serveur/équipe/cuisine/autre, somme = 100 %).
- ✅ Validation par les responsables + **distribution** + suivi des montants (en attente/distribués).
- ✅ Multi-moyens (espèces, carte, mobile money) + annulations/corrections tracées + historique.
- ✅ Isolation RLS vérifiée.

**Module 17 (Remises, promotions & coupons) — livré :**
- ✅ Moteur de règles **flexible** (PMS/POS/caisse/facturation) : %, montant fixe, portées.
- ✅ **Plafonds par rôle** + **conditions** (dates, canaux, types de clients, types de chambres, montants).
- ✅ **Génération et validation des coupons** (code unique, mono-usage, expiration).
- ✅ Intégration folios clients (scope BILLING) + isolation RLS vérifiée.

**Module 18 (Stock & inventaire) — livré :**
- ✅ Articles, catégories, unités, **fournisseurs, entrepôts**.
- ✅ **Approvisionnements** : commandes fournisseurs, réceptions, contrôle des livraisons.
- ✅ **Seuils min/max + alertes** de réapprovisionnement.
- ✅ **Tous les mouvements** (entrées, sorties, transferts, ajustements, retours, pertes, casse).
- ✅ **Inventaires physiques** + **valorisation** (coût configurable) + **décrémentation auto** (POS/cuisine/blanchisserie/maintenance).
- ✅ Isolation RLS vérifiée.

**Module 19 (Comptabilité générale) — livré :**
- ✅ **Plan comptable configurable par hôtel** + compatibilité native **SYSCOHADA révisé (OHADA/UEMOA)**,
  extensible à d'autres normes par configuration (aucune règle codée en dur).
- ✅ **Journaux** (ventes, achats, banque, caisse, OD) + **écritures automatiques** équilibrées (débit = crédit).
- ✅ **Périodes comptables**, **rapprochements bancaires**, comptes clients/fournisseurs, **centres de coûts**.
- ✅ **Écritures d'ajustement**, **balance**, **grand livre** + isolation RLS vérifiée.

**Module 20 (Paiements & facturation) — livré :**
- ✅ **Folios clients** centralisant tous les frais (hébergement, restauration, room service, blanchisserie, transport, maintenance, minibar, autres).
- ✅ **Encaissements multimoyens** (espèces, carte, Mobile Money, virement, chèque) + **partiels / acomptes / cautions / remboursements / différés**.
- ✅ **Transfert / fusion de folios** (individuels, groupes, entreprises).
- ✅ **Facturation consolidée** (toutes consommations du séjour) + **règles fiscales configurables**.
- ✅ **Sync comptabilité SYSCOHADA** + **passerelles configurables** (Stripe, Flutterwave, Paystack, Mobile Money).
- ✅ Isolation RLS vérifiée.

**Module 21 (CRM) — livré :**
- ✅ **Vue 360 client** (séjours, dépenses, préférences, demandes, incidents, réclamations, fidélité, campagnes, interactions).
- ✅ **Segmentation dynamique** (critères configurables) + **campagnes multicanal** (email, SMS, WhatsApp, push) avec suivi ouvertures/clics.
- ✅ **Préférences clients** (langue, chambre, étage, vue, lit, régime, allergies, paiement, anniversaire, communication).
- ✅ Notes internes, tâches, rappels, opportunités, **entreprises/agences**, historique complet.
- ✅ **Architecture fidélité extensible** (points, niveaux, récompenses) sans logique en dur.
- ✅ Isolation RLS vérifiée. **261 tests verts.**

---

## BR-1 — Acteurs & rôles système

> ⭐ **RBAC extensible & versionné** : ces 11 rôles sont **définis par migration** (versionnée,
> `20260804010000_seed_permissions_roles`) et créés automatiquement **par organisation** via un trigger
> multihôtel (isolation). Un administrateur peut créer **de nouveaux rôles** et choisir librement leurs
> permissions **sans modifier le code**, via le panneau d'admin (Module 3 — IAM). Le code n'a pas de liste
> figée de rôles ; seuls ces rôles "système" sont pré-définis (non supprimables), tout rôle créé en base est
> pleinement fonctionnel.

| Code rôle | Libellé | Périmètre | Accès principal |
|-----------|---------|-----------|-----------------|
| `PLATFORM_ADMIN` | Super Admin (plateforme) | plateforme entière | tout, toutes org/hôtels |
| `HOTEL_OWNER` | Propriétaire | son organisation / ses hôtels | accès complet à son org |
| `FRONT_DESK` | Réception | un hôtel | réservations, check-in/out, clients, planning, paiements |
| `HOUSEKEEPING` | Housekeeping (gouvernante) | un hôtel | états chambres, ménage |
| `CASHIER` | Caissier | un hôtel | encaissements, caisse, POS |
| `WAITER` | Serveur | un hôtel | commandes & ventes restaurant |
| `KITCHEN` | Cuisinier | un hôtel | ordres cuisine, menus |
| `STOCK_MANAGER` | Gestionnaire de stock | un hôtel | inventaire, réappro, fournisseurs |
| `ACCOUNTANT` | Comptable | un hôtel | paiements, facturation, caisse, audit, rapports |
| `MAINTENANCE` | Technicien maintenance | un hôtel | interventions, mise hors service |
| `GUEST` | Client | portail | réservation, factures, fidélité, profil |

**Règles :**
- **BR-1.1** Une action = permission `module.action` ; vérifiée route + BD.
- **BR-1.2** Rôles système seedés, non supprimables ; **rôles personnalisés créés en base par l'admin**.
- **BR-1.3** Seul le propriétaire / admin d'organisation gère les utilisateurs/rôles de son organisation.
- **BR-1.4** Toute action financière requiert un rôle autorisé et est tracée.
- **BR-1.5** `HOUSEKEEPING`/`KITCHEN`/`MAINTENANCE` ne modifient jamais réservation/paiement/facture.
- **BR-1.6** `GUEST` ne possède que des permissions `portal.*` (périmètre portail).

### Matrice de permissions (extrait — complète module par module)

| Action | OWNER | FRONT_DESK | CASHIER | ACCOUNTANT | HOUSEKEEPING | STOCK | GUEST |
|--------|-------|------------|---------|------------|--------------|-------|-------|
| `reservations.create` | ✅ | ✅ | — | — | — | — | portal |
| `reservations.checkin` | ✅ | ✅ | — | — | — | — | — |
| `rooms.assign` | ✅ | ✅ | — | — | — | — | — |
| `housekeeping.update` | ✅ | — | — | — | ✅ | — | — |
| `pos.sell` | ✅ | — | ✅ | — | — | — | — |
| `caisse.close` | ✅ | — | ✅ | ✅ | — | — | — |
| `invoices.refund` | ✅ | — | — | ✅ | — | — | — |
| `inventory.reorder` | ✅ | — | — | — | — | ✅ | — |
| `settings.hotel.update` | ✅ | — | — | — | — | — | — |
| `users.manage` | ✅ | — | — | — | — | — | — |
| `reports.view` | ✅ | — | ✅ | ✅ | — | ✅ | — |
| `portal.self_reservation` | — | — | — | — | — | — | ✅ |

---

## BR-2 — Multihôtel

- **BR-2.1** Utilisateur n'accède qu'aux hôtels de ses `Membership`.
- **BR-2.2** Hôtel actif mémorisé en session ; vues filtrées par l'hôtel actif.
- **BR-2.3** Hôtel désactivable (`isActive=false`).
- **BR-2.4** Chaque hôtel porte devise, langue, fuseau, taxe, coordonnées.
- **BR-2.5** RLS : aucune lecture inter-hôtel.

---

## BR-3 — Chambres & types de chambres

- **BR-3.1** Type de chambre = catégorie (nom, `baseRate`, capacité, équipements).
- **BR-3.2** Chambre → un type, `number` unique par hôtel.
- **BR-3.3** Tarif de référence sur le type ; réservation gèle son prix facturé.
- **BR-3.4** Suppression d'un type impossible s'il a des chambres/historique.

## BR-4 — États d'une chambre

- **BR-4.1** États : `AVAILABLE, RESERVED, OCCUPIED, DIRTY, CLEANING, INSPECTED, OUT_OF_ORDER, OUT_OF_SERVICE`.
- **BR-4.2** Transitions :
  - `AVAILABLE → RESERVED`
  - `RESERVED → OCCUPIED` (check-in) ; `RESERVED → AVAILABLE` (annulation)
  - `OCCUPIED → DIRTY` (check-out)
  - `DIRTY → CLEANING → INSPECTED → AVAILABLE` (housekeeping)
  - `* → OUT_OF_ORDER / OUT_OF_SERVICE`
- **BR-4.3** `OUT_OF_SERVICE` jamais affectée.
- **BR-4.4** Chaque changement d'état journalisé.

---

## BR-5 — Réservations

- **BR-5.1** `bookingRef` unique (ex : `AH-2026-00042`).
- **BR-5.2** Statuts : `PROVISIONAL, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW, WAITLIST`.
- **BR-5.3** Transitions :
  - `PROVISIONAL → CONFIRMED | CANCELLED`
  - `CONFIRMED → CHECKED_IN | CANCELLED | NO_SHOW`
  - `CHECKED_IN → CHECKED_OUT | CANCELLED`
  - `WAITLIST → PROVISIONAL`
  - autres rejetées.
- **BR-5.4** Validité : `departure > arrival`, durée ≥ 1 nuit, capacité cohérente.
- **BR-5.5** Pas de double-réservation sur une même chambre/période.
- **BR-5.6** Overbooking interdit par défaut (option `HOTEL_MANAGER`) **[EXT]**.
- **BR-5.7** Tarif = `nuits × taux − remise + taxes`, en minor units.
- **BR-5.8** Annulation : politique par hôtel, enregistrée.

---

## BR-6 — Check-in / Check-out

- **BR-6.1** Check-in requiert réservation `CONFIRMED` + chambre assignée. → `CHECKED_IN` ; chambre `OCCUPIED` ; active consommation.
- **BR-6.2** Check-out requiert `CHECKED_IN`. → `CHECKED_OUT` ; chambre `DIRTY` ; clôture facture.
- **BR-6.3** No-show → `NO_SHOW`, chambre libérée, pénalité possible.
- **BR-6.4** Actions hors-ligne enregistrées localement puis synchronisées ; idempotence (pas de ré-application).

---

## BR-7 — Housekeeping

- **BR-7.1** Tâche créée quand chambre `OCCUPIED → DIRTY` (check-out).
- **BR-7.2** Statuts tâche : `PENDING → ASSIGNED → IN_PROGRESS → COMPLETED → VERIFIED`.
- **BR-7.3** Priorités : `LOW / MEDIUM / HIGH / URGENT`.
- **BR-7.4** `HOUSEKEEPING` assigne/exécute ; manager/front desk vérifient.
- **BR-7.5** Chambre `AVAILABLE` seulement après `VERIFIED`.
- **BR-7.6** Création automatique au check-out (automatisation).

---

## BR-8 — Clients

- **BR-8.1** Client global à l'org + fiche locale par hôtel.
- **BR-8.2** Unicité `email` par org ; doublons détectés.
- **BR-8.3** Création depuis réservation ou recherche par email/téléphone.
- **BR-8.4** Chaque séjour enrichit l'historique.
- **BR-8.5** RGPD : export/suppression (anonymisation).

---

## BR-9 — Paiements (base)

- **BR-9.1** Méthodes : `CASH, CARD, MOBILE_MONEY, BANK_TRANSFER, ONLINE, POS_TERMINAL`.
- **BR-9.2** Statuts : `PENDING → AUTHORIZED → PAID`, ou `FAILED/VOID/REFUNDED`.
- **BR-9.3** Paiement référence réservation/facture sans dupliquer.
- **BR-9.4** Montant minor units + devise ; taux de change gelé.
- **BR-9.5** Mobile Money natif ; hors-ligne en file, confirmé à la sync.
- **BR-9.6** Jamais de numéro de carte stocké (PCI).
- **BR-9.7** Règlement partiel autorisé, solde tracé.

---

## BR-10 — Journal d'audit

- **BR-10.1** Toute mutation create/update/delete journalisée.
- **BR-10.2** Append-only (immuable) — ADR-012.
- **BR-10.3** Enregistre : actor, action, entité, avant/après (JSON), ip, userAgent, hotel, time.
- **BR-10.4** Consultable par rôles autorisés selon périmètre.
- **BR-10.5** Actif dès la Phase 0.

---

## BR-11 — Automatisations (MVP)

| Déclencheur | Condition | Action |
|-------------|-----------|--------|
| Réservation confirmée | toujours | notifier client, préparer housekeeping |
| Arrivée J-1 | `CONFIRMED` | pré-assigner chambre si possible |
| Non-arrivée | échéance atteinte | → `NO_SHOW`, libérer chambre, pénalité |
| Check-out | toujours | créer tâche housekeeping, libérer chambre |
| Paiement reçu | toujours | marquer facture payée |
| Réservation annulée | toujours | libérer chambre, remboursement selon politique |

---

## BR-12 — Notifications (MVP)

| Canal | Usage MVP | Fournisseur |
|-------|-----------|-------------|
| WhatsApp | confirmation, rappel, check-out | WhatsApp Business Cloud API |
| Email | confirmation, reçu | SendGrid |
| SMS | urgences, rappel | Twilio |

- **BR-12.1** WhatsApp = canal prioritaire.
- **BR-12.2** Templates multi-langue/multi-devise.
- **BR-12.3** Statuts : `QUEUED → SENT → DELIVERED → FAILED` (+ retry).
- **BR-12.4** Hors-ligne → file, envoi à la sync.

---

## BR-13 — Règles transversales (non négociables)

1. **Aucune écriture sans audit.**
2. **Aucun accès inter-hôtel** (RLS + contrôle applicatif).
3. **Montants en minor units**, devise explicite.
4. **Toute mutation monétaire** via service financier dédié.
5. **Changements de statut** via la machine à états du service, jamais un `UPDATE` libre.
6. **Multi-langue / multi-devise** par hôtel.
7. **Offline-first** (lecture/écriture locales, sync à la reconnexion).
8. **Conformité RGPD**.
9. **Audit append-only**.
10. **IDs UUID v7 côté client + updatedAt + soft-delete**.

---

## Glossaire
- **PMS** : Property Management System.
- **RLS** : Row Level Security.
- **LWW** : Last-Write-Wins (résolution de conflit de sync).
- **Minor units** : montant en unités divisibles (centimes).
- **OTA** : Online Travel Agency (Booking, Expedia...).
