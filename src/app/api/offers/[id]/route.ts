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
