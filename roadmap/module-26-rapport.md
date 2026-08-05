# Rapport — Module 26 : Portail Client (PWA) ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 12 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Portail client moderne, sécurisé et entièrement intégré au PMS, **conçu comme une PWA** (utilisable sur
ordinateur, tablette et smartphone sans app native), avec une **architecture API-first** pour qu'une future
application Android/iOS et des apps partenaires utilisent le même backend. Synchronisé avec CRM, Réservations,
Front Desk, Paiements, Facturation, Fidélité, Notifications, Transport, POS et Housekeeping.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804210000_portal`)
| Modèle | Rôle |
|--------|------|
| `PortalUser` | **Compte portail** (email/téléphone, hash mot de passe, OTP, vérification, actif, dernier login) |
| `PortalDevice` | **Appareils connectés / sessions** (nom, plateforme, token, révocation) |
| `PortalMessage` | **Messagerie sécurisée** client ↔ hôtel (direction, lecture) |
| `PortalServiceRequest` | **Demandes de services** (room service, transport, maintenance, blanchisserie, conciergerie...) |
| `PortalNotification` | **Notifications / offres personnalisées** (promotion, offre, réservation, facture, fidélité) |

Chaque table porte `hotelId` (isolation) + RLS.

### B. Domaine (`modules/portal`)
- **Authentification sécurisée** : email/téléphone + mot de passe (hashé) ou **OTP** ; gestion des appareils
  et révocation de sessions. Compatible OAuth via la même interface.
- **Tableau de bord** client : réservations actuelles/passées/futures, factures, folios détaillés,
  séjours/consommations, points & niveau fidélité.
- **Modification / annulation** de réservation (vérifie que la réservation appartient au client).
- **Check-in / check-out en ligne** (selon autorisation hôtel).
- **Paiement sécurisé** d'acomptes / soldes (délégué au module Paiements via EventBus).
- **Messagerie sécurisée**, **demandes de services**, **notifications/offres**, **mise à jour du profil**.
- Isolation multihôtel + RBAC `portal.*`. Chaque mutation journalisée (audit).

### C. Application (`apps/web`) — API-first + PWA
- Adapter Prisma (`modules/portal/portal.repository.prisma.ts`) : agrégations réservations/factures/folios/séjours
  déjà filtrées par RLS.
- **API** (le même backend alimente web + mobile Android/iOS) : `/api/portal/auth/register|login|otp`,
  `/dashboard`, `/reservations`(+`/change`), `/invoices`, `/stays`, `/messages`, `/service-requests`,
  `/notifications`, `/profile`, `/devices`, `/checkin`, `/checkout`, `/payment`, `/loyalty`.
- **PWA** : `manifest.webmanifest`, service worker `sw.js` (cache-first du shell, réseau pour l'API),
  enregistrement dans `layout.tsx`, écran `/portal` (dashboard).

### D. RLS & base réelle
- **Migration appliquée** (5 tables).
- Policies RLS par hôtel sur les 5 tables (+ `FORCE`).
- **Test d'isolation RLS** (`26-rls-test-portal.sql`) sur la base réelle : A (Cotonou) voit son compte /
  **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`26-demo-portal.sql`) : 1 compte portail (mot de passe `demo1234`, hashé), 1 appareil,
  1 message, 1 demande de service (transport), 1 offre personnalisée.

## 3. Vérifications
- ✅ **348 tests verts** (core 27 + domaine 321), typecheck core/domain/web propres, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS Portail).
- ✅ Migration + RLS appliqués ; jeu de démo intact ; nettoyage automatique.
- ✅ **Base Supabase vérifiée** : 5 tables `Portal*`, RLS activé (`FORCE`), compte de démo `amadou@demo.local`.

## 4. Rien n'est cassé
- Aucune régression : modules 1–25 + tous les modules fonctionnels.
- Le portail est **API-first** : la PWA consomme les mêmes API qu'une future app native (aucun code métier dupliqué).

## ➡️ Module suivant (après votre validation) : selon feuille de route — Mobile (PWA avancée / application).
