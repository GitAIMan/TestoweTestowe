import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { error: "Parametry dateFrom i dateTo są wymagane" },
      { status: 400 }
    );
  }

  const halls = await prisma.hall.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }],
  });

  const reservations = await prisma.hallReservation.findMany({
    where: {
      date: {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      },
      status: "ZAREZERWOWANA",
    },
    select: { hallId: true, date: true },
  });

  const reservedMap = new Map<string, string[]>();
  for (const r of reservations) {
    const dates = reservedMap.get(r.hallId) || [];
    dates.push(r.date.toISOString().split("T")[0]);
    reservedMap.set(r.hallId, dates);
  }

  const result = halls.map((hall) => ({
    ...hall,
    reservedDates: reservedMap.get(hall.id) || [],
  }));

  return NextResponse.json(result);
}
