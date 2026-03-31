"use client";

import useSWR from "swr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TableSkeleton } from "@/components/ui/table-skeleton";
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
  const { data: contracts } = useSWR<Contract[]>("/api/contracts", fetcher);

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
                <TableHead>Data utworzenia</TableHead>
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
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("pl-PL")}
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
