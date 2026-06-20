import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeClientLockDate, DEFAULT_LOCK_DAYS_BEFORE } from "@/lib/agenda-lock";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const agendaToken = await prisma.agendaToken.findUnique({
    where: { token },
  });

  if (!agendaToken || agendaToken.isRevoked) {
    return NextResponse.json({ error: "Nieprawidłowy lub cofnięty link" }, { status: 404 });
  }

  if (agendaToken.expiresAt && new Date() > agendaToken.expiresAt) {
    return NextResponse.json({ error: "Link wygasł" }, { status: 410 });
  }

  await prisma.agendaToken.update({
    where: { id: agendaToken.id },
    data: { lastAccessedAt: new Date() },
  });

  const agenda = await prisma.agenda.findUnique({
    where: { id: agendaToken.agendaId },
    include: {
      offer: {
        select: {
          id: true,
          clientName: true,
          eventName: true,
          eventDateFrom: true,
          eventDateTo: true,
          adultsCount: true,
          childrenCount: true,
          offerItems: {
            orderBy: [{ day: "asc" }, { sortOrder: "asc" }],
            include: {
              hall: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!agenda) {
    return NextResponse.json({ error: "Agenda nie znaleziona" }, { status: 404 });
  }

  // Dociągamy kompozycje pakietów używanych w items (sourceType=PACKAGE)
  const offerItems = agenda.offer.offerItems;
  const packageIds = Array.from(
    new Set(
      offerItems
        .filter((it) => it.sourceType === "PACKAGE" && it.sourceId)
        .map((it) => it.sourceId as string)
    )
  );

  const packageCompositions: Record<
    string,
    {
      packageName: string;
      offerTypeName: string;
      sections: Array<{
        id: string;
        name: string;
        selectionMode: string;
        selectionCount: number | null;
        items: Array<{ id: string; name: string }>;
      }>;
    }
  > = {};

  if (packageIds.length > 0) {
    const pkgs = await prisma.package.findMany({
      where: { id: { in: packageIds } },
      include: {
        offerType: { select: { name: true } },
        sections: {
          where: { isActive: true },
          include: {
            items: {
              where: { isActive: true },
              orderBy: { sortOrder: "asc" },
              select: { id: true, name: true },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    for (const p of pkgs) {
      packageCompositions[p.id] = {
        packageName: p.name,
        offerTypeName: p.offerType?.name || "",
        sections: p.sections.map((s) => ({
          id: s.id,
          name: s.name,
          selectionMode: s.selectionMode,
          selectionCount: s.selectionCount,
          items: s.items.map((it) => ({ id: it.id, name: it.name })),
        })),
      };
    }
  }

  const selections = await prisma.agendaSectionSelection.findMany({
    where: { agendaId: agenda.id },
    include: {
      items: { select: { menuItemId: true } },
    },
  });

  // Historia propozycji zmian klienta — z nazwami pozycji
  const selectionChanges = await prisma.clientSelectionChange.findMany({
    where: { agendaId: agenda.id },
    orderBy: { createdAt: "desc" },
    include: {
      respondedBy: { select: { firstName: true, lastName: true } },
    },
  });

  const allMenuItemIds = new Set<string>();
  for (const c of selectionChanges) {
    for (const id of c.proposedMenuItemIds) allMenuItemIds.add(id);
    for (const id of c.previousMenuItemIds) allMenuItemIds.add(id);
  }
  const menuItems = allMenuItemIds.size
    ? await prisma.menuItem.findMany({
        where: { id: { in: Array.from(allMenuItemIds) } },
        select: { id: true, name: true },
      })
    : [];
  const menuMap = new Map(menuItems.map((m) => [m.id, m.name]));

  const selectionChangesOut = selectionChanges.map((c) => ({
    id: c.id,
    offerItemId: c.offerItemId,
    sectionId: c.sectionId,
    proposedNames: c.proposedMenuItemIds.map((id) => menuMap.get(id) || "?"),
    previousNames: c.previousMenuItemIds.map((id) => menuMap.get(id) || "?"),
    createdAt: c.createdAt.toISOString(),
    responseStatus: c.responseStatus,
    responseReason: c.responseReason,
    responsePhone: c.responsePhone,
    respondedAt: c.respondedAt?.toISOString() || null,
    respondedBy: c.respondedBy,
  }));

  const settings = await prisma.settings.findFirst();
  const lockDays = settings?.agendaLockDaysBefore ?? DEFAULT_LOCK_DAYS_BEFORE;
  const lockDate = computeClientLockDate(agenda.offer.eventDateFrom, lockDays);
  const isLocked = agenda.isLocked || new Date() >= lockDate;

  const hotel = settings
    ? {
        hotelName: settings.hotelName,
        logoUrl: settings.logoUrl,
        primaryColor: settings.primaryColor,
      }
    : null;

  // Remap offerItems → items dla frontendów
  const { offerItems: _omit, ...offerRest } = agenda.offer;
  void _omit;
  const agendaOut = {
    ...agenda,
    offer: {
      ...offerRest,
      items: offerItems,
    },
  };

  return NextResponse.json({
    agenda: agendaOut,
    packageCompositions,
    selections,
    selectionChanges: selectionChangesOut,
    isLocked,
    tokenType: agendaToken.type,
    hotel,
    lastModifiedAt: agenda.updatedAt,
  });
}
