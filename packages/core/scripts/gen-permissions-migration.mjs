/**
 * Générateur de la migration de seed des permissions & rôles (versionnée).
 *
 * Régénère `database/migrations/20260804010000_seed_permissions_roles/migration.sql`
 * à partir de la source unique `packages/core/src/rbac/{permissions,roles}.ts`.
 *
 * Usage : depuis la racine du repo
 *   npx tsx packages/core/scripts/gen-permissions-migration.mjs
 */
import { writeFileSync } from "node:fs";
import { allPermissions } from "../dist/rbac/permissions.js";
import { SYSTEM_ROLES } from "../dist/rbac/roles.js";

const outDir = new URL("../../../database/migrations/20260804010000_seed_permissions_roles/", import.meta.url);
const file = new URL("migration.sql", outDir);

const perms = allPermissions();

let out = `-- ============================================================================
-- AfriHost AI — Seed des permissions & rôles système (versionné)
-- Migration : 20260804010000_seed_permissions_roles
--
-- PRINCIPE MULTI-HÔTELS (isolation) :
--   * Les PERMISSIONS sont GLOBALES (table Permission, code unique) : seedées une
--     seule fois, indépendamment des hôtels/organisations.
--   * Les RÔLES sont PAR ORGANISATION (table Role, contrainte unique
--     (organisationId, name)). Une fonction Postgres + un trigger créent
--     automatiquement les 11 rôles système + leurs permissions pour CHAQUE
--     organisation à sa création. Chaque organisation/hôtel est donc isolé.
--
-- Source unique : packages/core/src/rbac/{permissions,roles}.ts
-- Idempotent : ON CONFLICT DO NOTHING / CREATE OR REPLACE.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) PERMISSIONS GLOBALES (seed une fois)
-- ---------------------------------------------------------------------------
`;

for (const p of perms) {
  const mod = p.split(".")[0];
  out += `INSERT INTO "Permission"(id, code, module, label)
SELECT gen_random_uuid(), '${p}', '${mod}', '${p}'
WHERE NOT EXISTS (SELECT 1 FROM "Permission" WHERE code = '${p}');\n`;
}

out += `
-- ---------------------------------------------------------------------------
-- 2) FONCTION : création des rôles système + permissions pour une organisation
-- ---------------------------------------------------------------------------
create or replace function public.afrihost_seed_org_roles(v_org text)
returns void language plpgsql security definer set search_path = public as $$
declare
  rid text; -- les IDs sont TEXT (UUID stocké en texte)
begin
`;

for (const role of SYSTEM_ROLES) {
  out += `  -- ${role.code} — ${role.label}\n`;
  // Échapper les apostrophes SQL (description) — jamais de guillemets doubles
  const desc = role.description.replace(/'/g, "''");
  out += `  insert into "Role"(id, "organisationId", name, description, "isSystem")
  select gen_random_uuid(), v_org, '${role.code}', '${desc}', true
  where not exists (select 1 from "Role" where "organisationId" = v_org and name = '${role.code}');
  select id into rid from "Role" where "organisationId" = v_org and name = '${role.code}';
`;
  for (const pc of role.permissions) {
    out += `  insert into "RolePermission"(id, "roleId", "permissionId")
  select gen_random_uuid(), rid, p.id from "Permission" p
  where p.code = '${pc}'
  and not exists (select 1 from "RolePermission" rp where rp."roleId" = rid and rp."permissionId" = p.id);
`;
  }
  out += "\n";
}

out += `end $$;

-- ---------------------------------------------------------------------------
-- 3) TRIGGER : à la création d'une organisation, seed ses rôles système
-- ---------------------------------------------------------------------------
create or replace function public.afrihost_org_seed_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.afrihost_seed_org_roles(new.id);
  return new;
end $$;

drop trigger if exists trg_org_seed_roles on "Organisation";
create trigger trg_org_seed_roles
after insert on "Organisation"
for each row execute function public.afrihost_org_seed_trigger();

-- ---------------------------------------------------------------------------
-- 4) Seed des rôles pour les organisations EXISTANTES (idempotent)
-- ---------------------------------------------------------------------------
do $$
declare o record;
begin
  for o in select id from "Organisation" loop
    perform public.afrihost_seed_org_roles(o.id);
  end loop;
end $$;
`;

writeFileSync(file, out);
console.log(`Migration écrite : ${file.pathname}`);
console.log(`${perms.length} permissions, ${SYSTEM_ROLES.length} rôles, ${out.split("\n").length} lignes`);
