import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const updateRoomSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").optional(),
  type: z.string().min(1, "Typ jest wymagany").optional(),
  pricePerNight: z
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
  const parsed = updateRoomSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Błąd walidacji", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await prisma.room.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pokój nie znaleziony" }, { status: 404 });
  }

  const room = await prisma.room.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(room);
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

  const existing = await prisma.room.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Pokój nie znaleziony" }, { status: 404 });
  }

  // Soft delete — dezaktywacja
  const room = await prisma.room.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json(room);
}
