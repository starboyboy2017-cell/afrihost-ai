# Documentation — Initialisation du premier Super Admin (Sous-module 33.1)

Ce guide explique comment initialiser le premier compte **SUPER_ADMIN** d'AfriHost AI lors d'un **nouveau
déploiement** de la plateforme SaaS.

## Prérequis

- Base de données Supabase opérationnelle (migrations appliquées, dont `20260804281000_bootstrap`).
- Une **clé de bootstrap** secrète (`BOOTSTRAP_KEY`). Elle doit être stockée dans l'environnement serveur
  (jamais dans le code ni exposée publiquement).

## Étapes

### 1. Vérifier l'état d'initialisation

```
GET /api/bootstrap/status
→ { "initialized": false }
```

Si `initialized` est déjà `true`, le SaaS a déjà un Super Admin et le bootstrap est **refusé** (création unique).

### 2. Créer le premier Super Admin (une seule fois)

```
POST /api/bootstrap/init
{
  "email": "admin@afrihost.com",
  "password": "VotreM0tDeP@ssSuperSolide!",
  "firstName": "Super",
  "lastName": "Admin",
  "bootstrapKey": "<la clé BOOTSTRAP_KEY>"
}
```

Réponse : le compte est créé avec `isSuperAdmin=true`, `mustChangePassword=true`, `twoFactorEnabled=false`.

> ⚠️ Cette opération n'est possible **qu'une seule fois** et requiert la clé de bootstrap. Toute inscription
> publique **ne peut jamais** créer un Super Admin.

### 3. Première connexion

```
POST /api/bootstrap/login
{ "email": "admin@afrihost.com", "password": "VotreM0tDeP@ssSuperSolide!" }
```

La réponse indique `mustChangePassword: true`.

### 4. Changer le mot de passe (obligatoire)

```
POST /api/bootstrap/change-password
{
  "superAdminId": "<id>",
  "currentPassword": "VotreM0tDeP@ssSuperSolide!",
  "newPassword": "N0uv@uM0tDeP@ssEncorePlusFort!"
}
```

Le flag `mustChangePassword` est levé.

### 5. Activer le 2FA (obligatoire avant l'accès admin)

Générer un secret :
```
POST /api/bootstrap/2fa
{ "action": "generate", "superAdminId": "<id>" }
→ { "secret": "<secret TOTP>" }
```

Activer après confirmation (scanner le QR / saisir un code) :
```
POST /api/bootstrap/2fa
{ "action": "enable", "superAdminId": "<id>", "code": "123456", "secret": "<secret>" }
```

Désormais, chaque connexion exige le **code 2FA** (TOTP) avant tout accès aux fonctionnalités d'administration.

## Sécurité

- La **création unique** est garantie : si `isSuperAdmin` existe déjà, `POST /api/bootstrap/init` renvoie 409.
- **Aucune inscription publique** ne peut mettre `isSuperAdmin` à `true`.
- **Seul un Super Admin** peut créer/modifier/suspendre d'autres Super Admins (via le Module 33).
- Chaque action (création, connexion, changement de mot de passe, activation 2FA, impersonation) est
  **journalisée dans l'audit log** (qui, quand, quoi).

## Script de bootstrap (exemple CLI)

Un opérateur peut aussi exécuter le bootstrap via un script sécurisé qui lit `BOOTSTRAP_KEY` de
l'environnement et appelle l'API d'initialisation — garantissant que la clé ne transite jamais par une
requête publique non autorisée.
