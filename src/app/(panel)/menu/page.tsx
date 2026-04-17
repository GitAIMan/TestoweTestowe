"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

interface OfferType {
  id: string;
  name: string;
  isActive: boolean;
  packages: { id: string }[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function MenuPage() {
  const { data: offerTypes, mutate } = useSWR<OfferType[]>(
    "/api/menu/offer-types",
    fetcher
  );
  const [dialog, setDialog] = useState<{ editing?: OfferType } | null>(null);
  const [nameField, setNameField] = useState("");
  const [saving, setSaving] = useState(false);

  function openDialog(editing?: OfferType) {
    setNameField(editing?.name || "");
    setDialog({ editing });
  }

  async function handleSave() {
    if (!nameField.trim()) {
      toast.error("Nazwa jest wymagana");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!dialog?.editing;
      const res = await fetch(
        isEdit
          ? `/api/menu/offer-types/${dialog!.editing!.id}`
          : "/api/menu/offer-types",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: nameField }),
        }
      );
      if (!res.ok) throw new Error("Błąd zapisu");
      toast.success(isEdit ? "Zaktualizowano" : "Utworzono");
      setDialog(null);
      mutate();
    } catch {
      toast.error("Nie udało się zapisać");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Czy na pewno chcesz usunąć "${name}"? Zostaną usunięte wszystkie pakiety, sekcje i pozycje.`)) return;
    try {
      const res = await fetch(`/api/menu/offer-types/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Błąd");
      toast.success(`Usunięto "${name}"`);
      mutate();
    } catch {
      toast.error("Nie udało się usunąć");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Menu</h1>
      </div>

      {!offerTypes ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {offerTypes.map((ot) => (
            <Link key={ot.id} href={`/menu/${ot.id}`} className="block">
              <Card className="group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer">
                <CardContent className="pt-6 pb-4 flex flex-col items-center text-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-4">
                    <UtensilsCrossed className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-lg font-semibold">{ot.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {ot.packages.length}{" "}
                    {ot.packages.length === 1
                      ? "pakiet"
                      : ot.packages.length < 5
                        ? "pakiety"
                        : "pakietów"}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openDialog(ot);
                      }}
                      title="Zmień nazwę"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(ot.id, ot.name);
                      }}
                      title="Usuń"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Kafelek dodawania */}
          <button
            onClick={() => openDialog()}
            className="rounded-xl border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30 transition-all flex flex-col items-center justify-center gap-3 p-8 min-h-[160px]"
          >
            <div className="rounded-xl bg-muted p-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              Stwórz nową ofertę menu
            </span>
          </button>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.editing ? "Zmień nazwę" : "Nowa oferta menu"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nazwa *</Label>
              <Input
                value={nameField}
                onChange={(e) => setNameField(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialog(null)}>
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
