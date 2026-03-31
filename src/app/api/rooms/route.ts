import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const roomSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
  type: z.string().min(1, "Typ jest wymagany"),
  pricePerNight: z.string().regex(/^\d+(\.\d{1,2})?$/, "Nieprawidłowa cena"),
  description: z.string().optional().default(""),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const rooms = await prisma.room.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = roomSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Błąd walidacji", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, type, pricePerNight, description } = parsed.data;

  const maxSort = await prisma.room.aggregate({ _max: { sortOrder: true } });

  const room = await prisma.room.create({
    data: {
      name,
      type,
      pricePerNight,
      description: description || null,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(room, { status: 201 });
}
