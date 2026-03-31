import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const updateSettingsSchema = z.object({
  hotelName: z.string().min(1, "Nazwa hotelu jest wymagana").optional(),
  logoUrl: z.string().optional().nullable(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  contactEmail: z.string().email("Nieprawidłowy email").optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  nip: z.string().optional().nullable(),
  regulamin: z.string().optional().nullable(),
  footerText: z.string().optional().nullable(),
  offerExpiryDays: z.number().int().min(1).optional(),
  agendaLockDaysBefore: z.number().int().min(1).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const settings = await prisma.settings.findFirst();

  if (!settings) {
    return NextResponse.json({ error: "Brak ustawień" }, { status: 404 });
  }

  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  // Tylko KIEROWNIK
  if (session.user.role !== "KIEROWNIK") {
    return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = updateSettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Błąd walidacji", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const existing = await prisma.settings.findFirst();

  if (!existing) {
    return NextResponse.json({ error: "Brak ustawień" }, { status: 404 });
  }

  const settings = await prisma.settings.update({
    where: { id: existing.id },
    data: parsed.data,
  });

  return NextResponse.json(settings);
}
