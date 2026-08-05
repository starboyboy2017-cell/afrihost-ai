-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'DIRTY', 'CLEANING', 'INSPECTED', 'OUT_OF_ORDER', 'OUT_OF_SERVICE', 'RESERVED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('PROVISIONAL', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW', 'WAITLIST');

-- CreateEnum
CREATE TYPE "ReservationSource" AS ENUM ('DIRECT', 'WEBSITE', 'OTA', 'PHONE', 'WALK_IN', 'CORPORATE', 'AGENCY', 'CHANNEL_MANAGER');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('ROOM', 'RESTAURANT', 'SERVICE', 'CONSOLIDATED', 'CREDIT_NOTE', 'PRO_FORMA');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'POS_TERMINAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'VOID');

-- CreateEnum
CREATE TYPE "HousekeepingStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'SMS', 'PUSH');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "Organisation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "legalName" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organisation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'XOF',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Porto-Novo',
    "vatRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "authId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "hotelId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "hotelId" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "nationality" TEXT,
    "idDocument" TEXT,
    "idDocumentType" TEXT,
    "birthDate" TIMESTAMP(3),
    "address" TEXT,
    "tags" TEXT[],
    "notes" TEXT,
    "isVip" BOOLEAN NOT NULL DEFAULT false,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "loyaltyTier" TEXT DEFAULT 'BRONZE',
    "preferredLanguage" TEXT DEFAULT 'fr',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomType" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseRate" INTEGER NOT NULL,
    "maxOccupancy" INTEGER NOT NULL DEFAULT 2,
    "bedCount" INTEGER NOT NULL DEFAULT 1,
    "amenities" TEXT[],
    "features" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "RoomType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "floor" INTEGER,
    "status" "RoomStatus" NOT NULL,
    "isOutOfOrder" BOOLEAN NOT NULL DEFAULT false,
    "isOutOfService" BOOLEAN NOT NULL DEFAULT false,
    "keyCardEnabled" BOOLEAN NOT NULL DEFAULT false,
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomStatusHistory" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "from" "RoomStatus",
    "to" "RoomStatus" NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "guestId" TEXT,
    "roomId" TEXT,
    "roomTypeId" TEXT,
    "bookingRef" TEXT NOT NULL,
    "source" "ReservationSource" NOT NULL,
    "channel" TEXT,
    "status" "ReservationStatus" NOT NULL,
    "arrivalDate" TIMESTAMP(3) NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "ratePlanId" TEXT,
    "amount" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL DEFAULT 0,
    "discountAmount" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "confirmationNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationStatusHistory" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "from" "ReservationStatus",
    "to" "ReservationStatus" NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReservationStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "reservationId" TEXT,
    "guestId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "status" "InvoiceStatus" NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "taxAmount" INTEGER NOT NULL,
    "discountAmount" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "taxRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "accountCode" TEXT,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "reservationId" TEXT,
    "invoiceId" TEXT,
    "guestId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "reference" TEXT,
    "receivedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "category" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "costPrice" INTEGER,
    "currency" TEXT NOT NULL,
    "taxRate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "trackStock" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "location" TEXT,
    "reorderLevel" DECIMAL(14,3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HousekeepingTask" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" "HousekeepingStatus" NOT NULL,
    "priority" "Priority" NOT NULL,
    "assignedTo" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HousekeepingTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "templateCode" TEXT NOT NULL,
    "payload" JSONB,
    "status" "NotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncOutbox" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "SyncOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Automation" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "condition" JSONB,
    "actionType" TEXT NOT NULL,
    "actionPayload" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organisation_slug_key" ON "Organisation"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_slug_key" ON "Hotel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Hotel_code_key" ON "Hotel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE INDEX "Membership_hotelId_idx" ON "Membership"("hotelId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_hotelId_roleId_key" ON "Membership"("userId", "hotelId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_organisationId_name_key" ON "Role"("organisationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "AuditLog_hotelId_createdAt_idx" ON "AuditLog"("hotelId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Guest_hotelId_idx" ON "Guest"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_organisationId_email_key" ON "Guest"("organisationId", "email");

-- CreateIndex
CREATE INDEX "RoomType_hotelId_idx" ON "RoomType"("hotelId");

-- CreateIndex
CREATE INDEX "Room_hotelId_status_idx" ON "Room"("hotelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Room_hotelId_number_key" ON "Room"("hotelId", "number");

-- CreateIndex
CREATE INDEX "RoomStatusHistory_roomId_createdAt_idx" ON "RoomStatusHistory"("roomId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_bookingRef_key" ON "Reservation"("bookingRef");

-- CreateIndex
CREATE INDEX "Reservation_hotelId_arrivalDate_idx" ON "Reservation"("hotelId", "arrivalDate");

-- CreateIndex
CREATE INDEX "Reservation_hotelId_status_idx" ON "Reservation"("hotelId", "status");

-- CreateIndex
CREATE INDEX "Reservation_guestId_idx" ON "Reservation"("guestId");

-- CreateIndex
CREATE INDEX "ReservationStatusHistory_reservationId_createdAt_idx" ON "ReservationStatusHistory"("reservationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE INDEX "Invoice_hotelId_status_idx" ON "Invoice"("hotelId", "status");

-- CreateIndex
CREATE INDEX "Invoice_guestId_idx" ON "Invoice"("guestId");

-- CreateIndex
CREATE INDEX "Payment_hotelId_createdAt_idx" ON "Payment"("hotelId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Product_hotelId_idx" ON "Product"("hotelId");

-- CreateIndex
CREATE INDEX "StockItem_hotelId_idx" ON "StockItem"("hotelId");

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_productId_location_key" ON "StockItem"("productId", "location");

-- CreateIndex
CREATE INDEX "HousekeepingTask_hotelId_status_idx" ON "HousekeepingTask"("hotelId", "status");

-- CreateIndex
CREATE INDEX "Notification_hotelId_status_idx" ON "Notification"("hotelId", "status");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_guestId_createdAt_idx" ON "LoyaltyTransaction"("guestId", "createdAt");

-- CreateIndex
CREATE INDEX "SyncOutbox_hotelId_status_idx" ON "SyncOutbox"("hotelId", "status");

-- CreateIndex
CREATE INDEX "SyncOutbox_entityType_entityId_idx" ON "SyncOutbox"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Automation_hotelId_event_idx" ON "Automation"("hotelId", "event");

-- AddForeignKey
ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomType" ADD CONSTRAINT "RoomType_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomStatusHistory" ADD CONSTRAINT "RoomStatusHistory_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationStatusHistory" ADD CONSTRAINT "ReservationStatusHistory_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockItem" ADD CONSTRAINT "StockItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HousekeepingTask" ADD CONSTRAINT "HousekeepingTask_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;



-- ============================================================================
-- ROW LEVEL SECURITY (multi-tenant + RBAC) - integre au script de creation
-- (source : infra/supabase/03-rls-policies.sql)
-- ============================================================================

-- ============================================================================
-- AfriHost AI — RLS (Row Level Security) intégral — multi-tenant + RBAC
-- Fichier : infra/supabase/03-rls-policies.sql
--
-- ACTIVE le RLS sur TOUTES les tables et crée des policies minimales :
--   1. ISOLATION MULTITENANT : chaque utilisateur ne voit/écrit que les données
--      des HÔTELS dont il est membre (Membership).
--   2. RBAC PAR RÔLE : les écritures sont restreintes par permission (module.action)
--      via la chaîne Membership -> Role -> RolePermission -> Permission.
--
-- Ce fichier est CONCATÉNÉ au script de migration initial (migration.sql) pour que
-- les tables soient créées AVEC RLS dès le départ.
--
-- NB : les helpers sont SECURITY DEFINER pour résoudre le tenant sans récursion RLS.
--      Les superutilisateurs (postgres, service_role) contournent le RLS par nature ;
--      ce RLS protège les rôles anon/authenticated (PostgREST) = défense en profondeur.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) HELPERS (security definer, search_path fixé)
--
-- Les colonnes d'identité (id, authId, hotelId, organisationId, userId, ...) sont
-- de type TEXT (UUID stocké en texte). auth.uid() renvoie un `uuid` → on caste
-- systématiquement en `::text`. Les helpers renvoient donc des TEXT.
-- ---------------------------------------------------------------------------

-- id interne "User" de l'utilisateur connecté (User.authId = auth.uid()::text)
create or replace function auth_user_id()
returns text language sql stable security definer set search_path = public as $$
  select "id" from "User" u where u."authId" = auth.uid()::text limit 1;
$$;

-- organisation de l'utilisateur connecté
create or replace function auth_org_id()
returns text language sql stable security definer set search_path = public as $$
  select u."organisationId" from "User" u where u."id" = auth_user_id() limit 1;
$$;

-- l'utilisateur est-il membre de l'hôtel p_hotel ?
create or replace function auth_has_hotel(p_hotel text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from "Membership" m
    where m."hotelId" = p_hotel and m."userId" = auth_user_id()
  );
$$;

-- hôtel actif par défaut de l'utilisateur
create or replace function auth_hotel_id()
returns text language sql stable security definer set search_path = public as $$
  select m."hotelId" from "Membership" m
  where m."userId" = auth_user_id()
  order by m."isDefault" desc, m."createdAt" limit 1;
$$;

-- l'utilisateur est admin d'organisation / propriétaire (accès large)
create or replace function auth_org_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from "Membership" m join "Role" r on r.id = m."roleId"
    where m."userId" = auth_user_id() and r.name in ('PLATFORM_ADMIN','HOTEL_OWNER')
  );
$$;

-- l'utilisateur possède un rôle donné sur un hôtel
create or replace function auth_has_role(p_hotel text, p_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from "Membership" m join "Role" r on r.id = m."roleId"
    where m."hotelId" = p_hotel and m."userId" = auth_user_id() and r.name = p_role
  );
$$;

-- l'utilisateur possède une permission donnée sur un hôtel (RBAC)
create or replace function auth_has_permission(p_hotel text, p_code text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from "Membership" m
    join "Role" r on r.id = m."roleId"
    join "RolePermission" rp on rp."roleId" = r.id
    join "Permission" pe on pe.id = rp."permissionId"
    where m."hotelId" = p_hotel and m."userId" = auth_user_id() and pe.code = p_code
  );
$$;

-- ---------------------------------------------------------------------------
-- 2) ACTIVER LE RLS SUR TOUTES LES TABLES (+ FORCE pour défense en profondeur)
-- ---------------------------------------------------------------------------

alter table "Organisation" enable row level security, force row level security;
alter table "Hotel" enable row level security, force row level security;
alter table "User" enable row level security, force row level security;
alter table "Membership" enable row level security, force row level security;
alter table "Role" enable row level security, force row level security;
alter table "Permission" enable row level security, force row level security;
alter table "RolePermission" enable row level security, force row level security;
alter table "AuditLog" enable row level security, force row level security;
alter table "Guest" enable row level security, force row level security;
alter table "RoomType" enable row level security, force row level security;
alter table "Room" enable row level security, force row level security;
alter table "RoomStatusHistory" enable row level security, force row level security;
alter table "Reservation" enable row level security, force row level security;
alter table "ReservationStatusHistory" enable row level security, force row level security;
alter table "Invoice" enable row level security, force row level security;
alter table "InvoiceLine" enable row level security, force row level security;
alter table "Payment" enable row level security, force row level security;
alter table "Product" enable row level security, force row level security;
alter table "StockItem" enable row level security, force row level security;
alter table "HousekeepingTask" enable row level security, force row level security;
alter table "Notification" enable row level security, force row level security;
alter table "LoyaltyTransaction" enable row level security, force row level security;
alter table "SyncOutbox" enable row level security, force row level security;
alter table "Automation" enable row level security, force row level security;

-- ---------------------------------------------------------------------------
-- 3) POLICIES — TABLES GLOBALES (organisation / identité / RBAC)
-- ---------------------------------------------------------------------------

-- Organisation
create policy "org_select" on "Organisation" for select
  using ( "id" = auth_org_id() or auth_org_admin() );

-- User (identité) : voit son org ; peut modifier son profil ; admin gère les autres
create policy "user_select" on "User" for select
  using ( "organisationId" = auth_org_id() or "id" = auth_user_id() );
create policy "user_update_self" on "User" for update
  using ( "id" = auth_user_id() ) with check ( "id" = auth_user_id() );
create policy "user_admin_insert" on "User" for insert
  with check ( auth_org_admin() );
create policy "user_admin_delete" on "User" for delete
  using ( auth_org_admin() );

-- Membership : un utilisateur voit ses propres affectations ; un membre voit celles de son hôtel
create policy "membership_select" on "Membership" for select
  using ( "userId" = auth_user_id() or auth_has_hotel("hotelId") );
create policy "membership_insert" on "Membership" for insert
  with check ( auth_org_admin() or auth_has_hotel("hotelId") );
create policy "membership_update" on "Membership" for update
  using ( auth_org_admin() or auth_has_hotel("hotelId") )
  with check ( auth_org_admin() or auth_has_hotel("hotelId") );
create policy "membership_delete" on "Membership" for delete
  using ( auth_org_admin() or auth_has_hotel("hotelId") );

-- Role : lisible dans son org ; admin les modifie
create policy "role_select" on "Role" for select
  using ( "organisationId" = auth_org_id() );
create policy "role_admin_insert" on "Role" for insert with check ( auth_org_admin() );
create policy "role_admin_update" on "Role" for update
  using ( auth_org_admin() ) with check ( auth_org_admin() );
create policy "role_admin_delete" on "Role" for delete using ( auth_org_admin() );

-- Permission : lisible par tous les utilisateurs authentifiés
create policy "permission_select" on "Permission" for select using ( true );

-- RolePermission : lisible via les rôles de son org ; admin les modifie
create policy "roleperm_select" on "RolePermission" for select
  using ( exists( select 1 from "Role" r where r.id = "roleId" and r."organisationId" = auth_org_id() ) );
create policy "roleperm_admin_insert" on "RolePermission" for insert
  with check ( auth_org_admin() );
create policy "roleperm_admin_delete" on "RolePermission" for delete
  using ( auth_org_admin() );

-- ---------------------------------------------------------------------------
-- 4) POLICIES — AUDIT (append-only : INSERT + SELECT, jamais UPDATE/DELETE)
-- ---------------------------------------------------------------------------
create policy "audit_insert" on "AuditLog" for insert
  with check ( auth_has_hotel("hotelId") or auth_org_admin() );
create policy "audit_select" on "AuditLog" for select
  using ( auth_has_hotel("hotelId") or "actorUserId" = auth_user_id() or auth_org_admin() );
-- (aucune policy UPDATE/DELETE => append-only garanti)

-- ---------------------------------------------------------------------------
-- 5) POLICIES — TABLES PAR HÔTEL (isolation + RBAC sur écriture)
--    Pattern : SELECT = membre de l'hôtel
--              INSERT/UPDATE/DELETE = membre ET (admin OU permission module)
-- ---------------------------------------------------------------------------

