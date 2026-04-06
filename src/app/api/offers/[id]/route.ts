import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { firstName: true, lastName: true },
      },
      offerRooms: {
        include: {
          room: { select: { name: true, type: true } },
        },
      },
      offerHalls: {
        include: {
          hall: { select: { name: true, capacity: true } },
        },
        orderBy: { date: "asc" },
      },
      offerPackages: {
        include: {
          package: {
            include: {
              offerType: { select: { name: true } },
              sections: {
                include: { items: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!offer) {
    return NextResponse.json({ error: "Oferta nie znaleziona" }, { status: 404 });
  }

  return NextResponse.json(offer);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const offer = await prisma.offer.update({
    where: { id },
    data: {
      ...(body.notes !== undefined && { notes: body.notes || null }),
    },
  });

  return NextResponse.json(offer);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  // Usuń powiązane dane w transakcji
  await prisma.$transaction(async (tx) => {
    // Usuń agendy i ich powiązania
    const agendas = await tx.agenda.findMany({ where: { offerId: id } });
    for (const agenda of agendas) {
      const blocks = await tx.agendaBlock.findMany({ where: { agendaId: agenda.id } });
      for (const block of blocks) {
        await tx.agendaBlockEquipment.deleteMany({ where: { agendaBlockId: block.id } });
        await tx.agendaBlockPackage.deleteMany({ where: { agendaBlockId: block.id } });
      }
      await tx.agendaBlock.deleteMany({ where: { agendaId: agenda.id } });
      await tx.agendaToken.deleteMany({ where: { agendaId: agenda.id } });
      // Selections nie mają FK, ale czyścimy po agendaId
      const selections = await tx.agendaSectionSelection.findMany({ where: { agendaId: agenda.id } });
      for (const sel of selections) {
        await tx.agendaItemSelection.deleteMany({ where: { agendaSectionSelectionId: sel.id } });
      }
      await tx.agendaSectionSelection.deleteMany({ where: { agendaId: agenda.id } });
    }
    await tx.agenda.deleteMany({ where: { offerId: id } });

    // Usuń umowy
    await tx.contract.deleteMany({ where: { offerId: id } });

    // Usuń powiązania oferty
    await tx.offerPackage.deleteMany({ where: { offerId: id } });
    await tx.offerRoom.deleteMany({ where: { offerId: id } });
    await tx.offerHall.deleteMany({ where: { offerId: id } });

    // Usuń ofertę
    await tx.offer.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
