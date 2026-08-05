# Rapport — Module 23 : Notifications multicanales ✅

> **Statut : LIVRÉ + VÉRIFIÉ SUR LA BASE RÉELLE — 17 tests verts (domaine), isolation RLS confirmée,
> jeu de démonstration.**

## 1. Objectif du module
Système centralisé de notifications, **agnostique fournisseur** (provider-agnostic), intégré à tout le PMS.
Chaque hôtel configure ses propres fournisseurs (Email : Resend/Brevo/SES/SendGrid ; SMS : Twilio/Infobip/
Vonage/Orange/MTN ; WhatsApp : Meta/360Dialog ; Push : FCM…), ses clés API, expéditeurs, domaines, modèles
multilingues et règles — **sans modification du code métier**.

## 2. Ce qui a été fait

### A. Schéma (migration `20260804180000_notifications`)
| Modèle | Rôle |
|--------|------|
| `NotificationProvider` | **Fournisseur** configurable par hôtel (canal, type, `providerKey`, credentials, from, domain, défaut, actif, rate limit) |
| `NotificationTemplate` | **Templates multilingues** (canal, événement, code, locale, sujet, corps, variables) |
| `NotificationTrigger` | **Déclencheurs automatiques** (événement → canal → template, condition, priorité) |
| `NotificationCampaign` | **Campagnes programmées** (cible segment/audience, planification, statut) |
| `NotificationSend` | **File d'attente + historique** : statut, tentatives, maxAttempts, retry, providerRef, horodatages (sent/delivered/read) |
| Enums | `NotificationProviderType` (6), `NotificationEventType` (17), `NotificationPriority` (4) ; `NotificationChannel` et `NotificationStatus` **étendus** (VOICE/IN_APP/OTHER, PROCESSING/READ/CLICKED/CANCELLED) — additif, non-breaking |

### B. Domaine (`modules/notifications`)
- **Port d'expédition agnostique** (`notifications.sender.ts`) : les adaptateurs (Resend, Twilio, Meta, FCM…)
  implémentent `NotificationSender` ; le service ne connaît jamais le fournisseur concret.
- **Moteur de templates** (`template-engine`, 6 tests) : `{{var}}` et `{{var|default}}`, chemins imbriqués,
  détection de variables ; aucun code arbitraire exécuté (sécurité).
- **Service** (`service`, 11 tests) : fournisseurs, templates (+ prévisualisation), déclencheurs, campagnes,
  **envoi immédiat ou programmé**, **file d'attente avec backoff exponentiel + reprise** et rejet après
  `maxAttempts`, suivi de statuts (SENT/DELIVERED/READ/FAILED), callback webhook.
- **Intégration** : `dispatchEvent` déclenche les envois automatiques selon les triggers et leurs conditions ;
  publie des événements `notifications.*` (EventBus). Isolation multihôtel + RBAC `notifications.*`.

### C. Application (`apps/web`)
- Adapter Prisma (`modules/notifications/notifications.repository.prisma.ts`).
- **Adaptateur de démonstration** `LoggerSender` (provider-agnostic) — branché via un **registre** par
  `providerKey`, sans toucher au service.
- **API** : `/api/notifications/providers`, `/templates`(+`/preview`), `/triggers`, `/campaigns`
  (+`/:id/launch`), `/send`, `/events`, `/sends`(+`/:id/status`).
- Écran `/notifications` (fournisseurs, templates, déclencheurs, campagnes, historique).

### D. RLS & base réelle
- **Migration appliquée** (5 nouvelles tables + 2 enums créés + 2 enums étendus).
- Policies RLS par hôtel sur les 5 tables (+ `FORCE`). La table `Notification` garde ses policies existantes.
- **Test d'isolation RLS** (`23-rls-test-notifications.sql`) sur la base réelle : A (Cotonou) voit ses
  fournisseurs / **0** de Dakar ; B (Dakar) voit **0**. ✅
- **Jeu de démo** (`23-demo-notifications.sql`) : 4 fournisseurs (Resend, Twilio, Meta, FCM), 3 templates,
  2 déclencheurs, 1 campagne programmée, 1 envoi DELIVERED.

## 3. Vérifications
- ✅ **301 tests verts** (core 27 + domaine 274), typecheck core/domain/web propres, aucune régression.
- ✅ **Isolation multihôtel confirmée sur la base réelle** (test RLS notifications).
- ✅ Migration + RLS appliqués ; jeu de démo intact ; nettoyage automatique.
- ✅ **Base Supabase vérifiée** : 6 tables `Notification*`, RLS activé (`FORCE`), enums étendus corrects.

## 4. Rien n'est cassé
- Aucune régression : modules 1–22 + Guests + réservations + tarifs + chambres + séjours + front desk +
  housekeeping + maintenance + blanchisserie + transport + POS + cuisine + caisse + pourboires + remises +
  stock + comptabilité + billing + CRM + fidélité fonctionnels. Extensions d'enums **additives** (ADD VALUE),
  ajout de tables et de permissions sans suppression.

## ➡️ Module suivant (après votre validation) : selon feuille de route — IA (assistant, prédictions, tri).
