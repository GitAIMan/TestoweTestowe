"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { BarChart3, Users, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PodsumowaniaPage() {
  const { data: allAgendas } = useSWR<Agenda[]>("/api/agendas", fetcher);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Filtruj tylko finalne
  const finalAgendas = allAgendas?.filter((a) => a.type === "FINALNA") || [];

  // Filtruj po datach
  const filtered = finalAgendas.filter((a) => {
    if (dateFrom && a.offer.eventDateFrom < dateFrom) return false;
    if (dateTo && a.offer.eventDateTo > dateTo) return false;
    return true;
  });

  // Statystyki
  const totalEvents = filtered.length;
  const uniqueClients = new Set(filtered.map((a) => a.offer.clientName)).size;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Podsumowania</h1>

      {/* Filtry */}
      <div className="flex gap-4 items-end">
        <div>
          <Label>Od</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <Label>Do</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
      </div>

      {/* Karty statystyk */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Wydarzenia finalne
            </CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Unikalni klienci
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueClients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Wszystkie agendy
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {allAgendas?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              wstępne + finalne
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Brak agend finalnych
            {(dateFrom || dateTo) && " w wybranym zakresie dat"}.
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
                <TableHead>Status</TableHead>
                <TableHead>Utworzył</TableHead>
                <TableHead>Data finalizacji</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
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
                    <Badge variant="default">Finalna</Badge>
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
