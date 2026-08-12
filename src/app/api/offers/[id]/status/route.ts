import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const statusSchema = z.object({
  // PRZYWROCONA to sygnał (nie status w bazie) — przywraca odrzuconą ofertę
  // na status sprzed odrzucenia.
  status: z.enum([
    "ROBOCZA",
    "WYSLANA",
    "ZAAKCEPTOWANA",
    "ODRZUCONA",
    "WYGASLA",
    "PRZYWROCONA",
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

  // Przywrócenie odrzuconej oferty na status sprzed odrzucenia
  if (parsed.data.status === "PRZYWROCONA") {
    if (existing.status !== "ODRZUCONA") {
      return NextResponse.json(
        { error: "Przywrócić można tylko odrzuconą ofertę" },
        { status: 400 }
      );
    }
    const offer = await prisma.offer.update({
      where: { id },
      data: {
        status: existing.statusBeforeRejection ?? "ROBOCZA",
        statusBeforeRejection: null,
        respondedAt: null,
      },
    });
    return NextResponse.json(offer);
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

  // Przy odrzuceniu zapamiętaj poprzedni status, aby móc przywrócić
  if (
    parsed.data.status === "ODRZUCONA" &&
    (existing.status === "ROBOCZA" || existing.status === "WYSLANA")
  ) {
    updateData.statusBeforeRejection = existing.status;
  }

  const offer = await prisma.offer.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(offer);
}
