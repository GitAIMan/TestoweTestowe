import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { detectAmendmentFromSelections } from "@/lib/amendment-detection";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

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

  const change = await prisma.clientSelectionChange.findUnique({ where: { id } });
  if (!change) {
    return NextResponse.json({ error: "Propozycja nie znaleziona" }, { status: 404 });
  }
  if (change.responseStatus) {
    return NextResponse.json(
      { error: "Propozycja ma już odpowiedź" },
      { status: 409 }
    );
  }

  // ACCEPTED → zapisz proposedMenuItemIds jako aktualny wybór
  if (status === "ACCEPTED") {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.agendaSectionSelection.findFirst({
        where: {
          agendaId: change.agendaId,
          offerItemId: change.offerItemId,
          sectionId: change.sectionId,
        },
      });

      let sectionSelectionId: string;
      if (existing) {
        sectionSelectionId = existing.id;
        await tx.agendaItemSelection.deleteMany({
          where: { agendaSectionSelectionId: existing.id },
        });
        await tx.agendaSectionSelection.update({
          where: { id: existing.id },
          data: { completedAt: new Date() },
        });
      } else {
        const created = await tx.agendaSectionSelection.create({
          data: {
            agendaId: change.agendaId,
            offerItemId: change.offerItemId,
            sectionId: change.sectionId,
            completedAt: new Date(),
          },
        });
        sectionSelectionId = created.id;
      }

      if (change.proposedMenuItemIds.length > 0) {
        await tx.agendaItemSelection.createMany({
          data: change.proposedMenuItemIds.map((menuItemId) => ({
            agendaSectionSelectionId: sectionSelectionId,
            menuItemId,
          })),
        });
      }
    });
  }

  const updated = await prisma.clientSelectionChange.update({
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

  // Po ACCEPTED — sprawdź czy kwota się zmieniła (flaga aneksu)
  if (status === "ACCEPTED") {
    await detectAmendmentFromSelections(change.agendaId);
  }

  // Odśwież banner u klienta
  await prisma.agenda.update({
    where: { id: change.agendaId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(updated);
}
