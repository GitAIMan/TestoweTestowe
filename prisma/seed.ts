import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Ustawienia hotelu
  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: {
      id: "default",
      hotelName: "Hotel Testowy Resort & SPA",
      contactEmail: "kontakt@hoteltestowy.pl",
      contactPhone: "+48 600 100 200",
      address: "ul. Hotelowa 1",
      city: "Zakopane",
      postalCode: "34-500",
      nip: "1234567890",
      regulamin:
        "1. Potwierdzenie liczby gości najp. 14 dni przed terminem.\n2. Zmiany w menu min. 14 dni przed terminem.\n3. Doba hotelowa: 15:00 - 11:00.",
      footerText:
        "Hotel Testowy Resort & SPA, ul. Hotelowa 1, 34-500 Zakopane, +48 600 100 200",
    },
  });

  // Użytkownicy
  const passwordHash = await bcrypt.hash("test1234", 10);

  await prisma.user.upsert({
    where: { email: "anna@hotel.pl" },
    update: {},
    create: {
      email: "anna@hotel.pl",
      passwordHash,
      firstName: "Anna",
      lastName: "Nowak",
      role: "PRACOWNIK",
    },
  });

  await prisma.user.upsert({
    where: { email: "kierownik@hotel.pl" },
    update: {},
    create: {
      email: "kierownik@hotel.pl",
      passwordHash,
      firstName: "Jan",
      lastName: "Kowalski",
      role: "KIEROWNIK",
    },
  });

  // Pokoje
  const roomTypes = [
    { name: "Pokój 2-osobowy Standard", type: "2-osobowy", pricePerNight: 250 },
    { name: "Pokój 2-osobowy Premium", type: "2-osobowy", pricePerNight: 350 },
    { name: "Pokój 3-osobowy", type: "3-osobowy", pricePerNight: 400 },
    { name: "Apartament", type: "apartament", pricePerNight: 600 },
  ];

  for (let i = 0; i < roomTypes.length; i++) {
    await prisma.room.upsert({
      where: { id: `room-${i}` },
      update: {},
      create: {
        id: `room-${i}`,
        ...roomTypes[i],
        sortOrder: i,
      },
    });
  }

  // Sale
  const halls = [
    { name: "Sala Balowa", capacity: 200, pricePerDay: 3000 },
    { name: "Sala Konferencyjna VIP", capacity: 50, pricePerDay: 1500 },
    { name: "Leśna Sala Konferencyjna", capacity: 30, pricePerDay: 800 },
    { name: "Szałas", capacity: 40, pricePerDay: 2000 },
    { name: "Oranżeria", capacity: 80, pricePerDay: 2500 },
  ];

  for (let i = 0; i < halls.length; i++) {
    await prisma.hall.upsert({
      where: { id: `hall-${i}` },
      update: {},
      create: {
        id: `hall-${i}`,
        ...halls[i],
        sortOrder: i,
      },
    });
  }

  // Typy ofert
  const weselna = await prisma.offerType.upsert({
    where: { id: "offer-type-weselna" },
    update: {},
    create: {
      id: "offer-type-weselna",
      name: "Oferta Weselna",
      sortOrder: 0,
    },
  });

  const konferencyjna = await prisma.offerType.upsert({
    where: { id: "offer-type-konferencyjna" },
    update: {},
    create: {
      id: "offer-type-konferencyjna",
      name: "Oferta Konferencyjna",
      sortOrder: 1,
    },
  });

  // Pakiety weselne
  const pakietDaniaGlowneWeselne = await prisma.package.upsert({
    where: { id: "pkg-weselna-dania" },
    update: {},
    create: {
      id: "pkg-weselna-dania",
      offerTypeId: weselna.id,
      name: "Dania Główne",
      sortOrder: 0,
    },
  });

  // Sekcje
  const sekcjaZupy = await prisma.section.upsert({
    where: { id: "sec-weselna-zupy" },
    update: {},
    create: {
      id: "sec-weselna-zupy",
      packageId: pakietDaniaGlowneWeselne.id,
      name: "Zupy",
      selectionMode: "ALL_INCLUDED",
      sortOrder: 0,
    },
  });

  const sekcjaMiesa = await prisma.section.upsert({
    where: { id: "sec-weselna-miesa" },
    update: {},
    create: {
      id: "sec-weselna-miesa",
      packageId: pakietDaniaGlowneWeselne.id,
      name: "Mięsa",
      selectionMode: "CHOOSE_X_FROM_Y",
      selectionCount: 1,
      sortOrder: 1,
    },
  });

  const sekcjaPrzystawki = await prisma.section.upsert({
    where: { id: "sec-weselna-przystawki" },
    update: {},
    create: {
      id: "sec-weselna-przystawki",
      packageId: pakietDaniaGlowneWeselne.id,
      name: "Przystawki",
      selectionMode: "CHOOSE_X_FROM_Y",
      selectionCount: 2,
      sortOrder: 2,
    },
  });

  // Pozycje - Zupy
  const zupy = ["Rosół z makaronem", "Krem z pomidorów", "Żurek staropolski"];
  for (let i = 0; i < zupy.length; i++) {
    await prisma.menuItem.upsert({
      where: { id: `mi-zupy-${i}` },
      update: {},
      create: { id: `mi-zupy-${i}`, sectionId: sekcjaZupy.id, name: zupy[i], sortOrder: i },
    });
  }

  // Pozycje - Mięsa
  const miesa = [
    "Polędwiczka wieprzowa z parmezanową panierką",
    "Wolno gotowana pierś z kurczaka supreme",
    "Grillowany łosoś na risotto",
  ];
  for (let i = 0; i < miesa.length; i++) {
    await prisma.menuItem.upsert({
      where: { id: `mi-miesa-${i}` },
      update: {},
      create: { id: `mi-miesa-${i}`, sectionId: sekcjaMiesa.id, name: miesa[i], sortOrder: i },
    });
  }

  // Pozycje - Przystawki
  const przystawki = [
    "Tatar z łososia",
    "Carpaccio z buraka",
    "Pasztet z gęsi",
    "Roladki z szynki parmeńskiej",
    "Bruschetta z pomidorami",
  ];
  for (let i = 0; i < przystawki.length; i++) {
    await prisma.menuItem.upsert({
      where: { id: `mi-przyst-${i}` },
      update: {},
      create: {
        id: `mi-przyst-${i}`,
        sectionId: sekcjaPrzystawki.id,
        name: przystawki[i],
        sortOrder: i,
      },
    });
  }

  // Pakiet konferencyjny - Przerwy kawowe
  await prisma.package.upsert({
    where: { id: "pkg-konf-kawa" },
    update: {},
    create: {
      id: "pkg-konf-kawa",
      offerTypeId: konferencyjna.id,
      name: "Przerwy Kawowe",
      price: 45,
      sortOrder: 0,
    },
  });

  const sekcjaKawaStd = await prisma.section.upsert({
    where: { id: "sec-konf-kawa-std" },
    update: {},
    create: {
      id: "sec-konf-kawa-std",
      packageId: "pkg-konf-kawa",
      name: "Standard",
      selectionMode: "ALL_INCLUDED",
      sortOrder: 0,
    },
  });

  const kawaItems = ["Kawa", "Wybór herbat", "Woda z cytryną", "Soki owocowe", "Ciasteczka"];
  for (let i = 0; i < kawaItems.length; i++) {
    await prisma.menuItem.upsert({
      where: { id: `mi-kawa-${i}` },
      update: {},
      create: {
        id: `mi-kawa-${i}`,
        sectionId: sekcjaKawaStd.id,
        name: kawaItems[i],
        sortOrder: i,
      },
    });
  }

  console.log("Seed completed!");
  console.log("Login: anna@hotel.pl / test1234 (PRACOWNIK)");
  console.log("Login: kierownik@hotel.pl / test1234 (KIEROWNIK)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
