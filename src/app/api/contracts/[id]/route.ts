import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const updateContractSchema = z.object({
  clientFullName: z.string().min(1).optional(),
  clientAddress: z.string().optional(),
  clientNip: z.string().optional(),
  clientPesel: z.string().optional(),
  advanceAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  advanceDueDate: z.string().optional().nullable(),
  paymentTerms: z.string().optional(),
  specialConditions: z.string().optional(),
  signedAt: z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      offer: {
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          offerRooms: {
            include: { room: { select: { name: true, type: true } } },
          },
          offerHalls: {
            include: { hall: { select: { name: true, capacity: true } } },
            orderBy: { date: "asc" },
          },
          offerPackages: {
            include: {
              package: {
                include: {
                  offerType: { select: { name: true } },
                  sections: {
                    include: { items: { select: { name: true } } },
                    orderBy: { sortOrder: "asc" },
                  },
                },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  if (!contract) {
    return NextResponse.json({ error: "Umowa nie znaleziona" }, { status: 404 });
  }

  return NextResponse.json(contract);
}

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
  const parsed = updateContractSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Błąd walidacji" }, { status: 400 });
  }

  const existing = await prisma.contract.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Umowa nie znaleziona" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.advanceDueDate) {
    updateData.advanceDueDate = new Date(parsed.data.advanceDueDate);
  }
  if (parsed.data.signedAt) {
    updateData.signedAt = new Date(parsed.data.signedAt);
  }

  const contract = await prisma.contract.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(contract);
}
