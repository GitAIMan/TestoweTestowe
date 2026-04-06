"use client";

import { Fragment, use, useState, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    createdBy: { firstName: string; lastName: string };
  };
  contract: {
    id: string;
    signedAt: string | null;
    clientFullName: string;
  } | null;
  agenda: {
    id: string;
    type: string;
    isLocked: boolean;
    tokens: Array<{ token: string; type: string }>;
  } | null;
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
  sections: { name: string; mode?: string; count?: number | null; items: string[] }[];
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
}: {
  value: string;
  onChange: (v: string) => void;
  onPickMenu: () => void;
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

  // Guide
  const [guideOpen, setGuideOpen] = useState(false);

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
    if (!confirm("Czy na pewno chcesz usunąć umowę?")) return;
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
    if (!confirm("Czy na pewno chcesz usunąć agendę?")) return;
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
      if (!res.ok) throw new Error();
      mutateItems();
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

    // Build composition
    const composition: PackageComposition = {
      packageName: pickerPkg.name,
      offerTypeName: pickerOfferType,
      sections: [],
    };

    let totalPrice = Number(pickerPkg.price) || 0;

    pickerPkg.sections.forEach((sec) => {
      const selectedItems = sec.items.filter((i) => pickerSelected[sec.id]?.has(i.id));
      if (selectedItems.length > 0) {
        composition.sections.push({
          name: sec.name,
          mode: sec.selectionMode,
          count: sec.selectionCount,
          items: selectedItems.map((i) => i.name),
        });
        selectedItems.forEach((i) => {
          totalPrice += Number(i.price) || 0;
        });
        totalPrice += Number(sec.price) || 0;
      }
    });

    if (composition.sections.length === 0) {
      toast.error("Wybierz przynajmniej jedną pozycję");
      return;
    }

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
          unitPrice: totalPrice.toFixed(2),
          vatRate: 8,
          sourceType: "PACKAGE",
          sourceId: pickerPkg.id,
        }),
      });
      if (!res.ok) throw new Error();
      mutateItems();
      toast.success(`Dodano: ${pickerPkg.name}`);
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

  // ==================== TOTALS ====================

  const personCount = offer.adultsCount + offer.childrenCount;
  const totalNetto = items.reduce((s, i) => {
    const mul = i.sourceType === "PACKAGE" ? personCount : 1;
    return s + Number(i.unitPrice) * i.quantity * mul;
  }, 0);
  const totalVat = items.reduce((s, i) => {
    const mul = i.sourceType === "PACKAGE" ? personCount : 1;
    return s + Number(i.unitPrice) * i.quantity * mul * (i.vatRate / 100);
  }, 0);
  const totalBrutto = totalNetto + totalVat;

  // Blokada edycji 14 dni przed wydarzeniem
  const eventDate = new Date(offer.eventDateFrom);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isLocked = daysLeft <= 14;
  const isFinished = daysLeft <= 0;

  // Oblicz aktualny krok dla przewodnika
  function getCurrentStep(): number {
    if (offer.status === "ROBOCZA") return 0;
    if (offer.status === "WYSLANA") return 1;
    if (offer.status === "ZAAKCEPTOWANA" && !contract) return 2;
    if (contract && !contract.signedAt) return 3;
    if (contract?.signedAt && !agenda) return 4;
    if (agenda && agenda.type === "WSTEPNA") return 5;
    if (agenda && agenda.type === "FINALNA") return 6;
    return 0;
  }
  const currentStep = getCurrentStep();

  const GUIDE_STEPS = [
    { title: "Uzupełnij ofertę", desc: "Dodaj pozycje, pakiety z menu, ustaw ceny. Edytuj w tabeli poniżej." },
    { title: "Wyślij ofertę klientowi", desc: "Kliknij \"Wysyłam ofertę\" → pobierz PDF → wyślij klientowi mailem lub inaczej." },
    { title: "Czekaj na odpowiedź klienta", desc: "Klient mówi \"biorę\" → kliknij \"Zaakceptowana\". Nie chce → \"Odrzucona\"." },
    { title: "Utwórz umowę", desc: "Kliknij \"Utwórz umowę\" → uzupełnij dane klienta i warunki zaliczki." },
    { title: "Umowa podpisana", desc: "Klient podpisał umowę → kliknij \"Oznacz umowę jako podpisaną\"." },
    { title: "Utwórz agendę i wyślij link", desc: "Kliknij \"Utwórz agendę\" → skopiuj link klienta → wyślij. Klient wybierze pozycje menu online." },
    { title: "Finalizuj agendę", desc: "Klient wybrał wszystko → wejdź w agendę → kliknij \"Finalizuj\". Link dla kuchni gotowy." },
  ];

  // Odśwież agendę
  async function refreshAgenda() {
    if (!agenda) return;
    if (!confirm("Odświeżyć agendę? Stara agenda i linki zostaną usunięte, powstanie nowa.")) return;
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
          </div>
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setGuideOpen(true)} title="Przewodnik krok po kroku">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <a href={`/api/offers/${id}/pdf`} download>
            <Button variant="outline" size="sm">
              <FileDown className="mr-1 h-4 w-4" />
              PDF
            </Button>
          </a>
          {!isLocked && (
            <Button onClick={saveAll} disabled={saving} size="sm">
              <Save className="mr-1 h-4 w-4" />
              {saving ? "Zapisuję..." : "Zapisz pozycje"}
            </Button>
          )}
        </div>
      </div>

      {/* Banner odliczania */}
      {isFinished ? (
        <div className="rounded-xl px-4 py-3 text-sm bg-muted text-muted-foreground flex items-center gap-3">
          <CalendarDays className="h-5 w-5" />
          <div>
            <span className="font-semibold">Wydarzenie zakończone</span>
          </div>
        </div>
      ) : isLocked ? (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center gap-3">
          <Lock className="h-5 w-5" />
          <div>
            <span className="font-semibold">Wydarzenie za {daysLeft} {daysLeft === 1 ? "dzień" : "dni"}</span>
            <span className="mx-2">·</span>
            <span>Edycja zablokowana — mniej niż 14 dni do wydarzenia</span>
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
          <div className="flex flex-wrap gap-2 items-center">
            {(offer.status === "ROBOCZA" || offer.status === "WYSLANA") && (
              <>
                {offer.status === "ROBOCZA" && (
                  <Button size="sm" variant="outline" onClick={() => setConfirmSendOpen(true)}>
                    <Send className="mr-1 h-4 w-4" />
                    Wysyłam ofertę
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => changeStatus("ZAAKCEPTOWANA")}>
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Zaakceptowana
                </Button>
                <Button size="sm" variant="outline" onClick={() => changeStatus("ODRZUCONA")}>
                  <XCircle className="mr-1 h-4 w-4" />
                  Odrzucona
                </Button>
              </>
            )}

            {offer.status === "ZAAKCEPTOWANA" && !contract && (
              <Link href={`/umowy/nowa/${id}`}>
                <Button size="sm">
                  <FileText className="mr-1 h-4 w-4" />
                  Utwórz umowę
                </Button>
              </Link>
            )}

            {contract && !contract.signedAt && (
              <Button size="sm" onClick={signContract}>
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
              <Button size="sm" onClick={createAgenda}>
                <CalendarDays className="mr-1 h-4 w-4" />
                Utwórz agendę
              </Button>
            )}

            {agenda && (
              <>
                <Link href={`/agendy/${agenda.id}`}>
                  <Badge variant="info" className="cursor-pointer">
                    Agenda: {agenda.type === "WSTEPNA" ? "Wstępna" : "Finalna"}
                  </Badge>
                </Link>
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
              <Button size="sm" variant="outline" onClick={() => copyLink(clientToken.token, "klient")}>
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
            <div className="rounded-xl border border-border/60 shadow-[var(--shadow-card)] overflow-hidden bg-white dark:bg-card">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-12">NR</th>
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
                    const netto = isPackage
                      ? Number(item.unitPrice) * personCount * item.quantity
                      : Number(item.unitPrice) * item.quantity;
                    const brutto = netto * (1 + item.vatRate / 100);
                    const isExpanded = expandedRows.has(item.id);
                    const composition = isPackage ? tryParseComposition(item.description) : null;

                    return (
                      <Fragment key={item.id}>
                        <tr className={`border-t border-border/40 hover:bg-accent/30 transition-colors ${isPackage ? "bg-blue-50/40 dark:bg-blue-950/10" : ""}`}>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {isPackage ? (
                              <button onClick={() => toggleRowExpand(item.id)} className="flex items-center gap-0.5">
                                <span className="text-xs">{idx + 1}</span>
                                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-blue-500" /> : <ChevronRight className="h-3.5 w-3.5 text-blue-500" />}
                              </button>
                            ) : (
                              idx + 1
                            )}
                          </td>
                          <td className="px-2 py-1.5">
                            {isPackage ? (
                              <div className="flex items-center gap-2 px-1">
                                <Package className="h-4 w-4 text-blue-500 shrink-0" />
                                <Input
                                  className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 px-1 font-medium"
                                  value={item.name}
                                  onChange={(e) => updateItem(item.id, "name", e.target.value)}
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
                            <Input
                              type="number"
                              step="0.01"
                              className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 px-1 w-28"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, "unitPrice", e.target.value)}
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
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteItem(item.id)}>
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
                                          {itemName}
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
                    );
                  })}
                </tbody>
              </table>
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

      {!isLocked && (
        <div className="flex justify-end">
          <Button onClick={saveAll} disabled={saving}>
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Zapisuję..." : "Zapisz pozycje"}
          </Button>
        </div>
      )}

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
