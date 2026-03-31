import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Brak autoryzacji" }, { status: 401 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOffers,
    totalContracts,
    totalAgendas,
    acceptedThisMonth,
  ] = await Promise.all([
    prisma.offer.count({
      where: { status: { in: ["ROBOCZA", "WYSLANA", "ZAAKCEPTOWANA"] } },
    }),
    prisma.contract.count(),
    prisma.agenda.count({ where: { type: "WSTEPNA" } }),
    prisma.offer.count({
      where: {
        status: "ZAAKCEPTOWANA",
        respondedAt: { gte: startOfMonth },
      },
    }),
  ]);

  return NextResponse.json({
    totalOffers,
    totalContracts,
    totalAgendas,
    acceptedThisMonth,
  });
}
