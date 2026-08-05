# Module 1 — Paramètres généraux (exemple de spécification complète)

## 0. Fiche
- **Nom :** Paramètres généraux (`settings`)
- **Dépendances :** Phase 0 (fondation : auth, RBAC, RLS, audit, EventBus)
- **Position :** n° 1 — livré en premier car tout le reste s'y réfère.

## 1. Objectif
Centraliser la **configuration** de l'organisation et de chaque hôtel (identité, devise, taxes, langue,
fuseau, options de modules). C'est le "panneau de contrôle" qui conditionne le comportement de toute la
plateforme (tarifs, factures, notifications).

## 2. Acteurs & permissions
| Rôle | Accès |
|------|-------|
| `PLATFORM_ADMIN` | Tout (org de chaque client, paramètres SaaS) |
| `ORG_ADMIN` | Paramètres de l'organisation + créer/configurer ses hôtels |
| `HOTEL_MANAGER` | Paramètres **de son hôtel** uniquement |

Permissions :
- `settings.organisation.view` / `settings.organisation.update`
- `settings.hotel.view` / `settings.hotel.update`
- `settings.integrations.manage` (clés API WhatsApp, paiement, email)

## 3. Données (entités)
Tables existantes concernées : `Organisation`, `Hotel` (colonnes `currency`, `locale`, `timezone`,
`vatRate`, `features`). Nouvelle table d'audit pour traçabilité. RLS : `ORG_ADMIN` sur org, `HOTEL_MANAGER` sur
`hotel_id = current_hotel_id()`.

## 4. Statuts
Pas de machine à états complexe. Flag `Hotel.isActive` (hôtel actif/inactif). Validation des champs
(format devise ISO, locale BCP-47, fuseau IANA).

## 5. Automatisations
- À la création d'un hôtel → création d'un jeu de **permissions** et de **rôles système** par défaut + plan comptable de base (module 25).
- À la modification de devise → recalcul des prix catalogués (module 6) avec alerte.

## 6. Notifications
- Notification à l'`ORG_ADMIN` lors d'un changement sensible de configuration (audit + email).
- Historique des modifications via journal d'audit.

## 7. Interactions
- **Émis :** `hotel.created`, `hotel.updated`, `settings.changed`.
- **Écouté :** rien au départ.
- **Consommé par :** tous les modules (devise, taxe, langue).

## 8. API
```
GET    /api/org                         → infos organisation + hôtels
PATCH  /api/org                         → update org (ORG_ADMIN)
GET    /api/hotels/:hotelId/settings    → réglages d'un hôtel
PATCH  /api/hotels/:hotelId/settings    → update (HOTEL_MANAGER)
GET    /api/hotels/:hotelId/currencies  → devises actives
```
Réponses paginées, schémas zod validés, permissions sur chaque route.

## 9. Écrans d'interface
1. **Paramètres organisation** — identité, logo, devise par défaut, langue, liste des hôtels.
2. **Paramètres hôtel** — adresse, contact, devise, taxe, fuseau, options (activer POS, channel manager...).
3. **Sélecteur d'hôtel** (barre supérieure) — bascule entre hôtels selon `Membership`.
4. **Intégrations** — connecter WhatsApp / paiement / email (clés).

## 10. Critères d'acceptation
- [ ] Un `HOTEL_MANAGER` ne peut modifier que son hôtel (RLS testé).
- [ ] La devise/taxe choisies se propagent aux modules suivants (contrat).
- [ ] Chaque modification est journalisée dans l'audit.
- [ ] Tests unitaires (services) + tests RLS.
