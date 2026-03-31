"use client";

import useSWR from "swr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Agenda {
  id: string;
  type: string;
  isLocked: boolean;
  createdAt: string;
  offer: {
    clientName: string;
    eventName: string | null;
    eventDateFrom: string;
    eventDateTo: string;
  };
  createdBy: { firstName: string; lastName: string };
  tokens: Array<{ token: string; type: string }>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function AgendyPage() {
  const { data: agendas } = useSWR<Agenda[]>("/api/agendas", fetcher);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Agendy</h1>

      {!agendas ? (
        <p className="text-muted-foreground">Ładowanie...</p>
      ) : agendas.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Brak agend — agendę tworzysz z zaakceptowanej oferty (Oferty → Szczegóły → &quot;Utwórz agendę&quot;).
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead>Wydarzenie</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Utworzył</TableHead>
                <TableHead>Data utworzenia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agendas.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link
                      href={`/agendy/${a.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {a.offer.clientName}
                    </Link>
                  </TableCell>
                  <TableCell>{a.offer.eventName || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(a.offer.eventDateFrom).toLocaleDateString("pl-PL")}
                    {" — "}
                    {new Date(a.offer.eventDateTo).toLocaleDateString("pl-PL")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.type === "FINALNA" ? "default" : "secondary"}>
                      {a.type === "WSTEPNA" ? "Wstępna" : "Finalna"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={a.isLocked ? "destructive" : "outline"}>
                      {a.isLocked ? "Zablokowana" : "Aktywna"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {a.createdBy.firstName} {a.createdBy.lastName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(a.createdAt).toLocaleDateString("pl-PL")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
