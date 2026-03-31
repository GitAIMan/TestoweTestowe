import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const hallSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  capacity: z.number().int().min(1, "Pojemność musi być > 0"),
  pricePerDay: z.string().regex(/^\d+(\.\d{1,2})?$/, "Nieprawidłowa cena"),
  description: z.string().optional().default(""),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const halls = await prisma.hall.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(halls);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = hallSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Błąd walidacji", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, capacity, pricePerDay, description } = parsed.data;

  const maxSort = await prisma.hall.aggregate({ _max: { sortOrder: true } });

  const hall = await prisma.hall.create({
    data: {
      name,
      capacity,
      pricePerDay,
      description: description || null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(hall, { status: 201 });
}
