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
    select: { id: true, signedAt: true, clientFullName: true },
  });

  const agenda = await prisma.agenda.findFirst({
    where: { offerId: id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      isLocked: true,
      tokens: {
        where: { isRevoked: false },
        select: { token: true, type: true },
      },
    },
  });

  return NextResponse.json({ offer, contract, agenda });
}
