import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const updateContractSchema = z.object({
  clientFullName: z.string().min(1).optional(),
  clientAddress: z.string().optional(),
  clientNip: z.string().optional(),
  clientPesel: z.string().optional(),
  advanceAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  advanceDueDate: z.string().optional().nullable(),
  paymentTerms: z.string().optional(),
  specialConditions: z.string().optional(),
  signedAt: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      offer: {
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          offerRooms: {
            include: { room: { select: { name: true, type: true } } },
          },
          offerHalls: {
            include: { hall: { select: { name: true, capacity: true } } },
            orderBy: { date: "asc" },
          },
          offerPackages: {
            include: {
              package: {
                include: {
                  offerType: { select: { name: true } },
                  sections: {
                    include: { items: { select: { name: true } } },
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Umowa nie znaleziona" }, { status: 404 });
  }

  return NextResponse.json(contract);
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
  const parsed = updateContractSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Błąd walidacji" }, { status: 400 });
  }

  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Umowa nie znaleziona" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.advanceDueDate) {
    updateData.advanceDueDate = new Date(parsed.data.advanceDueDate);
  }

  // Wykryj przejście niepodpisana -> podpisana (snapshot pozycji + kwoty)
  const isSigningNow =
    parsed.data.signedAt !== undefined &&
    parsed.data.signedAt !== null &&
    parsed.data.signedAt !== "" &&
    !existing.signedAt;

  if (parsed.data.signedAt) {
    updateData.signedAt = new Date(parsed.data.signedAt);
  } else if (parsed.data.signedAt === null) {
    updateData.signedAt = null;
  }

  if (isSigningNow) {
    // Dociągnij aktualne offerItems + kwotę
    const offer = await prisma.offer.findUnique({
      where: { id: existing.offerId },
      include: {
        offerItems: {
          orderBy: [{ day: "asc" }, { sortOrder: "asc" }],
          include: { hall: { select: { name: true } } },
        },
      },
    });

    if (!offer) {
      return NextResponse.json({ error: "Oferta nie znaleziona" }, { status: 404 });
    }

    updateData.totalAtSigning = offer.totalPrice;

    await prisma.$transaction(async (tx) => {
      // Skasuj ewentualne istniejące snapshoty bazowe (amendmentId=null) — bezpieczeństwo
      await tx.contractItemSnapshot.deleteMany({
        where: { contractId: id, amendmentId: null },
      });
      // Utwórz świeże snapshoty
      if (offer.offerItems.length > 0) {
        await tx.contractItemSnapshot.createMany({
          data: offer.offerItems.map((it) => ({
            contractId: id,
            amendmentId: null,
            offerItemId: it.id,
            day: it.day,
            date: it.date,
            sortOrder: it.sortOrder,
            name: it.name,
            description: it.description,
            timeFrom: it.timeFrom,
            timeTo: it.timeTo,
            hallName: it.hall?.name || null,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            vatRate: it.vatRate,
            sourceType: it.sourceType,
            sourceId: it.sourceId,
          })),
        });
      }
      await tx.contract.update({ where: { id }, data: updateData });
    });

    const contract = await prisma.contract.findUnique({ where: { id } });
    return NextResponse.json(contract);
  }

  const contract = await prisma.contract.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(contract);
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

  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) {
    return NextResponse.json({ error: "Umowa nie znaleziona" }, { status: 404 });
  }

  const agenda = await prisma.agenda.findFirst({ where: { offerId: contract.offerId } });
  if (agenda) {
    return NextResponse.json(
      { error: "Najpierw usuń agendę powiązaną z tą ofertą" },
      { status: 400 }
    );
  }

  await prisma.contract.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
