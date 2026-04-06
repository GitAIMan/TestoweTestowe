-- AlterTable
ALTER TABLE "OfferItem" ADD COLUMN     "hallId" TEXT,
ADD COLUMN     "timeTo" TEXT;

-- AddForeignKey
ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_hallId_fkey" FOREIGN KEY ("hallId") REFERENCES "Hall"("id") ON DELETE SET NULL ON UPDATE CASCADE;
