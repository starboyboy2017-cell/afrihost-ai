# Rapport — Module 4 : Journal d'audit (consultation) ✅

> **Statut : LIVRÉ — 8 tests verts (domaine). Total suite : 78 tests (core 27 + domaine 51).**

## 1. Objectif du module
Fournir la **consultation** du journal d'audit (la **capture** est déjà assurée par l'infrastructure
`@afrihost/core` + table `AuditLog` depuis la Phase 0). Ce module ajoute la **lecture** avec filtres,
**export CSV**, et l'**API de consultation** — tout en restant **append-only** (immuable).

## 2. Ce qui a été fait

### A. Domaine (`@afrihost/domain` → `modules/audit`)
| Fichier | Rôle |
|---------|------|
| `audit.types.ts` | Types : `AuditLogEntry`, `AuditFilter`, `AuditPage` |
| `audit.repository.ts` | Port de lecture (`AuditReadRepository`) |
| `audit.service.ts` | Service de consultation + **export CSV** + isolation |

**Fonctionnalités :**
- **Consultation** avec filtres : `action`, `entityType`, `entityId`, `actorUserId`, `from`, `to`, pagination (`limit`/`offset`, limit max 500).
- **Export CSV** (`toCsv`) : en-tête + lignes, échappement des guillemets.
- **Isolation multitenant** : un utilisateur non-admin ne voit que les entrées de **son hôtel** ; un admin d'org voit toute l'organisation.
- **Append-only** : aucune méthode de modification/suppression (le journal reste immuable).

### B. Application (`apps/web`)
- Adapter Prisma `PrismaAuditReadRepository` (lecture) + `PrismaAuditWriter` (écriture append-only, déjà présent, réintégré).
- **API** :
  - `GET /api/audit?action&entityType&entityId&actorUserId&from&to&limit&offset` — `audit.view`
  - `GET /api/audit?export=csv` — téléchargement CSV — `audit.export`
- Écran `/audit` (tableau + bouton d'export).

### C. RBAC
- Permissions utilisées : `audit.view`, `audit.export` (déjà présentes dans le registre).

## 3. Vérifications (sandbox)
- ✅ `tsc --noEmit` : domain, web → aucun erreur.
- ✅ Tests : 8 pour le module audit ; **78 tests verts** au total. Aucune régression.

## 4. Base de données
- **Aucun changement de schéma** : la table `AuditLog` existait déjà dans la migration initiale (RLS
  append-only : policies `audit_insert` + `audit_select`, pas d'UPDATE/DELETE).
- L'isolation de consultation est garantie par le **service** (filtre par hôtel) **+ le RLS**.

## 5. Rien n'est cassé
- 78 tests verts, schéma valide, modules 1–3 + Guests intacts.

## ➡️ Module suivant (après votre validation) : Modules selon feuille de route (types de chambres, chambres, états des chambres, puis check-in/out, housekeeping...)
