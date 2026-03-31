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
