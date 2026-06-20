import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });

  const userId = session.user.id;

  // Znajdź wszystkie nieprzeczytane dla tego usera
  const unread = await prisma.notification.findMany({
    where: { reads: { none: { userId } } },
    select: { id: true },
  });

  if (unread.length === 0) {
    return NextResponse.json({ ok: true, marked: 0 });
  }

  await prisma.notificationRead.createMany({
    data: unread.map((n) => ({ notificationId: n.id, userId })),
    skipDuplicates: true,
  });

  return NextResponse.json({ ok: true, marked: unread.length });
}
