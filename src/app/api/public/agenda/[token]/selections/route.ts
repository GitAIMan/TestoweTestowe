import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface SelectionInput {
  sectionId: string;
  menuItemIds: string[];
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // Walidacja tokenu
  const agendaToken = await prisma.agendaToken.findUnique({
    where: { token },
  });

  if (!agendaToken || agendaToken.isRevoked || agendaToken.type !== "KLIENT_AGENDA") {
    return NextResponse.json({ error: "Nieprawidłowy link" }, { status: 404 });
  }

  if (agendaToken.expiresAt && new Date() > agendaToken.expiresAt) {
    return NextResponse.json({ error: "Link wygasł" }, { status: 410 });
  }

  // Sprawdź blokadę
  const agenda = await prisma.agenda.findUnique({
    where: { id: agendaToken.agendaId },
    include: {
      offer: { select: { eventDateFrom: true, clientName: true, eventName: true } },
    },
  });

  if (!agenda) {
    return NextResponse.json({ error: "Agenda nie znaleziona" }, { status: 404 });
  }

  const settings = await prisma.settings.findFirst();
  const lockDays = settings?.agendaLockDaysBefore ?? 14;
  const eventDate = new Date(agenda.offer.eventDateFrom);
  const lockDate = new Date(eventDate);
  lockDate.setDate(lockDate.getDate() - lockDays);

  if (agenda.isLocked || new Date() >= lockDate) {
    return NextResponse.json(
      { error: "Wybory są zamknięte — nie można już zmieniać" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const selections: SelectionInput[] = body.selections;

  if (!Array.isArray(selections)) {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  // Zapisz wybory w transakcji
  await prisma.$transaction(async (tx) => {
    for (const sel of selections) {
      // Upsert AgendaSectionSelection
      const existing = await tx.agendaSectionSelection.findUnique({
        where: {
          agendaId_sectionId: {
            agendaId: agenda.id,
            sectionId: sel.sectionId,
          },
        },
      });

      let sectionSelectionId: string;

      if (existing) {
        sectionSelectionId = existing.id;
        // Usuń stare wybory
        await tx.agendaItemSelection.deleteMany({
          where: { agendaSectionSelectionId: existing.id },
        });
        // Aktualizuj
        await tx.agendaSectionSelection.update({
          where: { id: existing.id },
          data: { completedAt: new Date() },
        });
      } else {
        const created = await tx.agendaSectionSelection.create({
          data: {
            agendaId: agenda.id,
            sectionId: sel.sectionId,
            completedAt: new Date(),
          },
        });
        sectionSelectionId = created.id;
      }

      // Dodaj nowe wybory
      if (sel.menuItemIds.length > 0) {
        await tx.agendaItemSelection.createMany({
          data: sel.menuItemIds.map((menuItemId) => ({
            agendaSectionSelectionId: sectionSelectionId,
            menuItemId,
          })),
        });
      }
    }

    // Utwórz powiadomienie
    await tx.notification.create({
      data: {
        type: "KLIENT_ZMIANA_WYBORU",
        title: "Klient zmienił wybory",
        message: `${agenda.offer.clientName} zmienił wybory w agendzie${agenda.offer.eventName ? ` "${agenda.offer.eventName}"` : ""}.`,
        metadata: {
          agendaId: agenda.id,
          offerId: agenda.offerId,
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}
