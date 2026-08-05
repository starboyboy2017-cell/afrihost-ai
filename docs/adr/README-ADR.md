# Architecture Decision Records (ADR)

> Ce dossier consigne **chaque décision d'architecture structurante** au format ADR (Markdown Any Decision
> Record). Chaque ADR est numéroté, daté, et suit le format *Contexte / Décision / Conséquences*.
>
> Règle : **toute décision importante doit être tracée ici** avant d'être codée. Une décision non tracée
> est considérée comme non validée.

---

## Index des ADR

| ID | Titre | Statut |
|----|-------|--------|
| ADR-001 | Monolithe modulaire plutôt que microservices | ✅ Adopté |
| ADR-002 | Supabase (PostgreSQL managé) comme backend & BaaS | ✅ Adopté |
| ADR-003 | Prisma comme ORM | ✅ Adopté |
| ADR-004 | Next.js App Router comme front **et** API | ✅ Adopté |
| ADR-005 | RLS multitenant par hôtel (isolation au niveau BD) | ✅ Adopté |
| ADR-006 | Module = bounded context symétrique | ✅ Adopté |
| ADR-007 | Montants en minor units (int) — jamais de flottants | ✅ Adopté |
| ADR-008 | WhatsApp Business Cloud API = canal prioritaire | ✅ Adopté |
| ADR-009 | Paiement Mobile Money en natif (MTN, Orange, Moov) | ✅ Adopté |
| ADR-010 | Paystack / Flutterwave pour les paiements cartes & mobile | ✅ Adopté |
| ADR-011 | **Offline-first (local-first) obligatoire dès le MVP** | ✅ Adopté |
| ADR-012 | Journal d'audit append-only + infrastructure d'audit en Phase 0 | ✅ Adopté |
| ADR-013 | IDs générés côté client (UUID) + registre de synchronisation | ✅ Adopté |
| ADR-014 | Greenfield (aucun héritage, aucune dette à migrer) | ✅ Adopté |

> Les ADR 011, 012, 013, 014 sont détaillés dans les fichiers ci-après. Les ADR 001–010 sont résumés dans
> `../06-stack-outils.md` et `../02-architecture-cible.md`.

## Comment ajouter un ADR
1. Copier le gabarit `ADR-TEMPLATE.md` → `ADR-XXX-titre.md`.
2. Remplir Contexte / Décision / Conséquences / Alternatives envisagées.
3. Mettre à jour cet index.
4. Faire valider par le CTO avant implémentation.
