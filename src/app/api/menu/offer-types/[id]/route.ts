import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  const offerType = await prisma.offerType.findUnique({
    where: { id },
    include: {
      packages: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          sections: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: {
              items: {
                orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
              },
            },
          },
        },
      },
    },
  });

  if (!offerType) {
    return NextResponse.json({ error: "Typ oferty nie znaleziony" }, { status: 404 });
  }

  return NextResponse.json(offerType);
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
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

  const offerType = await prisma.offerType.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(offerType);
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

  // Cascade delete w Prisma schemacie usunie powiązane pakiety/sekcje/pozycje
  await prisma.offerType.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
