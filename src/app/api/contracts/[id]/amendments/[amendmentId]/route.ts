import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; amendmentId: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id, amendmentId } = await params;

  const amendment = await prisma.contractAmendment.findFirst({
    where: { id: amendmentId, contractId: id },
  });

  if (!amendment) {
    return NextResponse.json(
      { error: "Aneks nie znaleziony" },
      { status: 404 }
    );
  }

  if (amendment.resolvedAt) {
    return NextResponse.json(
      {
        error:
          "Nie można usunąć wysłanego aneksu — klient ma już dokument. Utwórz kolejny aneks korygujący.",
      },
      { status: 403 }
    );
  }

  // Cascade w schema.prisma usuwa ContractItemSnapshot powiązane z aneksem
  await prisma.contractAmendment.delete({ where: { id: amendmentId } });

  // Jeśli to był ostatni nierozwiązany aneks → zgaś flagę banneru
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
