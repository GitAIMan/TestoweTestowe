-- DropForeignKey
ALTER TABLE "HallReservation" DROP CONSTRAINT "HallReservation_offerId_fkey";

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "HallReservation" ADD CONSTRAINT "HallReservation_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
