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

  // Sprawdź czy powiadomienie istnieje
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) {
    return NextResponse.json({ error: "Powiadomienie nie znalezione" }, { status: 404 });
  }

  // Upsert — jeśli już przeczytane, nie twórz duplikatu
  await prisma.notificationRead.upsert({
    where: {
      notificationId_userId: {
        notificationId: id,
        userId: session.user.id,
      },
    },
    create: {
      notificationId: id,
      userId: session.user.id,
    },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
