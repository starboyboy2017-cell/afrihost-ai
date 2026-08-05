# 5 — Règles métiers (aperçu)

> **Le document de référence exécutoire est [`docs/business-rules.md`](business-rules.md)** (Business Rules,
> versionné, avec le périmètre MVP validé). Ce fichier en est l'aperçu synthétique. Toute règle énoncée dans
> `business-rules.md` **précède le développement** et fait foi en cas d'écart.

---

## 5.1 Acteurs & rôles système

| Rôle | Code | Périmètre | Actes typiques |
|------|------|-----------|----------------|
| Super Admin (plateforme) | `PLATFORM_ADMIN` | Toute la plateforme | gérer organisations, billing SaaS, support |
| Administrateur d'organisation | `ORG_ADMIN` | L'organisation (tous hôtels) | créer hôtels, utilisateurs, rôles, paramètres globaux |
| Directeur d'hôtel | `HOTEL_MANAGER` | Un hôtel | tout sur son hôtel, rapports, tarifs, configuration |
| Réceptionniste | `FRONT_DESK` | Un hôtel | réservations, check-in/out, allocation chambres |
| Gouvernante / Housekeeping | `HOUSEKEEPING` | Un hôtel | tâches de ménage, états des chambres, blanchisserie |
| Maintenance | `MAINTENANCE` | Un hôtel | interventions, immobilisations |
| POS / Restaurant | `POS_CASHIER` | Un hôtel | ventes restaurant/bar, encaissements |
| Chef de cuisine | `KITCHEN` | Un hôtel | ordres cuisine, menus, stocks cuisine |
| Caissier / Comptable | `ACCOUNTING` | Un hôtel | caisse, facturation, comptabilité, paiements |
| Commercial / CRM | `SALES_CRM` | Un hôtel | clients, fidélité, campagnes, événements |
| Client (portail) | `GUEST` | Lui-même | réserver, consulter facture, fidélité, demandes |

> **Modèle :** `Role` est configurable par organisation. Les rôles ci-dessus sont les **rôles système** seedés.
> Une permission = `module.action` (ex : `reservations.cancel`). Chaque écran/route vérifie la permission.

## 5.2 Matrice de permissions (extrait — livrée complète module par module)

| Action (code) | ORG_ADMIN | HOTEL_MANAGER | FRONT_DESK | HOUSEKEEPING | POS | ACCOUNTING |
|---------------|-----------|---------------|------------|--------------|-----|------------|
| `reservations.create` | ✅ | ✅ | ✅ | — | — | — |
| `reservations.cancel` | ✅ | ✅ | ✅ | — | — | — |
| `reservations.checkin` | ✅ | ✅ | ✅ | — | — | — |
| `rooms.assign` | ✅ | ✅ | ✅ | — | — | — |
| `housekeeping.update` | ✅ | ✅ | — | ✅ | — | — |
| `pos.sell` | ✅ | ✅ | — | — | ✅ | — |
| `caisse.close` | ✅ | ✅ | — | — | — | ✅ |
| `invoices.refund` | ✅ | ✅ | — | — | — | ✅ |
| `billing.consolidate` | ✅ | ✅ | — | — | — | ✅ |
| `settings.hotel.update` | ✅ | ✅ | — | — | — | — |
| `users.manage` | ✅ | — | — | — | — | — |
| `reports.view` | ✅ | ✅ | — | — | — | ✅ |

