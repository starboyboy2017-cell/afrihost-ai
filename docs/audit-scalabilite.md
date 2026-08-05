# Audit de Scalabilité — AfriHost AI (Module 36)

> **Objectif** : valider la capacité de la plateforme à supporter **10 000 hôtels**, **500 000 chambres**,
> plusieurs **millions de réservations** et des **milliers d'utilisateurs simultanés**.

## 1. Hypothèses de charge
- 10 000 hôtels ; 500 000 chambres ; ~10 000 000 réservations/an ; 5 000 utilisateurs simultanés.

## 2. Goulots d'étranglement identifiés

### 2.1 Base de données (Supabase/PostgreSQL)
| Risque | Analyse | Optimisation (sans casser le métier) |
|---|---|---|
| Requêtes de listing non paginées | Volume important | Pagination systématique sur les routes API (limit/offset ou cursor) |
| Index manquants sur gros volumes | `reservation(hotelId, arrivalDate)`, `room(hotelId)`, `guest(hotelId)` | Déjà indexés ; ajouter des index composites sur les requêtes de rapport |
| Agrégations BI sur toutes les réservations | Coûteux sur millions de lignes | Pré-agréger dans `SaasMetrics`/matérialiser des vues ; pagination |
| Recherche plein texte | `LIKE %...%` coûteux | Index GIN / trigram sur `guest` (nom, email) |

### 2.2 Concurrence
- Écritures simultanées sur une même réservation/chambre → risque de conflit.
- **Optimisation** : transactions Prisma + verrouillage optimiste (champ `updatedAt`), retry sur conflit.

### 2.3 API
- Appels synchrones coûteux (paiements, notifications, IA).
- **Optimisation** : files d'attente (déjà présentes pour notifications/webhooks) ; worker dédié ; rate
  limiting ; mise en cache (HTTP, Redis optionnel).

### 2.4 Supabase
- Limites de connexions et de temps de requête.
- **Optimisation** : pooling, réduction du nombre de requêtes (include Prisma ciblés), RLS efficace.

### 2.5 Notifications / IA / OTA
- Envois massifs (campagnes) et appels LLM.
- **Optimisation** : files d'attente + retry (présents), quotas par plan, batching, throttling.

### 2.6 Stockage & bande passante
- Preuves de paiement (images/PDF), exports.
- **Optimisation** : compression, CDN (Vercel/Supabase Storage), politiques de rétention.

## 3. Recommandations multi-régions / scaling
- **Horizontal scaling** : stateless Next.js (Vercel serverless), DB managée Supabase.
- **Multi-régions** : réplication de lecture PostgreSQL, CDN.
- **Équilibrage de charge** : assuré par Vercel/serverless.
- **Index & requêtes** : poursuivre la pagination et l'indexation des colonnes de filtrage (hotelId, dates).

## 4. Conclusion
L'architecture est **scalable horizontalement** (serverless + DB managée). Les optimisations proposées
(pagination, index, pré-agrégation BI, files d'attente, pooling) permettent la montée en charge **sans
modifier les fonctionnalités métier**.
