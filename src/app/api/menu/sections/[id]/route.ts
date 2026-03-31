import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  selectionMode: z.enum(["ALL_INCLUDED", "CHOOSE_X_FROM_Y"]).optional(),
  selectionCount: z.number().int().min(1).nullable().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Błąd walidacji" }, { status: 400 });
  }

  const data = parsed.data;

  if (data.selectionMode === "CHOOSE_X_FROM_Y" && !data.selectionCount) {
    return NextResponse.json(
      { error: "Tryb 'Wybierz X z Y' wymaga podania liczby wyborów" },
      { status: 400 }
    );
  }

  if (data.selectionMode === "ALL_INCLUDED") {
    data.selectionCount = null;
  }

  const section = await prisma.section.update({
    where: { id },
    data,
  });

  return NextResponse.json(section);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.section.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
