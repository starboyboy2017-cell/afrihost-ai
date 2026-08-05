# Canevas — Spécification d'un module

> Chaque module livre ce document **avant** son développement, selon ce gabarit. Il est révisé et validé par le
> CTO/architecte. Exemples remplis : `01-parametres.md`, `09-reservations.md`.

## 0. Fiche
- **Nom du module :** ...
- **Dépendances :** modules/fondations requis.
- **Position dans la feuille de route :** n° ...

## 1. Objectif
Pourquoi ce module existe, à quel besoin hôtelier il répond, sa valeur.

## 2. Acteurs & permissions
| Rôle | Accès | Permissions (code `module.action`) |

## 3. Données (entités)
Nouvelles tables/colonnes Prisma + relations + index + RLS.

## 4. Statuts (machine à états)
Diagramme de transitions + transitions illégales.

## 5. Automatisations
Règles déclenchées (événement → condition → action).

## 6. Notifications
Templates, canaux, destinataires, déclencheurs.

## 7. Interactions avec les autres modules
Événements **émis** / **écoutés** ; services consommés.

## 8. API (endpoints)
`GET/POST/PUT/PATCH/DELETE` + schémas d'entrée/sortie + permissions.

## 9. Écrans d'interface
Liste des vues (écrans), actions utilisateur, navigation, UX clés.

## 10. Critères d'acceptation
Tests, non-régressions, performance, sécurité (RLS), audit.
