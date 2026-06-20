import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeClientLockDate, DEFAULT_LOCK_DAYS_BEFORE } from "@/lib/agenda-lock";

interface SelectionInput {
  sectionId: string;
  offerItemId: string | null;
  menuItemIds: string[];
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const agendaToken = await prisma.agendaToken.findUnique({
    where: { token },
  });

  if (!agendaToken || agendaToken.isRevoked || agendaToken.type !== "KLIENT_AGENDA") {
    return NextResponse.json({ error: "Nieprawidłowy link" }, { status: 404 });
  }

  if (agendaToken.expiresAt && new Date() > agendaToken.expiresAt) {
    return NextResponse.json({ error: "Link wygasł" }, { status: 410 });
  }

  const agenda = await prisma.agenda.findUnique({
    where: { id: agendaToken.agendaId },
    include: {
      offer: { select: { eventDateFrom: true, clientName: true, eventName: true, id: true } },
    },
  });

  if (!agenda) {
    return NextResponse.json({ error: "Agenda nie znaleziona" }, { status: 404 });
  }

  // Agenda FINALNA — klient nie może już niczego zmieniać (nawet propozycji)
  if (agenda.type === "FINALNA") {
    return NextResponse.json(
      { error: "Agenda została sfinalizowana — zmiany niedostępne" },
      { status: 403 }
    );
  }

  const settings = await prisma.settings.findFirst();
  const lockDays = settings?.agendaLockDaysBefore ?? DEFAULT_LOCK_DAYS_BEFORE;
  const lockDate = computeClientLockDate(agenda.offer.eventDateFrom, lockDays);

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

  // Pobierz aktualne wybory klienta (do porównania: gdzie faktycznie zmienia?)
  const currentSelections = await prisma.agendaSectionSelection.findMany({
    where: { agendaId: agenda.id },
    include: { items: { select: { menuItemId: true } } },
  });
  const currentMap = new Map<string, Set<string>>();
  for (const s of currentSelections) {
    const key = `${s.offerItemId || "null"}:${s.sectionId}`;
    currentMap.set(key, new Set(s.items.map((i) => i.menuItemId)));
  }

  // Pobierz pending propozycje (żeby porównywać też z nimi — klient może zmienić 2 razy przed akceptacją)
  const pendingChanges = await prisma.clientSelectionChange.findMany({
    where: { agendaId: agenda.id, responseStatus: null },
  });
  const pendingMap = new Map<string, { id: string; proposed: Set<string> }>();
  for (const p of pendingChanges) {
    if (!p.offerItemId) continue;
    pendingMap.set(`${p.offerItemId}:${p.sectionId}`, {
      id: p.id,
      proposed: new Set(p.proposedMenuItemIds),
    });
  }

  let createdCount = 0;
  let updatedCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const sel of selections) {
      if (!sel.offerItemId) continue; // legacy — ignoruj
      const key = `${sel.offerItemId}:${sel.sectionId}`;
      const currentSet = currentMap.get(key) || new Set<string>();
      const proposedSet = new Set(sel.menuItemIds);

      // Porównaj z AKTUALNYM stanem wyborów (zaakceptowanych)
      const sameAsCurrent = setsEqual(currentSet, proposedSet);
      if (sameAsCurrent) {
        // Klient wrócił do poprzedniego wyboru → usuń pending propozycję jeśli istnieje
        const pending = pendingMap.get(key);
        if (pending) {
          await tx.clientSelectionChange.delete({ where: { id: pending.id } });
        }
        continue;
      }

      const pending = pendingMap.get(key);
      if (pending) {
        // Aktualizuj istniejącą pending propozycję
        const sameAsPending = setsEqual(pending.proposed, proposedSet);
        if (sameAsPending) continue;
        await tx.clientSelectionChange.update({
          where: { id: pending.id },
          data: {
            proposedMenuItemIds: Array.from(proposedSet),
            previousMenuItemIds: Array.from(currentSet),
            createdAt: new Date(),
          },
        });
        updatedCount++;
      } else {
        // Nowa propozycja
        await tx.clientSelectionChange.create({
          data: {
            agendaId: agenda.id,
            offerItemId: sel.offerItemId,
            sectionId: sel.sectionId,
            proposedMenuItemIds: Array.from(proposedSet),
            previousMenuItemIds: Array.from(currentSet),
          },
        });
        createdCount++;
      }
    }

    if (createdCount + updatedCount > 0) {
      await tx.notification.create({
        data: {
          type: "KLIENT_ZMIANA_WYBORU",
          title: "Klient proponuje zmianę wyborów",
          message: `${agenda.offer.clientName} zaproponował(a) ${createdCount + updatedCount} zmian(y) w agendzie${
            agenda.offer.eventName ? ` "${agenda.offer.eventName}"` : ""
          } — czeka na akceptację.`,
          metadata: {
            agendaId: agenda.id,
            offerId: agenda.offerId,
            clientName: agenda.offer.clientName,
          },
        },
      });

      // Odśwież updatedAt agendy — banner u klienta
      await tx.agenda.update({
        where: { id: agenda.id },
        data: { updatedAt: new Date() },
      });
    }
  });

  return NextResponse.json({
    ok: true,
    created: createdCount,
    updated: updatedCount,
  });
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}
