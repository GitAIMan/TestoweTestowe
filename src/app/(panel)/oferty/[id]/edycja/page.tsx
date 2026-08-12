"use client";

import { Fragment, use, useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Decimal from "decimal.js";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Send,
  CheckCircle,
  XCircle,
  FileDown,
  FileText,
  CalendarDays,
  Lock,
  Link2,
  Copy,
  Package,
  ChevronDown,
  ChevronRight,
  Layers,
  CookingPot,
  StickyNote,
  HelpCircle,
  GripVertical,
  Check,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PriceInput } from "@/components/ui/price-input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { StepProgressBar, type Step } from "@/components/offers/step-progress-bar";
import { AlertTriangle, Info } from "lucide-react";
import { calculatePackagePrice } from "@/lib/package-pricing";
import { useConfirm } from "@/components/ui/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface HallOption {
  id: string;
  name: string;
}

interface OfferItem {
  id: string;
  offerId: string;
  day: number;
  date: string | null;
  sortOrder: number;
  name: string;
  description: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  hallId: string | null;
  quantity: number;
  unitPrice: string;
  vatRate: number;
  sourceType: string | null;
  sourceId: string | null;
}

interface FullData {
  offer: {
    id: string;
    clientName: string;
    eventName: string | null;
    eventDateFrom: string;
    eventDateTo: string;
    adultsCount: number;
    childrenCount: number;
    totalPrice: string;
    status: string;
    notes: string | null;
    sentAt: string | null;
    offerSentConfirmedAt: string | null;
    lastItemsChangedAt: string | null;
    createdBy: { firstName: string; lastName: string };
  };
  contract: {
    id: string;
    signedAt: string | null;
    clientFullName: string;
    needsAmendment: boolean;
    contractSentConfirmedAt: string | null;
    totalAtSigning: string | null;
    createdBy: { firstName: string; lastName: string } | null;
    amendments: Array<{
      id: string;
      number: number;
      createdAt: string;
      resolvedAt: string | null;
      totalBefore: string;
      totalAfter: string;
    }>;
  } | null;
  agenda: {
    id: string;
    type: string;
    isLocked: boolean;
    clientNotifiedAt: string | null;
    createdAt: string;
    createdBy: { firstName: string; lastName: string } | null;
    tokens: Array<{ token: string; type: string }>;
  } | null;
  unansweredMessages?: number;
}

// Menu types
interface MenuItemData {
  id: string;
  name: string;
  price: string;
  vatRate: number;
  description: string | null;
}
interface SectionData {
  id: string;
  name: string;
  price: string;
  vatRate: number;
  selectionMode: string;
  selectionCount: number | null;
  items: MenuItemData[];
}
interface PackageData {
  id: string;
  name: string;
  price: string;
  vatRate: number;
  description: string | null;
  sections: SectionData[];
}
interface OfferTypeData {
  id: string;
  name: string;
  packages: PackageData[];
}

// Parsed package composition stored in description
interface PackageComposition {
  packageName: string;
  offerTypeName: string;
  sections: {
    name: string;
    mode?: string;
    count?: number | null;
    items: Array<string | { id: string; name: string }>;
  }[];
}

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "success" | "warning" | "info" }
> = {
  ROBOCZA: { label: "Robocza", variant: "secondary" },
  WYSLANA: { label: "Wysłana", variant: "info" },
  ZAAKCEPTOWANA: { label: "Zaakceptowana", variant: "success" },
  ODRZUCONA: { label: "Odrzucona", variant: "destructive" },
  WYGASLA: { label: "Wygasła", variant: "warning" },
};