-- Hotel (pas de hotelId ; c'est l'hôtel lui-même)
create policy "hotel_select" on "Hotel" for select
  using ( auth_has_hotel("id") or auth_org_admin() );
create policy "hotel_insert" on "Hotel" for insert with check ( auth_org_admin() );
create policy "hotel_update" on "Hotel" for update
  using ( auth_has_hotel("id") or auth_org_admin() )
  with check ( auth_org_admin() or auth_has_permission("id", 'hotels.update') );
create policy "hotel_delete" on "Hotel" for delete using ( auth_org_admin() );

-- RoomType
create policy "roomtype_select" on "RoomType" for select using ( auth_has_hotel("hotelId") );
create policy "roomtype_insert" on "RoomType" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'roomTypes.create') ) );
create policy "roomtype_update" on "RoomType" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'roomTypes.update') ) );
create policy "roomtype_delete" on "RoomType" for delete
  using ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'roomTypes.delete') ) );

-- Room
create policy "room_select" on "Room" for select using ( auth_has_hotel("hotelId") );
create policy "room_insert" on "Room" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'rooms.create') ) );
create policy "room_update" on "Room" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'rooms.update') ) );
create policy "room_delete" on "Room" for delete
  using ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'rooms.delete') ) );

-- RoomStatusHistory (table enfant : via Room)
create policy "roomstatushist_select" on "RoomStatusHistory" for select
  using ( exists( select 1 from "Room" r where r.id = "roomId" and auth_has_hotel(r."hotelId") ) );
