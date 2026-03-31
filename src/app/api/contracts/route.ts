import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const createContractSchema = z.object({
  offerId: z.string().min(1),
  clientFullName: z.string().min(1, "Imię i nazwisko jest wymagane"),
  clientAddress: z.string().optional().default(""),
  clientNip: z.string().optional().default(""),
  clientPesel: z.string().optional().default(""),
  advanceAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  advanceDueDate: z.string().optional().default(""),
  paymentTerms: z.string().optional().default(""),
  specialConditions: z.string().optional().default(""),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const contracts = await prisma.contract.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      offer: {
        select: {
          clientName: true,
          eventName: true,
          eventDateFrom: true,
          eventDateTo: true,
          totalPrice: true,
          status: true,
        },
      },
    },
  });

  return NextResponse.json(contracts);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createContractSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Błąd walidacji", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Sprawdź czy oferta istnieje i jest zaakceptowana
  const offer = await prisma.offer.findUnique({
    where: { id: data.offerId },
  });

  if (!offer) {
    return NextResponse.json({ error: "Oferta nie znaleziona" }, { status: 404 });
  }

  if (offer.status !== "ZAAKCEPTOWANA") {
    return NextResponse.json(
      { error: "Umowę można utworzyć tylko z zaakceptowanej oferty" },
      { status: 400 }
    );
  }

  // Sprawdź czy nie ma już umowy dla tej oferty
  const existing = await prisma.contract.findFirst({
    where: { offerId: data.offerId },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Umowa dla tej oferty już istnieje" },
      { status: 400 }
    );
  }

  const contract = await prisma.contract.create({
    data: {
      offerId: data.offerId,
      clientFullName: data.clientFullName,
      clientAddress: data.clientAddress || null,
      clientNip: data.clientNip || null,
      clientPesel: data.clientPesel || null,
      advanceAmount: data.advanceAmount || null,
      advanceDueDate: data.advanceDueDate ? new Date(data.advanceDueDate) : null,
      paymentTerms: data.paymentTerms || null,
      specialConditions: data.specialConditions || null,
    },
  });

  return NextResponse.json(contract, { status: 201 });
}