function getDaysArray(from: string, to: string) {
  const days: { day: number; date: string; label: string }[] = [];
  const start = new Date(from);
  const end = new Date(to);
  let i = 1;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push({
      day: i++,
      date: d.toISOString().split("T")[0],
      label: d.toLocaleDateString("pl-PL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    });
  }
  return days;
}

function tryParseComposition(desc: string | null): PackageComposition | null {
  if (!desc) return null;
  try {
    const parsed = JSON.parse(desc);
    if (parsed.packageName && parsed.sections) return parsed;
  } catch {}
  return null;
}

// ==================== NAME INPUT WITH SUGGEST ====================

function NameInputWithSuggest({
  value,
  onChange,
  onPickMenu,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  onPickMenu: () => void;
  onEnter?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const showSuggest = focused && value.length >= 2 && "pakiety".startsWith(value.toLowerCase());

  return (
    <div className="relative">
      <Input
        className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 px-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
            onEnter();
          }
        }}
        placeholder="Wpisz nazwę pozycji..."
      />
      {showSuggest && (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-lg border bg-white dark:bg-card shadow-lg py-1">
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={onPickMenu}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-left"
          >
            <Package className="h-4 w-4 text-blue-500" />
            <span className="font-medium">Pakiety</span>
            <span className="text-xs text-muted-foreground ml-auto">z menu</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function OfferEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const confirmDialog = useConfirm();
  const { data: fullData, mutate: mutateFull } = useSWR<FullData>(
    `/api/offers/${id}/full`,
    fetcher
  );
  const { data: serverItems, mutate: mutateItems } = useSWR<OfferItem[]>(
    `/api/offers/${id}/items`,
    fetcher
  );
  const { data: halls } = useSWR<HallOption[]>("/api/halls", fetcher);
  const { data: menuData } = useSWR<OfferTypeData[]>("/api/menu/offer-types", fetcher);

  // Mapa packageId → kompozycja (fallback dla starych ofert bez description)
  const menuCompositionMap = useMemo(() => {
    const m = new Map<string, PackageComposition>();
    (menuData || []).forEach((ot) => {
      (ot.packages || []).forEach((pkg) => {
        m.set(pkg.id, {
          packageName: pkg.name,
          offerTypeName: ot.name,
          sections: (pkg.sections || []).map((s) => ({
            name: s.name,
            mode: s.selectionMode,
            count: s.selectionCount,
            items: (s.items || []).map((it) => it.name),
          })),
        });
      });
    });
    return m;
  }, [menuData]);

  const [items, setItems] = useState<OfferItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);

  // Menu picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDay, setPickerDay] = useState<{ day: number; date: string } | null>(null);
  const [pickerStep, setPickerStep] = useState<"list" | "detail">("list");
  const [pickerPkg, setPickerPkg] = useState<PackageData | null>(null);
  const [pickerOfferType, setPickerOfferType] = useState("");
  const [pickerSelected, setPickerSelected] = useState<Record<string, Set<string>>>({});

  // Expanded rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Confirm send dialog
  const [confirmSendOpen, setConfirmSendOpen] = useState(false);
  const [confirmSignOpen, setConfirmSignOpen] = useState(false);

  // Guide
  const [guideOpen, setGuideOpen] = useState(false);

  // DnD sensors — muszą być przed early-return (rules of hooks)
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (serverItems) setItems(serverItems);
  }, [serverItems]);

  useEffect(() => {
    if (fullData?.offer?.notes !== undefined) {
      setNotesValue(fullData.offer.notes || "");
    }
  }, [fullData]);

  if (!fullData) return <p className="text-muted-foreground">Ładowanie...</p>;

  const { offer, contract, agenda } = fullData;
  const days = getDaysArray(offer.eventDateFrom, offer.eventDateTo);
  const statusCfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.ROBOCZA;

  const clientToken = agenda?.tokens.find((t) => t.type === "KLIENT_AGENDA");
  const kitchenToken = agenda?.tokens.find((t) => t.type === "KUCHNIA_AGENDA");

  // ==================== ACTIONS ====================

  async function changeStatus(status: string) {
    try {
      const res = await fetch(`/api/offers/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Status zmieniony na: ${STATUS_CONFIG[status]?.label}`);
      mutateFull();
    } catch {
      toast.error("Błąd zmiany statusu");
    }
  }

  async function rejectOffer() {
    const ok = await confirmDialog({
      title: "Oznaczyć ofertę jako odrzuconą?",
      description:
        "Oferta trafi do odrzuconych. Możesz ją przywrócić w każdej chwili — nic nie zostanie usunięte.",
      confirmLabel: "Tak, odrzuć",
      variant: "destructive",
    });
    if (!ok) return;
    changeStatus("ODRZUCONA");
  }

  async function restoreOffer() {
    try {
      const res = await fetch(`/api/offers/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PRZYWROCONA" }),
      });
      if (!res.ok) throw new Error();
      toast.success("Oferta przywrócona");
      mutateFull();
    } catch {
      toast.error("Błąd przywracania oferty");
    }
  }

  async function signContract() {
    if (!contract) return;
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Umowa oznaczona jako podpisana");
      mutateFull();
    } catch {
      toast.error("Błąd");
    }
  }

  function copyLink(token: string, path: string) {
    const url = `${window.location.origin}/${path}/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link skopiowany");
  }

  async function createAgenda() {
    try {
      const res = await fetch("/api/agendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const agenda = await res.json();
      await fetch(`/api/agendas/${agenda.id}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "KLIENT_AGENDA" }),
      });
      toast.success("Agenda utworzona + link klienta wygenerowany");
      mutateFull();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd tworzenia agendy");
    }
  }

  async function deleteContract() {
    const ok = await confirmDialog({
      title: "Usunąć umowę?",
      description: "Nie będziesz mógł już wygenerować PDF tej umowy. Tej operacji nie da się cofnąć.",
      confirmLabel: "Tak, usuń",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/contracts/${contract?.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Błąd usuwania");
      toast.success("Umowa usunięta");
      mutateFull();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się usunąć umowy");
    }
  }

  async function deleteAgenda() {
    const ok = await confirmDialog({
      title: "Usunąć agendę?",
      description: "Linki klienta i kuchni przestaną działać. Tej operacji nie da się cofnąć.",
      confirmLabel: "Tak, usuń",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/agendas/${agenda?.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Błąd usuwania");
      }
      toast.success("Agenda usunięta");
      mutateFull();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się usunąć agendy");
    }
  }

  // ==================== ITEMS ====================

  function updateItem(itemId: string, field: string, value: string | number | null) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  }

  async function addItem(day: number, date: string) {
    const maxSort = items
      .filter((i) => i.day === day)
      .reduce((max, i) => Math.max(max, i.sortOrder), -1);
    try {
      // Najpierw zapisz bieżące edycje, żeby nie zgubić wpisanych wartości
      // (np. "DJ + Nagłośnienie" wpisane tuż przed kliknięciem "Dodaj pozycję")
      const saveRes = await fetch(`/api/offers/${id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!saveRes.ok) throw new Error("save");

      const res = await fetch(`/api/offers/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day,
          date,
          sortOrder: maxSort + 1,
          name: "",
          quantity: 1,
          unitPrice: "0",
          vatRate: 23,
        }),
      });
      if (!res.ok) throw new Error("create");
      mutateItems();
      mutateFull();
      toast.success("Pozycja dodana");
    } catch {
      toast.error("Błąd");
    }
  }

  async function deleteItem(itemId: string) {
    try {
      await fetch(`/api/offers/${id}/items?itemId=${itemId}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success("Usunięto");
    } catch {
      toast.error("Błąd");
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      const res = await fetch(`/api/offers/${id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      toast.success(`Zapisano! Brutto: ${result.totalPrice} zł`);
      mutateItems();
      mutateFull();
    } catch {
      toast.error("Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  // ==================== MENU PICKER ====================

  function openMenuPicker(day: number, date: string) {
    setPickerDay({ day, date });
    setPickerStep("list");
    setPickerPkg(null);
    setPickerOpen(true);
  }

  function selectPackage(pkg: PackageData, offerTypeName: string) {
    setPickerPkg(pkg);
    setPickerOfferType(offerTypeName);
    // Default: all sections and items selected
    const sel: Record<string, Set<string>> = {};
    pkg.sections.forEach((sec) => {
      sel[sec.id] = new Set(sec.items.map((i) => i.id));
    });
    setPickerSelected(sel);
    setPickerStep("detail");
  }

  function toggleSection(secId: string, allItemIds: string[]) {
    setPickerSelected((prev) => {
      const next = { ...prev };
      if (next[secId] && next[secId].size > 0) {
        next[secId] = new Set();
      } else {
        next[secId] = new Set(allItemIds);
      }
      return next;
    });
  }

  function toggleItem(secId: string, itemId: string) {
    setPickerSelected((prev) => {
      const next = { ...prev };
      const set = new Set(next[secId] || []);
      if (set.has(itemId)) {
        set.delete(itemId);
      } else {
        set.add(itemId);
      }
      next[secId] = set;
      return next;
    });
  }

  async function confirmMenuPick() {
    if (!pickerPkg || !pickerDay) return;

    // Wycena z centralnej funkcji (źródło prawdy)
    const pricing = calculatePackagePrice({
      id: pickerPkg.id,
      name: pickerPkg.name,
      price: pickerPkg.price,
      vatRate: pickerPkg.vatRate,
      sections: pickerPkg.sections.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        selectionMode: s.selectionMode,
        selectionCount: s.selectionCount,
        items: s.items.map((it) => ({ id: it.id, name: it.name, price: it.price })),
      })),
    });

    // Composition — wszystkie sekcje z pakietu (klient będzie wybierał w agendzie)
    const composition = {
      packageName: pickerPkg.name,
      offerTypeName: pickerOfferType,
      sections: pickerPkg.sections.map((s) => ({
        id: s.id,
        name: s.name,
        mode: s.selectionMode,
        count: s.selectionCount,
        items: s.items.map((it) => ({ id: it.id, name: it.name })),
      })),
      priceBreakdown: pricing.sections,
      priceSource: pricing.source,
    };

    const maxSort = items
      .filter((i) => i.day === pickerDay.day)
      .reduce((max, i) => Math.max(max, i.sortOrder), -1);

    try {
      const res = await fetch(`/api/offers/${id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          day: pickerDay.day,
          date: pickerDay.date,
          sortOrder: maxSort + 1,
          name: `${pickerPkg.name} (${pickerOfferType})`,
          description: JSON.stringify(composition),
          quantity: 1,
          unitPrice: pricing.unitPrice.toFixed(2),
          vatRate: pricing.vatRate,
          sourceType: "PACKAGE",
          sourceId: pickerPkg.id,
        }),
      });
      if (!res.ok) throw new Error();
      mutateItems();
      toast.success(`Dodano: ${pickerPkg.name} (${pricing.unitPrice.toFixed(2)} zł/os)`);
      setPickerOpen(false);
    } catch {
      toast.error("Błąd dodawania pakietu");
    }
  }

  function toggleRowExpand(itemId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  // ==================== DRAG & DROP ====================

  async function handleDragEnd(event: DragEndEvent, day: number) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const dayItems = items
      .filter((i) => i.day === day)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const oldIndex = dayItems.findIndex((i) => i.id === active.id);
    const newIndex = dayItems.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...dayItems];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const idToNewSort = new Map<string, number>();
    reordered.forEach((it, idx) => idToNewSort.set(it.id, idx));

    const newItems = items.map((it) =>
      idToNewSort.has(it.id) ? { ...it, sortOrder: idToNewSort.get(it.id)! } : it
    );
    setItems(newItems);
    // Zwiń pakiety dla przerysowania
    setExpandedRows(new Set());

    try {
      const res = await fetch(`/api/offers/${id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: newItems }),
      });
      if (!res.ok) throw new Error();
      mutateItems();
      toast.success("Kolejność zapisana");
    } catch {
      toast.error("Błąd zapisu kolejności");
    }
  }

  // ==================== TOTALS ====================

  const personCount = offer.adultsCount + offer.childrenCount;
  let totalNettoD = new Decimal(0);
  let totalVatD = new Decimal(0);
  for (const i of items) {
    const mul = i.sourceType === "PACKAGE" ? personCount : 1;
    const price = i.unitPrice === "" || i.unitPrice === "-" ? "0" : i.unitPrice;
    const netto = new Decimal(price).mul(i.quantity).mul(mul);
    totalNettoD = totalNettoD.add(netto);
    totalVatD = totalVatD.add(netto.mul(new Decimal(i.vatRate).div(100)));
  }
  const totalNetto = totalNettoD.toNumber();
  const totalVat = totalVatD.toNumber();
  const totalBrutto = totalNettoD.add(totalVatD).toNumber();

  // Blokada edycji:
  //  - pracownik może edytować DOPÓKI agenda FINALNA nie jest zatwierdzona (isLocked)
  //  - blokada 14 dni dotyczy tylko klienta (w jego widoku publicznym)
  //  - po zakończeniu wydarzenia tabela zablokowana dla wszystkich
  const eventDate = new Date(offer.eventDateFrom);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isFinished = daysLeft <= 0;
  const agendaIsFinalLocked = agenda?.type === "FINALNA" && agenda?.isLocked;
  const isLocked = Boolean(agendaIsFinalLocked) || isFinished;

  // Oblicz aktualny krok dla przewodnika
  function getCurrentStep(): number {
    // 0: Uzupełnij ofertę, 1: Wyślij, 2: Zaakceptowana, 3: Utwórz umowę,
    // 4: Oznacz podpisaną, 5: Aneksy, 6: Utwórz agendę, 7: Finalizuj
    if (offer.status === "ROBOCZA") return 0;
    if (offer.status === "WYSLANA") return 1;
    if (offer.status === "ZAAKCEPTOWANA" && !contract) return 3;
    if (contract && !contract.signedAt) return 4;
    if (contract?.signedAt && contract?.needsAmendment) return 5;
    if (contract?.signedAt && !agenda) return 6;
    if (agenda && agenda.type === "WSTEPNA") return 6;
    if (agenda && agenda.type === "FINALNA") return 7;
    return 0;
  }
  const currentStep = getCurrentStep();

  // ==================== STEP PROGRESS BAR ====================
  const agendaFinalized = agenda?.type === "FINALNA" && agenda?.isLocked;
  const progressSteps: Step[] = [
    { label: "Szkic", state: "done" },
    {
      label: "Wysłana",
      state:
        offer.status === "ROBOCZA"
          ? "current"
          : "done",
    },
    {
      label: "Zaakcept.",
      state:
        offer.status === "ZAAKCEPTOWANA" || contract || agenda
          ? "done"
          : offer.status === "WYSLANA"
          ? "current"
          : "future",
    },
    {
      label: "Umowa",
      state: contract
        ? "done"
        : offer.status === "ZAAKCEPTOWANA"
        ? "current"
        : "future",
    },
    {
      label: "Podpis",
      state: contract?.signedAt
        ? "done"
        : contract
        ? "current"
        : "future",
    },
    {
      label: "Agenda",
      state: agenda
        ? "done"
        : contract?.signedAt
        ? "current"
        : "future",
    },
    {
      label: "Finał",
      state: agendaFinalized
        ? "done"
        : agenda?.type === "WSTEPNA"
        ? "current"
        : "future",
    },
  ];

  // ==================== NEXT ACTION ====================
  type NextActionId =
    | "send-offer"
    | "mark-accepted"
    | "create-contract"
    | "mark-signed"
    | "create-agenda"
    | "copy-client-link"
    | "finalize-agenda"
    | null;

  let nextActionId: NextActionId = null;
  let nextActionLabel = "";

  if (offer.status === "ROBOCZA") {
    nextActionId = "send-offer";
    nextActionLabel = "Wysyłam ofertę";
  } else if (offer.status === "WYSLANA") {
    nextActionId = "mark-accepted";
    nextActionLabel = "Oznacz jako zaakceptowaną";
  } else if (offer.status === "ZAAKCEPTOWANA" && !contract) {
    nextActionId = "create-contract";
    nextActionLabel = "Utwórz umowę";
  } else if (contract && !contract.signedAt) {
    nextActionId = "mark-signed";
    nextActionLabel = "Oznacz umowę jako podpisaną";
  } else if (contract?.signedAt && !agenda) {
    nextActionId = "create-agenda";
    nextActionLabel = "Utwórz agendę";
  } else if (agenda?.type === "WSTEPNA" && !agendaFinalized) {
    nextActionId = "copy-client-link";
    nextActionLabel = "Skopiuj link klienta";
  } else if (agenda?.type === "FINALNA" && !agenda.isLocked) {
    nextActionId = "finalize-agenda";
    nextActionLabel = "Zatwierdź agendę";
  }

  // ==================== BANNER CONDITIONS ====================
  const sentBenchmark = offer.offerSentConfirmedAt ?? offer.sentAt;
  const lastChangedMs = offer.lastItemsChangedAt
    ? new Date(offer.lastItemsChangedAt).getTime()
    : 0;
  const sentBenchmarkMs = sentBenchmark ? new Date(sentBenchmark).getTime() : 0;
  const showOfferChangedBanner =
    (offer.status === "WYSLANA" || offer.status === "ZAAKCEPTOWANA") &&
    lastChangedMs > sentBenchmarkMs &&
    !contract?.signedAt;

  const showAmendmentBanner = Boolean(
    contract?.signedAt && contract?.needsAmendment
  );

  const showContractCreatedBanner = Boolean(
    contract && !contract.signedAt && !contract.contractSentConfirmedAt
  );

  const agendaNotifiedMs = agenda?.clientNotifiedAt
    ? new Date(agenda.clientNotifiedAt).getTime()
    : agenda?.createdAt
    ? new Date(agenda.createdAt).getTime()
    : 0;
  const showAgendaNotifyBanner =
    Boolean(agenda) && lastChangedMs > agendaNotifiedMs;

  // ==================== BANNER HANDLERS ====================
  async function confirmOfferSent() {
    try {
      const res = await fetch(`/api/offers/${id}/confirm-sent`, { method: "PATCH" });
      if (!res.ok) throw new Error();
      toast.success("Oznaczono jako wysłane do klienta");
      mutateFull();
    } catch {
      toast.error("Błąd");
    }
  }

  async function resolveAmendment(amendmentId?: string) {
    if (!contract) return;
    try {
      const res = await fetch(`/api/contracts/${contract.id}/resolve-amendment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(amendmentId ? { amendmentId } : {}),
      });
      if (!res.ok) throw new Error();
      toast.success("Aneks oznaczony jako wysłany");
      mutateFull();
    } catch {
      toast.error("Błąd");
    }
  }

  async function createAmendment() {
    if (!contract) return;
    try {
      // KRYTYCZNE: najpierw zapisz aktualne pozycje z tabeli
      // (inaczej aneks zrobi snapshot ze starych wartości z bazy, np. cena 0 zł
      // dla świeżo dodanej pozycji, której jeszcze nie zapisano)
      const saveRes = await fetch(`/api/offers/${id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!saveRes.ok) throw new Error("Błąd zapisu pozycji");

      const res = await fetch(`/api/contracts/${contract.id}/amendments`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd");
      }
      const amendment = await res.json();
      toast.success(`Aneks nr ${amendment.number} utworzony`);
      mutateItems();
      mutateFull();
      // Otwórz PDF w nowej karcie
      window.open(
        `/api/contracts/${contract.id}/amendments/${amendment.id}/pdf`,
        "_blank"
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd");
    }
  }

  async function deleteAmendment(amendmentId: string, number: number) {
    if (!contract) return;
    const ok = await confirmDialog({
      title: `Usunąć aneks nr ${number}?`,
      description:
        "Ta operacja jest nieodwracalna. Aneks zostanie skasowany z bazy. Użyj tylko jeśli aneks powstał omyłkowo.",
      confirmLabel: "Tak, usuń",
      variant: "destructive",
    });
    if (!ok) return;
    try {
      const res = await fetch(
        `/api/contracts/${contract.id}/amendments/${amendmentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Błąd");
      }
      toast.success(`Aneks nr ${number} usunięty`);
      mutateFull();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd");
    }
  }

  async function confirmContractSent() {
    if (!contract) return;
    try {
      const res = await fetch(`/api/contracts/${contract.id}/confirm-sent`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error();
      toast.success("Oznaczono — umowa wysłana do klienta");
      mutateFull();
    } catch {
      toast.error("Błąd");
    }
  }

  async function notifyClient() {
    if (!agenda) return;
    try {
      const res = await fetch(`/api/agendas/${agenda.id}/notify-client`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error();
      toast.success("Oznaczono — klient powiadomiony");
      mutateFull();
    } catch {
      toast.error("Błąd");
    }
  }

  const GUIDE_STEPS = [
    { title: "Uzupełnij ofertę", desc: 'Dodaj pozycje, pakiety z menu, ustaw ceny. Edytuj w tabeli poniżej (Enter zapisuje).' },
    { title: "Wyślij ofertę klientowi", desc: 'Kliknij „Wysyłam ofertę" → pobierz PDF → wyślij klientowi. Cena to wariant „od góry" — najwyższy możliwy.' },
    { title: "Czekaj na odpowiedź klienta", desc: 'Klient mówi „biorę" → kliknij „Zaakceptowana". Nie chce → „Odrzucona".' },
    { title: "Utwórz umowę", desc: 'Kliknij „Utwórz umowę" → dane klienta + zaliczka. Przed podpisem PDF umowy żyje — każda zmiana w tabeli od razu w dokumencie.' },
    { title: "Oznacz umowę jako podpisaną", desc: 'Klient odesłał skan → kliknij „Oznacz umowę jako podpisaną". Od tej chwili umowa jest ZAMROŻONA. Każda zmiana w tabeli = aneks.' },
    { title: "Aneksy po zmianach", desc: 'Żółty pasek „Utwórz aneks" pojawia się gdy zmienisz pozycje po podpisie ALBO gdy klient wybierze tańsze dania w agendzie. Klik → PDF aneksu z listą zmian + kwotą. Wyślij klientowi, po otrzymaniu klik „Wysłany".' },
    { title: "Utwórz agendę i wyślij link", desc: 'Kliknij „Utwórz agendę" → skopiuj link klienta → wyślij. Klient wybierze pozycje menu online (do 14 dni przed eventem, potem blokada).' },
    { title: "Finalizuj agendę", desc: 'Klient wybrał wszystko → wejdź w agendę → „Finalizuj". Link dla kuchni gotowy.' },
  ];

  // Odśwież agendę
  async function refreshAgenda() {
    if (!agenda) return;
    const ok = await confirmDialog({
      title: "Odświeżyć agendę?",
      description: "Stara agenda i linki zostaną usunięte, powstanie nowa. Tej operacji nie da się cofnąć.",
      confirmLabel: "Tak, odśwież",
    });
    if (!ok) return;
    try {
      // Pobierz wszystkie agendy oferty
      const listRes = await fetch(`/api/agendas?offerId=${id}`);
      if (listRes.ok) {
        const agendas: Array<{ id: string }> = await listRes.json();
        // Usuń wszystkie po kolei
        for (const a of agendas) {
          await fetch(`/api/agendas/${a.id}`, { method: "DELETE" });
        }
      } else {
        // Fallback — usuń tę jedną
        await fetch(`/api/agendas/${agenda.id}`, { method: "DELETE" });
      }
      // Utwórz nową
      const res = await fetch("/api/agendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const newAgenda = await res.json();
      await fetch(`/api/agendas/${newAgenda.id}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "KLIENT_AGENDA" }),
      });
      toast.success("Agenda odświeżona — nowy link klienta wygenerowany");
      mutateFull();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd odświeżania agendy");
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Nagłówek */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Link href="/oferty">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {offer.clientName}
            </h1>
            <p className="text-muted-foreground text-sm">
              {offer.eventName && `${offer.eventName} · `}
              {new Date(offer.eventDateFrom).toLocaleDateString("pl-PL")} —{" "}
              {new Date(offer.eventDateTo).toLocaleDateString("pl-PL")} ·{" "}
              {offer.adultsCount + offer.childrenCount} os.
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Ofertę utworzył: <span className="font-medium text-foreground">{offer.createdBy.firstName} {offer.createdBy.lastName}</span>
              {contract?.createdBy && (
                <> · Umowę: <span className="font-medium text-foreground">{contract.createdBy.firstName} {contract.createdBy.lastName}</span></>
              )}
              {agenda?.createdBy && (
                <> · Agendę: <span className="font-medium text-foreground">{agenda.createdBy.firstName} {agenda.createdBy.lastName}</span></>
              )}
            </p>
          </div>
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setGuideOpen(true)} title="Przewodnik krok po kroku">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <a href={`/api/offers/${id}/pdf`} download={`oferta-${id}.pdf`}>
            <Button variant="outline" size="sm">
              <FileDown className="mr-1 h-4 w-4" />
              Pobierz ofertę
            </Button>
          </a>
          {contract && (
            <a href={`/api/contracts/${contract.id}/pdf`} download={`umowa-${id}.pdf`}>
              <Button variant="outline" size="sm">
                <FileDown className="mr-1 h-4 w-4" />
                Pobierz umowę
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Duży, widoczny przycisk zapisu — zawsze na górze */}
      {!isLocked && (
        <div className="flex justify-end">
          <Button
            onClick={saveAll}
            disabled={saving}
            size="lg"
            className="h-12 px-6 text-base font-semibold shadow-elevated animate-pulse-slow"
          >
            <Save className="mr-2 h-5 w-5" />
            {saving ? "Zapisuję..." : "Zapisz pozycje"}
          </Button>
        </div>
      )}

      {/* Pasek postępu 7 kroków */}
      <StepProgressBar steps={progressSteps} />

      {/* BANNER: zmiana po wysyłce PDF */}
      {showOfferChangedBanner && (
        <div className="rounded-xl border-2 border-red-500 bg-red-50 dark:bg-red-950/30 px-4 py-3 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-red-900 dark:text-red-200 text-sm">
              Zmieniłeś ofertę po wysyłce PDF
            </div>
            <div className="text-red-800 dark:text-red-300 text-xs mt-0.5">
              Pobierz nowy PDF i wyślij klientowi poprawioną ofertę.
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a href={`/api/offers/${id}/pdf`} download={`oferta-${id}.pdf`}>
              <Button size="sm" variant="outline" className="border-red-300">
                <FileDown className="mr-1 h-4 w-4" />
                Pobierz PDF
              </Button>
            </a>
            <Button size="sm" onClick={confirmOfferSent} className="bg-red-600 hover:bg-red-700 text-white">
              <CheckCircle className="mr-1 h-4 w-4" />
              Potwierdzam — wysłałem
            </Button>
          </div>
        </div>
      )}

      {/* BANNER: umowa utworzona — wyślij klientowi */}
      {showContractCreatedBanner && (
        <div className="rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 flex items-start gap-3 shadow-sm">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-blue-900 dark:text-blue-200 text-sm">
              Umowa utworzona — wyślij klientowi do podpisu
            </div>
            <div className="text-blue-800 dark:text-blue-300 text-xs mt-0.5">
              Pobierz PDF umowy i wyślij klientowi. Potem czekaj na podpisany skan.
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {contract && (
              <a href={`/api/contracts/${contract.id}/pdf`} target="_blank" rel="noopener">
                <Button size="sm" variant="outline" className="border-blue-300">
                  <FileDown className="mr-1 h-4 w-4" />
                  Pobierz PDF
                </Button>
              </a>
            )}
            <Button size="sm" onClick={confirmContractSent} className="bg-blue-600 hover:bg-blue-700 text-white">
              <CheckCircle className="mr-1 h-4 w-4" />
              Potwierdzam — wysłałem
            </Button>
          </div>
        </div>
      )}

      {/* BANNER: umowa wymaga aneksu */}
      {showAmendmentBanner && (
        <div className="rounded-xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
              Zmieniłeś pozycje po podpisaniu umowy — potrzebny aneks
            </div>
            <div className="text-amber-800 dark:text-amber-300 text-xs mt-0.5">
              Umowa jest zamrożona. Utwórz aneks z listą zmian i wyślij klientowi do podpisania.
            </div>
          </div>
          <Button size="sm" onClick={createAmendment} className="bg-amber-600 hover:bg-amber-700 text-white">
            <FileText className="mr-1 h-4 w-4" />
            Utwórz aneks
          </Button>
        </div>
      )}

      {/* BANNER: wiadomości od klienta */}
      {fullData.unansweredMessages && fullData.unansweredMessages > 0 && agenda && (
        <div className="rounded-xl border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 flex items-start gap-3 shadow-sm">
          <MessageSquare className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-blue-900 dark:text-blue-200 text-sm">
              Klient wysłał {fullData.unansweredMessages === 1 ? "nową wiadomość" : `nowe wiadomości (${fullData.unansweredMessages})`}
            </div>
            <div className="text-blue-800 dark:text-blue-300 text-xs mt-0.5">
              Przejdź do agendy, żeby odpowiedzieć.
            </div>
          </div>
          <Link href={`/agendy/${agenda.id}`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <MessageSquare className="mr-1 h-4 w-4" />
              Otwórz wiadomości
            </Button>
          </Link>
        </div>
      )}

      {/* BANNER: agenda — zawiadom klienta */}
      {showAgendaNotifyBanner && !showOfferChangedBanner && !showAmendmentBanner && (
        <div className="rounded-xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex items-start gap-3 shadow-sm">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
              Zmieniłeś harmonogram — zawiadom klienta
            </div>
            <div className="text-amber-800 dark:text-amber-300 text-xs mt-0.5">
              Klient i kuchnia widzą zmiany od razu. Zadzwoń lub wyślij SMS: „zerknij na link".
            </div>
          </div>
          <Button size="sm" onClick={notifyClient} className="bg-amber-600 hover:bg-amber-700 text-white">
            <CheckCircle className="mr-1 h-4 w-4" />
            Powiadomiłem klienta
          </Button>
        </div>
      )}

      {/* Banner odliczania / statusu */}
      {isFinished ? (
        <div className="rounded-xl px-4 py-3 text-sm bg-muted text-muted-foreground flex items-center gap-3">
          <CalendarDays className="h-5 w-5" />
          <div>
            <span className="font-semibold">Wydarzenie zakończone</span>
          </div>
        </div>
      ) : agendaIsFinalLocked ? (
        <div className="rounded-xl px-4 py-3 text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center gap-3">
          <Lock className="h-5 w-5" />
          <div>
            <span className="font-semibold">Agenda zatwierdzona</span>
            <span className="mx-2">·</span>
            <span>
              Aby edytować — kliknij „Wprowadź poprawki" w{" "}
              <Link href={`/agendy/${agenda?.id}`} className="underline">
                agendzie
              </Link>
              .
            </span>
          </div>
        </div>
      ) : daysLeft <= 14 ? (
        <div className="rounded-xl px-4 py-3 text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-center gap-3">
          <CalendarDays className="h-5 w-5" />
          <div>
            <span className="font-semibold">Wydarzenie za {daysLeft} {daysLeft === 1 ? "dzień" : "dni"}</span>
            <span className="mx-2">·</span>
            <span>Klient nie może już zmieniać wyborów. Pamiętaj o deadline'ach kuchni.</span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl px-4 py-3 text-sm bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 flex items-center gap-3">
          <CalendarDays className="h-5 w-5" />
          <div>
            <span className="font-semibold">Wydarzenie za {daysLeft} {daysLeft === 1 ? "dzień" : "dni"}</span>
            <span className="mx-2">·</span>
            <span>Zmiany dozwolone</span>
          </div>
        </div>
      )}

      {/* Status + akcje */}
      <Card>
        <CardContent className="pt-4">
          {nextActionId && (
            <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
              <span className="text-base">➜</span>
              <span>Następny krok: {nextActionLabel}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            {(offer.status === "ROBOCZA" || offer.status === "WYSLANA") && (
              <>
                {offer.status === "ROBOCZA" && (
                  <Button
                    size={nextActionId === "send-offer" ? "default" : "sm"}
                    variant={nextActionId === "send-offer" ? "default" : "outline"}
                    onClick={() => setConfirmSendOpen(true)}
                    className={
                      nextActionId === "send-offer"
                        ? "animate-pulse ring-2 ring-primary/40 shadow-elevated"
                        : "opacity-70"
                    }
                  >
                    <Send className="mr-1 h-4 w-4" />
                    Wysyłam ofertę
                  </Button>
                )}
                <Button
                  size={nextActionId === "mark-accepted" ? "default" : "sm"}
                  variant={nextActionId === "mark-accepted" ? "default" : "outline"}
                  onClick={() => changeStatus("ZAAKCEPTOWANA")}
                  className={
                    nextActionId === "mark-accepted"
                      ? "animate-pulse ring-2 ring-primary/40 shadow-elevated"
                      : "opacity-70"
                  }
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Zaakceptowana
                </Button>
                <Button size="sm" variant="outline" onClick={rejectOffer} className="opacity-70">
                  <XCircle className="mr-1 h-4 w-4" />
                  Odrzucona
                </Button>
              </>
            )}

            {offer.status === "ODRZUCONA" && (
              <Button
                size="default"
                onClick={restoreOffer}
                className="animate-pulse ring-2 ring-primary/40 shadow-elevated"
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Przywróć ofertę
              </Button>
            )}

            {offer.status === "ZAAKCEPTOWANA" && !contract && (
              <Link href={`/umowy/nowa/${id}`}>
                <Button
                  size={nextActionId === "create-contract" ? "default" : "sm"}
                  className={
                    nextActionId === "create-contract"
                      ? "animate-pulse ring-2 ring-primary/40 shadow-elevated"
                      : ""
                  }
                >
                  <FileText className="mr-1 h-4 w-4" />
                  Utwórz umowę
                </Button>
              </Link>
            )}

            {contract && !contract.signedAt && (
              <Button
                size={nextActionId === "mark-signed" ? "default" : "sm"}
                onClick={() => setConfirmSignOpen(true)}
                className={
                  nextActionId === "mark-signed"
                    ? "animate-pulse ring-2 ring-primary/40 shadow-elevated"
                    : ""
                }
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Oznacz umowę jako podpisaną
              </Button>
            )}

            {contract?.signedAt && (
              <Badge variant="success">Umowa podpisana</Badge>
            )}

            {contract && (
              <Button size="sm" variant="destructive" onClick={deleteContract}>
                <Trash2 className="mr-1 h-4 w-4" />
                Usuń umowę
              </Button>
            )}

            {contract?.signedAt && !agenda && (
              <Button
                size={nextActionId === "create-agenda" ? "default" : "sm"}
                onClick={createAgenda}
                className={
                  nextActionId === "create-agenda"
                    ? "animate-pulse ring-2 ring-primary/40 shadow-elevated"
                    : ""
                }
              >
                <CalendarDays className="mr-1 h-4 w-4" />
                Utwórz agendę
              </Button>
            )}

            {agenda && (
              <>
                {agenda.type === "WSTEPNA" ? (
                  <Link href={`/agendy/${agenda.id}`}>
                    <Button
                      size="sm"
                      className="relative animate-pulse shadow-[0_0_0_3px_rgba(209,100,112,0.25)]"
                    >
                      <CalendarDays className="mr-1 h-4 w-4" />
                      Otwórz agendę wstępną
                      <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-white/80" />
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/agendy/${agenda.id}`}>
                    <Badge variant="success" className="cursor-pointer">
                      Agenda finalna
                    </Badge>
                  </Link>
                )}
                {!isLocked && (
                  <Button size="sm" variant="outline" onClick={refreshAgenda}>
                    <CalendarDays className="mr-1 h-4 w-4" />
                    Odśwież agendę
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={deleteAgenda}>
                  <Trash2 className="mr-1 h-4 w-4" />
                  Usuń agendę
                </Button>
              </>
            )}

            {clientToken && (
              <Button
                size={nextActionId === "copy-client-link" ? "default" : "sm"}
                variant={nextActionId === "copy-client-link" ? "default" : "outline"}
                onClick={() => copyLink(clientToken.token, "klient")}
                className={
                  nextActionId === "copy-client-link"
                    ? "animate-pulse ring-2 ring-primary/40 shadow-elevated"
                    : ""
                }
              >
                <Copy className="mr-1 h-4 w-4" />
                Link klienta
              </Button>
            )}

            {kitchenToken && (
              <Button size="sm" variant="outline" onClick={() => copyLink(kitchenToken.token, "kuchnia")}>
                <Copy className="mr-1 h-4 w-4" />
                Link kuchni
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aneksy do umowy */}
      {contract && contract.amendments && contract.amendments.length > 0 && (
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-amber-600" />
              <h3 className="font-semibold text-sm">Aneksy do umowy</h3>
              <Badge variant="outline" className="text-xs">
                {contract.amendments.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {contract.amendments.map((am) => {
                const delta = Number(am.totalAfter) - Number(am.totalBefore);
                const deltaStr = `${delta > 0 ? "+" : ""}${delta.toLocaleString("pl-PL", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} zł`;
                const deltaColor =
                  delta > 0 ? "text-red-600" : delta < 0 ? "text-green-600" : "text-muted-foreground";
                const dateStr = new Date(am.createdAt).toLocaleDateString("pl-PL", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                return (
                  <div
                    key={am.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/60 bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">
                        Aneks nr {am.number} z {dateStr}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className={deltaColor}>{deltaStr}</span>
                        {am.resolvedAt ? (
                          <Badge variant="success" className="text-[10px]">
                            Wysłany
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-[10px]">
                            Do wysyłki
                          </Badge>
                        )}
                      </div>
                    </div>
                    <a
                      href={`/api/contracts/${contract.id}/amendments/${am.id}/pdf`}
                      target="_blank"
                      rel="noopener"
                    >
                      <Button size="sm" variant="outline">
                        <FileDown className="mr-1 h-4 w-4" />
                        Pobierz PDF
                      </Button>
                    </a>
                    {!am.resolvedAt && (
                      <>
                        <Button size="sm" onClick={() => resolveAmendment(am.id)}>
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Wysłany
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteAmendment(am.id, am.number)}
                          title="Usuń aneks (gdy powstał omyłkowo)"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabele per dzień */}
      {days.map((dayInfo) => {
        const dayItems = items
          .filter((i) => i.day === dayInfo.day)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        return (
          <div key={dayInfo.day}>
            <h2 className="text-base font-semibold mb-2">
              Dzień {dayInfo.day} — {dayInfo.label}
            </h2>
            <div className="rounded-xl border border-border/60 shadow-[var(--shadow-card)] overflow-x-scroll bg-white dark:bg-card">
            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, dayInfo.day)}
            >
              <SortableContext
                items={dayItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
                disabled={isLocked}
              >
              <table className="min-w-[1100px] w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-14">NR</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 min-w-[180px]">NAZWA</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-20">OD</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-20">DO</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-32">SALA</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-16">ILOŚĆ</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-16">OSOBY</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-28">CENA NETTO</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-20">VAT</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider text-foreground/70 w-28">BRUTTO</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className={isLocked ? "pointer-events-none opacity-60" : ""}>
                  {dayItems.map((item, idx) => {
                    const isPackage = item.sourceType === "PACKAGE";
                    const personCount = offer.adultsCount + offer.childrenCount;
                    const mul = isPackage ? personCount : 1;
                    const price = item.unitPrice === "" || item.unitPrice === "-" ? "0" : item.unitPrice;
                    const nettoD = new Decimal(price).mul(item.quantity).mul(mul);
                    const bruttoD = nettoD.mul(new Decimal(1).add(new Decimal(item.vatRate).div(100)));
                    const netto = nettoD.toNumber();
                    const brutto = bruttoD.toNumber();
                    const isExpanded = expandedRows.has(item.id);
                    const composition = isPackage
                      ? tryParseComposition(item.description) ?? (item.sourceId ? menuCompositionMap.get(item.sourceId) ?? null : null)
                      : null;

                    return (
                      <SortableItemRow key={item.id} id={item.id} disabled={isLocked}>
                        {({ setNodeRef, listeners, attributes, style, isDragging }) => (
                        <Fragment>
                        <tr ref={setNodeRef} style={style} className={`border-t border-border/40 hover:bg-accent/30 transition-colors ${isPackage ? "bg-blue-50/40 dark:bg-blue-950/10" : ""} ${isDragging ? "opacity-50 bg-primary/5" : ""}`}>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <button
                                {...attributes}
                                {...listeners}
                                type="button"
                                className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-foreground touch-none p-0.5 -ml-1"
                                aria-label="Przeciągnij"
                                tabIndex={isLocked ? -1 : 0}
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </button>
                              {isPackage ? (
                                <button
                                  onClick={() => toggleRowExpand(item.id)}
                                  className="flex items-center gap-0.5 pointer-events-auto"
                                  style={{ pointerEvents: "auto" }}
                                >
                                  <span className="text-xs">{idx + 1}</span>
                                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-blue-500" /> : <ChevronRight className="h-3.5 w-3.5 text-blue-500" />}
                                </button>
                              ) : (
                                <span>{idx + 1}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            {isPackage ? (
                              <div className="flex items-center gap-2 px-1">
                                <Package className="h-4 w-4 text-blue-500 shrink-0" />
                                <Input
                                  className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 px-1 font-medium"
                                  value={item.name}
                                  onChange={(e) => updateItem(item.id, "name", e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      (e.currentTarget as HTMLInputElement).blur();
                                      saveAll();
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <NameInputWithSuggest
                                value={item.name}
                                onChange={(v) => updateItem(item.id, "name", v)}
                                onPickMenu={() => {
                                  // Usuń pustą pozycję z której wywołano picker
                                  deleteItem(item.id);
                                  openMenuPicker(dayInfo.day, dayInfo.date);
                                }}
                                onEnter={saveAll}
                              />
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="time"
                              className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 px-1 w-20"
                              value={item.timeFrom || ""}
                              onChange={(e) => updateItem(item.id, "timeFrom", e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="time"
                              className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 px-1 w-20"
                              value={item.timeTo || ""}
                              onChange={(e) => updateItem(item.id, "timeTo", e.target.value)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Select
                              value={item.hallId || "none"}
                              onValueChange={(v) => updateItem(item.id, "hallId", v === "none" ? null : v)}
                            >
                              <SelectTrigger className="h-8 text-sm border-0 bg-transparent shadow-none w-32">
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                {(halls || []).filter((h: HallOption & { isActive?: boolean }) => (h as HallOption & { isActive?: boolean }).isActive !== false).map((h) => (
                                  <SelectItem key={h.id} value={h.id}>
                                    {h.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 px-1 w-16"
                              value={item.quantity || ""}
                              onChange={(e) => updateItem(item.id, "quantity", e.target.value === "" ? 0 : parseInt(e.target.value))}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-center text-muted-foreground text-xs">
                            {isPackage ? personCount : "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            <PriceInput
                              className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 px-1 w-28"
                              value={item.unitPrice}
                              onChange={(next) => updateItem(item.id, "unitPrice", next)}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Select
                              value={String(item.vatRate)}
                              onValueChange={(v) => {
                                if (v) updateItem(item.id, "vatRate", parseInt(v));
                              }}
                            >
                              <SelectTrigger className="h-8 text-sm border-0 bg-transparent shadow-none w-20">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="8">8%</SelectItem>
                                <SelectItem value="23">23%</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-2 py-1.5 text-right font-medium">
                            {brutto.toFixed(2)} zł
                          </td>
                          <td className="px-2 py-1.5">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteItem(item.id)} title="Usuń">
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </td>
                        </tr>
                        {/* Rozwinięcie pakietu */}
                        {isPackage && isExpanded && composition && (
                          <tr>
                            <td colSpan={11} className="bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3 border-t border-blue-100 dark:border-blue-900/30">
                              <div className="space-y-2">
                                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                  Skład: {composition.packageName} ({composition.offerTypeName})
                                </p>
                                {composition.sections.map((sec, si) => (
                                  <div key={si} className="pl-2">
                                    <div className="flex items-center gap-2 text-xs font-medium text-green-700 dark:text-green-400">
                                      <Layers className="h-3 w-3" />
                                      {sec.name} ({sec.items.length})
                                      <span className={`text-[10px] font-normal px-1.5 py-0.5 rounded ${sec.mode === "ALL_INCLUDED" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                                        {sec.mode === "ALL_INCLUDED" || !sec.mode
                                          ? "w cenie"
                                          : `wybór ${sec.count || "?"} z ${sec.items.length}`}
                                      </span>
                                    </div>
                                    <ul className="pl-6 mt-0.5 space-y-0.5">
                                      {sec.items.map((itemName, ii) => (
                                        <li key={ii} className="text-xs text-muted-foreground flex items-center gap-1.5">
                                          <CookingPot className="h-2.5 w-2.5 text-orange-400" />
                                          {typeof itemName === "string" ? itemName : itemName.name}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                        )}
                      </SortableItemRow>
                    );
                  })}
                </tbody>
              </table>
              </SortableContext>
            </DndContext>
              {!isLocked && (
                <div className="p-2 border-t border-border/40">
                  <Button variant="ghost" size="sm" className="text-primary" onClick={() => addItem(dayInfo.day, dayInfo.date)}>
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Dodaj pozycję
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Podsumowanie */}
      <div className="rounded-xl border border-border/60 shadow-[var(--shadow-card)] p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Suma netto</span>
          <span>{totalNetto.toFixed(2)} zł</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">VAT</span>
          <span>{totalVat.toFixed(2)} zł</span>
        </div>
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span>RAZEM BRUTTO</span>
          <span>{totalBrutto.toFixed(2)} zł</span>
        </div>
      </div>

      {/* Dopisek o wycenie "od góry" — widoczny gdy są pakiety */}
      {items.some((it) => it.sourceType === "PACKAGE") && (
        <div className="rounded-lg border-l-2 border-primary bg-primary/5 px-4 py-3 flex items-start gap-3">
          <Info className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground italic leading-relaxed">
            <span className="font-semibold text-foreground not-italic">Wycena „od góry":</span>{" "}
            kwota uwzględnia najdroższy wariant z menu (najwyższe pozycje w sekcjach
            „wybierz X z Y"). Po wyborze dań przez klienta system zaproponuje aneks
            w dół, jeśli klient wybierze tańsze opcje.
          </div>
        </div>
      )}

      {/* Notatki z rozmowy */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-200/60 dark:border-amber-800/60 bg-amber-100/50 dark:bg-amber-900/30">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">Notatki z rozmowy</span>
          </div>
          {notesDirty && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs rounded-lg border-amber-300"
              disabled={notesSaving}
              onClick={async () => {
                setNotesSaving(true);
                try {
                  await fetch(`/api/offers/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ notes: notesValue }),
                  });
                  setNotesDirty(false);
                  toast.success("Notatki zapisane");
                } catch {
                  toast.error("Błąd zapisu notatek");
                } finally {
                  setNotesSaving(false);
                }
              }}
            >
              <Save className="mr-1 h-3 w-3" />
              {notesSaving ? "..." : "Zapisz notatki"}
            </Button>
          )}
        </div>
        <Textarea
          value={notesValue}
          onChange={(e) => {
            setNotesValue(e.target.value);
            setNotesDirty(true);
          }}
          placeholder="Notatki z rozmowy telefonicznej..."
          className="border-0 rounded-none bg-transparent min-h-[120px] text-sm resize-y focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {/* ==================== GUIDE DIALOG ==================== */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-3">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-3">
                <HelpCircle className="h-6 w-6 text-blue-600" />
              </div>
              Przewodnik — co robić?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <p className="text-xs text-muted-foreground mb-4">
              Poniżej kolejne kroki od szkicu do finalnej agendy. Aktualny krok jest podświetlony.
            </p>
            {GUIDE_STEPS.map((step, i) => {
              const isDone = i < currentStep;
              const isCurrent = i === currentStep;
              return (
                <div
                  key={i}
                  className={`flex gap-3 p-3 rounded-xl transition-colors ${
                    isCurrent
                      ? "bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-700"
                      : isDone
                        ? "bg-green-50/50 dark:bg-green-950/20 border border-green-200/60 dark:border-green-800/40"
                        : "bg-muted/30 border border-border/40"
                  }`}
                >
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCurrent
                      ? "bg-blue-500 text-white"
                      : isDone
                        ? "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {isDone ? "✓" : i + 1}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isCurrent ? "text-blue-700 dark:text-blue-300" : isDone ? "text-green-700 dark:text-green-400" : "text-muted-foreground"}`}>
                      {step.title}
                    </p>
                    <p className={`text-xs mt-0.5 ${isCurrent ? "text-blue-600/80 dark:text-blue-400/80" : "text-muted-foreground/70"}`}>
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="pt-3 border-t mt-4">
              <p className="text-xs text-muted-foreground">
                Zmiany w ofercie możliwe do 14 dni przed wydarzeniem. Po tym terminie edycja zostanie zablokowana automatycznie.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== CONFIRM SEND DIALOG ==================== */}
      <Dialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-3">
              <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-3">
                <Send className="h-6 w-6 text-blue-600" />
              </div>
              Wysyłam ofertę
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Potwierdzam, że oferta dla <span className="font-semibold text-foreground">{offer.clientName}</span> została
              przygotowana i wysłana do klienta wraz z dokumentem PDF.
            </p>
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <CheckCircle className="h-4 w-4" />
                <span>Oferta gotowa do wysyłki</span>
              </div>
              <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <FileDown className="h-4 w-4" />
                <span>PDF wygenerowany i wysłany</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmSendOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={() => {
                changeStatus("WYSLANA");
                setConfirmSendOpen(false);
              }}>
                <Send className="mr-1.5 h-4 w-4" />
                Potwierdzam wysłanie
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== CONFIRM SIGN DIALOG ==================== */}
      <Dialog open={confirmSignOpen} onOpenChange={setConfirmSignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-3">
              <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              Oznacz umowę jako podpisaną
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Potwierdzam, że umowa z <span className="font-semibold text-foreground">{contract?.clientFullName}</span> została wysłana i klient odesłał podpisaną wersję.
            </p>
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <FileDown className="h-4 w-4" />
                <span>PDF umowy pobrany i wysłany do klienta</span>
              </div>
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <CheckCircle className="h-4 w-4" />
                <span>Klient odesłał podpisany dokument</span>
              </div>
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <Lock className="h-4 w-4" />
                <span>Po kliknięciu umowa zostanie ZAMROŻONA — zmiany = aneks</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setConfirmSignOpen(false)}>
                Anuluj
              </Button>
              <Button onClick={() => {
                signContract();
                setConfirmSignOpen(false);
              }} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="mr-1.5 h-4 w-4" />
                Potwierdzam — podpisana
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== MENU PICKER DIALOG ==================== */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          {pickerStep === "list" ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-3">
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  Dodaj pakiet z menu
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 pt-2">
                {!menuData || menuData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Brak typów ofert w menu</p>
                ) : (
                  menuData.map((offerType) => (
                    <div key={offerType.id}>
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">
                        {offerType.name}
                      </h3>
                      {offerType.packages.length === 0 ? (
                        <p className="text-xs text-muted-foreground pl-2">Brak pakietów</p>
                      ) : (
                        <div className="grid gap-2">
                          {offerType.packages.map((pkg) => (
                            <button
                              key={pkg.id}
                              onClick={() => selectPackage(pkg, offerType.name)}
                              className="flex items-center gap-3 p-3 rounded-xl border hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors text-left w-full"
                            >
                              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/50 p-2 shrink-0">
                                <Package className="h-4 w-4 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{pkg.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {pkg.sections.length} sekcji · {pkg.sections.reduce((s, sec) => s + sec.items.length, 0)} pozycji
                                </p>
                              </div>
                              <span className="text-sm font-semibold text-blue-600">
                                {Number(pkg.price).toFixed(2)} zł
                              </span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : pickerStep === "detail" && pickerPkg ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setPickerStep("list")}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="rounded-lg bg-blue-100 p-2">
                    <Package className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <span>{pickerPkg.name}</span>
                    <p className="text-xs font-normal text-muted-foreground">{pickerOfferType}</p>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <p className="text-xs text-muted-foreground">Podgląd składu pakietu. Kliknij &quot;Dodaj do oferty&quot; aby wstawić.</p>

                {pickerPkg.sections.map((sec) => (
                  <div key={sec.id} className="rounded-xl border p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <Layers className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-sm">{sec.name}</span>
                      <Badge variant="outline" className={`text-xs ${sec.selectionMode === "ALL_INCLUDED" ? "border-green-300 text-green-700" : "border-amber-300 text-amber-700"}`}>
                        {sec.selectionMode === "ALL_INCLUDED"
                          ? "Wszystko w cenie"
                          : `Klient wybiera ${sec.selectionCount || "?"} z ${sec.items.length}`}
                      </Badge>
                      <span className="text-xs text-muted-foreground ml-auto">{sec.items.length} pozycji</span>
                    </div>
                    <div className="pl-7 space-y-1">
                      {sec.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-2.5 px-2 py-1 text-sm">
                          <CookingPot className="h-3.5 w-3.5 text-orange-500" />
                          <span>{item.name}</span>
                          {Number(item.price) > 0 && (
                            <span className="text-xs text-muted-foreground ml-auto">{Number(item.price).toFixed(2)} zł</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <Button variant="outline" onClick={() => setPickerStep("list")}>
                    ← Wstecz
                  </Button>
                  <Button onClick={confirmMenuPick}>
                    <Package className="mr-1.5 h-4 w-4" />
                    Dodaj do oferty
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SortableRowRenderArgs {
  setNodeRef: (el: HTMLElement | null) => void;
  listeners: Record<string, unknown> | undefined;
  attributes: Record<string, unknown>;
  style: React.CSSProperties;
  isDragging: boolean;
}

function SortableItemRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled?: boolean;
  children: (args: SortableRowRenderArgs) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return <>{children({ setNodeRef, listeners, attributes: attributes as unknown as Record<string, unknown>, style, isDragging })}</>;
}
