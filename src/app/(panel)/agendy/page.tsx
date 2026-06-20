"use client";

import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useConfirm } from "@/components/ui/confirm-dialog";
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
  const { data: agendas, mutate } = useSWR<Agenda[]>("/api/agendas", fetcher);
  const confirmDelete = useConfirm();

  async function deleteAgenda(id: string, clientName: string) {
    const ok = await confirmDelete({
      title: `Usunąć agendę "${clientName}"?`,
      description: "Linki klienta i kuchni przestaną działać. Tej operacji nie da się cofnąć.",
      confirmLabel: "Tak, usuń",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/agendas/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Błąd usuwania");
      }
      toast.success("Agenda usunięta");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się usunąć agendy");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Agendy</h1>

      {!agendas ? (
        <TableSkeleton rows={4} columns={7} />
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
                <TableHead className="w-10"></TableHead>
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
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteAgenda(a.id, a.offer.clientName)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
