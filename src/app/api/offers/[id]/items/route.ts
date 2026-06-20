import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Decimal from "decimal.js";

async function touchAgendas(offerId: string) {
  await prisma.agenda.updateMany({
    where: { offerId },
    data: { updatedAt: new Date() },
  });
}

async function touchOfferChanged(offerId: string, materialChange: boolean) {
  await prisma.offer.update({
    where: { id: offerId },
    data: { lastItemsChangedAt: new Date() },
  });
  // Flagę aneksu ustawiamy TYLKO gdy zmiana jest merytoryczna
  // (nie pusta/zerowa pozycja, nie samo przestawienie kolejności)
  if (materialChange) {
    await prisma.contract.updateMany({
      where: { offerId, signedAt: { not: null } },
      data: { needsAmendment: true },
    });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  const items = await prisma.offerItem.findMany({
    where: { offerId: id },
    orderBy: [{ day: "asc" }, { sortOrder: "asc" }],
    include: { hall: { select: { id: true, name: true } } },
  });

  return NextResponse.json(items);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const item = await prisma.offerItem.create({
    data: {
      offerId: id,
      day: body.day || 1,
      date: body.date ? new Date(body.date) : null,
      sortOrder: body.sortOrder || 0,
      name: body.name || "",
      description: body.description || null,
      timeFrom: body.timeFrom || null,
      timeTo: body.timeTo || null,
      hallId: body.hallId || null,
      quantity: body.quantity || 1,
      unitPrice: body.unitPrice || "0",
      vatRate: body.vatRate || 23,
      sourceType: body.sourceType || "CUSTOM",
      sourceId: body.sourceId || null,
    },
  });

  // Merytoryczna zmiana = pozycja z ceną > 0 albo pakiet (zawsze istotny)
  const unitPriceDec = new Decimal(item.unitPrice.toString());
  const materialChange =
    item.sourceType === "PACKAGE" || unitPriceDec.gt(0);

  await touchOfferChanged(id, materialChange);
  await touchAgendas(id);

  return NextResponse.json(item, { status: 201 });
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
  const items: Array<{
    id: string;
    day: number;
    sortOrder: number;
    name: string;
    description?: string;
    timeFrom?: string;
    timeTo?: string;
    hallId?: string;
    quantity: number;
    unitPrice: string;
    vatRate: number;
  }> = body.items;

  // Zapamiętaj poprzednią kwotę brutto i stan pozycji (dla wykrycia zmian)
  const prevOffer = await prisma.offer.findUnique({
    where: { id },
    select: { totalPrice: true },
  });
  const prevTotal = new Decimal(prevOffer?.totalPrice?.toString() ?? "0");

  const prevItems = await prisma.offerItem.findMany({
    where: { offerId: id },
    select: {
      id: true,
      day: true,
      sortOrder: true,
      name: true,
      description: true,
      timeFrom: true,
      timeTo: true,
      hallId: true,
      quantity: true,
      unitPrice: true,
      vatRate: true,
    },
  });
  const prevMap = new Map(prevItems.map((p) => [p.id, p]));

  // Wykryj czy są MERYTORYCZNE zmiany (bez sortOrder — drag&drop ≠ aneks)
  const hasMaterialChanges = items.some((item) => {
    const p = prevMap.get(item.id);
    if (!p) return true;
    return (
      p.day !== item.day ||
      p.name !== item.name ||
      (p.description || "") !== (item.description || "") ||
      (p.timeFrom || "") !== (item.timeFrom || "") ||
      (p.timeTo || "") !== (item.timeTo || "") ||
      (p.hallId || "") !== (item.hallId || "") ||
      p.quantity !== item.quantity ||
      !new Decimal(p.unitPrice.toString()).equals(new Decimal(item.unitPrice)) ||
      p.vatRate !== item.vatRate
    );
  });

  // Dla lastItemsChangedAt liczą się wszystkie zmiany (w tym sortOrder)
  const hasAnyChanges = items.some((item) => {
    const p = prevMap.get(item.id);
    if (!p) return true;
    return (
      p.sortOrder !== item.sortOrder || hasMaterialChanges
    );
  });

  // Batch update
  await prisma.$transaction(
    items.map((item) =>
      prisma.offerItem.update({
        where: { id: item.id },
        data: {
          day: item.day,
          sortOrder: item.sortOrder,
          name: item.name,
          description: item.description || null,
          timeFrom: item.timeFrom || null,
          timeTo: item.timeTo || null,
          hallId: item.hallId || null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          vatRate: item.vatRate,
        },
      })
    )
  );

  // Przelicz totalPrice (pakiety × osoby) — Decimal dla precyzji
  const offerData = await prisma.offer.findUnique({
    where: { id },
    select: { adultsCount: true, childrenCount: true },
  });
  const personCount = (offerData?.adultsCount || 0) + (offerData?.childrenCount || 0);

  const allItems = await prisma.offerItem.findMany({
    where: { offerId: id },
  });

  let total = new Decimal(0);
  for (const item of allItems) {
    const mul = item.sourceType === "PACKAGE" ? personCount : 1;
    const netto = new Decimal(item.unitPrice.toString()).mul(item.quantity).mul(mul);
    const brutto = netto.mul(new Decimal(1).add(new Decimal(item.vatRate).div(100)));
    total = total.add(brutto);
  }

  await prisma.offer.update({
    where: { id },
    data: {
      totalPrice: total.toFixed(2),
      ...(hasAnyChanges ? { lastItemsChangedAt: new Date() } : {}),
    },
  });

  // Flaga aneksu TYLKO przy merytorycznych zmianach (drag&drop nie liczy się)
  if (hasMaterialChanges) {
    await prisma.contract.updateMany({
      where: {
        offerId: id,
        signedAt: { not: null },
      },
      data: { needsAmendment: true },
    });
  }

  await touchAgendas(id);

  return NextResponse.json({ success: true, totalPrice: total.toFixed(2) });
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

  const url = new URL(req.url);
  const itemId = url.searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "Brak itemId" }, { status: 400 });
  }

  // Pobierz pozycję PRZED usunięciem — żeby wiedzieć czy była merytoryczna
  const itemToDelete = await prisma.offerItem.findUnique({
    where: { id: itemId },
    select: { unitPrice: true, sourceType: true },
  });

  await prisma.offerItem.delete({ where: { id: itemId } });

  // Merytoryczne usunięcie = miała cenę > 0 albo to pakiet
  const unitPriceDec = itemToDelete
    ? new Decimal(itemToDelete.unitPrice.toString())
    : new Decimal(0);
  const materialChange = itemToDelete
    ? itemToDelete.sourceType === "PACKAGE" || unitPriceDec.gt(0)
    : false;

  await touchOfferChanged(id, materialChange);
  await touchAgendas(id);

  return NextResponse.json({ success: true });
}
