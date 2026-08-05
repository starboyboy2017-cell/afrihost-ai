# AfriHost AI — Plateforme SaaS de Gestion Hôtelière

> **Posture :** CTO / Architecte Logiciel / UX Designer / DevOps / Expert SaaS hôtelier.
> **Statut :** Phase d'architecture (Étape 1–3). **Aucun code applicatif n'est encore écrit.** Tout code sera développé après validation de ce socle.

---

## 🎯 Vision

AfriHost AI est un **PMS (Property Management System) SaaS multihôtel**, inspiré des meilleurs standards
internationaux (Oracle Opera Cloud, Mews, Cloudbeds, Apaleo, HotelKey) mais **conçu pour les réalités
d'Afrique** : connectivité intermittente, multi-devises, multi-langues, paiement mobile, exigences fiscales
locales, réseau de distribution local, contexte opérationnel de terrain.

## 🧭 Phase actuelle

Conformément à la méthode demandée, nous livrons dans cette phase (avant tout développement) :

| # | Livrable | Fichier |
|---|----------|---------|
| 1 | Audit de l'existant + méthodologie (projet greenfield) | `docs/01-audit-existant.md` |
| 2 | Architecture cible modulaire multihôtel + offline-first | `docs/02-architecture-cible.md` |
| 3 | Arborescence des dossiers | `docs/03-arborescence.md` |
| 4 | Schéma de base de données (Prisma/SQL) | `database/schema.prisma` + `docs/04-schema-bdd.md` |
| 5 | **Business Rules** (document exécutoire) | `docs/business-rules.md` |
| 6 | **ADR** (Architecture Decision Records) | `docs/adr/README-ADR.md` |
| 7 | Feuille de route (ordre des modules) | `roadmap/feuille-de-route.md` |
| 8 | Stack technique & décisions documentées | `docs/06-stack-outils.md` |
| 9 | Canevas de spécification de module + modules détaillés | `docs/modules/*.md` |

## ✅ Décisions validées

- **Greenfield** : projet neuf, aucun héritage (ADR-014).
- **Périmètre MVP** : cœur du métier hôtelier (paramètres → multihôtels → IAM → chambres/états →
  réservations → planning → check-in/out → housekeeping → clients → paiements de base → audit).
  Restaurant, comptabilité avancée, CRM, channel manager, IA et le reste sont ajoutés ensuite.
- **Offline-first** obligatoire dès le MVP (fonctionne hors connexion + sync à la reconnexion) — ADR-011.
- **Documents ADR** et **Business Rules** créés (`docs/adr/`, `docs/business-rules.md`).

## 🚀 État d'avancement

- ✅ **Architecture validée** (`Architecture.md`).
- ✅ **Règles métiers validées** (`BusinessRules.md`).
- ✅ **Phase 0 — Fondation** : livrée et testée (`roadmap/phase-0-rapport.md`).
- ✅ **Module 1 — Paramètres généraux** : livré et testé (`roadmap/module-1-rapport.md`).
  RBAC étendu à 11 rôles + extensible. `@afrihost/domain` créé. 36 tests verts.
- ✅ **Module 2 — Gestion multihôtels** : livré et testé (`roadmap/module-2-rapport.md`).
  Création/modification/désactivation, sélecteur, paramètres par établissement, isolation RLS,
  rôles/permissions par hôtel. Migration versionnée + rollback doc. 46 tests verts.
- ✅ **Module 3 — Gestion des réservations** : livré et testé (`roadmap/module-3-rapport.md`).
  Machine à états, tarification, disponibilité, bookingRef unique, isolation + RLS, API + écran.
- ✅ **Module 4 — Journal d'audit** : livré et testé (`roadmap/module-4-rapport.md`).
  Consultation + filtres + export CSV + API + écran. Append-only, isolation par hôtel.
- ✅ **Module Guests (Clients)** : livré et testé (`roadmap/guests-rapport.md`).
  Création, modification, archivage, identité, historique des séjours, recherche rapide. RBAC + isolation.
- ✅ **Migration & RLS appliqués sur Supabase** + test RLS validé sur la base réelle.
- ✅ **Rôles & permissions définis par migration** (versionnée `20260804010000_seed_permissions_roles`) :
  69 permissions globales + 11 rôles système créés automatiquement par organisation (trigger multihôtel,
  isolation). Générateur versionné (`packages/core/scripts/`).
- ✅ **Module 5 — Types de chambres & tarifs flexibles** : livré et testé (`roadmap/module-5-rapport.md`).
  Migration `20260804020000` appliquée (RatePlan/Price/Restriction), isolation RLS vérifiée, jeu de démo.
- ✅ **Module 6 — Chambres & inventaire physique** : livré et testé (`roadmap/module-6-rapport.md`).
  Machine à états des chambres, lien types (Module 5), historique, isolation RLS vérifiée, jeu de démo.
- ✅ **Module 7 — Check-in / Check-out** : livré et testé (`roadmap/module-7-rapport.md`).
  Flux complet (check-in/out, prolongation, changement de chambre, état temps réel), séjours, isolation
  RLS vérifiée, jeu de démo.
- ✅ **Module 8 — Tableau de disponibilité (Front Desk)** : livré et testé (`roadmap/module-8-rapport.md`).
  Vue temps réel par hôtel (séjours + états), filtres, recherche, indicateurs, actions contextuelles,
  isolation RLS vérifiée. **119 tests verts.**
- ✅ **Module 9 — Housekeeping** : livré et testé (`roadmap/module-9-rapport.md`).
  Génération auto au check-out, affectation/réaffectation, cycle de statut, horodatage, audit,
  notifications temps réel, isolation RLS vérifiée. **129 tests verts.**
