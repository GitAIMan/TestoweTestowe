import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function clearAll() {
  // Od najbardziej zależnych do niezależnych
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AgendaItemSelection",
      "AgendaSectionSelection",
      "AgendaBlockEquipment",
      "AgendaBlockPackage",
      "AgendaBlock",
      "AgendaToken",
      "Agenda",
      "NotificationRead",
      "Notification",
      "Contract",
      "OfferPackage",
      "OfferRoom",
      "OfferHall",
      "HallReservation",
      "Offer",
      "MenuItem",
      "Section",
      "Package",
      "OfferType",
      "Room",
      "Hall",
      "Settings"
    CASCADE
  `);
  console.log("Baza wyczyszczona! Zostali tylko użytkownicy.");
}

clearAll()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
  });
