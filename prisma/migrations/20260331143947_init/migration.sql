-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PRACOWNIK', 'KIEROWNIK');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('ROBOCZA', 'WYSLANA', 'ZAAKCEPTOWANA', 'ODRZUCONA', 'WYGASLA');

-- CreateEnum
CREATE TYPE "SectionSelectionMode" AS ENUM ('ALL_INCLUDED', 'CHOOSE_X_FROM_Y');

-- CreateEnum
CREATE TYPE "AgendaType" AS ENUM ('WSTEPNA', 'FINALNA');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('KLIENT_ZMIANA_WYBORU', 'OFERTA_WYGASLA', 'OFERTA_ZAAKCEPTOWANA', 'OFERTA_ODRZUCONA');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('KLIENT_AGENDA', 'KUCHNIA_AGENDA');

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "logoUrl" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#1a56db',
    "secondaryColor" TEXT NOT NULL DEFAULT '#f3f4f6',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "nip" TEXT,
    "regulamin" TEXT,
    "footerText" TEXT,
    "offerExpiryDays" INTEGER NOT NULL DEFAULT 14,
    "agendaLockDaysBefore" INTEGER NOT NULL DEFAULT 14,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "pricePerNight" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hall" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "pricePerDay" DECIMAL(10,2) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HallReservation" (
    "id" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "offerId" TEXT,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ZAREZERWOWANA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HallReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "offerTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "selectionMode" "SectionSelectionMode" NOT NULL DEFAULT 'ALL_INCLUDED',
    "selectionCount" INTEGER,
    "price" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientPhone" TEXT,
    "clientCompany" TEXT,
    "eventName" TEXT,
    "eventDateFrom" DATE NOT NULL,
    "eventDateTo" DATE NOT NULL,
    "adultsCount" INTEGER NOT NULL,
    "childrenCount" INTEGER NOT NULL DEFAULT 0,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'ROBOCZA',
    "sentAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferRoom" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "nights" INTEGER NOT NULL DEFAULT 1,
    "pricePerNight" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "OfferRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferHall" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "hallId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "pricePerDay" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "OfferHall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferPackage" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "priceSnapshot" DECIMAL(10,2),
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "OfferPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "clientFullName" TEXT NOT NULL,
    "clientAddress" TEXT,
    "clientNip" TEXT,
    "clientPesel" TEXT,
    "advanceAmount" DECIMAL(10,2),
    "advanceDueDate" TIMESTAMP(3),
    "paymentTerms" TEXT,
    "specialConditions" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agenda" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "AgendaType" NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaBlock" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "timeFrom" TEXT NOT NULL,
    "timeTo" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "hallId" TEXT,
    "personCount" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaBlockPackage" (
    "id" TEXT NOT NULL,
    "agendaBlockId" TEXT NOT NULL,
    "offerPackageId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AgendaBlockPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaBlockEquipment" (
    "id" TEXT NOT NULL,
    "agendaBlockId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,

    CONSTRAINT "AgendaBlockEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaSectionSelection" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgendaSectionSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaItemSelection" (
    "id" TEXT NOT NULL,
    "agendaSectionSelectionId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaItemSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaToken" (
    "id" TEXT NOT NULL,
    "agendaId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgendaToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationRead" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "HallReservation_hallId_date_idx" ON "HallReservation"("hallId", "date");

-- CreateIndex
CREATE INDEX "HallReservation_offerId_idx" ON "HallReservation"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "HallReservation_hallId_date_status_key" ON "HallReservation"("hallId", "date", "status");

-- CreateIndex
CREATE INDEX "Package_offerTypeId_idx" ON "Package"("offerTypeId");

-- CreateIndex
CREATE INDEX "Section_packageId_idx" ON "Section"("packageId");

-- CreateIndex
CREATE INDEX "MenuItem_sectionId_idx" ON "MenuItem"("sectionId");

-- CreateIndex
CREATE INDEX "Offer_status_idx" ON "Offer"("status");

-- CreateIndex
CREATE INDEX "Offer_createdById_idx" ON "Offer"("createdById");

-- CreateIndex
CREATE INDEX "OfferRoom_offerId_idx" ON "OfferRoom"("offerId");

-- CreateIndex
CREATE INDEX "OfferHall_offerId_idx" ON "OfferHall"("offerId");

-- CreateIndex
CREATE INDEX "OfferPackage_offerId_idx" ON "OfferPackage"("offerId");

-- CreateIndex
CREATE UNIQUE INDEX "OfferPackage_offerId_packageId_key" ON "OfferPackage"("offerId", "packageId");

-- CreateIndex
CREATE INDEX "Contract_offerId_idx" ON "Contract"("offerId");

-- CreateIndex
CREATE INDEX "Agenda_offerId_idx" ON "Agenda"("offerId");

-- CreateIndex
CREATE INDEX "AgendaBlock_agendaId_idx" ON "AgendaBlock"("agendaId");

-- CreateIndex
CREATE INDEX "AgendaBlock_agendaId_date_idx" ON "AgendaBlock"("agendaId", "date");

-- CreateIndex
CREATE INDEX "AgendaBlockPackage_agendaBlockId_idx" ON "AgendaBlockPackage"("agendaBlockId");

-- CreateIndex
CREATE INDEX "AgendaBlockEquipment_agendaBlockId_idx" ON "AgendaBlockEquipment"("agendaBlockId");

-- CreateIndex
CREATE INDEX "AgendaSectionSelection_agendaId_idx" ON "AgendaSectionSelection"("agendaId");

-- CreateIndex
CREATE UNIQUE INDEX "AgendaSectionSelection_agendaId_sectionId_key" ON "AgendaSectionSelection"("agendaId", "sectionId");

-- CreateIndex
CREATE INDEX "AgendaItemSelection_agendaSectionSelectionId_idx" ON "AgendaItemSelection"("agendaSectionSelectionId");

-- CreateIndex
CREATE UNIQUE INDEX "AgendaItemSelection_agendaSectionSelectionId_menuItemId_key" ON "AgendaItemSelection"("agendaSectionSelectionId", "menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "AgendaToken_token_key" ON "AgendaToken"("token");

-- CreateIndex
CREATE INDEX "AgendaToken_token_idx" ON "AgendaToken"("token");

-- CreateIndex
CREATE INDEX "AgendaToken_agendaId_idx" ON "AgendaToken"("agendaId");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationRead_notificationId_userId_key" ON "NotificationRead"("notificationId", "userId");

-- AddForeignKey
ALTER TABLE "HallReservation" ADD CONSTRAINT "HallReservation_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallReservation" ADD CONSTRAINT "HallReservation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_offerTypeId_fkey" FOREIGN KEY ("offerTypeId") REFERENCES "OfferType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferRoom" ADD CONSTRAINT "OfferRoom_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferRoom" ADD CONSTRAINT "OfferRoom_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferHall" ADD CONSTRAINT "OfferHall_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferHall" ADD CONSTRAINT "OfferHall_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferPackage" ADD CONSTRAINT "OfferPackage_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferPackage" ADD CONSTRAINT "OfferPackage_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agenda" ADD CONSTRAINT "Agenda_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaBlock" ADD CONSTRAINT "AgendaBlock_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaBlock" ADD CONSTRAINT "AgendaBlock_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaBlockPackage" ADD CONSTRAINT "AgendaBlockPackage_agendaBlockId_fkey" FOREIGN KEY ("agendaBlockId") REFERENCES "AgendaBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaBlockEquipment" ADD CONSTRAINT "AgendaBlockEquipment_agendaBlockId_fkey" FOREIGN KEY ("agendaBlockId") REFERENCES "AgendaBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaSectionSelection" ADD CONSTRAINT "AgendaSectionSelection_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaItemSelection" ADD CONSTRAINT "AgendaItemSelection_agendaSectionSelectionId_fkey" FOREIGN KEY ("agendaSectionSelectionId") REFERENCES "AgendaSectionSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaItemSelection" ADD CONSTRAINT "AgendaItemSelection_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaToken" ADD CONSTRAINT "AgendaToken_agendaId_fkey" FOREIGN KEY ("agendaId") REFERENCES "Agenda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationRead" ADD CONSTRAINT "NotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
