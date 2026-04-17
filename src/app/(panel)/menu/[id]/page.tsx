"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Save,
  ChevronDown,
  ChevronRight,
  Package,
  Layers,
  CookingPot,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
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

interface MenuItemType {
  id: string;
  name: string;
  description: string | null;
  price: string;
  vatRate: number;
  isActive: boolean;
}

interface SectionType {
  id: string;
  name: string;
  selectionMode: "ALL_INCLUDED" | "CHOOSE_X_FROM_Y";
  selectionCount: number | null;
  price: string;
  vatRate: number;
  isActive: boolean;
  items: MenuItemType[];
}

interface PackageType {
  id: string;
  name: string;
  description: string | null;
  price: string;
  vatRate: number;
  isActive: boolean;
  sections: SectionType[];
}

interface OfferTypeDetail {
  id: string;
  name: string;
  isActive: boolean;
  packages: PackageType[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type InlineFormKind =
  | { kind: "package"; packageId?: string }
  | { kind: "section"; packageId: string; sectionId?: string }
  | { kind: "item"; sectionId: string; itemId?: string };

function isTemp(id: string) {
  return id.startsWith("temp_");
}

// ===================== INLINE FORM — sekcja/pozycja (prosty) =====================

function InlineForm({
  kind,
  isEdit,
  nameField, setNameField,
  descField, setDescField,
  priceField, setPriceField,
  vatField, setVatField,
  modeField, setModeField,
  countField, setCountField,
  onConfirm,
  onCancel,
}: {
  kind: "section" | "item";
  isEdit: boolean;
  nameField: string; setNameField: (v: string) => void;
  descField: string; setDescField: (v: string) => void;
  priceField: string; setPriceField: (v: string) => void;
  vatField: string; setVatField: (v: string) => void;
  modeField: "ALL_INCLUDED" | "CHOOSE_X_FROM_Y"; setModeField: (v: "ALL_INCLUDED" | "CHOOSE_X_FROM_Y") => void;
  countField: string; setCountField: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const bgColor = kind === "section" ? "bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-800"
    : "bg-orange-50/80 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800";

  const iconBg = kind === "section" ? "bg-green-100 dark:bg-green-900/50"
    : "bg-orange-100 dark:bg-orange-900/30";

  const Icon = kind === "section" ? Layers : CookingPot;
  const iconColor = kind === "section" ? "text-green-600" : "text-orange-500";

  const title = kind === "section"
    ? (isEdit ? "Edytuj sekcję" : "Nowa sekcja")
    : (isEdit ? "Edytuj pozycję" : "Nowa pozycja menu");

  const placeholder = kind === "section" ? "np. Zupy" : "np. Rosół z makaronem";

  return (
    <div className={`rounded-xl border-2 border-dashed p-4 space-y-4 ${bgColor}`}>
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <span className="font-semibold text-sm">{title}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={kind === "item" ? "" : "sm:col-span-2"}>
          <Label className="text-xs font-medium">Nazwa *</Label>
          <Input
            value={nameField}
            onChange={(e) => setNameField(e.target.value)}
            placeholder={placeholder}
            className="mt-1 h-9 rounded-lg text-sm"
            autoFocus
          />
        </div>

        {kind === "item" && (
          <div className="sm:col-span-2">
            <Label className="text-xs font-medium">Opis</Label>
            <Textarea
              value={descField}
              onChange={(e) => setDescField(e.target.value)}
              placeholder="Opcjonalny opis..."
              className="mt-1 rounded-lg text-sm min-h-[60px]"
            />
          </div>
        )}

        <div>
          <Label className="text-xs font-medium">Cena netto (PLN)</Label>
          <PriceInput
            value={priceField}
            onChange={(next) => setPriceField(next)}
            placeholder="0,00"
            className="mt-1 h-9 rounded-lg text-sm"
          />
        </div>

        <div>
          <Label className="text-xs font-medium">VAT</Label>
          <Select value={vatField} onValueChange={(v) => v && setVatField(v)}>
            <SelectTrigger className="mt-1 h-9 rounded-lg text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="8">8%</SelectItem>
              <SelectItem value="23">23%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {kind === "section" && (
          <>
            <div>
              <Label className="text-xs font-medium">Tryb wyboru</Label>
              <Select
                value={modeField}
                onValueChange={(v) => v && setModeField(v as "ALL_INCLUDED" | "CHOOSE_X_FROM_Y")}
              >
                <SelectTrigger className="mt-1 h-9 rounded-lg text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_INCLUDED">Wszystko w cenie</SelectItem>
                  <SelectItem value="CHOOSE_X_FROM_Y">Klient wybiera</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {modeField === "CHOOSE_X_FROM_Y" && (
              <div>
                <Label className="text-xs font-medium">Ile wybiera? *</Label>
                <Input
                  type="number" min="1"
                  value={countField}
                  onChange={(e) => setCountField(e.target.value)}
                  className="mt-1 h-9 rounded-lg text-sm"
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-lg h-8 px-3 text-xs">
          <X className="mr-1 h-3.5 w-3.5" />
          Anuluj
        </Button>
        <Button size="sm" onClick={onConfirm} className="rounded-lg h-8 px-4 text-xs">
          <Check className="mr-1 h-3.5 w-3.5" />
          {isEdit ? "Zapisz" : "Dodaj"}
        </Button>
      </div>
    </div>
  );
}

// ===================== PAKIET INLINE FORM (z sekcjami i pozycjami) =====================

interface DraftItem {
  name: string;
  description: string;
  price: string;
  vatRate: string;
}

interface DraftSection {
  name: string;
  price: string;
  vatRate: string;
  selectionMode: "ALL_INCLUDED" | "CHOOSE_X_FROM_Y";
  selectionCount: string;
  items: DraftItem[];
}

function PackageInlineForm({
  isEdit,
  initialName,
  initialDesc,
  initialPrice,
  initialVat,
  initialSections,
  onConfirm,
  onCancel,
}: {
  isEdit: boolean;
  initialName: string;
  initialDesc: string;
  initialPrice: string;
  initialVat: string;
  initialSections?: DraftSection[];
  onConfirm: (pkg: { name: string; description: string; price: string; vatRate: string; sections: DraftSection[] }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [desc, setDesc] = useState(initialDesc);
  const [price, setPrice] = useState(initialPrice);
  const [vat, setVat] = useState(initialVat);
  const [sections, setSections] = useState<DraftSection[]>(
    initialSections || []
  );
  const [flashItem, setFlashItem] = useState<string | null>(null);
  const itemNameRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function addSection() {
    setSections((prev) => [...prev, {
      name: "",
      price: "0",
      vatRate: "8",
      selectionMode: "ALL_INCLUDED",
      selectionCount: "",
      items: [],
    }]);
  }

  function removeSection(idx: number) {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateSection(idx: number, field: string, value: string) {
    setSections((prev) => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  }

  function addItem(secIdx: number) {
    const key = `${secIdx}_${sections[secIdx]?.items.length || 0}`;
    setSections((prev) => prev.map((s, i) =>
      i === secIdx ? { ...s, items: [...s.items, { name: "", description: "", price: "0", vatRate: "8" }] } : s
    ));
    // Focus nowy input po renderze
    setTimeout(() => {
      itemNameRefs.current[key]?.focus();
    }, 50);
  }

  function handleItemEnter(e: React.KeyboardEvent, secIdx: number, itemIdx: number) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const item = sections[secIdx]?.items[itemIdx];
    if (!item?.name.trim()) return;
    // Flash potwierdzenie na bieżącej pozycji
    const currentKey = `${secIdx}_${itemIdx}`;
    setFlashItem(currentKey);
    setTimeout(() => setFlashItem(null), 600);
    // Dodaj nową pozycję
    addItem(secIdx);
  }

  function removeItem(secIdx: number, itemIdx: number) {
    setSections((prev) => prev.map((s, i) =>
      i === secIdx ? { ...s, items: s.items.filter((_, j) => j !== itemIdx) } : s
    ));
  }

  function updateItem(secIdx: number, itemIdx: number, field: string, value: string) {
    setSections((prev) => prev.map((s, i) =>
      i === secIdx ? { ...s, items: s.items.map((it, j) => j === itemIdx ? { ...it, [field]: value } : it) } : s
    ));
  }

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Nazwa pakietu jest wymagana");
      return;
    }
    for (let si = 0; si < sections.length; si++) {
      if (!sections[si].name.trim()) {
        toast.error(`Sekcja ${si + 1}: nazwa jest wymagana`);
        return;
      }
      for (let ii = 0; ii < sections[si].items.length; ii++) {
        if (!sections[si].items[ii].name.trim()) {
          toast.error(`Sekcja "${sections[si].name}" → pozycja ${ii + 1}: nazwa jest wymagana`);
          return;
        }
      }
    }
    onConfirm({ name, description: desc, price, vatRate: vat, sections });
  }

  return (
    <div className="rounded-xl border-2 border-dashed p-5 space-y-5 bg-blue-50/80 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
      {/* Naglowek pakietu */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg p-2 bg-blue-100 dark:bg-blue-900/50">
          <Package className="h-5 w-5 text-blue-600" />
        </div>
        <span className="font-bold text-base">{isEdit ? "Edytuj pakiet" : "Nowy pakiet"}</span>
      </div>

      {/* Pola pakietu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs font-medium">Nazwa pakietu *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-9 rounded-lg text-sm" autoFocus />
        </div>
        <div className="sm:col-span-1 flex gap-3">
          <div className="flex-1">
            <Label className="text-xs font-medium">Cena netto</Label>
            <PriceInput value={price} onChange={(next) => setPrice(next)} placeholder="0,00" className="mt-1 h-9 rounded-lg text-sm" />
          </div>
          <div className="w-24">
            <Label className="text-xs font-medium">VAT</Label>
            <Select value={vat} onValueChange={(v) => v && setVat(v)}>
              <SelectTrigger className="mt-1 h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8%</SelectItem>
                <SelectItem value="23">23%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs font-medium">Opis</Label>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Opcjonalny opis..." className="mt-1 rounded-lg text-sm min-h-[50px]" />
        </div>
      </div>

      {/* Sekcje */}
      {sections.length > 0 && (
        <div className="space-y-4">
          {sections.map((sec, si) => (
            <div key={si} className="rounded-xl border-2 border-dashed p-4 space-y-3 bg-green-50/80 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg p-1.5 bg-green-100 dark:bg-green-900/50">
                    <Layers className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="font-semibold text-sm">Sekcja {si + 1}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive text-xs" onClick={() => removeSection(si)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-medium">Nazwa sekcji *</Label>
                  <Input value={sec.name} onChange={(e) => updateSection(si, "name", e.target.value)} className="mt-1 h-9 rounded-lg text-sm" />
                </div>
                <div>
                  <Label className="text-xs font-medium">Cena netto</Label>
                  <PriceInput value={sec.price} onChange={(next) => updateSection(si, "price", next)} placeholder="0,00" className="mt-1 h-9 rounded-lg text-sm" />
                </div>
                <div>
                  <Label className="text-xs font-medium">VAT</Label>
                  <Select value={sec.vatRate} onValueChange={(v) => v && updateSection(si, "vatRate", v)}>
                    <SelectTrigger className="mt-1 h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8%</SelectItem>
                      <SelectItem value="23">23%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium">Tryb wyboru</Label>
                  <Select value={sec.selectionMode} onValueChange={(v) => v && updateSection(si, "selectionMode", v)}>
                    <SelectTrigger className="mt-1 h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL_INCLUDED">Wszystko w cenie</SelectItem>
                      <SelectItem value="CHOOSE_X_FROM_Y">Klient wybiera</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {sec.selectionMode === "CHOOSE_X_FROM_Y" && (
                  <div>
                    <Label className="text-xs font-medium">Ile wybiera? *</Label>
                    <Input type="number" min="1" value={sec.selectionCount} onChange={(e) => updateSection(si, "selectionCount", e.target.value)} className="mt-1 h-9 rounded-lg text-sm" />
                  </div>
                )}
              </div>

              {/* Pozycje w sekcji */}
              {sec.items.length > 0 && (
                <div className="space-y-2 pl-2">
                  {sec.items.map((item, ii) => (
                    <div key={ii} className={`rounded-lg border border-dashed p-3 bg-orange-50/80 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 transition-all duration-300 ${flashItem === `${si}_${ii}` ? "ring-2 ring-green-400 bg-green-50/60 dark:bg-green-950/20" : ""}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="rounded p-1 bg-orange-100 dark:bg-orange-900/30">
                            <CookingPot className="h-3.5 w-3.5 text-orange-500" />
                          </div>
                          <span className="font-medium text-xs">
                            Pozycja {ii + 1}
                            {flashItem === `${si}_${ii}` && <span className="ml-2 text-green-600">✓</span>}
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-destructive hover:text-destructive text-xs" onClick={() => removeItem(si, ii)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                        <div className="sm:col-span-2">
                          <Input
                            ref={(el) => { itemNameRefs.current[`${si}_${ii}`] = el; }}
                            value={item.name}
                            onChange={(e) => updateItem(si, ii, "name", e.target.value)}
                            onKeyDown={(e) => handleItemEnter(e, si, ii)}
                            placeholder="Nazwa pozycji * (Enter → następna)"
                            className="h-8 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <PriceInput value={item.price} onChange={(next) => updateItem(si, ii, "price", next)} placeholder="Cena" className="h-8 rounded-lg text-xs" />
                        </div>
                        <div>
                          <Select value={item.vatRate} onValueChange={(v) => v && updateItem(si, ii, "vatRate", v)}>
                            <SelectTrigger className="h-8 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="8">8%</SelectItem>
                              <SelectItem value="23">23%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-4">
                          <Input value={item.description} onChange={(e) => updateItem(si, ii, "description", e.target.value)} placeholder="Opis (opcjonalnie)" className="h-8 rounded-lg text-xs" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <Button variant="ghost" size="sm" className="rounded-lg text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 text-xs h-7" onClick={() => addItem(si)}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Dodaj pozycję menu
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Dodaj sekcje */}
      <Button
        variant="outline" size="sm"
        className="rounded-xl border-2 border-dashed border-green-300/60 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-700/40 dark:text-green-400 w-full py-2.5 text-xs"
        onClick={addSection}
      >
        <Plus className="mr-1.5 h-4 w-4" />
        Dodaj sekcję
      </Button>

      {/* Przyciski akcji */}
      <div className="flex justify-end gap-2 pt-1 border-t border-blue-200/50 dark:border-blue-800/50">
        <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-lg h-8 px-3 text-xs mt-3">
          <X className="mr-1 h-3.5 w-3.5" />
          Anuluj
        </Button>
        <Button size="sm" onClick={handleSubmit} className="rounded-lg h-8 px-4 text-xs mt-3">
          <Check className="mr-1 h-3.5 w-3.5" />
          {isEdit ? "Zapisz pakiet" : "Dodaj pakiet"}
        </Button>
      </div>
    </div>
  );
}

// ===================== KOMPONENT GLOWNY =====================

export default function MenuEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, mutate } = useSWR<OfferTypeDetail>(
    `/api/menu/offer-types/${id}`,
    fetcher
  );

  const [localPackages, setLocalPackages] = useState<PackageType[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [inlineForm, setInlineForm] = useState<InlineFormKind | null>(null);
  const [saving, setSaving] = useState(false);
  const originalRef = useRef<PackageType[]>([]);

  // Form fields (for section/item inline edit)
  const [nameField, setNameField] = useState("");
  const [descField, setDescField] = useState("");
  const [priceField, setPriceField] = useState("0");
  const [vatField, setVatField] = useState("8");
  const [modeField, setModeField] = useState<"ALL_INCLUDED" | "CHOOSE_X_FROM_Y">("ALL_INCLUDED");
  const [countField, setCountField] = useState("");

  // Sync SWR → local state
  useEffect(() => {
    if (data) {
      const normalized = data.packages.map((pkg) => ({
        ...pkg,
        price: pkg.price || "0",
        vatRate: pkg.vatRate ?? 23,
        sections: pkg.sections.map((sec) => ({
          ...sec,
          price: sec.price || "0",
          vatRate: sec.vatRate ?? 23,
          items: sec.items.map((item) => ({
            ...item,
            price: item.price || "0",
            vatRate: item.vatRate ?? 23,
          })),
        })),
      }));
      setLocalPackages(normalized);
      originalRef.current = JSON.parse(JSON.stringify(normalized));
      setHasChanges(false);
    }
  }, [data]);

  // beforeunload warning
  useEffect(() => {
    if (!hasChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasChanges]);

  function toggle(nodeId: string) {
    setExpanded((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  }

  // ===================== INLINE FORM LOGIC =====================

  function openInlineForm(d: InlineFormKind) {
    setInlineForm(d);
    if (d.kind === "section") {
      const pkg = localPackages.find((p) => p.id === d.packageId);
      const editing = d.sectionId ? pkg?.sections.find((s) => s.id === d.sectionId) : null;
      setNameField(editing?.name || "");
      setPriceField(editing?.price || "0");
      setVatField((editing?.vatRate ?? 8).toString());
      setModeField(editing?.selectionMode || "ALL_INCLUDED");
      setCountField(editing?.selectionCount?.toString() || "");
    } else if (d.kind === "item") {
      const sec = localPackages.flatMap((p) => p.sections).find((s) => s.id === d.sectionId);
      const editing = d.itemId ? sec?.items.find((i) => i.id === d.itemId) : null;
      setNameField(editing?.name || "");
      setDescField(editing?.description || "");
      setPriceField(editing?.price || "0");
      setVatField((editing?.vatRate ?? 8).toString());
    }
  }

  function handleInlineConfirm() {
    if (!nameField.trim()) {
      toast.error("Nazwa jest wymagana");
      return;
    }
    if (!inlineForm) return;

    const price = priceField || "0";
    const vatRate = parseInt(vatField) || 23;

    if (inlineForm.kind === "section") {
      const selectionCount =
        modeField === "CHOOSE_X_FROM_Y" ? parseInt(countField) || 1 : null;

      if (inlineForm.sectionId) {
        setLocalPackages((prev) =>
          prev.map((p) =>
            p.id === inlineForm.packageId
              ? {
                  ...p,
                  sections: p.sections.map((s) =>
                    s.id === inlineForm.sectionId
                      ? { ...s, name: nameField, price, vatRate, selectionMode: modeField, selectionCount }
                      : s
                  ),
                }
              : p
          )
        );
      } else {
        const newSec: SectionType = {
          id: `temp_${Date.now()}`,
          name: nameField,
          selectionMode: modeField,
          selectionCount,
          price,
          vatRate,
          isActive: true,
          items: [],
        };
        setLocalPackages((prev) =>
          prev.map((p) =>
            p.id === inlineForm.packageId
              ? { ...p, sections: [...p.sections, newSec] }
              : p
          )
        );
        setExpanded((prev) => ({ ...prev, [newSec.id]: true }));
      }
    } else if (inlineForm.kind === "item") {
      if (inlineForm.itemId) {
        setLocalPackages((prev) =>
          prev.map((p) => ({
            ...p,
            sections: p.sections.map((s) =>
              s.id === inlineForm.sectionId
                ? {
                    ...s,
                    items: s.items.map((i) =>
                      i.id === inlineForm.itemId
                        ? { ...i, name: nameField, description: descField || null, price, vatRate }
                        : i
                    ),
                  }
                : s
            ),
          }))
        );
      } else {
        const newItem: MenuItemType = {
          id: `temp_${Date.now()}`,
          name: nameField,
          description: descField || null,
          price,
          vatRate,
          isActive: true,
        };
        setLocalPackages((prev) =>
          prev.map((p) => ({
            ...p,
            sections: p.sections.map((s) =>
              s.id === inlineForm.sectionId
                ? { ...s, items: [...s.items, newItem] }
                : s
            ),
          }))
        );
      }
    }

    setHasChanges(true);
    setInlineForm(null);
  }

  // Pakiet: confirm z PackageInlineForm
  function handlePackageFormConfirm(
    pkgData: { name: string; description: string; price: string; vatRate: string; sections: DraftSection[] },
    editingPkgId?: string,
  ) {
    const vatRate = parseInt(pkgData.vatRate) || 23;
    const now = Date.now();

    const newSections: SectionType[] = pkgData.sections.map((ds, si) => ({
      id: `temp_${now}_s${si}`,
      name: ds.name,
      selectionMode: ds.selectionMode,
      selectionCount: ds.selectionMode === "CHOOSE_X_FROM_Y" ? parseInt(ds.selectionCount) || 1 : null,
      price: ds.price || "0",
      vatRate: parseInt(ds.vatRate) || 23,
      isActive: true,
      items: ds.items.map((di, ii) => ({
        id: `temp_${now}_s${si}_i${ii}`,
        name: di.name,
        description: di.description || null,
        price: di.price || "0",
        vatRate: parseInt(di.vatRate) || 23,
        isActive: true,
      })),
    }));

    if (editingPkgId) {
      // Edycja — zachowaj istniejące sekcje, dodaj nowe z draftu
      setLocalPackages((prev) =>
        prev.map((p) =>
          p.id === editingPkgId
            ? {
                ...p,
                name: pkgData.name,
                description: pkgData.description || null,
                price: pkgData.price || "0",
                vatRate,
                sections: [...p.sections, ...newSections],
              }
            : p
        )
      );
    } else {
      // Nowy pakiet
      const newPkg: PackageType = {
        id: `temp_${now}`,
        name: pkgData.name,
        description: pkgData.description || null,
        price: pkgData.price || "0",
        vatRate,
        isActive: true,
        sections: newSections,
      };
      setLocalPackages((prev) => [...prev, newPkg]);
      // Expand nowy pakiet i sekcje
      const expMap: Record<string, boolean> = { [newPkg.id]: true };
      newSections.forEach((s) => { expMap[s.id] = true; });
      setExpanded((prev) => ({ ...prev, ...expMap }));
    }

    setHasChanges(true);
    setInlineForm(null);
  }

  function handleLocalDelete(kind: "package" | "section" | "item", deleteId: string, parentId?: string) {
    if (kind === "package") {
      setLocalPackages((prev) => prev.filter((p) => p.id !== deleteId));
    } else if (kind === "section") {
      setLocalPackages((prev) =>
        prev.map((p) => ({
          ...p,
          sections: p.sections.filter((s) => s.id !== deleteId),
        }))
      );
    } else if (kind === "item") {
      setLocalPackages((prev) =>
        prev.map((p) => ({
          ...p,
          sections: p.sections.map((s) =>
            s.id === parentId
              ? { ...s, items: s.items.filter((i) => i.id !== deleteId) }
              : s
          ),
        }))
      );
    }
    setHasChanges(true);
  }

  // ===================== BULK SAVE =====================

  const bulkSave = useCallback(async () => {
    setSaving(true);
    try {
      const original = originalRef.current;
      const origPkgIds = new Set(original.map((p) => p.id));
      const localPkgIds = new Set(localPackages.map((p) => p.id));

      // 1. Delete removed packages
      for (const origPkg of original) {
        if (!localPkgIds.has(origPkg.id)) {
          await fetch(`/api/menu/packages/${origPkg.id}`, { method: "DELETE" });
        }
      }

      // 2. Delete removed sections
      for (const origPkg of original) {
        if (!localPkgIds.has(origPkg.id)) continue;
        const localPkg = localPackages.find((p) => p.id === origPkg.id);
        if (!localPkg) continue;
        const localSecIds = new Set(localPkg.sections.map((s) => s.id));
        for (const origSec of origPkg.sections) {
          if (!localSecIds.has(origSec.id)) {
            await fetch(`/api/menu/sections/${origSec.id}`, { method: "DELETE" });
          }
        }
      }

      // 3. Delete removed items
      for (const origPkg of original) {
        if (!localPkgIds.has(origPkg.id)) continue;
        const localPkg = localPackages.find((p) => p.id === origPkg.id);
        if (!localPkg) continue;
        for (const origSec of origPkg.sections) {
          const localSec = localPkg.sections.find((s) => s.id === origSec.id);
          if (!localSec) continue;
          const localItemIds = new Set(localSec.items.map((i) => i.id));
          for (const origItem of origSec.items) {
            if (!localItemIds.has(origItem.id)) {
              await fetch(`/api/menu/items/${origItem.id}`, { method: "DELETE" });
            }
          }
        }
      }

      // 4. Create/update packages
      const pkgIdMap: Record<string, string> = {};

      for (const pkg of localPackages) {
        if (isTemp(pkg.id)) {
          const res = await fetch("/api/menu/packages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              offerTypeId: id,
              name: pkg.name,
              description: pkg.description || undefined,
              price: pkg.price || "0",
              vatRate: pkg.vatRate,
            }),
          });
          if (!res.ok) throw new Error("Błąd tworzenia pakietu");
          const created = await res.json();
          pkgIdMap[pkg.id] = created.id;
        } else {
          pkgIdMap[pkg.id] = pkg.id;
          const origPkg = original.find((p) => p.id === pkg.id);
          if (
            origPkg &&
            (origPkg.name !== pkg.name ||
              origPkg.description !== pkg.description ||
              origPkg.price !== pkg.price ||
              origPkg.vatRate !== pkg.vatRate)
          ) {
            await fetch(`/api/menu/packages/${pkg.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: pkg.name,
                description: pkg.description || undefined,
                price: pkg.price || "0",
                vatRate: pkg.vatRate,
              }),
            });
          }
        }
      }

      // Sections
      const secIdMap: Record<string, string> = {};

      for (const pkg of localPackages) {
        const realPkgId = pkgIdMap[pkg.id];
        for (const sec of pkg.sections) {
          if (isTemp(sec.id)) {
            const res = await fetch("/api/menu/sections", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                packageId: realPkgId,
                name: sec.name,
                selectionMode: sec.selectionMode,
                selectionCount: sec.selectionCount,
                price: sec.price || "0",
                vatRate: sec.vatRate,
              }),
            });
            if (!res.ok) throw new Error("Błąd tworzenia sekcji");
            const created = await res.json();
            secIdMap[sec.id] = created.id;
          } else {
            secIdMap[sec.id] = sec.id;
            const origPkg = original.find((p) => p.id === pkg.id);
            const origSec = origPkg?.sections.find((s) => s.id === sec.id);
            if (
              origSec &&
              (origSec.name !== sec.name ||
                origSec.price !== sec.price ||
                origSec.vatRate !== sec.vatRate ||
                origSec.selectionMode !== sec.selectionMode ||
                origSec.selectionCount !== sec.selectionCount)
            ) {
              await fetch(`/api/menu/sections/${sec.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: sec.name,
                  selectionMode: sec.selectionMode,
                  selectionCount: sec.selectionCount,
                  price: sec.price || "0",
                  vatRate: sec.vatRate,
                }),
              });
            }
          }
        }
      }

      // Items
      for (const pkg of localPackages) {
        for (const sec of pkg.sections) {
          const realSecId = secIdMap[sec.id];
          for (const item of sec.items) {
            if (isTemp(item.id)) {
              const res = await fetch("/api/menu/items", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  sectionId: realSecId,
                  name: item.name,
                  description: item.description || undefined,
                  price: item.price || "0",
                  vatRate: item.vatRate,
                }),
              });
              if (!res.ok) throw new Error("Błąd tworzenia pozycji");
            } else {
              const origPkg = original.find((p) => p.id === pkg.id);
              const origSec = origPkg?.sections.find((s) => s.id === sec.id);
              const origItem = origSec?.items.find((i) => i.id === item.id);
              if (
                origItem &&
                (origItem.name !== item.name ||
                  origItem.description !== item.description ||
                  origItem.price !== item.price ||
                  origItem.vatRate !== item.vatRate)
              ) {
                await fetch(`/api/menu/items/${item.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: item.name,
                    description: item.description || undefined,
                    price: item.price || "0",
                    vatRate: item.vatRate,
                  }),
                });
              }
            }
          }
        }
      }

      toast.success("Zapisano wszystkie zmiany");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }, [localPackages, id, mutate]);

  const formProps = {
    nameField, setNameField,
    descField, setDescField,
    priceField, setPriceField,
    vatField, setVatField,
    modeField, setModeField,
    countField, setCountField,
    onConfirm: handleInlineConfirm,
    onCancel: () => setInlineForm(null),
  };

  if (!data) {
    return <p className="text-muted-foreground p-8">Ładowanie...</p>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/menu">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{data.name}</h1>
            <p className="text-sm text-muted-foreground">
              {localPackages.length}{" "}
              {localPackages.length === 1 ? "pakiet" : localPackages.length < 5 ? "pakiety" : "pakietów"}
            </p>
          </div>
        </div>
        <Button
          size="lg"
          className="rounded-xl shadow-md"
          onClick={bulkSave}
          disabled={!hasChanges || saving}
        >
          <Save className="mr-2 h-5 w-5" />
          {saving ? "Zapisywanie..." : "Zapisz zmiany"}
        </Button>
      </div>

      {/* Unsaved changes banner */}
      {hasChanges && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          Masz niezapisane zmiany
        </div>
      )}

      {/* Add package button */}
      {!(inlineForm?.kind === "package" && !inlineForm.packageId) && (
        <Button
          size="lg"
          variant="outline"
          className="rounded-xl"
          onClick={() => setInlineForm({ kind: "package" })}
        >
          <Plus className="mr-2 h-5 w-5" />
          Dodaj pakiet
        </Button>
      )}

      {/* Inline form: nowy pakiet */}
      {inlineForm?.kind === "package" && !inlineForm.packageId && (
        <PackageInlineForm
          isEdit={false}
          initialName=""
          initialDesc=""
          initialPrice="0"
          initialVat="23"
          onConfirm={(pkgData) => handlePackageFormConfirm(pkgData)}
          onCancel={() => setInlineForm(null)}
        />
      )}

      {localPackages.length === 0 && !(inlineForm?.kind === "package" && !inlineForm.packageId) ? (
        <div className="rounded-2xl border-2 border-dashed border-muted-foreground/20 p-12 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-lg">Brak pakietów</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Kliknij &quot;Dodaj pakiet&quot; aby zacząć budować ofertę menu
          </p>
        </div>
      ) : localPackages.length > 0 ? (
        <div className="space-y-6">
          {localPackages.map((pkg) => {
            const isExpanded = expanded[pkg.id];
            const totalItems = pkg.sections.reduce((s, sec) => s + sec.items.length, 0);
            const isNew = isTemp(pkg.id);
            const isEditingThisPkg = inlineForm?.kind === "package" && inlineForm.packageId === pkg.id;

            // Edycja pakietu — PackageInlineForm
            if (isEditingThisPkg) {
              return (
                <PackageInlineForm
                  key={pkg.id}
                  isEdit={true}
                  initialName={pkg.name}
                  initialDesc={pkg.description || ""}
                  initialPrice={pkg.price}
                  initialVat={pkg.vatRate.toString()}
                  onConfirm={(pkgData) => handlePackageFormConfirm(pkgData, pkg.id)}
                  onCancel={() => setInlineForm(null)}
                />
              );
            }

            return (
              <Card
                key={pkg.id}
                className={`rounded-2xl shadow-md overflow-hidden border-0 ${isNew ? "ring-2 ring-blue-300 dark:ring-blue-700" : ""}`}
              >
                {/* Package header */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-b">
                  <div className="p-5 flex items-start justify-between">
                    <button
                      onClick={() => toggle(pkg.id)}
                      className="flex items-start gap-4 text-left"
                    >
                      <div className="rounded-xl bg-blue-100 dark:bg-blue-900/50 p-3 mt-0.5">
                        <Package className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-foreground">
                            {pkg.name}
                          </h2>
                          {isNew && (
                            <Badge className="bg-blue-500 text-white border-0 text-xs">
                              Nowy
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                            {Number(pkg.price).toFixed(2)} zł
                          </span>
                          <Badge className="bg-blue-200/80 text-blue-800 dark:bg-blue-800 dark:text-blue-200 border-0 text-sm px-2.5">
                            VAT {pkg.vatRate}%
                          </Badge>
                        </div>
                        {!isExpanded && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {pkg.sections.length}{" "}
                            {pkg.sections.length === 1 ? "sekcja" : pkg.sections.length < 5 ? "sekcje" : "sekcji"}
                            {" · "}{totalItems} pozycji
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => setInlineForm({ kind: "package", packageId: pkg.id })}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Edytuj
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => handleLocalDelete("package", pkg.id)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Usuń
                      </Button>
                      <button onClick={() => toggle(pkg.id)} className="ml-2 p-1">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Package content */}
                {isExpanded && (
                  <CardContent className="p-5 space-y-5">
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground italic">{pkg.description}</p>
                    )}

                    {pkg.sections.map((sec) => {
                      const secExpanded = expanded[sec.id] !== false;
                      const secIsNew = isTemp(sec.id);
                      const isEditingThisSec = inlineForm?.kind === "section" && inlineForm.sectionId === sec.id;

                      if (isEditingThisSec) {
                        return (
                          <InlineForm key={sec.id} kind="section" isEdit={true} {...formProps} />
                        );
                      }

                      return (
                        <div
                          key={sec.id}
                          className={`rounded-xl border-2 overflow-hidden ${secIsNew ? "border-green-400 dark:border-green-600" : "border-green-200/60 dark:border-green-800/40"}`}
                        >
                          {/* Section header */}
                          <div className="bg-green-50/80 dark:bg-green-950/20 px-4 py-3 flex items-center justify-between">
                            <button
                              onClick={() => toggle(sec.id)}
                              className="flex items-center gap-3 text-left flex-wrap"
                            >
                              <div className="rounded-lg bg-green-100 dark:bg-green-900/50 p-2">
                                <Layers className="h-4 w-4 text-green-600" />
                              </div>
                              <span className="font-semibold text-base">{sec.name}</span>
                              {secIsNew && (
                                <Badge className="bg-green-500 text-white border-0 text-xs">Nowy</Badge>
                              )}
                              <Badge
                                variant="outline"
                                className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400 text-xs"
                              >
                                {sec.selectionMode === "ALL_INCLUDED"
                                  ? "Wszystko w cenie"
                                  : `Klient wybiera ${sec.selectionCount}`}
                              </Badge>
                              <span className="inline-flex items-center gap-1.5">
                                <span className="font-semibold text-green-700 dark:text-green-400">
                                  {Number(sec.price).toFixed(2)} zł
                                </span>
                                <Badge className="bg-green-200/80 text-green-800 dark:bg-green-800 dark:text-green-200 border-0 text-xs px-2">
                                  {sec.vatRate}%
                                </Badge>
                              </span>
                            </button>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost" size="sm" className="h-8 rounded-lg"
                                onClick={() => openInlineForm({ kind: "section", packageId: pkg.id, sectionId: sec.id })}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                className="h-8 rounded-lg text-destructive hover:text-destructive"
                                onClick={() => handleLocalDelete("section", sec.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              <button onClick={() => toggle(sec.id)} className="p-1">
                                {secExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                              </button>
                            </div>
                          </div>

                          {/* Items */}
                          {secExpanded && (
                            <div className="bg-white dark:bg-card">
                              {sec.items.length === 0 && !(inlineForm?.kind === "item" && inlineForm.sectionId === sec.id && !inlineForm.itemId) ? (
                                <p className="px-4 py-4 text-sm text-muted-foreground text-center">
                                  Brak pozycji menu
                                </p>
                              ) : (
                                <div className="divide-y">
                                  {sec.items.map((item) => {
                                    const itemIsNew = isTemp(item.id);
                                    const isEditingThisItem = inlineForm?.kind === "item" && inlineForm.itemId === item.id;

                                    if (isEditingThisItem) {
                                      return (
                                        <div key={item.id} className="px-4 py-3">
                                          <InlineForm kind="item" isEdit={true} {...formProps} />
                                        </div>
                                      );
                                    }

                                    return (
                                      <div
                                        key={item.id}
                                        className={`px-4 py-3 flex items-center justify-between hover:bg-orange-50/40 dark:hover:bg-orange-950/10 transition-colors ${itemIsNew ? "bg-orange-50/60 dark:bg-orange-950/20" : ""}`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="rounded-lg bg-orange-100 dark:bg-orange-900/30 p-1.5">
                                            <CookingPot className="h-3.5 w-3.5 text-orange-500" />
                                          </div>
                                          <div>
                                            <span className="text-sm font-medium">{item.name}</span>
                                            {itemIsNew && (
                                              <Badge className="ml-2 bg-orange-500 text-white border-0 text-xs">Nowy</Badge>
                                            )}
                                            {item.description && (
                                              <p className="text-xs text-muted-foreground">{item.description}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="inline-flex items-center gap-1.5">
                                            <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">
                                              {Number(item.price).toFixed(2)} zł
                                            </span>
                                            <Badge className="bg-orange-200/80 text-orange-800 dark:bg-orange-800 dark:text-orange-200 border-0 text-xs px-2">
                                              {item.vatRate}%
                                            </Badge>
                                          </span>
                                          <div className="flex gap-0.5">
                                            <Button
                                              variant="ghost" size="icon" className="h-8 w-8 rounded-lg"
                                              onClick={() => openInlineForm({ kind: "item", sectionId: sec.id, itemId: item.id })}
                                            >
                                              <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost" size="icon"
                                              className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                                              onClick={() => handleLocalDelete("item", item.id, sec.id)}
                                            >
                                              <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Inline form: nowa pozycja */}
                              {inlineForm?.kind === "item" && inlineForm.sectionId === sec.id && !inlineForm.itemId && (
                                <div className="px-4 py-3 border-t">
                                  <InlineForm kind="item" isEdit={false} {...formProps} />
                                </div>
                              )}

                              {/* Przycisk dodaj pozycje */}
                              {!(inlineForm?.kind === "item" && inlineForm.sectionId === sec.id && !inlineForm.itemId) && (
                                <div className="px-4 py-3 border-t">
                                  <Button
                                    variant="ghost" size="sm"
                                    className="rounded-lg text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/30"
                                    onClick={() => openInlineForm({ kind: "item", sectionId: sec.id })}
                                  >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Dodaj pozycję menu
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Inline form: nowa sekcja */}
                    {inlineForm?.kind === "section" && inlineForm.packageId === pkg.id && !inlineForm.sectionId && (
                      <InlineForm kind="section" isEdit={false} {...formProps} />
                    )}

                    {/* Przycisk dodaj sekcje */}
                    {!(inlineForm?.kind === "section" && inlineForm.packageId === pkg.id && !inlineForm.sectionId) && (
                      <Button
                        variant="outline"
                        className="rounded-xl border-2 border-dashed border-green-300/60 text-green-600 hover:bg-green-50 hover:text-green-700 dark:border-green-700/40 dark:text-green-400 dark:hover:bg-green-950/20 w-full py-3"
                        onClick={() => openInlineForm({ kind: "section", packageId: pkg.id })}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Dodaj sekcję
                      </Button>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
