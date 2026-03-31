import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const offerTypeSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana"),
});

// GET — pełne drzewko: OfferType → Package → Section → MenuItem
export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const offerTypes = await prisma.offerType.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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

  return NextResponse.json(offerTypes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = offerTypeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Błąd walidacji", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const maxSort = await prisma.offerType.aggregate({
    _max: { sortOrder: true },
  });

  const offerType = await prisma.offerType.create({
    data: {
      name: parsed.data.name,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  return NextResponse.json(offerType, { status: 201 });
}
