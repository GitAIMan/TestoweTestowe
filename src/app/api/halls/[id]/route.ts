import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const updateHallSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").optional(),
  capacity: z.number().int().min(1, "Pojemność musi być > 0").optional(),
  pricePerDay: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Nieprawidłowa cena")
    .optional(),
  description: z.string().optional(),
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
  const parsed = updateHallSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Błąd walidacji", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await prisma.hall.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Sala nie znaleziona" }, { status: 404 });
  }

  const hall = await prisma.hall.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(hall);
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

  const existing = await prisma.hall.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Sala nie znaleziona" }, { status: 404 });
  }

  const hall = await prisma.hall.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json(hall);
}
