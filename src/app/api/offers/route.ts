import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import Decimal from "decimal.js";

const offerRoomSchema = z.object({
  roomId: z.string().min(1),
  quantity: z.number().int().min(1),
  nights: z.number().int().min(1),
  pricePerNight: z.string(),
  notes: z.string().optional(),
});

const offerHallSchema = z.object({
  hallId: z.string().min(1),
  date: z.string(), // ISO date string
  pricePerDay: z.string(),
  notes: z.string().optional(),
});

const offerPackageSchema = z.object({
  packageId: z.string().min(1),
  priceSnapshot: z.string().nullable().optional(),
  notes: z.string().optional(),
});

const createOfferSchema = z.object({
  // Dane klienta
  clientName: z.string().min(1, "Imię i nazwisko klienta jest wymagane"),
  clientEmail: z.union([z.string().email("Nieprawidłowy email"), z.literal("")]).optional().default(""),
  clientPhone: z.string().optional().default(""),
  clientCompany: z.string().optional().default(""),
  // Dane wydarzenia
  eventName: z.string().optional().default(""),
  eventDateFrom: z.string().min(1, "Data rozpoczęcia jest wymagana"),
  eventDateTo: z.string().min(1, "Data zakończenia jest wymagana"),
  adultsCount: z.number().int().min(1, "Minimum 1 osoba dorosła"),
  childrenCount: z.number().int().min(0).default(0),
  // Notatki
  notes: z.string().optional().default(""),
  // Klocki
  rooms: z.array(offerRoomSchema).default([]),
  halls: z.array(offerHallSchema).default([]),
  packages: z.array(offerPackageSchema).default([]),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.clientName = { contains: search, mode: "insensitive" };
  }

  const offers = await prisma.offer.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: { firstName: true, lastName: true },
      },
    },
  });

  return NextResponse.json(offers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createOfferSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Błąd walidacji", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Oblicz totalPrice z decimal.js
  let total = new Decimal(0);

  for (const room of data.rooms) {
    total = total.add(
      new Decimal(room.pricePerNight).mul(room.quantity).mul(room.nights)
    );
  }

  for (const hall of data.halls) {
    total = total.add(new Decimal(hall.pricePerDay));
  }

  const personCount = data.adultsCount + data.childrenCount;
  for (const pkg of data.packages) {
    if (pkg.priceSnapshot) {
      total = total.add(new Decimal(pkg.priceSnapshot).mul(personCount));
    }
  }

  // Transakcja: tworzymy ofertę + klocki + rezerwacje sal
  const offer = await prisma.$transaction(async (tx) => {
    const newOffer = await tx.offer.create({
      data: {
        createdById: session.user.id,
        clientName: data.clientName,
        clientEmail: data.clientEmail || null,
        clientPhone: data.clientPhone || null,
        clientCompany: data.clientCompany || null,
        eventName: data.eventName || null,
        eventDateFrom: new Date(data.eventDateFrom),
        eventDateTo: new Date(data.eventDateTo),
        adultsCount: data.adultsCount,
        childrenCount: data.childrenCount,
        totalPrice: total.toFixed(2),
        notes: data.notes || null,
        status: "ROBOCZA",
      },
    });

    // Klocki: pokoje
    if (data.rooms.length > 0) {
      await tx.offerRoom.createMany({
        data: data.rooms.map((r) => ({
          offerId: newOffer.id,
          roomId: r.roomId,
          quantity: r.quantity,
          nights: r.nights,
          pricePerNight: r.pricePerNight,
          notes: r.notes || null,
        })),
      });
    }

    // Klocki: sale + rezerwacje
    for (const hall of data.halls) {
      await tx.offerHall.create({
        data: {
          offerId: newOffer.id,
          hallId: hall.hallId,
          date: new Date(hall.date),
          pricePerDay: hall.pricePerDay,
          notes: hall.notes || null,
        },
      });

      await tx.hallReservation.create({
        data: {
          hallId: hall.hallId,
          offerId: newOffer.id,
          date: new Date(hall.date),
          status: "ZAREZERWOWANA",
        },
      });
    }

    // Klocki: pakiety
    if (data.packages.length > 0) {
      await tx.offerPackage.createMany({
        data: data.packages.map((p, i) => ({
          offerId: newOffer.id,
          packageId: p.packageId,
          priceSnapshot: p.priceSnapshot || null,
          notes: p.notes || null,
          sortOrder: i,
        })),
      });
    }

    // Generuj OfferItems z pozycji oferty
    const eventFrom = new Date(data.eventDateFrom);
    const eventTo = new Date(data.eventDateTo);
    const days: Date[] = [];
    for (let d = new Date(eventFrom); d <= eventTo; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    let sortCounter = 0;

    // Sale → OfferItems
    for (const hall of data.halls) {
      const hallDate = new Date(hall.date);
      const dayIndex = days.findIndex(
        (d) => d.toISOString().split("T")[0] === hallDate.toISOString().split("T")[0]
      );
      const hallInfo = await tx.hall.findUnique({ where: { id: hall.hallId } });
      await tx.offerItem.create({
        data: {
          offerId: newOffer.id,
          day: dayIndex + 1,
          date: hallDate,
          sortOrder: sortCounter++,
          name: `Wynajem sali: ${hallInfo?.name || "Sala"}`,
          quantity: 1,
          unitPrice: hall.pricePerDay,
          vatRate: 23,
          sourceType: "HALL",
          sourceId: hall.hallId,
        },
      });
    }

    // Pokoje → OfferItems (dzień 1)
    for (const room of data.rooms) {
      const roomInfo = await tx.room.findUnique({ where: { id: room.roomId } });
      await tx.offerItem.create({
        data: {
          offerId: newOffer.id,
          day: 1,
          date: eventFrom,
          sortOrder: sortCounter++,
          name: `Nocleg: ${roomInfo?.name || "Pokój"} (${room.nights} nocy)`,
          quantity: room.quantity,
          unitPrice: new Decimal(room.pricePerNight).mul(room.nights),
          vatRate: 8,
          sourceType: "ROOM",
          sourceId: room.roomId,
        },
      });
    }

    // Pakiety → OfferItems (dzień 1)
    for (const pkg of data.packages) {
      const pkgInfo = await tx.package.findUnique({
        where: { id: pkg.packageId },
        include: { offerType: { select: { name: true } } },
      });
      await tx.offerItem.create({
        data: {
          offerId: newOffer.id,
          day: 1,
          date: eventFrom,
          sortOrder: sortCounter++,
          name: `${pkgInfo?.name || "Pakiet"} (${pkgInfo?.offerType?.name || ""})`,
          quantity: 1,
          unitPrice: pkg.priceSnapshot || "0",
          vatRate: 8,
          sourceType: "PACKAGE",
          sourceId: pkg.packageId,
        },
      });
    }

    return newOffer;
  });

  return NextResponse.json(offer, { status: 201 });
}
