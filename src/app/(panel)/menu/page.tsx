"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  UtensilsCrossed,
  Package,
  Layers,
  CookingPot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ===================== TYPY =====================

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface Section {
  id: string;
  name: string;
  selectionMode: "ALL_INCLUDED" | "CHOOSE_X_FROM_Y";
  selectionCount: number | null;
  price: string | null;
  isActive: boolean;
  sortOrder: number;
  items: MenuItem[];
}

interface PackageType {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  isActive: boolean;
  sortOrder: number;
  sections: Section[];
}

interface OfferType {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  packages: PackageType[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// ===================== DIALOG TYPES =====================

type DialogType =
  | { kind: "offerType"; editing?: OfferType }
  | { kind: "package"; offerTypeId: string; editing?: PackageType }
  | { kind: "section"; packageId: string; editing?: Section }
  | { kind: "item"; sectionId: string; editing?: MenuItem };

// ===================== KOMPONENT =====================

export default function MenuPage() {
  const { data: offerTypes, mutate } = useSWR<OfferType[]>(
    "/api/menu/offer-types",
    fetcher
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<DialogType | null>(null);
  const [saving, setSaving] = useState(false);

  // Formularze
  const [nameField, setNameField] = useState("");
  const [descField, setDescField] = useState("");
  const [priceField, setPriceField] = useState("");
  const [modeField, setModeField] = useState<"ALL_INCLUDED" | "CHOOSE_X_FROM_Y">("ALL_INCLUDED");
  const [countField, setCountField] = useState("");

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function openDialog(d: DialogType) {
    setDialog(d);
    if (d.kind === "offerType") {
      setNameField(d.editing?.name || "");
    } else if (d.kind === "package") {
      setNameField(d.editing?.name || "");
      setDescField(d.editing?.description || "");
      setPriceField(d.editing?.price || "");
    } else if (d.kind === "section") {
      setNameField(d.editing?.name || "");
      setPriceField(d.editing?.price || "");
      setModeField(d.editing?.selectionMode || "ALL_INCLUDED");
      setCountField(d.editing?.selectionCount?.toString() || "");
    } else if (d.kind === "item") {
      setNameField(d.editing?.name || "");
      setDescField(d.editing?.description || "");
      setPriceField(d.editing?.price || "");
    }
  }

  async function handleSave() {
    if (!nameField.trim()) {
      toast.error("Nazwa jest wymagana");
      return;
    }

    setSaving(true);
    try {
      let url: string;
      let method: string;
      let body: Record<string, unknown>;

      if (!dialog) return;

      if (dialog.kind === "offerType") {
        url = dialog.editing
          ? `/api/menu/offer-types/${dialog.editing.id}`
          : "/api/menu/offer-types";
        method = dialog.editing ? "PUT" : "POST";
        body = { name: nameField };
      } else if (dialog.kind === "package") {
        url = dialog.editing
          ? `/api/menu/packages/${dialog.editing.id}`
          : "/api/menu/packages";
        method = dialog.editing ? "PUT" : "POST";
        body = {
          offerTypeId: dialog.offerTypeId,
          name: nameField,
          description: descField || undefined,
          price: priceField || null,
        };
      } else if (dialog.kind === "section") {
        url = dialog.editing
          ? `/api/menu/sections/${dialog.editing.id}`
          : "/api/menu/sections";
        method = dialog.editing ? "PUT" : "POST";
        body = {
          packageId: dialog.packageId,
          name: nameField,
          selectionMode: modeField,
          selectionCount:
            modeField === "CHOOSE_X_FROM_Y" ? parseInt(countField) || 1 : null,
          price: priceField || null,
        };
      } else {
        url = dialog.editing
          ? `/api/menu/items/${dialog.editing.id}`
          : "/api/menu/items";
        method = dialog.editing ? "PUT" : "POST";
        body = {
          sectionId: dialog.sectionId,
          name: nameField,
          description: descField || undefined,
          price: priceField || null,
        };
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Błąd zapisu");
      }

      toast.success("Zapisano");
      setDialog(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(
    kind: "offerType" | "package" | "section" | "item",
    id: string,
    name: string
  ) {
    if (!confirm(`Czy na pewno chcesz usunąć "${name}"? Ta operacja jest nieodwracalna.`)) {
      return;
    }

    const urlMap = {
      offerType: `/api/menu/offer-types/${id}`,
      package: `/api/menu/packages/${id}`,
      section: `/api/menu/sections/${id}`,
      item: `/api/menu/items/${id}`,
    };

    try {
      const res = await fetch(urlMap[kind], { method: "DELETE" });
      if (!res.ok) throw new Error("Błąd usuwania");
      toast.success(`Usunięto "${name}"`);
      mutate();
    } catch {
      toast.error("Nie udało się usunąć");
    }
  }

  if (!offerTypes) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Menu</h1>
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Menu</h1>
        <Button onClick={() => openDialog({ kind: "offerType" })}>
          <Plus className="mr-2 h-4 w-4" />
          Dodaj typ oferty
        </Button>
      </div>

      {offerTypes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Brak typów ofert — dodaj pierwszy typ (np. &quot;Oferta Weselna&quot;),
            klikając przycisk powyżej.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {offerTypes.map((ot) => (
            <div key={ot.id} className="rounded-lg border">
              {/* Poziom 1: Typ oferty */}
              <div className="flex items-center justify-between p-3 bg-muted/50">
                <button
                  onClick={() => toggle(ot.id)}
                  className="flex items-center gap-2 font-semibold text-left"
                >
                  {expanded[ot.id] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <UtensilsCrossed className="h-4 w-4" />
                  {ot.name}
                  {!ot.isActive && (
                    <Badge variant="secondary" className="ml-2">
                      Nieaktywny
                    </Badge>
                  )}
                </button>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      openDialog({
                        kind: "package",
                        offerTypeId: ot.id,
                      })
                    }
                    title="Dodaj pakiet"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      openDialog({ kind: "offerType", editing: ot })
                    }
                    title="Edytuj"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete("offerType", ot.id, ot.name)}
                    title="Usuń"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {expanded[ot.id] && (
                <div className="pl-6">
                  {ot.packages.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">
                      Brak pakietów — kliknij + aby dodać
                    </p>
                  ) : (
                    ot.packages.map((pkg) => (
                      <div key={pkg.id} className="border-t">
                        {/* Poziom 2: Pakiet */}
                        <div className="flex items-center justify-between p-3">
                          <button
                            onClick={() => toggle(pkg.id)}
                            className="flex items-center gap-2 font-medium text-left"
                          >
                            {expanded[pkg.id] ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <Package className="h-4 w-4 text-blue-600" />
                            {pkg.name}
                            {pkg.price && (
                              <span className="text-sm text-muted-foreground ml-1">
                                ({Number(pkg.price).toFixed(2)} zł)
                              </span>
                            )}
                          </button>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openDialog({
                                  kind: "section",
                                  packageId: pkg.id,
                                })
                              }
                              title="Dodaj sekcję"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openDialog({
                                  kind: "package",
                                  offerTypeId: ot.id,
                                  editing: pkg,
                                })
                              }
                              title="Edytuj"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDelete("package", pkg.id, pkg.name)
                              }
                              title="Usuń"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {expanded[pkg.id] && (
                          <div className="pl-6">
                            {pkg.sections.length === 0 ? (
                              <p className="p-3 text-sm text-muted-foreground">
                                Brak sekcji — kliknij + aby dodać
                              </p>
                            ) : (
                              pkg.sections.map((sec) => (
                                <div key={sec.id} className="border-t">
                                  {/* Poziom 3: Sekcja */}
                                  <div className="flex items-center justify-between p-3">
                                    <button
                                      onClick={() => toggle(sec.id)}
                                      className="flex items-center gap-2 text-sm font-medium text-left"
                                    >
                                      {expanded[sec.id] ? (
                                        <ChevronDown className="h-3 w-3" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3" />
                                      )}
                                      <Layers className="h-4 w-4 text-green-600" />
                                      {sec.name}
                                      <Badge
                                        variant="outline"
                                        className="ml-1 text-xs"
                                      >
                                        {sec.selectionMode === "ALL_INCLUDED"
                                          ? "Wszystko w cenie"
                                          : `Wybierz ${sec.selectionCount}`}
                                      </Badge>
                                    </button>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          openDialog({
                                            kind: "item",
                                            sectionId: sec.id,
                                          })
                                        }
                                        title="Dodaj pozycję"
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          openDialog({
                                            kind: "section",
                                            packageId: pkg.id,
                                            editing: sec,
                                          })
                                        }
                                        title="Edytuj"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleDelete(
                                            "section",
                                            sec.id,
                                            sec.name
                                          )
                                        }
                                        title="Usuń"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {expanded[sec.id] && (
                                    <div className="pl-6">
                                      {sec.items.length === 0 ? (
                                        <p className="p-3 text-sm text-muted-foreground">
                                          Brak pozycji — kliknij + aby dodać
                                        </p>
                                      ) : (
                                        sec.items.map((item) => (
                                          <div
                                            key={item.id}
                                            className="flex items-center justify-between p-2 pl-3 border-t"
                                          >
                                            {/* Poziom 4: Pozycja menu */}
                                            <div className="flex items-center gap-2">
                                              <CookingPot className="h-3 w-3 text-orange-500" />
                                              <span className="text-sm">
                                                {item.name}
                                              </span>
                                              {item.price && (
                                                <span className="text-xs text-muted-foreground">
                                                  ({Number(item.price).toFixed(2)} zł)
                                                </span>
                                              )}
                                              {!item.isActive && (
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs"
                                                >
                                                  Nieaktywna
                                                </Badge>
                                              )}
                                            </div>
                                            <div className="flex gap-1">
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  openDialog({
                                                    kind: "item",
                                                    sectionId: sec.id,
                                                    editing: item,
                                                  })
                                                }
                                                title="Edytuj"
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  handleDelete(
                                                    "item",
                                                    item.id,
                                                    item.name
                                                  )
                                                }
                                                title="Usuń"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===================== DIALOG UNIWERSALNY ===================== */}
      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.kind === "offerType" &&
                (dialog.editing ? "Edytuj typ oferty" : "Nowy typ oferty")}
              {dialog?.kind === "package" &&
                (dialog.editing ? "Edytuj pakiet" : "Nowy pakiet")}
              {dialog?.kind === "section" &&
                (dialog.editing ? "Edytuj sekcję" : "Nowa sekcja")}
              {dialog?.kind === "item" &&
                (dialog.editing ? "Edytuj pozycję" : "Nowa pozycja menu")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nazwa *</Label>
              <Input
                value={nameField}
                onChange={(e) => setNameField(e.target.value)}
                placeholder={
                  dialog?.kind === "offerType"
                    ? "np. Oferta Weselna"
                    : dialog?.kind === "package"
                      ? "np. Dania Główne"
                      : dialog?.kind === "section"
                        ? "np. Zupy"
                        : "np. Rosół z makaronem"
                }
              />
            </div>

            {/* Opis — dla pakietów i pozycji */}
            {(dialog?.kind === "package" || dialog?.kind === "item") && (
              <div>
                <Label>Opis (opcjonalnie)</Label>
                <Textarea
                  value={descField}
                  onChange={(e) => setDescField(e.target.value)}
                  placeholder="Dodatkowy opis..."
                />
              </div>
            )}

            {/* Cena — dla pakietów, sekcji i pozycji */}
            {dialog?.kind !== "offerType" && (
              <div>
                <Label>Cena (PLN) — puste = w cenie</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={priceField}
                  onChange={(e) => setPriceField(e.target.value)}
                  placeholder="np. 45.00 (puste = w cenie pakietu)"
                />
              </div>
            )}

            {/* Tryb wyboru — tylko dla sekcji */}
            {dialog?.kind === "section" && (
              <>
                <div>
                  <Label>Tryb wyboru</Label>
                  <Select
                    value={modeField}
                    onValueChange={(v) =>
                      setModeField(v as "ALL_INCLUDED" | "CHOOSE_X_FROM_Y")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_INCLUDED">
                        Wszystko w cenie
                      </SelectItem>
                      <SelectItem value="CHOOSE_X_FROM_Y">
                        Wybierz X z Y
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {modeField === "CHOOSE_X_FROM_Y" && (
                  <div>
                    <Label>Ile pozycji klient wybiera? *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={countField}
                      onChange={(e) => setCountField(e.target.value)}
                      placeholder="np. 1"
                    />
                  </div>
                )}
              </>
            )}

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
