"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/table-skeleton";

interface Offer {
  id: string;
  clientName: string;
  clientCompany: string | null;
  eventName: string | null;
  eventDateFrom: string;
  eventDateTo: string;
  totalPrice: string;
  status: string;
  createdAt: string;
  createdBy: { firstName: string; lastName: string };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  ROBOCZA: { label: "Robocza", variant: "secondary" },
  WYSLANA: { label: "Wysłana", variant: "info" },
  ZAAKCEPTOWANA: { label: "Zaakceptowana", variant: "success" },
  ODRZUCONA: { label: "Odrzucona", variant: "destructive" },
  WYGASLA: { label: "Wygasła", variant: "warning" },
};

export default function OfertyPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (searchQuery) params.set("search", searchQuery);
  const queryString = params.toString();

  const { data: offers, mutate } = useSWR<Offer[]>(
    `/api/offers${queryString ? `?${queryString}` : ""}`,
    fetcher
  );

  async function deleteOffer(id: string) {
    if (!confirm("Czy na pewno chcesz usunąć tę ofertę? Zostaną usunięte też powiązane umowy i agendy.")) return;
    try {
      const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Błąd usuwania");
      }
      toast.success("Oferta usunięta");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się usunąć oferty");
    }
  }

  function handleSearch() {
    setSearchQuery(searchInput);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Oferty</h1>
        <Link href="/oferty/nowa">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nowa oferta
          </Button>
        </Link>
      </div>

      {/* Filtry */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 max-w-xs">
          <div className="flex gap-2">
            <Input
              placeholder="Szukaj po nazwie klienta..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button variant="outline" onClick={handleSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie</SelectItem>
            <SelectItem value="ROBOCZA">Robocze</SelectItem>
            <SelectItem value="WYSLANA">Wysłane</SelectItem>
            <SelectItem value="ZAAKCEPTOWANA">Zaakceptowane</SelectItem>
            <SelectItem value="ODRZUCONA">Odrzucone</SelectItem>
            <SelectItem value="WYGASLA">Wygasłe</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      {!offers ? (
        <TableSkeleton rows={5} columns={7} />
      ) : offers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Brak ofert — utwórz pierwszą ofertę, klikając przycisk powyżej.
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
                <TableHead>Kwota</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Utworzył</TableHead>
                <TableHead>Data utworzenia</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => {
                const cfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.ROBOCZA;
                return (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <Link
                        href={`/oferty/${offer.id}/edycja`}
                        className="font-medium text-primary hover:underline"
                      >
                        {offer.clientName}
                      </Link>
                      {offer.clientCompany && (
                        <div className="text-xs text-muted-foreground">
                          {offer.clientCompany}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{offer.eventName || "—"}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(offer.eventDateFrom).toLocaleDateString("pl-PL")}
                      {" — "}
                      {new Date(offer.eventDateTo).toLocaleDateString("pl-PL")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {Number(offer.totalPrice).toFixed(2)} zł
                    </TableCell>
                    <TableCell>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {offer.createdBy.firstName} {offer.createdBy.lastName}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(offer.createdAt).toLocaleDateString("pl-PL")}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => deleteOffer(offer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
