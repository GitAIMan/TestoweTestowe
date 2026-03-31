import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const sectionSchema = z.object({
  packageId: z.string().min(1),
  name: z.string().min(1, "Nazwa jest wymagana"),
  selectionMode: z.enum(["ALL_INCLUDED", "CHOOSE_X_FROM_Y"]),
  selectionCount: z.number().int().min(1).nullable().optional(),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = sectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Błąd walidacji", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { packageId, name, selectionMode, selectionCount, price } = parsed.data;

  if (selectionMode === "CHOOSE_X_FROM_Y" && !selectionCount) {
    return NextResponse.json(
      { error: "Tryb 'Wybierz X z Y' wymaga podania liczby wyborów" },
      { status: 400 }
    );
  }

  const maxSort = await prisma.section.aggregate({
    _max: { sortOrder: true },
    where: { packageId },
  });

  const section = await prisma.section.create({
    data: {
      packageId,
      name,
      selectionMode,
      selectionCount: selectionMode === "CHOOSE_X_FROM_Y" ? selectionCount : null,
      price: price || null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(section, { status: 201 });
}
