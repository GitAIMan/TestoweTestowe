import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const userId = session.user.id;

  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      reads: {
        where: { userId },
        select: { readAt: true },
      },
    },
  });

  const result = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    metadata: n.metadata,
    createdAt: n.createdAt,
    isRead: n.reads.length > 0,
  }));

  const unreadCount = result.filter((n) => !n.isRead).length;

  return NextResponse.json({ notifications: result, unreadCount });
}