*(Règle : les permissions de gestion comptable/financière sont exclusives aux rôles dédiés pour éviter les conflits d'intérêts.)*

## 5.3 Statuts & machines à états

### Réservation
```
PROVISIONAL ──(confirmation)──▶ CONFIRMED ──(check-in)──▶ CHECKED_IN ──(check-out)──▶ CHECKED_OUT
     │                              │                       │
     └─(annulation)─▶ CANCELLED      ├─(no-show)─▶ NO_SHOW  └─(annulation)─▶ CANCELLED
                                     └─(annulation)─▶ CANCELLED
WAITLIST ──(place libérée)──▶ PROVISIONAL
```

### Chambre
```
AVAILABLE ──(ménage requis)──▶ DIRTY ──(assignée)──▶ CLEANING ──(inspection)──▶ INSPECTED ──▶ AVAILABLE
AVAILABLE ──(réservation)──▶ RESERVED
RESERVED/OCCUPIED ...
OCCUPIED ──(check-out)──▶ DIRTY
tout état ──(maintenance)──▶ OUT_OF_ORDER / OUT_OF_SERVICE
```

### Facture / Paiement / Housekeeping : voir `04-schema-bdd.md` §4.4.

## 5.4 Événements de domaine (EventBus)

Catégorie d'événements publiés par les modules et consommés par d'autres (découplage) :

| Événement | Émis par | Consommé par |
|-----------|----------|--------------|
| `reservation.created` | Réservations | Compta, CRM, Notifications, Housekeeping, Channel |
| `reservation.confirmed` | Réservations | Compta (dépôt), Notifications, Housekeeping |
| `reservation.cancelled` | Réservations | Compta, Notifications, Channel, Disponibilité |
| `reservation.no_show` | Réservations | Facturation (no-show fee), Notifications |
| `guest.checked_in` | Check-in | Chambre(état), Compta, CRM |
| `guest.checked_out` | Check-out | Chambre(état→DIRTY), Compta, Housekeeping, Facturation |
| `room.status_changed` | Room/Status | Planning (temps réel), Housekeeping |
| `payment.received` | Paiements | Facturation, Caisse, Compta, CRM |
| `invoice.paid` | Facturation | Compta, CRM (reçu), Notifications |
| `pos.sale_completed` | POS | Compta, Stocks, Caisse, Tips, Notifications |
| `inventory.reorder` | Stocks | Fournisseurs, Notifications |
| `housekeeping.completed` | Housekeeping | Chambre(état), Planning |
| `loyalty.points_earned` | Fidélité | CRM, Notifications |
| `channel.reservation_synced` | Channel Manager | Réservations, Notifications |
| `events.group_confirmed` | Événements | Réservations (blocs), Facturation, CRM |

## 5.5 Automatisations (moteur de règles)

L'administrateur configure des **automations** (règle = `quand X → faire Y`).

| Déclencheur | Condition | Action |
|-------------|-----------|--------|
| Réservation confirmée | toujours | notifier client (WhatsApp/email), créer pré-autorisation |
| Arrivée J-1 | réservation CONFIRMED | pré-assigner chambre si possible, préparer housekeeping |
| Non-arrivée | après heure d'échéance sans check-in | passer en NO_SHOW, facturer pénalité, relancer |
| Check-out fait | toujours | envoyer facture + questionnaire satisfaction, libérer chambre |
| Chambre sale | check-out | générer tâche housekeeping priorité normale |
| Stock bas | quantité ≤ seuil | générer bon de commande fournisseur + notifier |
| Paiement reçu | toujours | marquer facture payée, attribuer points fidélité |
| Anniversaire client | date | campagne CRM (email/WhatsApp) |
| No-show | toujours | facturer, mettre chambre à disposition |
| Tâche en retard | échéance dépassée | escalade (notifier superviseur) |

> Moteur : tables `Automation` / `AutomationRule` + évaluateur déclenché par les événements de domaine.
> Livré en début (fondation) pour que tous les modules s'y branchent.

## 5.6 Notifications (canal central — module dédié)

- Un seul service `notifications` **orchestre** WhatsApp, Email, SMS, Push.
- **Templates** versionnés (variables, multi-langue, multi-devise).
- **Statuts** : QUEUED → SENT → DELIVERED → FAILED (avec retry et dead-letter).
- **Priorité** : WhatsApp > SMS > Email selon urgence (WhatsApp dominant en Afrique).
- Traçabilité dans `Notification` + journal d'audit.

| Canal | Usage | Fournisseur |
|-------|-------|-------------|
| WhatsApp | confirmation, rappel, facture, promo | **WhatsApp Business Cloud API** |
| Email | confirmations, factures PDF, newsletters | SendGrid |
| SMS | urgences, OTP, rappels sans internet | Twilio (ou opérateur local) |
| Push | planning, tâches (interne) | Realtime / Web Push |

## 5.7 Intégrations (module + canal)

| Intégration | Direction | Protocole | Usage |
|-------------|-----------|-----------|-------|
| OTA (Booking, Expedia, Airbnb) | Bidirectionnel | **Channel Manager** (8x-sync) | distribution, tarifs, disponibilité |
| Paiements cartes | Entrant | Stripe / Paystack / Flutterwave | pré-autorisations, encaissement |
| Mobile Money | Entrant | APIs opérateurs (MTN, Orange, Moov) | paiements |
| Comptabilité | Sortant | Export + webhooks | Sage/QuickBooks locaux |
| WhatsApp | Sortant/Entrant | Cloud API | notifications, conciergerie |
| IA | Sortant | LLM API | assistant, tri, prédictions |
| BI | Sortant | Export + API | rapports externes |
| Public API | Bidirectionnel | REST + webhooks | intégrations tierces |

## 5.8 Règles transversales (non-négociables)

1. **Aucune écriture sans audit.**
2. **Aucun accès inter-hôtel** (RLS + vérification applicative).
3. **Montants en minor units**, devise toujours explicite, taux de change historique gelé sur la transaction.
4. **Toute mutation monétaire** (paiement, remise, annulation) passe par un service financier dédié, jamais directement.
5. **Remises** : nécessitent un niveau de permission (`discounts.apply`), plafonds par rôle, tracées.
6. **Annulation** : politique définie par hôtel (frais, remboursement) — enregistrée sur la réservation.
7. **Changements de statut** : toujours via la machine à états du service, jamais un `UPDATE` libre.
8. **Multi-langue/multi-devise** : locales gérées par hôtel, traduction centralisée.
9. **Rétention & RGPD** : consentement, droit à l'oubli (anonymisation), export des données.
10. **Audit d'intégrité** : les journaux d'audit sont **append-only** (immutables).
