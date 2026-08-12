import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { AmendmentPdf } from "@/components/contracts/amendment-pdf";
import { computeAmendmentDiff, type DiffItem } from "@/lib/amendment-diff";
import { createElement } from "react";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; amendmentId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id, amendmentId } = await params;

  const [amendment, contract, settings] = await Promise.all([
    prisma.contractAmendment.findUnique({
      where: { id: amendmentId },
      include: { itemSnapshots: true },
    }),
    prisma.contract.findUnique({
      where: { id },
      include: {
        offer: {
          select: {
            eventName: true,
            eventDateFrom: true,
            adultsCount: true,
            childrenCount: true,
          },
        },
        amendments: { orderBy: { number: "asc" }, include: { itemSnapshots: true } },
        itemSnapshots: { where: { amendmentId: null } },
      },
    }),
    prisma.settings.findFirst(),
  ]);

  if (!amendment || !contract || amendment.contractId !== id) {
    return NextResponse.json({ error: "Aneks nie znaleziony" }, { status: 404 });
  }
  if (!settings) {
    return NextResponse.json({ error: "Brak ustawień hotelu" }, { status: 500 });
  }

  // Baseline = snapshoty z poprzedniego aneksu, albo bazowe (amendmentId=null) jeśli nr 1
  const prevAmendment = contract.amendments
    .filter((a) => a.number < amendment.number)
    .sort((a, b) => b.number - a.number)[0];

  const baselineSnapshots = prevAmendment
    ? prevAmendment.itemSnapshots
    : contract.itemSnapshots;

  const toDiff = (items: typeof amendment.itemSnapshots): DiffItem[] =>
    items.map((s) => ({
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

  const diff = computeAmendmentDiff(toDiff(baselineSnapshots), toDiff(amendment.itemSnapshots));

  const personCount = contract.offer.adultsCount + contract.offer.childrenCount;

  const element = createElement(AmendmentPdf, {
    hotel: settings,
    contract: {
      clientFullName: contract.clientFullName,
      clientAddress: contract.clientAddress,
      clientNip: contract.clientNip,
      clientPesel: contract.clientPesel,
      signedAt: contract.signedAt?.toISOString() || null,
      createdAt: contract.createdAt.toISOString(),
    },
    offer: {
      eventName: contract.offer.eventName,
      eventDateFrom: contract.offer.eventDateFrom.toISOString(),
      adultsCount: contract.offer.adultsCount,
      childrenCount: contract.offer.childrenCount,
    },
    amendment: {
      number: amendment.number,
      createdAt: amendment.createdAt.toISOString(),
      totalBefore: amendment.totalBefore.toString(),
      totalAfter: amendment.totalAfter.toString(),
    },
    diff,
    personCount,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);

  const rawName = `aneks-nr-${amendment.number}-${contract.clientFullName}`;
  const asciiName = rawName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "aneks";
  const utf8Name = encodeURIComponent(`${rawName}.pdf`);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${asciiName}.pdf"; filename*=UTF-8''${utf8Name}`,
      "Content-Length": String(buffer.length),
    },
  });
}
