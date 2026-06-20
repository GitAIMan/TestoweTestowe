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

interface Contract {
  id: string;
  clientFullName: string;
  advanceAmount: string | null;
  signedAt: string | null;
  createdAt: string;
  createdBy: { firstName: string; lastName: string } | null;
  offer: {
    clientName: string;
    eventName: string | null;
    eventDateFrom: string;
    eventDateTo: string;
    totalPrice: string;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UmowyPage() {
  const { data: contracts, mutate } = useSWR<Contract[]>("/api/contracts", fetcher);
  const confirmDelete = useConfirm();

  async function deleteContract(id: string, clientName: string) {
    const ok = await confirmDelete({
      title: `Usunąć umowę "${clientName}"?`,
      description: "Tej operacji nie da się cofnąć.",
      confirmLabel: "Tak, usuń",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/contracts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd usuwania");
      toast.success("Umowa usunięta");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się usunąć umowy");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Umowy</h1>

      {!contracts ? (
        <TableSkeleton rows={4} columns={7} />
      ) : contracts.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Brak umów — umowę tworzysz z zaakceptowanej oferty (przejdź do Oferty → Szczegóły → &quot;Utwórz umowę&quot;).
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead>Wydarzenie</TableHead>
                <TableHead>Data wydarzenia</TableHead>
                <TableHead>Kwota oferty</TableHead>
                <TableHead>Zaliczka</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Utworzył</TableHead>
                <TableHead>Data utworzenia</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contracts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/umowy/${c.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {c.clientFullName}
                    </Link>
                  </TableCell>
                  <TableCell>{c.offer.eventName || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(c.offer.eventDateFrom).toLocaleDateString("pl-PL")}
                    {" — "}
                    {new Date(c.offer.eventDateTo).toLocaleDateString("pl-PL")}
                  </TableCell>
                  <TableCell>{Number(c.offer.totalPrice).toFixed(2)} zł</TableCell>
                  <TableCell>
                    {c.advanceAmount
                      ? `${Number(c.advanceAmount).toFixed(2)} zł`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.signedAt ? "default" : "secondary"}>
                      {c.signedAt ? "Podpisana" : "Niepodpisana"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.createdBy
                      ? `${c.createdBy.firstName} ${c.createdBy.lastName}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("pl-PL")}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteContract(c.id, c.clientFullName)}
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
