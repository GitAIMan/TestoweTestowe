import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MAX_MESSAGES_PER_AGENDA = 50;

async function validateToken(token: string) {
  const agendaToken = await prisma.agendaToken.findUnique({ where: { token } });
  if (!agendaToken || agendaToken.isRevoked) return { error: "Nieprawidłowy link", status: 404 };
  if (agendaToken.expiresAt && new Date() > agendaToken.expiresAt) return { error: "Link wygasł", status: 410 };
  if (agendaToken.type !== "KLIENT_AGENDA") return { error: "Brak dostępu", status: 403 };
  return { agendaToken };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const v = await validateToken(token);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: v.status });

  const messages = await prisma.clientMessage.findMany({
    where: { agendaId: v.agendaToken.agendaId },
    orderBy: { createdAt: "asc" },
    include: { respondedBy: { select: { firstName: true, lastName: true } } },
  });

  return NextResponse.json({ messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const v = await validateToken(token);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: v.status });

  const body = await req.json().catch(() => ({}));
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (content.length < 3) {
    return NextResponse.json({ error: "Wiadomość za krótka (min 3 znaki)" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "Wiadomość za długa (max 2000 znaków)" }, { status: 400 });
  }

  const count = await prisma.clientMessage.count({
    where: { agendaId: v.agendaToken.agendaId },
  });
  if (count >= MAX_MESSAGES_PER_AGENDA) {
    return NextResponse.json(
      { error: "Osiągnięto limit wiadomości. Prosimy o kontakt z hotelem." },
      { status: 429 }
    );
  }

  const agenda = await prisma.agenda.findUnique({
    where: { id: v.agendaToken.agendaId },
    include: { offer: { select: { id: true, clientName: true } } },
  });
  if (!agenda) return NextResponse.json({ error: "Agenda nie znaleziona" }, { status: 404 });

  const message = await prisma.$transaction(async (tx) => {
    const m = await tx.clientMessage.create({
      data: { agendaId: agenda.id, content },
    });
    await tx.notification.create({
      data: {
        type: "WIADOMOSC_OD_KLIENTA",
        title: `Nowa wiadomość od ${agenda.offer.clientName}`,
        message: content.length > 120 ? content.slice(0, 117) + "..." : content,
        metadata: {
          agendaId: agenda.id,
          offerId: agenda.offer.id,
          messageId: m.id,
          clientName: agenda.offer.clientName,
        },
      },
    });
    return m;
  });

  return NextResponse.json({ ok: true, message }, { status: 201 });
}