- ✅ **Module 10 — Maintenance & interventions** : livré et testé (`roadmap/module-10-rapport.md`).
  Tickets (cycle Open→Closed), liaison chambre, mise hors service auto + restauration, sync temps réel,
  isolation RLS vérifiée.
- ✅ **Module 11 — Blanchisserie** : livré et testé (`roadmap/module-11-rapport.md`).
  Types de linge, cycle complet, lots de lavage, pertes, seuils de stock, isolation RLS vérifiée.
- ✅ **Module 12 — Transport, navettes & transferts** : livré et testé (`roadmap/module-12-rapport.md`).
  Véhicules (internes/externes), chauffeurs, transferts, affectation auto/manuelle, facturation au folio,
  isolation RLS vérifiée.
- ✅ **Module 13 — POS Restaurant** : livré et testé (`roadmap/module-13-rapport.md`).
  Points de vente, menus, commandes, encaissements multi-moyens, remboursements/annulations tracés,
  chiffre d'affaires auto, isolation RLS vérifiée.
- ✅ **Module 14 — Cuisine (KDS)** : livré et testé (`roadmap/module-14-rapport.md`).
  Ordres de préparation, répartition par poste, priorités, cycle New→Served, temps réel, isolation RLS
  vérifiée.
- ✅ **Module 15 — Caisse** : livré et testé (`roadmap/module-15-rapport.md`).
  Caisses, sessions ouverture/fermeture, mouvements multi-moyens, clôture + réconciliation, rapports
  financiers, isolation RLS vérifiée.
- ✅ **Module 16 — Pourboires** : livré et testé (`roadmap/module-16-rapport.md`).
  Enregistrement au paiement, individuel/collectif, règles configurables par hôtel, validation,
  distribution, suivi des montants, isolation RLS vérifiée.
- ✅ **Module 17 — Remises, promotions & coupons** : livré et testé (`roadmap/module-17-rapport.md`).
  Moteur de règles flexible, plafonds par rôle, conditions, coupons, isolation RLS vérifiée.
- ✅ **Module 18 — Stock & inventaire** : livré et testé (`roadmap/module-18-rapport.md`).
  Articles, fournisseurs, entrepôts, commandes, réceptions, mouvements, inventaires, seuils/alertes,
  décrémentation auto, isolation RLS vérifiée.
- ✅ **Module 19 — Comptabilité générale** : livré et testé (`roadmap/module-19-rapport.md`).
  Plan comptable configurable (**SYSCOHADA révisé / OHADA / UEMOA**), journaux, écritures auto, périodes,
  rapprochements, centres de coûts, balance, grand livre. Règles multi-juridictions.
- ✅ **Module 20 — Paiements & facturation** : livré et testé (`roadmap/module-20-rapport.md`).
  Folios clients, encaissements multimoyens, partiels/acomptes/cautions/différés, transfert/fusion,
  facturation consolidée, passerelles configurables, sync SYSCOHADA.
- ✅ **Module 21 — CRM** : livré et testé (`roadmap/module-21-rapport.md`).
  Vue 360 client, segmentation dynamique, campagnes multicanal, préférences, notes/tâches/opportunités,
  entreprises/agences. **261 tests verts.**
- 📄 **Rapport consolidé** : `roadmap/rapport-consolide.md`.
- ⏳ **Module 22 — Programme de fidélité** (après validation du Module 21).

## ✅ Comment valider l'architecture

Rien n'est codé tant que ces documents ne sont pas validés. Vous pouvez :

- **Valider globalement** → nous construisons la **Phase 0** puis le **Module 1**.
- **Modifier / commenter** un livrable précis → nous l'ajustons avant de coder.
- **Ajuster le périmètre MVP** → indiquez les modules à livrer d'abord.

---

## 🧱 Stack technique cible (outils modernes et gratuits)

| Couche | Technologie | Justification |
|--------|-------------|---------------|
| Frontend | **Next.js 14 (App Router)** + **React** + **TypeScript** | SSR/ISR, SEO, DX |
| Styling | **Tailwind CSS** + shadcn/ui | Rapide, cohérent, personnalisable |
| Backend | **Next.js API Routes / Route Handlers** (monolithe modulaire) | Une seule app, moins d'ops |
| ORM | **Prisma** | Typage fort, migrations, seed |
| Base de données | **PostgreSQL** (hébergée par Supabase) | Relationnelle, robuste, géo |
| Auth & RLS | **Supabase Auth + Row Level Security** | Sécurité multitenant au niveau BD |
| Stockage | **Supabase Storage** | Photos chambres, documents |
| Realtime | **Supabase Realtime** | Planning, notifications temps réel |
| Déploiement | **Vercel** (frontend/API) + **Supabase** (BD/Auth/Storage) | CI/CD gratuit, écosystème intégré |
| Notifications | **WhatsApp Business Cloud API**, SendGrid (email), Twilio (SMS) | WhatsApp dominant en Afrique |
| IA | **LLM** (OpenAI-compatible) pour chat, prédictions, tri, génération | Module IA |

> **Décision structurante :** Monolithe **modulaire** (module-first), pas de microservices — meilleur rapport
> simplicité/performance pour une équipe réduite, avec **frontières de modules strictes** pour permettre une
> extraction future vers des services indépendants si le volume l'exige.

---

## 📁 Accès rapide

- **Référence architecture** → [`Architecture.md`](Architecture.md)
- **Référence métiers** → [`BusinessRules.md`](BusinessRules.md)
- [Schéma de base de données](database/schema.prisma)
- [Feuille de route](roadmap/feuille-de-route.md)
- [Rapport Phase 0](roadmap/phase-0-rapport.md)
- [Stack & décisions](docs/06-stack-outils.md)
- [ADR](docs/adr/README-ADR.md)
- [Canevas module](docs/modules/00-canevas.md)
