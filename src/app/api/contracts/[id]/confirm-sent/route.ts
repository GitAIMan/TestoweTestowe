import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }
  const { id } = await params;
  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) {
    return NextResponse.json({ error: "Umowa nie znaleziona" }, { status: 404 });
  }
  await prisma.contract.update({
    where: { id },
    data: { contractSentConfirmedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
