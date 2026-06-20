-- AlterTable
ALTER TABLE "Agenda" ADD COLUMN     "clientNotifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "contractSentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "needsAmendment" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Offer" ADD COLUMN     "lastItemsChangedAt" TIMESTAMP(3),
ADD COLUMN     "offerSentConfirmedAt" TIMESTAMP(3);
