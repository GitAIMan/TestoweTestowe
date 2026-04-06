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

  const items = await prisma.offerItem.findMany({
    where: { offerId: id },
    orderBy: [{ day: "asc" }, { sortOrder: "asc" }],
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

  // Przelicz totalPrice (pakiety × osoby)
  const offerData = await prisma.offer.findUnique({
    where: { id },
    select: { adultsCount: true, childrenCount: true },
  });
  const personCount = (offerData?.adultsCount || 0) + (offerData?.childrenCount || 0);

  const allItems = await prisma.offerItem.findMany({
    where: { offerId: id },
  });

  const total = allItems.reduce((sum, item) => {
    const mul = item.sourceType === "PACKAGE" ? personCount : 1;
    const brutto = Number(item.unitPrice) * item.quantity * mul * (1 + item.vatRate / 100);
    return sum + brutto;
  }, 0);

  await prisma.offer.update({
    where: { id },
    data: { totalPrice: total.toFixed(2) },
  });

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

  const url = new URL(req.url);
  const itemId = url.searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "Brak itemId" }, { status: 400 });
  }

  await prisma.offerItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
}
