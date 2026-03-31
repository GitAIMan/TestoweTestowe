import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const tokenSchema = z.object({
  type: z.enum(["KLIENT_AGENDA", "KUCHNIA_AGENDA"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id: agendaId } = await params;
  const body = await req.json();
  const parsed = tokenSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Nieprawidłowy typ tokenu" }, { status: 400 });
  }

  const agenda = await prisma.agenda.findUnique({ where: { id: agendaId } });
  if (!agenda) {
    return NextResponse.json({ error: "Agenda nie znaleziona" }, { status: 404 });
  }

  // Sprawdź czy nie ma już aktywnego tokenu tego typu
  const existing = await prisma.agendaToken.findFirst({
    where: {
      agendaId,
      type: parsed.data.type,
      isRevoked: false,
    },
  });

  if (existing) {
    return NextResponse.json(existing);
  }

  const token = await prisma.agendaToken.create({
    data: {
      agendaId,
      type: parsed.data.type,
    },
  });

  return NextResponse.json(token, { status: 201 });
}
