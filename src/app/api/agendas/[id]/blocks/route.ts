import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const blockSchema = z.object({
  date: z.string().min(1),
  timeFrom: z.string().min(1),
  timeTo: z.string().optional().default(""),
  title: z.string().min(1, "Tytuł jest wymagany"),
  description: z.string().optional().default(""),
  hallId: z.string().optional().nullable(),
  personCount: z.number().int().min(1).optional().nullable(),
  packages: z.array(z.object({
    offerPackageId: z.string().min(1),
  })).default([]),
  equipment: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().int().min(1).default(1),
    notes: z.string().optional().default(""),
  })).default([]),
});

const updateBlockSchema = z.object({
  blockId: z.string().min(1),
  date: z.string().optional(),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional().nullable(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  hallId: z.string().optional().nullable(),
  personCount: z.number().int().min(1).optional().nullable(),
  packages: z.array(z.object({
    offerPackageId: z.string().min(1),
  })).optional(),
  equipment: z.array(z.object({
    name: z.string().min(1),
    quantity: z.number().int().min(1).default(1),
    notes: z.string().optional().default(""),
  })).optional(),
});

const deleteBlockSchema = z.object({
  blockId: z.string().min(1),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id: agendaId } = await params;
  const body = await req.json();
  const parsed = blockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Błąd walidacji", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const agenda = await prisma.agenda.findUnique({ where: { id: agendaId } });
  if (!agenda) {
    return NextResponse.json({ error: "Agenda nie znaleziona" }, { status: 404 });
  }

  const data = parsed.data;

  const maxSort = await prisma.agendaBlock.aggregate({
    _max: { sortOrder: true },
    where: { agendaId },
  });

  const block = await prisma.agendaBlock.create({
    data: {
      agendaId,
      date: new Date(data.date),
      timeFrom: data.timeFrom,
      timeTo: data.timeTo || null,
      title: data.title,
      description: data.description || null,
      hallId: data.hallId || null,
      personCount: data.personCount ?? null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      blockPackages: {
        create: data.packages.map((p, i) => ({
          offerPackageId: p.offerPackageId,
          sortOrder: i,
        })),
      },
      equipment: {
        create: data.equipment.map((e) => ({
          name: e.name,
          quantity: e.quantity,
          notes: e.notes || null,
        })),
      },
    },
    include: {
      blockPackages: true,
      equipment: true,
      hall: { select: { name: true } },
    },
  });

  return NextResponse.json(block, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  await params; // consume params
  const body = await req.json();
  const parsed = updateBlockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Błąd walidacji" }, { status: 400 });
  }

  const { blockId, packages, equipment, ...updateData } = parsed.data;

  const existing = await prisma.agendaBlock.findUnique({ where: { id: blockId } });
  if (!existing) {
    return NextResponse.json({ error: "Blok nie znaleziony" }, { status: 404 });
  }

  // Aktualizuj dane bloku
  const dataToUpdate: Record<string, unknown> = {};
  if (updateData.date) dataToUpdate.date = new Date(updateData.date);
  if (updateData.timeFrom) dataToUpdate.timeFrom = updateData.timeFrom;
  if (updateData.timeTo !== undefined) dataToUpdate.timeTo = updateData.timeTo;
  if (updateData.title) dataToUpdate.title = updateData.title;
  if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
  if (updateData.hallId !== undefined) dataToUpdate.hallId = updateData.hallId;
  if (updateData.personCount !== undefined) dataToUpdate.personCount = updateData.personCount;

  await prisma.agendaBlock.update({
    where: { id: blockId },
    data: dataToUpdate,
  });

  // Zamień pakiety jeśli podane
  if (packages) {
    await prisma.agendaBlockPackage.deleteMany({ where: { agendaBlockId: blockId } });
    await prisma.agendaBlockPackage.createMany({
      data: packages.map((p, i) => ({
        agendaBlockId: blockId,
        offerPackageId: p.offerPackageId,
        sortOrder: i,
      })),
    });
  }

  // Zamień equipment jeśli podane
  if (equipment) {
    await prisma.agendaBlockEquipment.deleteMany({ where: { agendaBlockId: blockId } });
    await prisma.agendaBlockEquipment.createMany({
      data: equipment.map((e) => ({
        agendaBlockId: blockId,
        name: e.name,
        quantity: e.quantity,
        notes: e.notes || null,
      })),
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  await params;
  const body = await req.json();
  const parsed = deleteBlockSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Brak blockId" }, { status: 400 });
  }

  await prisma.agendaBlock.delete({ where: { id: parsed.data.blockId } });

  return NextResponse.json({ ok: true });
}
