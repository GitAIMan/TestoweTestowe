"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus, Pencil, ToggleLeft, ToggleRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { TableSkeleton } from "@/components/ui/table-skeleton";

interface Hall {
  id: string;
  name: string;
  capacity: number;
  pricePerDay: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface HallAvailability extends Hall {
  reservedDates: string[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function SalePage() {
  const { data: halls, mutate } = useSWR<Hall[]>("/api/halls", fetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [saving, setSaving] = useState(false);

  // Dostępność
  const [checkDate, setCheckDate] = useState("");
  const [availability, setAvailability] = useState<HallAvailability[] | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [form, setForm] = useState({
    name: "",
    capacity: "",
    pricePerDay: "",
    description: "",
  });

  function openAdd() {
    setEditingHall(null);
    setForm({ name: "", capacity: "", pricePerDay: "", description: "" });
    setDialogOpen(true);
  }

  function openEdit(hall: Hall) {
    setEditingHall(hall);
    setForm({
      name: hall.name,
      capacity: String(hall.capacity),
      pricePerDay: hall.pricePerDay,
      description: hall.description || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.capacity || !form.pricePerDay) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    setSaving(true);
    try {
      const url = editingHall
        ? `/api/halls/${editingHall.id}`
        : "/api/halls";
      const method = editingHall ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          capacity: parseInt(form.capacity),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Błąd zapisu");
      }

      toast.success(editingHall ? "Sala zaktualizowana" : "Sala dodana");
      setDialogOpen(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(hall: Hall) {
    try {
      const res = await fetch(`/api/halls/${hall.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !hall.isActive }),
      });

      if (!res.ok) throw new Error("Błąd zmiany statusu");

      toast.success(
        hall.isActive ? "Sala dezaktywowana" : "Sala aktywowana"
      );
      mutate();
    } catch {
      toast.error("Nie udało się zmienić statusu");
    }
  }

  async function checkAvailability() {
    if (!checkDate) {
      toast.error("Wybierz datę");
      return;
    }

    setCheckingAvailability(true);
    try {
      const res = await fetch(
        `/api/halls/availability?dateFrom=${checkDate}&dateTo=${checkDate}`
      );
      if (!res.ok) throw new Error("Błąd sprawdzania dostępności");
      const data = await res.json();
      setAvailability(data);
    } catch {
      toast.error("Nie udało się sprawdzić dostępności");
    } finally {
      setCheckingAvailability(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sale</h1>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj salę
        </Button>
      </div>

      {/* Sprawdzanie dostępności */}
      <div className="rounded-lg border p-4 space-y-3">
        <h2 className="text-sm font-medium">Sprawdź dostępność sal</h2>
        <div className="flex gap-3 items-end">
          <div>
            <Label htmlFor="checkDate">Data</Label>
            <Input
              id="checkDate"
              type="date"
              value={checkDate}
              onChange={(e) => setCheckDate(e.target.value)}
            />
          </div>
          <Button
            onClick={checkAvailability}
            disabled={checkingAvailability}
            variant="outline"
          >
            <Search className="mr-2 h-4 w-4" />
            {checkingAvailability ? "Sprawdzam..." : "Sprawdź"}
          </Button>
        </div>
        {availability && (
          <div className="mt-3 space-y-2">
            {availability.map((hall) => {
              const isReserved = hall.reservedDates.includes(checkDate);
              return (
                <div
                  key={hall.id}
                  className="flex items-center justify-between rounded border px-3 py-2"
                >
                  <div>
                    <span className="font-medium">{hall.name}</span>
                    <span className="text-muted-foreground ml-2 text-sm">
                      ({hall.capacity} os.)
                    </span>
                  </div>
                  <Badge variant={isReserved ? "destructive" : "default"}>
                    {isReserved ? "Zajęta" : "Wolna"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Lista sal */}
      {!halls ? (
        <TableSkeleton rows={5} columns={5} />
      ) : halls.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Brak sal — dodaj pierwszą salę, klikając przycisk powyżej.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Pojemność</TableHead>
                <TableHead>Cena / dzień</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {halls.map((hall) => (
                <TableRow
                  key={hall.id}
                  className={!hall.isActive ? "opacity-50" : ""}
                >
                  <TableCell className="font-medium">{hall.name}</TableCell>
                  <TableCell>{hall.capacity} os.</TableCell>
                  <TableCell>
                    {Number(hall.pricePerDay).toFixed(2)} zł
                  </TableCell>
                  <TableCell>
                    <Badge variant={hall.isActive ? "default" : "secondary"}>
                      {hall.isActive ? "Aktywna" : "Nieaktywna"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(hall)}
                      title="Edytuj"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(hall)}
                      title={hall.isActive ? "Dezaktywuj" : "Aktywuj"}
                    >
                      {hall.isActive ? (
                        <ToggleRight className="h-4 w-4" />
                      ) : (
                        <ToggleLeft className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingHall ? "Edytuj salę" : "Nowa sala"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="hallName">Nazwa *</Label>
              <Input
                id="hallName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="np. Sala Balowa"
              />
            </div>
            <div>
              <Label htmlFor="hallCapacity">Pojemność (os.) *</Label>
              <Input
                id="hallCapacity"
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) =>
                  setForm({ ...form, capacity: e.target.value })
                }
                placeholder="np. 200"
              />
            </div>
            <div>
              <Label htmlFor="hallPrice">Cena za dzień (PLN) *</Label>
              <Input
                id="hallPrice"
                type="number"
                step="0.01"
                min="0"
                value={form.pricePerDay}
                onChange={(e) =>
                  setForm({ ...form, pricePerDay: e.target.value })
                }
                placeholder="np. 3000.00"
              />
            </div>
            <div>
              <Label htmlFor="hallDesc">Opis (opcjonalnie)</Label>
              <Textarea
                id="hallDesc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Dodatkowe informacje o sali..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Anuluj
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Zapisywanie..." : "Zapisz"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
