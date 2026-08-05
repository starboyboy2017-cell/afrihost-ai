# ADR-011 — Offline-first (local-first) obligatoire dès le MVP

- **Statut :** ✅ Accepté
- **Date :** 2026-08-04
- **Domaine :** architecture, produit, performance

## Contexte
Les hôtels africains subissent une **connectivité intermittente** (coupures réseau, zones blanches, réseau
mobile capricieux). Un PMS qui devient inutilisable sans internet est inacceptable en **front office** : un
check-in, une réservation ou un encaissement ne peuvent pas attendre la reconnexion.

Le MVP **doit fonctionner en mode déconnecté** et synchroniser les données dès que la connexion revient.

## Décision
Adopter une approche **offline-first (local-first)** pour l'application web (PWA) dès le MVP :

1. **Base locale** : l'app embarque une base locale dans le navigateur (IndexedDB via **Dexie.js**) qui
   sert de **source de lecture** et d'écriture immédiate hors-ligne.
2. **Écritures locales** : les actions du front office (réservation, check-in, encaissement, ménage) sont
   enregistrées **localement d'abord**, puis poussées vers le serveur via une **file d'attente (outbox)**.
3. **Synchronisation** : un **moteur de sync** (worker) :
   - pousse les écritures locales en file vers le serveur (dans l'ordre),
   - tire les mises à jour distantes depuis le serveur,
   - résout les conflits par **last-write-wins (LWW)** + horodatage `updatedAt`, avec garde-fous
     métier (ex : un check-in déjà consommé ne peut pas être réappliqué).
4. **Intégrité** : les identifiants sont générés **côté client** (UUID v7, ordonnables) pour permettre la
   création hors-ligne sans collision (voir ADR-013).
5. **Affichage état sync** : l'UI indique clairement « hors-ligne » / « en attente de synchronisation » /
   « synchronisé », sans bloquer l'utilisateur.

## Conséquences
### Positives
- Continuité d'activité garantie en front office (check-in/out, réservations, encaissements).
- Meilleure latence perçue (UI réactive même en ligne).
- Avantage concurrentiel face aux PMS "cloud-only" sur le marché africain.

### Négatives / Risques
- Complexité accrue (moteur de sync, gestion des conflits, versions de schéma local).
- Risque de conflits concurrents multi-postes → mitigé par LWW + règles métier.
- L'audit de sécurité local doit être chiffré (données en clair dans IndexedDB).

### Actions requises
- Intégrer **Dexie.js** + un schéma de sync dans la Phase 0.
- Concevoir un **registre de synchronisation** (`sync outbox` + `updatedAt` sur toutes les entités syncables).
- Versionner le **schéma local** et sa migration.
- Stratégie de conflit par entité, documentée (voir Business Rules § Sync).

## Alternatives envisagées
1. **Cloud-only** (classique) — écarté : inacceptable pour la réalité africaine.
2. **Cache lecture seul + écriture requise en ligne** — écarté : bloque les écritures hors-ligne, qui sont
   le besoin critique.
3. **Base partagée distante avec connexion permanente** — écarté : dépend de la connectivité.
