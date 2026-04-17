import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { ContractPdf } from "@/components/contracts/contract-pdf";
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

  const [contract, settings] = await Promise.all([
    prisma.contract.findUnique({
      where: { id },
      include: {
        offer: {
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
                  },
                },
              },
              orderBy: { sortOrder: "asc" },
            },
          },
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

  const serializedContract = {
    ...contract,
    advanceAmount: contract.advanceAmount?.toString() || null,
    advanceDueDate: contract.advanceDueDate?.toISOString() || null,
    signedAt: contract.signedAt?.toISOString() || null,
    createdAt: contract.createdAt.toISOString(),
  };

  const serializedOffer = {
    ...contract.offer,
    eventDateFrom: contract.offer.eventDateFrom.toISOString(),
    eventDateTo: contract.offer.eventDateTo.toISOString(),
    totalPrice: contract.offer.totalPrice.toString(),
    offerRooms: contract.offer.offerRooms.map((r) => ({
      ...r,
      pricePerNight: r.pricePerNight.toString(),
    })),
    offerHalls: contract.offer.offerHalls.map((h) => ({
      ...h,
      date: h.date.toISOString(),
      pricePerDay: h.pricePerDay.toString(),
    })),
    offerPackages: contract.offer.offerPackages.map((p) => ({
      ...p,
      priceSnapshot: p.priceSnapshot?.toString() || null,
    })),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = createElement(ContractPdf as any, {
    hotel: settings,
    contract: serializedContract,
    offer: serializedOffer,
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
