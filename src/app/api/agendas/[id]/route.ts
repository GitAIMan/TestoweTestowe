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

  const agenda = await prisma.agenda.findUnique({
    where: { id },
    include: {
      offer: {
        include: {
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
          offerHalls: {
            include: { hall: { select: { id: true, name: true } } },
          },
        },
      },
      createdBy: { select: { firstName: true, lastName: true } },
      blocks: {
        orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
        include: {
          hall: { select: { name: true, capacity: true } },
          blockPackages: true,
          equipment: true,
        },
      },
      tokens: {
        where: { isRevoked: false },
        select: { id: true, token: true, type: true, createdAt: true },
      },
    },
  });

  if (!agenda) {
    return NextResponse.json({ error: "Agenda nie znaleziona" }, { status: 404 });
  }

  // Pobierz wybory klienta
  const selections = await prisma.agendaSectionSelection.findMany({
    where: { agendaId: id },
    include: {
      section: { select: { name: true, selectionMode: true, selectionCount: true } },
      items: {
        include: { menuItem: { select: { name: true } } },
      },
    },
  });

  return NextResponse.json({ ...agenda, selections });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const agenda = await prisma.agenda.update({
    where: { id },
    data: { notes: body.notes ?? null },
  });

  return NextResponse.json(agenda);
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

  const agenda = await prisma.agenda.findUnique({ where: { id } });
  if (!agenda) {
    return NextResponse.json({ error: "Agenda nie znaleziona" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const blocks = await tx.agendaBlock.findMany({ where: { agendaId: id } });
    for (const block of blocks) {
      await tx.agendaBlockEquipment.deleteMany({ where: { agendaBlockId: block.id } });
      await tx.agendaBlockPackage.deleteMany({ where: { agendaBlockId: block.id } });
    }
    await tx.agendaBlock.deleteMany({ where: { agendaId: id } });
    await tx.agendaToken.deleteMany({ where: { agendaId: id } });

    const selections = await tx.agendaSectionSelection.findMany({ where: { agendaId: id } });
    for (const sel of selections) {
      await tx.agendaItemSelection.deleteMany({ where: { agendaSectionSelectionId: sel.id } });
    }
    await tx.agendaSectionSelection.deleteMany({ where: { agendaId: id } });

    await tx.agenda.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
