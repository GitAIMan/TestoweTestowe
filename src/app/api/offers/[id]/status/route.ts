import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const statusSchema = z.object({
  status: z.enum([
    "ROBOCZA",
    "WYSLANA",
    "ZAAKCEPTOWANA",
    "ODRZUCONA",
    "WYGASLA",
  ]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowy status" }, { status: 400 });
  }

  const existing = await prisma.offer.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Oferta nie znaleziona" }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {
    status: parsed.data.status,
  };

  if (parsed.data.status === "WYSLANA" && !existing.sentAt) {
    updateData.sentAt = new Date();
    // Ustaw datę wygaśnięcia
    const settings = await prisma.settings.findFirst();
    const expiryDays = settings?.offerExpiryDays ?? 14;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);
    updateData.expiresAt = expiresAt;
  }

  if (
    parsed.data.status === "ZAAKCEPTOWANA" ||
    parsed.data.status === "ODRZUCONA"
  ) {
    updateData.respondedAt = new Date();
  }

  const offer = await prisma.offer.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(offer);
}
