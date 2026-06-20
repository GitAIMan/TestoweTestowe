import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status: string | undefined = body?.status;
  const reason: string | undefined = body?.reason;
  const phone: string | undefined = body?.phone;

  if (!["ACCEPTED", "REJECTED", "CALL_BACK"].includes(status || "")) {
    return NextResponse.json({ error: "Nieprawidłowy status" }, { status: 400 });
  }
  if (status === "REJECTED" && (!reason || reason.trim().length < 2)) {
    return NextResponse.json({ error: "Powód wymagany" }, { status: 400 });
  }
  if (status === "CALL_BACK" && (!phone || phone.trim().length < 5)) {
    return NextResponse.json({ error: "Numer telefonu wymagany" }, { status: 400 });
  }

  const msg = await prisma.clientMessage.findUnique({ where: { id } });
  if (!msg) return NextResponse.json({ error: "Wiadomość nie znaleziona" }, { status: 404 });

  const updated = await prisma.clientMessage.update({
    where: { id },
    data: {
      responseStatus: status as "ACCEPTED" | "REJECTED" | "CALL_BACK",
      responseReason: status === "REJECTED" ? reason!.trim() : null,
      responsePhone: status === "CALL_BACK" ? phone!.trim() : null,
      respondedById: session.user?.id,
      respondedAt: new Date(),
    },
    include: { respondedBy: { select: { firstName: true, lastName: true } } },
  });

  // Odśwież updatedAt agendy — banner "Ostatnia aktualizacja" u klienta ma pokazać nową datę
  await prisma.agenda.update({
    where: { id: msg.agendaId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(updated);
}
