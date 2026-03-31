"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
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
import { TableSkeleton } from "@/components/ui/table-skeleton";

interface Room {
  id: string;
  name: string;
  type: string;
  pricePerNight: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function PokojePage() {
  const { data: rooms, mutate } = useSWR<Room[]>("/api/rooms", fetcher);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    type: "",
    pricePerNight: "",
    description: "",
  });

  function openAdd() {
    setEditingRoom(null);
    setForm({ name: "", type: "", pricePerNight: "", description: "" });
    setDialogOpen(true);
  }

  function openEdit(room: Room) {
    setEditingRoom(room);
    setForm({
      name: room.name,
      type: room.type,
      pricePerNight: room.pricePerNight,
      description: room.description || "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.type || !form.pricePerNight) {
      toast.error("Wypełnij wszystkie wymagane pola");
      return;
    }

    setSaving(true);
    try {
      const url = editingRoom
        ? `/api/rooms/${editingRoom.id}`
        : "/api/rooms";
      const method = editingRoom ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Błąd zapisu");
      }

      toast.success(editingRoom ? "Pokój zaktualizowany" : "Pokój dodany");
      setDialogOpen(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(room: Room) {
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !room.isActive }),
      });

      if (!res.ok) throw new Error("Błąd zmiany statusu");

      toast.success(
        room.isActive ? "Pokój dezaktywowany" : "Pokój aktywowany"
      );
      mutate();
    } catch {
      toast.error("Nie udało się zmienić statusu");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pokoje</h1>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj pokój
        </Button>
      </div>

      {!rooms ? (
        <TableSkeleton rows={4} columns={5} />
      ) : rooms.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Brak pokoi — dodaj pierwszy pokój, klikając przycisk powyżej.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nazwa</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Cena / noc</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map((room) => (
                <TableRow
                  key={room.id}
                  className={!room.isActive ? "opacity-50" : ""}
                >
                  <TableCell className="font-medium">{room.name}</TableCell>
                  <TableCell>{room.type}</TableCell>
                  <TableCell>{Number(room.pricePerNight).toFixed(2)} zł</TableCell>
                  <TableCell>
                    <Badge variant={room.isActive ? "default" : "secondary"}>
                      {room.isActive ? "Aktywny" : "Nieaktywny"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(room)}
                      title="Edytuj"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(room)}
                      title={room.isActive ? "Dezaktywuj" : "Aktywuj"}
                    >
                      {room.isActive ? (
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
              {editingRoom ? "Edytuj pokój" : "Nowy pokój"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nazwa *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="np. Pokój 101"
              />
            </div>
            <div>
              <Label htmlFor="type">Typ *</Label>
              <Input
                id="type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                placeholder="np. 2-osobowy Standard"
              />
            </div>
            <div>
              <Label htmlFor="price">Cena za noc (PLN) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={form.pricePerNight}
                onChange={(e) =>
                  setForm({ ...form, pricePerNight: e.target.value })
                }
                placeholder="np. 250.00"
              />
            </div>
            <div>
              <Label htmlFor="desc">Opis (opcjonalnie)</Label>
              <Textarea
                id="desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Dodatkowe informacje o pokoju..."
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
