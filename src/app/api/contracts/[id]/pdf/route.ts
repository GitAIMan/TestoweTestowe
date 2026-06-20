import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { ContractPdf } from "@/components/contracts/contract-pdf";
import { createElement } from "react";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  const [contract, settings] = await Promise.all([
    prisma.contract.findUnique({
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
        itemSnapshots: {
          where: { amendmentId: null },
          orderBy: [{ day: "asc" }, { sortOrder: "asc" }],
        },
      },
    }),
    prisma.settings.findFirst(),
  ]);

  if (!contract) {
    return NextResponse.json({ error: "Umowa nie znaleziona" }, { status: 404 });
  }

  if (!settings) {
    return NextResponse.json({ error: "Brak ustawień hotelu" }, { status: 500 });
  }

  const isSigned = Boolean(contract.signedAt);

  // Źródło pozycji: snapshot po podpisie, live offerItems przed podpisem
  const itemsSource = isSigned
    ? contract.itemSnapshots.map((s) => ({
        day: s.day,
        date: s.date?.toISOString() || null,
        sortOrder: s.sortOrder,
        name: s.name,
        timeFrom: s.timeFrom,
        timeTo: s.timeTo,
        hallName: s.hallName,
        quantity: s.quantity,
        unitPrice: s.unitPrice.toString(),
        vatRate: s.vatRate,
        sourceType: s.sourceType,
      }))
    : contract.offer.offerItems.map((it) => ({
        day: it.day,
        date: it.date?.toISOString() || null,
        sortOrder: it.sortOrder,
        name: it.name,
        timeFrom: it.timeFrom,
        timeTo: it.timeTo,
        hallName: it.hall?.name || null,
        quantity: it.quantity,
        unitPrice: it.unitPrice.toString(),
        vatRate: it.vatRate,
        sourceType: it.sourceType,
      }));

  // Kwota: totalAtSigning po podpisie, offer.totalPrice przed
  const totalPrice = isSigned
    ? (contract.totalAtSigning?.toString() || contract.offer.totalPrice.toString())
    : contract.offer.totalPrice.toString();

  const serializedContract = {
    ...contract,
    advanceAmount: contract.advanceAmount?.toString() || null,
    advanceDueDate: contract.advanceDueDate?.toISOString() || null,
    signedAt: contract.signedAt?.toISOString() || null,
    createdAt: contract.createdAt.toISOString(),
  };

  const serializedOffer = {
    eventName: contract.offer.eventName,
    eventDateFrom: contract.offer.eventDateFrom.toISOString(),
    eventDateTo: contract.offer.eventDateTo.toISOString(),
    adultsCount: contract.offer.adultsCount,
    childrenCount: contract.offer.childrenCount,
    totalPrice,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(ContractPdf as any, {
    hotel: settings,
    contract: serializedContract,
    offer: serializedOffer,
    items: itemsSource,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);

  const rawName = `umowa-${contract.clientFullName}`;
  const asciiName = rawName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "umowa";
  const utf8Name = encodeURIComponent(`${rawName}.pdf`);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiName}.pdf"; filename*=UTF-8''${utf8Name}`,
      "Content-Length": String(buffer.length),
    },
  });
}