create policy "roomstatushist_insert" on "RoomStatusHistory" for insert
  with check ( exists( select 1 from "Room" r where r.id = "roomId" and auth_has_hotel(r."hotelId") ) );

-- Reservation
create policy "reservation_select" on "Reservation" for select using ( auth_has_hotel("hotelId") );
create policy "reservation_insert" on "Reservation" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'reservations.create') ) );
create policy "reservation_update" on "Reservation" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'reservations.update') ) );
create policy "reservation_delete" on "Reservation" for delete
  using ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'reservations.cancel') ) );

-- ReservationStatusHistory (enfant : via Reservation)
create policy "resstatushist_select" on "ReservationStatusHistory" for select
  using ( exists( select 1 from "Reservation" res where res.id = "reservationId" and auth_has_hotel(res."hotelId") ) );
create policy "resstatushist_insert" on "ReservationStatusHistory" for insert
  with check ( exists( select 1 from "Reservation" res where res.id = "reservationId" and auth_has_hotel(res."hotelId") ) );

-- Invoice
create policy "invoice_select" on "Invoice" for select using ( auth_has_hotel("hotelId") );
create policy "invoice_insert" on "Invoice" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'invoices.issue') ) );
create policy "invoice_update" on "Invoice" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'invoices.issue') ) );
create policy "invoice_delete" on "Invoice" for delete using ( auth_org_admin() );

