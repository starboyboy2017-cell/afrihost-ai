# 3 — Arborescence des dossiers (monorepo)

> Structure **monorepo** Next.js. Les modules vivent sous `src/modules/<module>`, chacun avec sa structure
> symétrique (`contracts / services / repositories / handlers / jobs / rbac / ui`).

```
afrihost/
├─ apps/
│  ├─ web/                                  # Application principale (Next.js 14, App Router)
│  │  ├─ public/
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  │  ├─ (auth)/                      # login, register, forgot-password, otp
│  │  │  │  ├─ (pms)/                       # layout authentifié + sélecteur d'hôtel
│  │  │  │  │  ├─ dashboard/
│  │  │  │  │  ├─ reservations/
│  │  │  │  │  ├─ front-desk/               # check-in / check-out / planning
│  │  │  │  │  ├─ housekeeping/
│  │  │  │  │  ├─ rooms/  guests/  billing/
│  │  │  │  │  ├─ pos/  kitchen/  caisse/
│  │  │  │  │  ├─ inventory/  suppliers/
│  │  │  │  │  ├─ accounting/  reports/
│  │  │  │  │  ├─ crm/  loyalty/  campaigns/
│  │  │  │  │  ├─ channel-manager/  events/
│  │  │  │  │  ├─ settings/  users/  audit/
│  │  │  │  │  └─ api/                      # Route Handlers (couche transport globale)
│  │  │  │  ├─ (portal)/                    # Portail client (réservations, factures, fidélité)
│  │  │  │  └─ (public)/                    # site, disponibilité, réservation en ligne
│  │  │  ├─ components/                     # UI réutilisable (shadcn/ui)
│  │  │  ├─ hooks/
│  │  │  ├─ lib/                            # config clients (supabase, prisma), utils
│  │  │  └─ modules/                        # ★ NOYAU — modules métiers (voir ci-dessous)
│  │  └─ ...
│  ├─ api-worker/                           # (optionnel, futur) worker pour jobs lourds
│  └─ mobile/                               # PWA / wrapper mobile (futur)
│
├─ packages/
│  ├─ shared/                               # types partagés, enums, utils (TS)
│  ├─ ui/                                   # design system (shadcn/ui)
│  └─ config/                               # eslint, tsconfig, tailwind presets
│
├─ database/
│  ├─ schema.prisma                         # ★ Schéma de données maître
│  ├─ migrations/
│  └─ seed/                                 # données de démo (hôtels, chambres, rôles)
│
├─ docs/                                    # ★ Toute l'architecture
├─ roadmap/
├─ tests/                                   # tests e2e (Playwright), unitaires (Vitest)
├─ infra/
│  ├─ supabase/                             # policies RLS, functions SQL
│  ├─ github/workflows/                     # CI/CD
│  └─ docker-compose.yml                    # dev local (Postgres)
└─ .github/
```

## 3.1 Structure interne d'un module (exemple concret : `reservations`)

```
src/modules/reservations/
├─ contracts/
│  ├─ reservation.types.ts          # DTO + types partagés
│  ├─ reservation.enums.ts          # statuts, sources, canaux
│  └─ reservation.events.ts         # événements de domaine émis/écoutés
├─ services/
│  ├─ reservation.service.ts        # règles métier (création, annulation, no-show)
│  ├─ availability.service.ts       # vérif de disponibilité/overbooking
│  └─ pricing.service.ts            # calcul tarif, taxes, promotions
├─ repositories/
│  └─ reservation.repository.ts     # accès Prisma (dépôt)
├─ handlers/
│  ├─ route.reservations.ts         # REST /api/reservations
│  └─ route.reservations.id.ts
├─ jobs/
│  └─ no-show.job.ts                # détection no-show planifiée
├─ rbac/
│  └─ permissions.ts                # reservations.create, reservations.cancel, ...
└─ ui/
   ├─ ReservationList.tsx
   ├─ ReservationForm.tsx
   └─ ReservationDetail.tsx
```

## 3.2 Liste exhaustive des modules (dossiers `src/modules/*`)

Correspond à l'ordre de la feuille de route :

1. `settings` — paramètres généraux (org, hôtel, devise, taxes, langues)
2. `hotels` — gestion multihôtels
3. `iam` — utilisateurs / rôles / permissions (Identity & Access Management)
4. `audit` — journal d'audit
5. `guests` — clients (profil, historique, documents)
6. `rooms` — chambres
7. `room-types` — types de chambres & tarifs
8. `room-status` — états des chambres
9. `reservations` — réservations (voir exemple ci-dessus)
10. `frontdesk` — planning / tableau d'occupation
11. `checkin-checkout` — arrivées / départs
12. `housekeeping` — ménage
13. `maintenance` — maintenance & interventions
14. `laundry` — blanchisserie
15. `transport` — transport & navette
16. `pos` — point de vente / restaurant
17. `products` — produits & services vendables
18. `menus` — menus restaurant
19. `kitchen` — cuisine (ordres, préparation)
20. `caisse` — encaissements / fonds de caisse
21. `tips` — pourboires & répartition
22. `discounts` — remises, promotions, coupons
23. `inventory` — stocks
24. `suppliers` — fournisseurs & achats
25. `accounting` — comptabilité (plan comptable, journaux)
26. `payments` — paiements (cartes, mobile money, espèces)
27. `billing` — facturation (factures, avoirs, encaissements)
28. `crm` — gestion de la relation client
29. `loyalty` — programme de fidélité
30. `notifications` — WhatsApp / email / SMS (canal central)
31. `ai` — IA (assistant, prédictions, tri)
32. `channel-manager` — distribution OTA (channel manager)
33. `portal` — portail client
34. `mobile` — application mobile / PWA
35. `events` — événements & groupes
36. `bi` — BI / rapports / tableaux de bord
37. `public-api` — API publique / intégrations
38. `security` — sécurité transversale
```

> **Note anti-doublon :** `caisse` (encaissements comptables) vs `payments` (moyens de paiement) vs
> `billing` (facturation) sont **trois modules distincts mais interconnectés** — le schéma de données définit
> précisément leurs relations pour éviter toute duplication (voir `docs/04-schema-bdd.md`).
