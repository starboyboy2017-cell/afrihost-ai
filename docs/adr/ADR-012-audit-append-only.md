# ADR-012 — Journal d'audit append-only + infrastructure d'audit en Phase 0

- **Statut :** ✅ Accepté
- **Date :** 2026-08-04
- **Domaine :** sécurité, données, conformité

## Contexte
La traçabilité est un prérequis dans un PMS hôtelier (contestations, audits fiscaux, responsabilité).
Le journal d'audit doit être **fiable, complet et non falsifiable**. Il ne doit pas dépendre du module
"Journal d'audit" livré tard dans la feuille de route.

## Décision
1. **Infrastructure d'audit en Phase 0** : le mécanisme d'écriture des logs (`AuditLog` + middleware) est
   construit **avant** tous les modules, afin que chaque module journalise dès sa création.
2. **Append-only** : la table `AuditLog` est **immutable** — aucune mise à jour ni suppression (RLS :
   INSERT + SELECT uniquement, pas d'UPDATE/DELETE).
3. **Données** : `actorUserId`, `action`, `entityType`, `entityId`, `before`, `after` (JSON), `ip`,
   `userAgent`, `hotelId`, `createdAt`.
4. Le **module "Journal d'audit"** (interface de consultation, filtres, exports, alertes) est livré ensuite
   comme prévu, mais la **capture** est déjà active.

## Conséquences
### Positives
- Traçabilité dès le premier module, aucune lacune de couverture.
- Journal fiable pour audits et contestations.
### Négatives / Risques
- Volume de logs important → archivage/rotation (hors ligne de front, partitionnement par période).
### Actions requises
- Policy RLS append-only sur `AuditLog`.
- Hook d'audit partagé utilisé par tous les services.

## Alternatives envisagées
1. Attendre le module 13 pour l'audit — écarté : modules antérieurs non tracés.
2. Logs applicatifs seulement (pas en BD) — écarté : insuffisant pour conformité/audit.
