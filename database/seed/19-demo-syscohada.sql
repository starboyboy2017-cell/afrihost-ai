-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Plan comptable SYSCOHADA révisé (OHADA/UEMOA)
-- Fichier : database/seed/19-demo-syscohada.sql
--
-- Charge le plan comptable SYSCOHADA révisé (comptes des classes 1 à 8) pour
-- l'hôtel Cotonou, ainsi que les journaux et une période. Les règles comptables
-- restent CONFIGURABLES par hôtel (aucune règle codée en dur).
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

do $$
declare
  h_co text;
begin
  select "id" into h_co from "Hotel" where code='DEMO-CO';
  if h_co is null then raise exception 'Hôtel de démo absent (seed 05 requis)'; end if;

  -- Comptes SYSCOHADA révisé (classes 1-8) — échantillon représentatif
  insert into "Account"(id, "hotelId", code, name, type, nature, "updatedAt")
  select gen_random_uuid()::text, h_co, code, name, type::"AccountType", nature::"AccountNature", now()
  from (values
    ('101000','Capital social','EQUITY','CREDIT'),
    ('111000','Report à nouveau','EQUITY','CREDIT'),
    ('164000','Emprunts et dettes assimilées','LIABILITY','CREDIT'),
    ('401000','Fournisseurs et comptes rattachés','LIABILITY','CREDIT'),
    ('411000','Clients et comptes rattachés','ASSET','DEBIT'),
    ('421000','Personnel - rémunérations dues','LIABILITY','CREDIT'),
    ('431000','Sécurité sociale','LIABILITY','CREDIT'),
    ('471000','Comptes d''attente','ASSET','DEBIT'),
    ('511000','Banques','ASSET','DEBIT'),
    ('521000','Banques (hors chèques postaux)','ASSET','DEBIT'),
    ('531000','Caisse','ASSET','DEBIT'),
    ('601000','Achats matières premières','EXPENSE','DEBIT'),
    ('611000','Achats consommés de matières et fournitures','EXPENSE','DEBIT'),
    ('612000','Achats consommés de matières et fournitures à stocker','EXPENSE','DEBIT'),
    ('613000','Achats consommés de matières et fournitures non stockables','EXPENSE','DEBIT'),
    ('622000','Rémunérations du personnel extérieur','EXPENSE','DEBIT'),
    ('631000','Impôts et taxes','EXPENSE','DEBIT'),
    ('651000','Autres charges','EXPENSE','DEBIT'),
    ('701000','Ventes de marchandises','REVENUE','CREDIT'),
    ('706000','Services vendus','REVENUE','CREDIT'),
    ('707000','Produits accessoires','REVENUE','CREDIT'),
    ('709000','Ristournes et rabais accordés','REVENUE','CREDIT'),
    ('711000','Production stockée','REVENUE','CREDIT'),
    ('756000','Produits financiers','REVENUE','CREDIT'),
    ('771000','Produits exceptionnels','REVENUE','CREDIT')
  ) as v(code, name, type, nature)
  where not exists (select 1 from "Account" where "hotelId"=h_co and code=v.code);

  -- Journaux
  insert into "AccountingJournal"(id, "hotelId", name, type)
  select gen_random_uuid()::text, h_co, 'Ventes', 'SALES'
  where not exists (select 1 from "AccountingJournal" where "hotelId"=h_co and type='SALES');
  insert into "AccountingJournal"(id, "hotelId", name, type)
  select gen_random_uuid()::text, h_co, 'Achats', 'PURCHASES'
  where not exists (select 1 from "AccountingJournal" where "hotelId"=h_co and type='PURCHASES');
  insert into "AccountingJournal"(id, "hotelId", name, type)
  select gen_random_uuid()::text, h_co, 'Banque', 'BANK'
  where not exists (select 1 from "AccountingJournal" where "hotelId"=h_co and type='BANK');
  insert into "AccountingJournal"(id, "hotelId", name, type)
  select gen_random_uuid()::text, h_co, 'Caisse', 'CASH'
  where not exists (select 1 from "AccountingJournal" where "hotelId"=h_co and type='CASH');
  insert into "AccountingJournal"(id, "hotelId", name, type)
  select gen_random_uuid()::text, h_co, 'Opérations diverses', 'GENERAL'
  where not exists (select 1 from "AccountingJournal" where "hotelId"=h_co and type='GENERAL');

  -- Période (exercice 2026)
  insert into "AccountingPeriod"(id, "hotelId", label, "startDate", "endDate")
  select gen_random_uuid()::text, h_co, 'Exercice 2026', '2026-01-01', '2026-12-31'
  where not exists (select 1 from "AccountingPeriod" where "hotelId"=h_co and label='Exercice 2026');
end $$;

-- Récapitulatif
select h.name as hotel,
  (select count(*) from "Account" a where a."hotelId"=h.id) as comptes,
  (select count(*) from "AccountingJournal" j where j."hotelId"=h.id) as journaux,
  (select count(*) from "AccountingPeriod" p where p."hotelId"=h.id) as periodes
from "Hotel" h where h.name like 'Hôtel Démo%' order by h.name;
