import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });

  const { id } = await params;
  const messages = await prisma.clientMessage.findMany({
    where: { agendaId: id },
    orderBy: { createdAt: "asc" },
    include: { respondedBy: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json({ messages });
}
