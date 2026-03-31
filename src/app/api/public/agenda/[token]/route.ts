import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Znajdź token
  const agendaToken = await prisma.agendaToken.findUnique({
    where: { token },
  });

  if (!agendaToken || agendaToken.isRevoked) {
    return NextResponse.json({ error: "Nieprawidłowy lub cofnięty link" }, { status: 404 });
  }

  if (agendaToken.expiresAt && new Date() > agendaToken.expiresAt) {
    return NextResponse.json({ error: "Link wygasł" }, { status: 410 });
  }

  // Aktualizuj lastAccessedAt
  await prisma.agendaToken.update({
    where: { id: agendaToken.id },
    data: { lastAccessedAt: new Date() },
  });

  // Pobierz agendę z blokami i pakietami
  const agenda = await prisma.agenda.findUnique({
    where: { id: agendaToken.agendaId },
    include: {
      offer: {
        select: {
          clientName: true,
          eventName: true,
          eventDateFrom: true,
          eventDateTo: true,
          adultsCount: true,
          childrenCount: true,
          offerPackages: {
            include: {
              package: {
                include: {
                  offerType: { select: { name: true } },
                  sections: {
                    where: { isActive: true },
                    include: {
                      items: {
                        where: { isActive: true },
                        orderBy: { sortOrder: "asc" },
                      },
                    },
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      blocks: {
        orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
        include: {
          hall: { select: { name: true } },
          blockPackages: true,
          equipment: true,
        },
      },
    },
  });

  if (!agenda) {
    return NextResponse.json({ error: "Agenda nie znaleziona" }, { status: 404 });
  }

  // Pobierz wybory klienta
  const selections = await prisma.agendaSectionSelection.findMany({
    where: { agendaId: agenda.id },
    include: {
      items: {
        select: { menuItemId: true },
      },
    },
  });

  // Sprawdź blokadę
  const settings = await prisma.settings.findFirst();
  const lockDays = settings?.agendaLockDaysBefore ?? 14;
  const eventDate = new Date(agenda.offer.eventDateFrom);
  const lockDate = new Date(eventDate);
  lockDate.setDate(lockDate.getDate() - lockDays);
  const isLocked = agenda.isLocked || new Date() >= lockDate;

  // Pobierz ustawienia hotelu dla brandingu
  const hotel = settings ? {
    hotelName: settings.hotelName,
    logoUrl: settings.logoUrl,
    primaryColor: settings.primaryColor,
  } : null;

  return NextResponse.json({
    agenda,
    selections,
    isLocked,
    tokenType: agendaToken.type,
    hotel,
  });
}
