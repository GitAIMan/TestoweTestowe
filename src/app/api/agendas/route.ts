import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const createAgendaSchema = z.object({
  offerId: z.string().min(1),
  notes: z.string().optional().default(""),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const offerId = new URL(req.url).searchParams.get("offerId");

  const agendas = await prisma.agenda.findMany({
    where: offerId ? { offerId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      offer: {
        select: {
          clientName: true,
          eventName: true,
          eventDateFrom: true,
          eventDateTo: true,
        },
      },
      createdBy: {
        select: { firstName: true, lastName: true },
      },
      tokens: {
        where: { isRevoked: false },
        select: { token: true, type: true },
      },
    },
  });

  return NextResponse.json(agendas);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createAgendaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Błąd walidacji", details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Sprawdź ofertę
  const offer = await prisma.offer.findUnique({
    where: { id: parsed.data.offerId },
  });

  if (!offer) {
    return NextResponse.json({ error: "Oferta nie znaleziona" }, { status: 404 });
  }

  if (offer.status !== "ZAAKCEPTOWANA") {
    return NextResponse.json(
      { error: "Agendę można utworzyć tylko z zaakceptowanej oferty" },
      { status: 400 }
    );
  }

  // Sprawdź czy nie ma już agendy wstępnej
  const existing = await prisma.agenda.findFirst({
    where: { offerId: parsed.data.offerId, type: "WSTEPNA" },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Agenda wstępna dla tej oferty już istnieje" },
      { status: 400 }
    );
  }

  const agenda = await prisma.agenda.create({
    data: {
      offerId: parsed.data.offerId,
      createdById: session.user.id,
      type: "WSTEPNA",
      notes: parsed.data.notes || null,
    },
  });

  return NextResponse.json(agenda, { status: 201 });
}
