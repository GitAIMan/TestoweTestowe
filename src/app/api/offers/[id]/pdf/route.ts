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
    notes: null,
    createdAt: offer.createdAt.toISOString(),
  };

  // Fallback: dla pakietów bez description dociągamy kompozycję z menu
  const pkgIdsMissingComp = offerItems
    .filter((i) => i.sourceType === "PACKAGE" && !i.description && i.sourceId)
    .map((i) => i.sourceId as string);

  const compMap = new Map<string, string>();
  if (pkgIdsMissingComp.length > 0) {
    const pkgs = await prisma.package.findMany({
      where: { id: { in: pkgIdsMissingComp } },
      include: {
        offerType: { select: { name: true } },
        sections: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
        },
      },
    });
    for (const p of pkgs) {
      compMap.set(
        p.id,
        JSON.stringify({
          packageName: p.name,
          offerTypeName: p.offerType?.name || "",
          sections: p.sections.map((s) => ({
            name: s.name,
            mode: s.selectionMode,
            count: s.selectionCount,
            items: s.items.map((it) => it.name),
          })),
        })
      );
    }
  }

  const serializedItems = offerItems.map((item) => ({
    name: item.name,
    description:
      item.description ||
      (item.sourceType === "PACKAGE" && item.sourceId
        ? compMap.get(item.sourceId) || null
        : null),
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

  const rawName = `oferta-${offer.clientName}`;
  const asciiName = rawName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "oferta";
  const utf8Name = encodeURIComponent(`${rawName}.pdf`);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${asciiName}.pdf"; filename*=UTF-8''${utf8Name}`,
      "Content-Length": String(buffer.length),
    },
  });
}
