import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  const changes = await prisma.clientSelectionChange.findMany({
    where: { agendaId: id },
    orderBy: { createdAt: "desc" },
    include: {
      respondedBy: { select: { firstName: true, lastName: true } },
    },
  });

  // Dociągamy nazwy pozycji menu żeby UI mogło pokazać "Było: X → Chce: Y"
  const allMenuItemIds = new Set<string>();
  for (const c of changes) {
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

  // Dociągamy info o sekcji i pozycji oferty (dzień, pakiet)
  const sectionIds = Array.from(new Set(changes.map((c) => c.sectionId)));
  const sections = sectionIds.length
    ? await prisma.section.findMany({
        where: { id: { in: sectionIds } },
        select: {
          id: true,
          name: true,
          selectionMode: true,
          selectionCount: true,
        },
      })
    : [];
  const sectionMap = new Map(sections.map((s) => [s.id, s]));

  const offerItemIds = Array.from(new Set(changes.map((c) => c.offerItemId)));
  const offerItems = offerItemIds.length
    ? await prisma.offerItem.findMany({
        where: { id: { in: offerItemIds } },
        select: { id: true, name: true, day: true, date: true },
      })
    : [];
  const offerItemMap = new Map(offerItems.map((i) => [i.id, i]));

  const enriched = changes.map((c) => {
    const offerItem = offerItemMap.get(c.offerItemId);
    const section = sectionMap.get(c.sectionId);
    return {
      id: c.id,
      agendaId: c.agendaId,
      offerItemId: c.offerItemId,
      sectionId: c.sectionId,
      proposedMenuItemIds: c.proposedMenuItemIds,
      previousMenuItemIds: c.previousMenuItemIds,
      proposedNames: c.proposedMenuItemIds.map((id) => menuMap.get(id) || "?"),
      previousNames: c.previousMenuItemIds.map((id) => menuMap.get(id) || "?"),
      createdAt: c.createdAt.toISOString(),
      responseStatus: c.responseStatus,
      responseReason: c.responseReason,
      responsePhone: c.responsePhone,
      respondedAt: c.respondedAt?.toISOString() || null,
      respondedBy: c.respondedBy,
      sectionName: section?.name || "?",
      sectionMode: section?.selectionMode || "ALL_INCLUDED",
      sectionCount: section?.selectionCount || null,
      offerItemName: offerItem?.name || "?",
      day: offerItem?.day || 1,
      date: offerItem?.date?.toISOString() || null,
    };
  });

  return NextResponse.json(enriched);
}
