import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { OfferPdf } from "@/components/offers/offer-pdf";
import { createElement } from "react";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  const [offer, settings, offerItems] = await Promise.all([
    prisma.offer.findUnique({
      where: { id },
    }),
    prisma.settings.findFirst(),
    prisma.offerItem.findMany({
      where: { offerId: id },
      orderBy: [{ day: "asc" }, { sortOrder: "asc" }],
    }),
  ]);

  if (!offer) {
    return NextResponse.json({ error: "Oferta nie znaleziona" }, { status: 404 });
  }

  if (!settings) {
    return NextResponse.json({ error: "Brak ustawień hotelu" }, { status: 500 });
  }

  const serializedOffer = {
    clientName: offer.clientName,
    clientEmail: offer.clientEmail,
    clientPhone: offer.clientPhone,
    clientCompany: offer.clientCompany,
    eventName: offer.eventName,
    eventDateFrom: offer.eventDateFrom.toISOString(),
    eventDateTo: offer.eventDateTo.toISOString(),
    adultsCount: offer.adultsCount,
    childrenCount: offer.childrenCount,
    totalPrice: offer.totalPrice.toString(),
    notes: offer.notes,
    createdAt: offer.createdAt.toISOString(),
  };

  const serializedItems = offerItems.map((item) => ({
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toString(),
    vatRate: item.vatRate,
    sourceType: item.sourceType,
    day: item.day,
    date: item.date?.toISOString() || null,
    timeFrom: item.timeFrom,
    timeTo: item.timeTo,
  }));

  const element = createElement(OfferPdf, {
    hotel: settings,
    offer: serializedOffer,
    items: serializedItems,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="oferta-${offer.clientName.replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
