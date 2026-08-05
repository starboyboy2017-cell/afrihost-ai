# 1 — Audit de l'existant & méthodologie d'audit

> **Constat immédiat :** le workspace est vide. **Il n'existe aucun code, ni base de données, ni configuration
> à auditer aujourd'hui.** Ce document fournit donc (a) la **méthodologie d'audit** qui sera exécutée dès qu'un
> existant sera fourni, et (b) la **grille de contrôle** standard appliquée à tout PMS hôtelier.

---

## 1.1 Constat de l'existant

| Élément | État |
|---------|------|
| Code source | Aucun déposé dans le workspace |
| Base de données | Aucune |
| Contrats / dépendances | Aucun |
| Documentation | Aucune |

→ L'audit "deep dive" **ne peut pas encore être réalisé**. Veuillez fournir (le cas échéant) : dépôt Git,
dump SQL, schéma, ou description du système actuel. En l'absence d'existant, **AfriHost AI est construit
greenfield** (départ de zéro), ce qui évite dettes et doublons historiques.

---

## 1.2 Méthodologie d'audit (exécutable dès fourniture d'un existant)

L'audit sera mené en **6 dimensions**, chacune produisant des constats avec sévérité
(Critique / Majeur / Mineur / Info) et recommandation.

### A. Audit d'architecture
- Cartographie des couches (présentation, applicative, données, intégration).
- **Couplage** et **cohésion** entre modules.
- Détection des **doublons fonctionnels** (ex : 2 modules gèrent les prix).
- Présence ou non d'**isolation multitenant** (multi-hôtels).
- Dépendances cassées, imports circulaires, versions obsolètes.

### B. Audit de base de données
- Scripts SQL / migrations / ORM (`prisma` si existant).
- **Doublons de colonnes**, tables redondantes, absence de clés étrangères.
- Absence d'index → **problèmes de performance** sur requêtes fréquentes.
- Types faibles, `NULL` abusifs, `ENUM` codés en dur.
- **Incohérences** : mêmes données dans plusieurs tables (dérive des données).
- Absence de contraintes d'intégrité (FK, UNIQUE, CHECK).

### C. Audit fonctionnel / métier
- Couverture des modules hôteliers listés dans la feuille de route.
- Cohérence des **statuts** (réservation, chambre, etc.).
- Absence de règles de transition (ex : check-out sans check-in).

### D. Audit de sécurité
- Gestion des identités (auth), **rôles & permissions**.
- **Autorisation par hôtel** (RLS / tenant isolation).
- Injection SQL, XSS, fuites de secrets (`.env` versionnés), CORS permissif.
- Données sensibles (moyens de paiement) non chiffrées / non conformes PCI.

### E. Audit de performance
- Requêtes N+1 (ORM), absence d'index, chargements non paginés.
- Absence de cache, requêtes coûteuses sur les gros volumes.

### F. Audit d'exploitabilité (Ops)
- CI/CD présent ? Tests ? Observabilité (logs, métriques) ?
- Sauvegardes et restauration configurées ?

## 1.3 Grille de sévérité
- **🔴 Critique** — blocage, faille, perte de données → à corriger en priorité.
- **🟠 Majeur** — incohérence, risque, dégradation.
- **🟡 Mineur** — dette, amélioration.
- **🔵 Info** — observation, optimisation.

## 1.4 Règle de non-régression
Parce qu'AfriHost part de zéro, nous garantissons **dès la conception** l'absence des défauts
classiques d'un existant (doublons, couplage, fuites multitenant) via :
- Frontières de modules strictes (`docs/02`).
- Schéma normalisé sans duplication (`database/schema.prisma`).
- RLS multitenant par hôtel (sécurité BD).
- Journal d'audit systématique.
- Tests et CI dès le premier module.
