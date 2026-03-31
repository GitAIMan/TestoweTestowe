import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const itemSchema = z.object({
  sectionId: z.string().min(1),
  name: z.string().min(1, "Nazwa jest wymagana"),
  description: z.string().optional().default(""),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = itemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Błąd walidacji", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { sectionId, name, description, price } = parsed.data;

  const maxSort = await prisma.menuItem.aggregate({
    _max: { sortOrder: true },
    where: { sectionId },
  });

  const item = await prisma.menuItem.create({
    data: {
      sectionId,
      name,
      description: description || null,
      price: price || null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(item, { status: 201 });
}
