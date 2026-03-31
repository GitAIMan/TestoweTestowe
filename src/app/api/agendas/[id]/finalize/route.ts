import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  // Pobierz agendę wstępną z blokami i pakietami
  const agenda = await prisma.agenda.findUnique({
    where: { id },
    include: {
      offer: {
        include: {
          offerPackages: {
            include: {
              package: {
                include: {
                  sections: {
                    where: { isActive: true },
                  },
                },
              },
            },
          },
        },
      },
      blocks: {
        include: {
          blockPackages: true,
          equipment: true,
        },
      },
    },
  });

  if (!agenda) {
    return NextResponse.json({ error: "Agenda nie znaleziona" }, { status: 404 });
  }

  if (agenda.type !== "WSTEPNA") {
    return NextResponse.json(
      { error: "Można finalizować tylko agendę wstępną" },
      { status: 400 }
    );
  }

  // Sprawdź czy nie ma już agendy finalnej
  const existingFinal = await prisma.agenda.findFirst({
    where: { offerId: agenda.offerId, type: "FINALNA" },
  });

  if (existingFinal) {
    return NextResponse.json(
      { error: "Agenda finalna już istnieje" },
      { status: 400 }
    );
  }

  // Walidacja: wszystkie sekcje CHOOSE_X_FROM_Y muszą mieć kompletne wybory
  const chooseXSections = agenda.offer.offerPackages.flatMap((op) =>
    op.package.sections.filter((s) => s.selectionMode === "CHOOSE_X_FROM_Y")
  );

  const selections = await prisma.agendaSectionSelection.findMany({
    where: { agendaId: id },
    include: { items: true },
  });

  for (const section of chooseXSections) {
    const sel = selections.find((s) => s.sectionId === section.id);
    if (!sel || !sel.completedAt) {
      return NextResponse.json(
        {
          error: `Sekcja "${section.name}" nie ma kompletnych wyborów klienta`,
        },
        { status: 400 }
      );
    }
    if (section.selectionCount && sel.items.length !== section.selectionCount) {
      return NextResponse.json(
        {
          error: `Sekcja "${section.name}": klient wybrał ${sel.items.length}/${section.selectionCount} pozycji`,
        },
        { status: 400 }
      );
    }
  }

  // Utwórz agendę finalną z kopią bloków
  const finalAgenda = await prisma.$transaction(async (tx) => {
    const newAgenda = await tx.agenda.create({
      data: {
        offerId: agenda.offerId,
        createdById: session.user.id,
        type: "FINALNA",
        isLocked: true,
        notes: agenda.notes,
      },
    });

    // Skopiuj bloki
    for (const block of agenda.blocks) {
      const newBlock = await tx.agendaBlock.create({
        data: {
          agendaId: newAgenda.id,
          date: block.date,
          timeFrom: block.timeFrom,
          timeTo: block.timeTo,
          title: block.title,
          description: block.description,
          hallId: block.hallId,
          personCount: block.personCount,
          sortOrder: block.sortOrder,
        },
      });

      // Skopiuj pakiety bloku
      if (block.blockPackages.length > 0) {
        await tx.agendaBlockPackage.createMany({
          data: block.blockPackages.map((bp) => ({
            agendaBlockId: newBlock.id,
            offerPackageId: bp.offerPackageId,
            sortOrder: bp.sortOrder,
          })),
        });
      }

      // Skopiuj wyposażenie
      if (block.equipment.length > 0) {
        await tx.agendaBlockEquipment.createMany({
          data: block.equipment.map((e) => ({
            agendaBlockId: newBlock.id,
            name: e.name,
            quantity: e.quantity,
            notes: e.notes,
          })),
        });
      }
    }

    // Skopiuj wybory klienta
    for (const sel of selections) {
      const newSel = await tx.agendaSectionSelection.create({
        data: {
          agendaId: newAgenda.id,
          sectionId: sel.sectionId,
          completedAt: sel.completedAt,
        },
      });

      if (sel.items.length > 0) {
        await tx.agendaItemSelection.createMany({
          data: sel.items.map((item) => ({
            agendaSectionSelectionId: newSel.id,
            menuItemId: item.menuItemId,
          })),
        });
      }
    }

    // Zablokuj agendę wstępną
    await tx.agenda.update({
      where: { id },
      data: { isLocked: true },
    });

    return newAgenda;
  });

  return NextResponse.json(finalAgenda, { status: 201 });
}
