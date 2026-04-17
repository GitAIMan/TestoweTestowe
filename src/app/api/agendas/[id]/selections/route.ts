import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface SelectionInput {
  sectionId: string;
  menuItemIds: string[];
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  const agenda = await prisma.agenda.findUnique({ where: { id } });

  if (!agenda) {
    return NextResponse.json({ error: "Agenda nie znaleziona" }, { status: 404 });
  }

  if (agenda.isLocked) {
    return NextResponse.json(
      {
        error:
          "Agenda jest zatwierdzona. Kliknij „Wprowadź poprawki” aby ją odblokować.",
      },
      { status: 400 }
    );
  }

  const body = await req.json();
  const selections: SelectionInput[] = body.selections;

  if (!Array.isArray(selections)) {
    return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    for (const sel of selections) {
      const existing = await tx.agendaSectionSelection.findUnique({
        where: {
          agendaId_sectionId: {
            agendaId: agenda.id,
            sectionId: sel.sectionId,
          },
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
            agendaId: agenda.id,
            sectionId: sel.sectionId,
            completedAt: new Date(),
          },
        });
        sectionSelectionId = created.id;
      }

      if (sel.menuItemIds.length > 0) {
        await tx.agendaItemSelection.createMany({
          data: sel.menuItemIds.map((menuItemId) => ({
            agendaSectionSelectionId: sectionSelectionId,
            menuItemId,
          })),
        });
      }
    }

    // Dotknij agendy żeby zaktualizować updatedAt (dla banera kuchni)
    await tx.agenda.update({
      where: { id: agenda.id },
      data: { updatedAt: new Date() },
    });
  });

  return NextResponse.json({ ok: true });
}
