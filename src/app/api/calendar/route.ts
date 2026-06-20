import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Reservation {
  hallId: string;
  hallName: string;
  capacity: number;
  offerId: string;
  offerStatus: string;
  clientName: string;
  clientCompany: string | null;
  eventName: string | null;
  eventDateFrom: string;
  eventDateTo: string;
  adultsCount: number;
  childrenCount: number;
  timeFrom: string | null;
  timeTo: string | null;
}

interface DayData {
  date: string;
  reservations: Reservation[];
  freeHalls: Array<{ id: string; name: string; capacity: number }>;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const monthParam = new URL(req.url).searchParams.get("month");
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) {
    return NextResponse.json(
      { error: "Parametr 'month' w formacie YYYY-MM jest wymagany" },
      { status: 400 }
    );
  }

  const [yearStr, monthStr] = monthParam.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  // Zakres miesiąca (pierwszy dzień 00:00 do ostatniego 23:59)
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // Wszystkie sale aktywne
  const allHalls = await prisma.hall.findMany({
    where: { isActive: true },
    select: { id: true, name: true, capacity: true },
  });

  // Rezerwacje z potwierdzonymi ofertami (ZAAKCEPTOWANA + podpisana umowa)
  const reservations = await prisma.hallReservation.findMany({
    where: {
      date: { gte: monthStart, lte: monthEnd },
      offer: {
        status: "ZAAKCEPTOWANA",
        contracts: { some: { signedAt: { not: null } } },
      },
    },
    include: {
      hall: { select: { id: true, name: true, capacity: true } },
      offer: {
        select: {
          id: true,
          status: true,
          clientName: true,
          clientCompany: true,
          eventName: true,
          eventDateFrom: true,
          eventDateTo: true,
          adultsCount: true,
          childrenCount: true,
          offerItems: {
            where: { sourceType: "HALL" },
            select: {
              hallId: true,
              date: true,
              timeFrom: true,
              timeTo: true,
            },
          },
        },
      },
    },
  });

  // Pogrupuj po dacie (YYYY-MM-DD)
  const daysMap = new Map<string, Reservation[]>();

  for (const r of reservations) {
    if (!r.offer) continue;
    const dateKey = r.date.toISOString().split("T")[0];

    // Znajdź godziny z OfferItem tej samej sali i dnia (jeśli są)
    const matchingItem = r.offer.offerItems.find(
      (it) =>
        it.hallId === r.hallId &&
        it.date &&
        it.date.toISOString().split("T")[0] === dateKey
    );

    const entry: Reservation = {
      hallId: r.hall.id,
      hallName: r.hall.name,
      capacity: r.hall.capacity,
      offerId: r.offer.id,
      offerStatus: r.offer.status,
      clientName: r.offer.clientName,
      clientCompany: r.offer.clientCompany,
      eventName: r.offer.eventName,
      eventDateFrom: r.offer.eventDateFrom.toISOString(),
      eventDateTo: r.offer.eventDateTo.toISOString(),
      adultsCount: r.offer.adultsCount,
      childrenCount: r.offer.childrenCount,
      timeFrom: matchingItem?.timeFrom || null,
      timeTo: matchingItem?.timeTo || null,
    };

    if (!daysMap.has(dateKey)) daysMap.set(dateKey, []);
    daysMap.get(dateKey)!.push(entry);
  }

  // Zbuduj listę dni — każdy dzień miesiąca (nawet puste)
  const days: DayData[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${yearStr}-${monthStr}-${String(d).padStart(2, "0")}`;
    const dayReservations = daysMap.get(dateStr) || [];
    const occupiedHallIds = new Set(dayReservations.map((r) => r.hallId));
    const freeHalls = allHalls.filter((h) => !occupiedHallIds.has(h.id));

    days.push({
      date: dateStr,
      reservations: dayReservations,
      freeHalls,
    });
  }

  return NextResponse.json({ month: monthParam, days });
}