-- InvoiceLine (enfant : via Invoice)
create policy "invoiceline_select" on "InvoiceLine" for select
  using ( exists( select 1 from "Invoice" i where i.id = "invoiceId" and auth_has_hotel(i."hotelId") ) );
create policy "invoiceline_insert" on "InvoiceLine" for insert
  with check ( exists( select 1 from "Invoice" i where i.id = "invoiceId" and auth_has_hotel(i."hotelId") ) );

-- Payment
create policy "payment_select" on "Payment" for select using ( auth_has_hotel("hotelId") );
create policy "payment_insert" on "Payment" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'payments.create') ) );
create policy "payment_update" on "Payment" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'payments.refund') ) );
create policy "payment_delete" on "Payment" for delete using ( auth_org_admin() );

-- Product
create policy "product_select" on "Product" for select using ( auth_has_hotel("hotelId") );
create policy "product_admin_insert" on "Product" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "product_admin_update" on "Product" for update
  using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "product_admin_delete" on "Product" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- StockItem
create policy "stock_select" on "StockItem" for select using ( auth_has_hotel("hotelId") );
create policy "stock_admin_insert" on "StockItem" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "stock_admin_update" on "StockItem" for update
  using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "stock_admin_delete" on "StockItem" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- HousekeepingTask
create policy "housekeeping_select" on "HousekeepingTask" for select using ( auth_has_hotel("hotelId") );
create policy "housekeeping_insert" on "HousekeepingTask" for insert
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'housekeeping.update') ) );
create policy "housekeeping_update" on "HousekeepingTask" for update
  using ( auth_has_hotel("hotelId") )
  with check ( auth_has_hotel("hotelId") and ( auth_org_admin() or auth_has_permission("hotelId",'housekeeping.update') ) );
