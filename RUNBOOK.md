# RUNBOOK.md — AfriHost AI

> **Manuel opérationnel (runbook) — Module 36.**

Procédures opérationnelles de routine, de surveillance, de sauvegarde et de reprise après incident pour les
**Super Administrateurs** d'AfriHost AI.

---

## 1. Surveillance quotidienne

1. **Health Dashboard** : `GET /api/devops/health` → vérifier les 9 composants (app, supabase, api, ota, ai,
   payments, email, whatsapp, sms). Statut global HEALTHY attendu.
2. **Incidents** : `GET /api/devops/security/incidents` → résoudre les incidents ouverts.
3. **Sauvegardes** : vérifier que les sauvegardes récentes sont `SUCCESS` et que l'intégrité `PASSED`.

## 2. Création d'un hôtel (SaaS)

1. `POST /api/saasadmin/hotels` (création).
2. Créer l'abonnement : `POST /api/saas/subscriptions` (plan, coupon).
3. Facture générée automatiquement (TVA incluse).
4. Activer l'hôtel : `POST /api/saasadmin/hotels/:id/action { action: "activate" }`.
5. Créer la licence : `POST /api/saasadmin/licenses` (quotas).

## 3. Paiement

- **Automatique** : `POST /api/saas/payments { invoiceId, providerKey }`.
- **Manuel** : `POST /api/saas/manual-payments` (preuve) puis
  `POST /api/saas/manual-payments/:id/review { decision: "APPROVE" }` → activation/renouvellement auto.

## 4. Sauvegardes & restauration

- Créer : `POST /api/saasadmin/backups` (ou `POST /api/devops/backups/integrity` pour vérifier).
- Restaurer : `POST /api/saasadmin/backups` (mark RESTORED via le service) — voir `DEPLOYMENT.md`.

## 5. Mise à jour (release)

1. Merge sur `main` → CI/CD (`.github/workflows/production.yml`) : lint, typecheck, tests, validation
   migrations/RLS, build.
2. Appliquer les nouvelles migrations `database/migrations/` sur Supabase.
3. Déployer l'application sur Vercel.
4. Vérifier `/api/devops/health` et `/api/certification/audit`.

## 6. Reprise après incident

### 6.1 Application en panne
1. Vérifier `GET /api/devops/health` (app DOWN).
2. Rollback sur le dernier commit stable (Vercel/GitHub Actions).
3. Redémarrer, vérifier health.

### 6.2 Base de données
1. Restaurer la dernière sauvegarde `SUCCESS` + intégrité `PASSED`.
2. Rejouer les migrations si nécessaire.
3. Vérifier l'isolation : exécuter les tests RLS (`infra/supabase/NN-rls-test-*.sql`).

### 6.3 Incidents de sécurité
1. Signaler : `POST /api/devops/security/incidents`.
2. Si HIGH/CRITICAL : alerte automatique (EventBus).
3. Résoudre : `POST` resolve, puis rotation des secrets (`POST /api/devops/secrets`).

### 6.4 Impersonation (Login As Hotel Admin)
1. `POST /api/saasadmin/impersonation { targetUserId, hotelId, reason }` (journalisé).
2. Diagnostiquer.
3. `POST /api/saasadmin/impersonation/:id/end` (sortie immédiate).

## 7. Vérifications après incident
- `GET /api/certification/audit` → tout PASS.
- `GET /api/certification/journey` → parcours SaaS complet.
- `GET /api/devops/readiness` → rapport de préparation.
