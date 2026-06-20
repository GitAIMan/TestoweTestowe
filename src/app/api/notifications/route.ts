import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const userId = session.user.id;
  const url = new URL(req.url);
  const search = url.searchParams.get("search")?.trim().toLowerCase() || "";
  const nip = url.searchParams.get("nip")?.trim() || "";
  const pesel = url.searchParams.get("pesel")?.trim() || "";
  const type = url.searchParams.get("type") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const limitParam = parseInt(url.searchParams.get("limit") || "50", 10);
  const offsetParam = parseInt(url.searchParams.get("offset") || "0", 10);
  const limit = Math.min(Math.max(limitParam, 1), 200);
  const offset = Math.max(offsetParam, 0);

  const where: Prisma.NotificationWhereInput = {};
  if (type) where.type = type as Prisma.NotificationWhereInput["type"];
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      (where.createdAt as Prisma.DateTimeFilter).lte = toDate;
    }
  }

  // Jeśli filtrujemy po NIP/PESEL → potrzebujemy join przez metadata.offerId → contract
  let offerIdsFilter: string[] | null = null;
  if (nip || pesel) {
    const contracts = await prisma.contract.findMany({
      where: {
        ...(nip ? { clientNip: { contains: nip, mode: "insensitive" } } : {}),
        ...(pesel ? { clientPesel: { contains: pesel, mode: "insensitive" } } : {}),
      },
      select: { offerId: true },
    });
    offerIdsFilter = contracts.map((c) => c.offerId);
    if (offerIdsFilter.length === 0) {
      return NextResponse.json({ notifications: [], unreadCount: 0, total: 0 });
    }
  }

  // Pobierz szerszy zestaw i filtruj po stronie aplikacji (metadata jest JSON)
  const raw = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: offerIdsFilter || search ? 500 : limit + offset,
    skip: offerIdsFilter || search ? 0 : offset,
    include: {
      reads: { where: { userId }, select: { readAt: true } },
    },
  });

  type Meta = { offerId?: string; clientName?: string; agendaId?: string } | null;

  let filtered = raw;
  if (offerIdsFilter) {
    const set = new Set(offerIdsFilter);
    filtered = filtered.filter((n) => {
      const meta = n.metadata as Meta;
      return meta?.offerId && set.has(meta.offerId);
    });
  }
  if (search) {
    filtered = filtered.filter((n) => {
      const meta = n.metadata as Meta;
      const clientName = (meta?.clientName || "").toLowerCase();
      return (
        clientName.includes(search) ||
        n.title.toLowerCase().includes(search) ||
        n.message.toLowerCase().includes(search)
      );
    });
  }

  const total = filtered.length;
  const page = (offerIdsFilter || search) ? filtered.slice(offset, offset + limit) : filtered;

  const result = page.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    metadata: n.metadata,
    createdAt: n.createdAt,
    isRead: n.reads.length > 0,
  }));

  const allUnread = await prisma.notification.count({
    where: { reads: { none: { userId } } },
  });

  return NextResponse.json({
    notifications: result,
    unreadCount: allUnread,
    total,
  });
}
