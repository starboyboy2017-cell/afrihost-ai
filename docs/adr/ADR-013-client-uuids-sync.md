# ADR-013 — IDs générés côté client (UUID) + registre de synchronisation

- **Statut :** ✅ Accepté
- **Date :** 2026-08-04
- **Domaine :** données, offline

## Contexte
En mode **offline-first** (ADR-011), des enregistrements sont créés localement sans connexion. Il faut
garantir l'**unicité des identifiants** à travers tous les postes (multi-postes d'un hôtel) et la
synchronisation sans collision. Un simple `serial` côté serveur ne convient pas (impossible hors-ligne).

## Décision
1. **UUID v7** générés **côté client** pour tous les identifiants primaires (ordonnables temporellement,
   favorables aux index et au tri).
2. Toute entité **syncable** porte :
   - `id` (UUID v7),
   - `updatedAt` (horodatage de dernière modification, base de la résolution LWW),
   - `deletedAt` (soft-delete pour propager les suppressions via la sync).
3. Un **registre de sync** (`SyncOutbox`) journalise les écritures locales en attente de poussée.

## Conséquences
### Positives
- Création hors-ligne fiable, sans collision entre postes.
- Résolution de conflit simple (LWW sur `updatedAt`).
- Suppressions propagées via soft-delete.
### Négatives / Risques
- IDs non séquentiels (pas d'exposition directe — on utilise des références lisibles comme `bookingRef`).
- Nécessite de maintenir `updatedAt` à jour sur chaque mutation.
### Actions requises
- Convention : toute mutation d'entité syncable met à jour `updatedAt`.
- Le client génère les UUID v7 (lib `uuid`/`crypto.randomUUID`).

## Alternatives envisagées
1. Séquence auto-incrément côté serveur — écarté : incompatible offline.
2. UUID v4 — écarté : non ordonnables, moins performants pour index/range scans.
