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

  const [offer, settings] = await Promise.all([
    prisma.offer.findUnique({
      where: { id },
      include: {
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
    }),
    prisma.settings.findFirst(),
  ]);

  if (!offer) {
    return NextResponse.json({ error: "Oferta nie znaleziona" }, { status: 404 });
  }

  if (!settings) {
    return NextResponse.json({ error: "Brak ustawień hotelu" }, { status: 500 });
  }

  // Serializuj daty do stringów
  const serializedOffer = {
    ...offer,
    eventDateFrom: offer.eventDateFrom.toISOString(),
    eventDateTo: offer.eventDateTo.toISOString(),
    createdAt: offer.createdAt.toISOString(),
    totalPrice: offer.totalPrice.toString(),
    offerRooms: offer.offerRooms.map((r) => ({
      ...r,
      pricePerNight: r.pricePerNight.toString(),
    })),
    offerHalls: offer.offerHalls.map((h) => ({
      ...h,
      date: h.date.toISOString(),
      pricePerDay: h.pricePerDay.toString(),
    })),
    offerPackages: offer.offerPackages.map((p) => ({
      ...p,
      priceSnapshot: p.priceSnapshot?.toString() || null,
    })),
  };

  const element = createElement(OfferPdf, {
    hotel: settings,
    offer: serializedOffer,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="oferta-${offer.clientName.replace(/\s+/g, "-")}.pdf"`,
    },
  });
}
