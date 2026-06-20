import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tokenId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id: agendaId, tokenId } = await params;

  const token = await prisma.agendaToken.findUnique({ where: { id: tokenId } });

  if (!token || token.agendaId !== agendaId) {
    return NextResponse.json({ error: "Token nie znaleziony" }, { status: 404 });
  }

  if (token.isRevoked) {
    return NextResponse.json({ ok: true, alreadyRevoked: true });
  }

  await prisma.agendaToken.update({
    where: { id: tokenId },
    data: { isRevoked: true },
  });

  return NextResponse.json({ ok: true });
}
