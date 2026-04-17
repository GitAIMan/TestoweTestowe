import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const { id } = await params;

  const agenda = await prisma.agenda.findUnique({ where: { id } });

  if (!agenda) {
    return NextResponse.json({ error: "Agenda nie znaleziona" }, { status: 404 });
  }

  if (agenda.type !== "FINALNA") {
    return NextResponse.json(
      { error: "Poprawki można wprowadzać tylko do agendy finalnej" },
      { status: 400 }
    );
  }

  const updated = await prisma.agenda.update({
    where: { id },
    data: { isLocked: false },
  });

  return NextResponse.json(updated);
}