create policy "housekeeping_delete" on "HousekeepingTask" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- Notification
create policy "notification_select" on "Notification" for select using ( auth_has_hotel("hotelId") );
create policy "notification_admin_insert" on "Notification" for insert with check ( auth_has_hotel("hotelId") );
create policy "notification_admin_update" on "Notification" for update
  using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "notification_admin_delete" on "Notification" for delete using ( auth_has_hotel("hotelId") );

-- LoyaltyTransaction
create policy "loyalty_select" on "LoyaltyTransaction" for select using ( auth_has_hotel("hotelId") );
create policy "loyalty_admin_insert" on "LoyaltyTransaction" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "loyalty_admin_update" on "LoyaltyTransaction" for update
  using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "loyalty_admin_delete" on "LoyaltyTransaction" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- Guest (hotelId nullable ; voir aussi son organisation)
create policy "guest_select" on "Guest" for select
  using ( ( "hotelId" is not null and auth_has_hotel("hotelId") ) or "organisationId" = auth_org_id() );
create policy "guest_insert" on "Guest" for insert
  with check ( ( "hotelId" is not null and auth_has_hotel("hotelId") )
               and ( auth_org_admin() or auth_has_permission("hotelId",'guests.create') ) );
create policy "guest_update" on "Guest" for update
  using ( ( "hotelId" is not null and auth_has_hotel("hotelId") ) or "organisationId" = auth_org_id() )
  with check ( ( "hotelId" is not null and auth_has_hotel("hotelId") )
               and ( auth_org_admin() or auth_has_permission("hotelId",'guests.update') ) );
create policy "guest_admin_delete" on "Guest" for delete using ( auth_org_admin() );

-- SyncOutbox
create policy "syncoutbox_select" on "SyncOutbox" for select using ( auth_has_hotel("hotelId") );
create policy "syncoutbox_insert" on "SyncOutbox" for insert with check ( auth_has_hotel("hotelId") );
create policy "syncoutbox_update" on "SyncOutbox" for update
  using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") );
create policy "syncoutbox_delete" on "SyncOutbox" for delete using ( auth_has_hotel("hotelId") );

-- Automation
create policy "automation_select" on "Automation" for select using ( auth_has_hotel("hotelId") );
create policy "automation_admin_insert" on "Automation" for insert with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "automation_admin_update" on "Automation" for update
  using ( auth_has_hotel("hotelId") ) with check ( auth_has_hotel("hotelId") and auth_org_admin() );
create policy "automation_admin_delete" on "Automation" for delete using ( auth_has_hotel("hotelId") and auth_org_admin() );

-- ============================================================================
-- FIN RLS
-- ============================================================================
