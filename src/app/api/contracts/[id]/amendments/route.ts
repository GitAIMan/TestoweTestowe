import { NextRequest, NextResponse } from "next/server";
import Decimal from "decimal.js";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeAmendmentDiff, type DiffItem } from "@/lib/amendment-diff";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }
  const { id } = await params;
  const amendments = await prisma.contractAmendment.findMany({
    where: { contractId: id },
    orderBy: { number: "asc" },
    include: { createdBy: { select: { firstName: true, lastName: true } } },
  });
  return NextResponse.json(amendments);
}

export async function POST(
  _req: NextRequest,
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
      offer: {
        include: {
          offerItems: {
            orderBy: [{ day: "asc" }, { sortOrder: "asc" }],
            include: { hall: { select: { name: true } } },
          },
        },
      },
      amendments: { orderBy: { number: "desc" }, take: 1 },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Umowa nie znaleziona" }, { status: 404 });
  }

  if (!contract.signedAt) {
    return NextResponse.json(
      { error: "Aneks można utworzyć tylko po podpisaniu umowy" },
      { status: 400 }
    );
  }

  const prevAmendment = contract.amendments[0];
  const nextNumber = prevAmendment ? prevAmendment.number + 1 : 1;
  const totalBefore = prevAmendment
    ? prevAmendment.totalAfter
    : (contract.totalAtSigning ?? contract.offer.totalPrice);
  const totalAfter = contract.offer.totalPrice;

  // Walidacja: czy są faktyczne zmiany merytoryczne vs poprzedni snapshot?
  const baselineSnapshots = await prisma.contractItemSnapshot.findMany({
    where: {
      contractId: id,
      amendmentId: prevAmendment ? prevAmendment.id : null,
    },
  });

  const baselineItems: DiffItem[] = baselineSnapshots.map((s) => ({
    name: s.name,
    quantity: s.quantity,
    unitPrice: s.unitPrice.toString(),
    vatRate: s.vatRate,
    sourceType: s.sourceType,
    offerItemId: s.offerItemId,
    timeFrom: s.timeFrom,
    timeTo: s.timeTo,
    hallName: s.hallName,
    day: s.day,
  }));

  const currentItems: DiffItem[] = contract.offer.offerItems.map((it) => ({
    name: it.name,
    quantity: it.quantity,
    unitPrice: it.unitPrice.toString(),
    vatRate: it.vatRate,
    sourceType: it.sourceType,
    offerItemId: it.id,
    timeFrom: it.timeFrom,
    timeTo: it.timeTo,
    hallName: it.hall?.name || null,
    day: it.day,
  }));

  const diff = computeAmendmentDiff(baselineItems, currentItems);
  const totalsEqual = new Decimal(totalBefore.toString()).equals(
    new Decimal(totalAfter.toString())
  );
  const noItemChanges =
    diff.added.length === 0 &&
    diff.removed.length === 0 &&
    diff.changed.length === 0;

  if (noItemChanges && totalsEqual) {
    // Nic się nie zmieniło — zgaś flagę (żeby banner zniknął) i odmów utworzenia
    await prisma.contract.update({
      where: { id },
      data: { needsAmendment: false },
    });
    return NextResponse.json(
      { error: "Brak zmian merytorycznych — aneks nie jest potrzebny" },
      { status: 400 }
    );
  }

  const amendment = await prisma.$transaction(async (tx) => {
    const am = await tx.contractAmendment.create({
      data: {
        contractId: id,
        number: nextNumber,
        totalBefore,
        totalAfter,
        createdById: session.user?.id,
      },
    });

    if (contract.offer.offerItems.length > 0) {
      await tx.contractItemSnapshot.createMany({
        data: contract.offer.offerItems.map((it) => ({
          contractId: id,
          amendmentId: am.id,
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

    return am;
  });

  return NextResponse.json(amendment, { status: 201 });
}
