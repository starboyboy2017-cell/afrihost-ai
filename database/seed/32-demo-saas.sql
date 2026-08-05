-- ============================================================================
-- AfriHost AI — Jeu de démonstration : Billing SaaS (Module 32)
-- Fichier : database/seed/32-demo-saas.sql
--
--   * plans (Gratuit, Standard, Premium) ;
--   * moyens de paiement (Stripe auto, Wave manuel) ;
--   * un coupon.
--
-- IDEMPOTENT. NB : pgcrypto requis.
-- ============================================================================

-- Plans
insert into "SaasPlan"(id, code, name, description, price, currency, "billingCycle", "trialDays", "maxUsers", "maxHotels", "maxRooms", "quotaAi", "quotaEmail", "quotaSms", "quotaWhatsapp", "quotaApi", modules, "allowedPaymentMethods", "allowedCountries", "isActive", "updatedAt")
select gen_random_uuid()::text, 'FREE', 'Gratuit', 'Découverte', 0, 'XOF', 'MONTHLY', 0, 1, 1, 10, 100, 100, 50, 50, 100, array['reservations','frontdesk'], array['stripe-demo','wave'], array['BJ','SN'], true, now()
where not exists (select 1 from "SaasPlan" where code='FREE');

insert into "SaasPlan"(id, code, name, description, price, currency, "billingCycle", "trialDays", "maxUsers", "maxHotels", "maxRooms", "quotaAi", "quotaEmail", "quotaSms", "quotaWhatsapp", "quotaApi", modules, "allowedPaymentMethods", "allowedCountries", "isActive", "updatedAt")
select gen_random_uuid()::text, 'STANDARD', 'Standard', 'PME hôtelière', 20000, 'XOF', 'MONTHLY', 14, 10, 2, 50, 1000, 1000, 500, 500, 1000, array['reservations','frontdesk','housekeeping','billing','crm','loyalty','notifications','bi'], array['stripe-demo','flutterwave-demo','wave','mtn_money','orange_money'], array['BJ','SN','CI','TG','ML'], true, now()
where not exists (select 1 from "SaasPlan" where code='STANDARD');

insert into "SaasPlan"(id, code, name, description, price, currency, "billingCycle", "trialDays", "maxUsers", "maxHotels", "maxRooms", "quotaAi", "quotaEmail", "quotaSms", "quotaWhatsapp", "quotaApi", modules, "allowedPaymentMethods", "allowedCountries", "isActive", "updatedAt")
select gen_random_uuid()::text, 'PREMIUM', 'Premium', 'Chaîne hôtelière', 60000, 'XOF', 'MONTHLY', 0, 50, 10, 500, 10000, 10000, 5000, 5000, 10000, array['reservations','frontdesk','housekeeping','billing','crm','loyalty','notifications','ai','channel','portal','events','bi','publicapi','mobile'], array['stripe-demo','flutterwave-demo','paystack-demo','paypal-demo','wave','mtn_money','orange_money','cash','bank_transfer'], array['BJ','SN','CI','TG','ML','GH','KE','NG','ZA'], true, now()
where not exists (select 1 from "SaasPlan" where code='PREMIUM');

-- Moyens de paiement
insert into "SaasPaymentMethod"(id, "methodKey", name, type, "isActive", countries, currencies, "updatedAt")
select gen_random_uuid()::text, 'stripe-demo', 'Stripe (carte)', 'AUTO', true, array['BJ','SN','CI'], array['XOF','USD','EUR'], now()
where not exists (select 1 from "SaasPaymentMethod" where "methodKey"='stripe-demo');

insert into "SaasPaymentMethod"(id, "methodKey", name, type, "isActive", countries, currencies, "updatedAt")
select gen_random_uuid()::text, 'wave', 'Wave', 'MANUAL', true, array['BJ','SN','CI'], array['XOF'], now()
where not exists (select 1 from "SaasPaymentMethod" where "methodKey"='wave');

insert into "SaasPaymentMethod"(id, "methodKey", name, type, "isActive", countries, currencies, "updatedAt")
select gen_random_uuid()::text, 'orange_money', 'Orange Money', 'MANUAL', true, array['BJ','CI','ML'], array['XOF'], now()
where not exists (select 1 from "SaasPaymentMethod" where "methodKey"='orange_money');

insert into "SaasPaymentMethod"(id, "methodKey", name, type, "isActive", countries, currencies, "updatedAt")
select gen_random_uuid()::text, 'bank_transfer', 'Virement bancaire', 'MANUAL', true, array['BJ','SN','CI'], array['XOF','USD','EUR'], now()
where not exists (select 1 from "SaasPaymentMethod" where "methodKey"='bank_transfer');

-- Coupon
insert into "SaasCoupon"(id, code, type, value, "maxUses", used, "planCodes", "isActive")
select gen_random_uuid()::text, 'WELCOME15', 'PERCENT', 15, 100, 0, array['STANDARD','PREMIUM'], true
where not exists (select 1 from "SaasCoupon" where code='WELCOME15');

-- Récapitulatif
select (select count(*) from "SaasPlan") as plans,
  (select count(*) from "SaasPaymentMethod") as moyens,
  (select count(*) from "SaasCoupon") as coupons;
