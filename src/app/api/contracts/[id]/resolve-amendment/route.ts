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

  const contract = await prisma.contract.findUnique({ where: { id } });
  if (!contract) {
    return NextResponse.json({ error: "Umowa nie znaleziona" }, { status: 404 });
  }

  // amendmentId w body → konkretny aneks; brak → najnowszy nierozwiązany
  let amendmentId: string | undefined;
  try {
    const body = await req.json();
    amendmentId = body?.amendmentId;
  } catch {
    amendmentId = undefined;
  }

  const target = amendmentId
    ? await prisma.contractAmendment.findFirst({
        where: { id: amendmentId, contractId: id, resolvedAt: null },
      })
    : await prisma.contractAmendment.findFirst({
        where: { contractId: id, resolvedAt: null },
        orderBy: { number: "desc" },
      });

  if (target) {
    await prisma.contractAmendment.update({
      where: { id: target.id },
      data: { resolvedAt: new Date() },
    });
  }

  // Sprawdź czy zostały jakiekolwiek nierozwiązane
  const stillUnresolved = await prisma.contractAmendment.count({
    where: { contractId: id, resolvedAt: null },
  });

  if (stillUnresolved === 0) {
    await prisma.contract.update({
      where: { id },
      data: { needsAmendment: false },
    });
  }

  return NextResponse.json({ ok: true });
}
