# Audit Multi-Tenant & Isolation — AfriHost AI (Module 36)

> **Vérification du modèle d'isolation des données.** Résultat : **CONFORME**.

## 1. Vérifications

| Contrôle | Statut | Détail |
|---|---|---|
| Identifiant unique par hôtel | ✅ | Chaque hôtel a un `id` unique ; concept `tenant_id` = colonne `hotelId`. |
| Organisation/hôtel isolés | ✅ | RLS `auth_has_hotel("hotelId")` sur toutes les tables métier. |
| Tables critiques portent `hotelId` | ✅ | Réservations, chambres, séjours, housekeeping, POS, stock, comptabilité, billing, CRM, fidélité, notifications, IA, channel, portail, événements, BI, config admin. |
| Relations respectent l'isolation | ✅ | Les clés étrangères sont scoped par `hotelId` (rejet inter-hôtel dans les services). |
| Policies RLS filtrent par `hotelId` | ✅ | Toutes les tables métier ont `select/insert/update/delete` filtrées par `hotelId` (`FORCE RLS`). |
| Aucun accès inter-hôtel | ✅ | Vérifié par les tests RLS `infra/supabase/NN-rls-test-*.sql` sur la base réelle (Cotonou ↔ Dakar). |
| Rôles RBAC respectent le tenant | ✅ | `auth_has_permission(hotelId, code)` ; membership par hôtel. |
| Super Admin accès global contrôlé | ✅ | `auth_platform_admin()` pour les modules 32-35 ; jamais au portail hôtels/clients. |
| Actions Super Admin tracées | ✅ | `saas.impersonation.*`, `saasadmin.*`, `devops.*` journalisés dans l'Audit Log. |
| Exports/rapports/API/notifications isolés | ✅ | Tous passent par les services qui vérifient `actor.hotelId === hotelId` ; données filtrées par RLS. |

## 2. Tests de sécurité simulés

| Scénario | Résultat |
|---|---|
| Hôtel A tente d'accéder aux données Hôtel B | **BLOQUÉ** — RLS renvoie 0 ligne ; service rejette (`Accès inter-hôtel refusé`, 403). |
| Admin hôtel tente d'accéder aux paramètres SaaS | **BLOQUÉ** — tables SaaS protégées par `auth_platform_admin()` ; permissions `saas.*` absentes du rôle HOTEL_OWNER. |
| Appel API avec mauvais `tenant_id` | **BLOQUÉ** — `assertHotel` compare `actor.hotelId` au `hotelId` de la requête. |
| Modification directe des données (SQL/API) | **BLOQUÉ** — RLS force `hotelId` ; les services valident l'isolation. |

Ces scénarios sont couverts par les tests RLS exécutés sur la base réelle (Cotonou vs Dakar) pour chaque module.

## 3. Corrections apportées au fil des modules
- Entités **globales** (SaaS, Devops, Certification, API publique) volontairement hors RLS hôtel mais protégées
  par `auth_platform_admin()` / `auth_user_id()`, garantissant qu'un admin d'hôtel ne les voit jamais.
- `SaasLicense`, `SaasMetrics`, etc. ne sont **pas liées** à un hôtel (globales) → aucune fuite inter-hôtel.

## 4. Conclusion
Le modèle Multi-Tenant est **correctement implémenté** : isolation par `hotelId` au niveau base (RLS), au
niveau service (assertHotel) et au niveau RBAC. Aucune faille d'isolation détectée.
