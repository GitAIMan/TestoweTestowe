import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  const offer = await prisma.offer.findUnique({ where: { id } });
  if (!offer) {
    return NextResponse.json({ error: "Oferta nie znaleziona" }, { status: 404 });
  }

  await prisma.offer.update({
    where: { id },
    data: { offerSentConfirmedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
