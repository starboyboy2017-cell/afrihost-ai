-- ============================================================================
-- AfriHost AI — Module 27 : Événements & Groupes
-- Migration : 20260804220000_events
--
-- Gestion des groupes, entreprises/organisateurs (Company du CRM), événements
-- (séminaires, conférences, mariages, banquets, formations), salles, équipements,
-- contrats/devis, ordres de service, documents.
-- Ajoute :
--   * EventGroup, EventVenue, EventEquipment, HotelEvent, EventContract,
--     EventServiceOrder, EventDocument.
--
-- Chaque table porte hotelId (isolation multihôtel via RLS).
-- ============================================================================

-- Groupe de réservation
CREATE TABLE "EventGroup" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "companyId" TEXT, "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'GROUP', "contactName" TEXT, "contactEmail" TEXT, "contactPhone" TEXT,
    "roomsAllocated" INTEGER NOT NULL DEFAULT 0, "totalRooms" INTEGER NOT NULL DEFAULT 0,
    "arrivalDate" TIMESTAMP(3), "departureDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PROSPECT', "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventGroup_pkey" PRIMARY KEY ("id")
);

-- Salle / espace événementiel
CREATE TABLE "EventVenue" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0, "seatingModes" JSONB,
    "basePrice" INTEGER NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'XOF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventVenue_pkey" PRIMARY KEY ("id")
);

-- Équipement
CREATE TABLE "EventEquipment" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'AV', "quantity" INTEGER NOT NULL DEFAULT 1,
    "available" INTEGER NOT NULL DEFAULT 1, "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventEquipment_pkey" PRIMARY KEY ("id")
);

-- Événement
CREATE TABLE "HotelEvent" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "groupId" TEXT, "venueId" TEXT,
    "name" TEXT NOT NULL, "eventType" TEXT NOT NULL DEFAULT 'SEMINAR',
    "startAt" TIMESTAMP(3), "endAt" TIMESTAMP(3), "expectedAttendees" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PLANNED', "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HotelEvent_pkey" PRIMARY KEY ("id")
);

-- Contrat / devis
CREATE TABLE "EventContract" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "groupId" TEXT, "eventId" TEXT,
    "title" TEXT NOT NULL, "contractType" TEXT NOT NULL DEFAULT 'QUOTE',
    "amount" INTEGER NOT NULL DEFAULT 0, "currency" TEXT NOT NULL DEFAULT 'XOF',
    "status" TEXT NOT NULL DEFAULT 'DRAFT', "validUntil" TIMESTAMP(3), "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventContract_pkey" PRIMARY KEY ("id")
);

-- Ordre de service
CREATE TABLE "EventServiceOrder" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "groupId" TEXT, "eventId" TEXT,
    "department" TEXT NOT NULL, "title" TEXT NOT NULL, "detail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING', "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventServiceOrder_pkey" PRIMARY KEY ("id")
);

-- Document
CREATE TABLE "EventDocument" (
    "id" TEXT NOT NULL, "hotelId" TEXT NOT NULL, "groupId" TEXT, "eventId" TEXT,
    "name" TEXT NOT NULL, "kind" TEXT NOT NULL DEFAULT 'OTHER', "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventDocument_pkey" PRIMARY KEY ("id")
);

-- Index
CREATE INDEX "EventGroup_hotelId_status_idx" ON "EventGroup"("hotelId", "status");
CREATE INDEX "EventVenue_hotelId_idx" ON "EventVenue"("hotelId");
CREATE INDEX "EventEquipment_hotelId_idx" ON "EventEquipment"("hotelId");
CREATE INDEX "HotelEvent_hotelId_status_idx" ON "HotelEvent"("hotelId", "status");
CREATE INDEX "HotelEvent_venueId_startAt_idx" ON "HotelEvent"("venueId", "startAt");
CREATE INDEX "EventContract_hotelId_idx" ON "EventContract"("hotelId");
CREATE INDEX "EventServiceOrder_hotelId_department_idx" ON "EventServiceOrder"("hotelId", "department");
CREATE INDEX "EventDocument_hotelId_idx" ON "EventDocument"("hotelId");

-- Clés étrangères
ALTER TABLE "EventGroup" ADD CONSTRAINT "EventGroup_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventGroup" ADD CONSTRAINT "EventGroup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventVenue" ADD CONSTRAINT "EventVenue_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventEquipment" ADD CONSTRAINT "EventEquipment_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HotelEvent" ADD CONSTRAINT "HotelEvent_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HotelEvent" ADD CONSTRAINT "HotelEvent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "EventGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HotelEvent" ADD CONSTRAINT "HotelEvent_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "EventVenue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventContract" ADD CONSTRAINT "EventContract_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventContract" ADD CONSTRAINT "EventContract_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "EventGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventContract" ADD CONSTRAINT "EventContract_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "HotelEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventServiceOrder" ADD CONSTRAINT "EventServiceOrder_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventServiceOrder" ADD CONSTRAINT "EventServiceOrder_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "EventGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventServiceOrder" ADD CONSTRAINT "EventServiceOrder_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "HotelEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventDocument" ADD CONSTRAINT "EventDocument_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventDocument" ADD CONSTRAINT "EventDocument_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "EventGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventDocument" ADD CONSTRAINT "EventDocument_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "HotelEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
