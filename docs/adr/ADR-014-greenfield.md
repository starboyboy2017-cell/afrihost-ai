# ADR-014 — Greenfield (projet neuf, sans héritage)

- **Statut :** ✅ Accepté
- **Date :** 2026-08-04
- **Domaine :** processus

## Contexte
Aucun code ni base de données existant n'est fourni. Le workspace est vide. Le projet démarre de zéro.

## Décision
Construire **AfriHost AI entièrement de zéro (greenfield)**, sans migration de code, sans compatibilité avec
un système existant, et sans dette technique historique à transporter. L'audit de l'existant devient un
**audit d'opportunité** (étude de marché/concurrents) plutôt qu'un audit de code.

## Conséquences
### Positives
- Liberté totale sur l'architecture (ADR 001–013 appliqués dès le départ).
- Aucune duplication ni incohérence héritée.
- Meilleure qualité et sécurité par construction.
### Négatives / Risques
- Aucun historique de données utilisateurs (à bâtir).
- Greenfield impose de bien cadrer le périmètre (feuille de route) pour ne pas "tout vouloir d'emblée".
### Actions requises
- Appliquer la feuille de route validée (Phase 0 → MVP).
- Documenter chaque décision en ADR (prévenir la dette future).

## Alternatives envisagées
1. Réutiliser un existant — écarté : aucun existant fourni.
2. Racheter/licencier un code open source — écarté : perte de contrôle et dette possible.
