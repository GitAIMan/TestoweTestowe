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

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
    },
  });

  if (!offer) {
    return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  }

  const contract = await prisma.contract.findFirst({
    where: { offerId: id },
    select: {
      id: true,
      signedAt: true,
      clientFullName: true,
      needsAmendment: true,
      contractSentConfirmedAt: true,
      totalAtSigning: true,
      createdBy: { select: { firstName: true, lastName: true } },
      amendments: {
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          createdAt: true,
          resolvedAt: true,
          totalBefore: true,
          totalAfter: true,
        },
      },
    },
  });

  const agenda = await prisma.agenda.findFirst({
    where: { offerId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      isLocked: true,
      clientNotifiedAt: true,
      createdAt: true,
      createdBy: { select: { firstName: true, lastName: true } },
      tokens: {
        where: { isRevoked: false },
        select: { token: true, type: true },
      },
    },
  });

  // Licznik nieodpowiedzianych wiadomości klienta (dla bannera w widoku Excel)
  let unansweredMessages = 0;
  if (agenda) {
    unansweredMessages = await prisma.clientMessage.count({
      where: { agendaId: agenda.id, responseStatus: null },
    });
  }

  return NextResponse.json({ offer, contract, agenda, unansweredMessages });
}
