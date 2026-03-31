"use client";

import { use, useState, useEffect } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Hint } from "@/components/ui/hint";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface OfferItem {
  id: string;
  offerId: string;
  day: number;
  date: string | null;
  sortOrder: number;
  name: string;
  description: string | null;
  timeFrom: string | null;
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

  const [items, setItems] = useState<OfferItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (serverItems) setItems(serverItems);
  }, [serverItems]);

  if (!fullData) return <p className="text-muted-foreground">Ładowanie...</p>;

  const { offer, contract, agenda } = fullData;
  const days = getDaysArray(offer.eventDateFrom, offer.eventDateTo);
  const statusCfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.ROBOCZA;

  const clientToken = agenda?.tokens.find((t) => t.type === "KLIENT_AGENDA");
  const kitchenToken = agenda?.tokens.find((t) => t.type === "KUCHNIA_AGENDA");

  // Zmiana statusu oferty
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

  // Podpisanie umowy
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

  // Kopiuj link
  function copyLink(token: string, path: string) {
    const url = `${window.location.origin}/${path}/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link skopiowany");
  }

  // Edycja pozycji
  function updateItem(itemId: string, field: string, value: string | number) {
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

  // Podsumowanie
  const totalNetto = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  const totalVat = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity * (i.vatRate / 100), 0);
  const totalBrutto = totalNetto + totalVat;

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
        <div className="flex gap-2 flex-wrap">
          <Hint label="Pobierz ofertę jako PDF.">
            <a href={`/api/offers/${id}/pdf`} target="_blank" rel="noopener">
              <Button variant="outline" size="sm">
                <FileDown className="mr-1 h-4 w-4" />
                PDF
              </Button>
            </a>
          </Hint>
          <Button onClick={saveAll} disabled={saving} size="sm">
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Zapisuję..." : "Zapisz pozycje"}
          </Button>
        </div>
      </div>

      {/* Status + akcje */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-2 items-center">
            {/* Zmiana statusu */}
            {(offer.status === "ROBOCZA" || offer.status === "WYSLANA") && (
              <>
                {offer.status === "ROBOCZA" && (
                  <Hint label="Oferta wysłana klientowi mailem/PDF.">
                    <Button size="sm" variant="outline" onClick={() => changeStatus("WYSLANA")}>
                      <Send className="mr-1 h-4 w-4" />
                      Oznacz jako wysłaną
                    </Button>
                  </Hint>
                )}
                <Hint label="Klient potwierdził — zaakceptował ofertę.">
                  <Button size="sm" variant="outline" onClick={() => changeStatus("ZAAKCEPTOWANA")}>
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Zaakceptowana
                  </Button>
                </Hint>
                <Button size="sm" variant="outline" onClick={() => changeStatus("ODRZUCONA")}>
                  <XCircle className="mr-1 h-4 w-4" />
                  Odrzucona
                </Button>
              </>
            )}

            {/* Umowa */}
            {offer.status === "ZAAKCEPTOWANA" && !contract && (
              <Hint label="Utwórz umowę z danymi do podpisu.">
                <Link href={`/umowy/nowa/${id}`}>
                  <Button size="sm">
                    <FileText className="mr-1 h-4 w-4" />
                    Utwórz umowę
                  </Button>
                </Link>
              </Hint>
            )}

            {contract && !contract.signedAt && (
              <Hint label="Klient podpisał? Zatwierdź aby odblokować agendę.">
                <Button size="sm" onClick={signContract}>
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Oznacz umowę jako podpisaną
                </Button>
              </Hint>
            )}

            {contract?.signedAt && (
              <Badge variant="success">Umowa podpisana</Badge>
            )}

            {/* Agenda */}
            {contract?.signedAt && !agenda && (
              <Hint label="Zaplanuj harmonogram: bloki, pakiety, wyposażenie.">
                <Link href={`/agendy/nowa/${id}`}>
                  <Button size="sm">
                    <CalendarDays className="mr-1 h-4 w-4" />
                    Utwórz agendę
                  </Button>
                </Link>
              </Hint>
            )}

            {agenda && (
              <>
                <Link href={`/agendy/${agenda.id}`}>
                  <Badge variant="info" className="cursor-pointer">
                    Agenda: {agenda.type === "WSTEPNA" ? "Wstępna" : "Finalna"}
                  </Badge>
                </Link>
              </>
            )}

            {/* Linki */}
            {clientToken && (
              <Hint label="Skopiuj link dla klienta (wybór pozycji menu).">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyLink(clientToken.token, "klient")}
                >
                  <Copy className="mr-1 h-4 w-4" />
                  Link klienta
                </Button>
              </Hint>
            )}

            {kitchenToken && (
              <Hint label="Skopiuj link dla kuchni (harmonogram + wybory).">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyLink(kitchenToken.token, "kuchnia")}
                >
                  <Copy className="mr-1 h-4 w-4" />
                  Link kuchni
                </Button>
              </Hint>
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
            <div className="rounded-xl border border-border/60 shadow-[var(--shadow-card)] overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-12">NR</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 min-w-[200px]">NAZWA</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-20">GODZ</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-16">ILOŚĆ</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-28">CENA NETTO</th>
                    <th className="px-2 py-2 text-left text-xs font-semibold uppercase tracking-wider text-foreground/70 w-20">VAT</th>
                    <th className="px-2 py-2 text-right text-xs font-semibold uppercase tracking-wider text-foreground/70 w-28">BRUTTO</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {dayItems.map((item, idx) => {
                    const brutto = Number(item.unitPrice) * item.quantity * (1 + item.vatRate / 100);
                    return (
                      <tr key={item.id} className="border-t border-border/40 hover:bg-accent/30 transition-colors">
                        <td className="px-2 py-1.5 text-muted-foreground">{idx + 1}</td>
                        <td className="px-2 py-1.5">
                          <Input
                            className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 px-1"
                            value={item.name}
                            onChange={(e) => updateItem(item.id, "name", e.target.value)}
                            placeholder="Wpisz nazwę pozycji..."
                          />
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
                            type="number"
                            className="h-8 text-sm border-0 bg-transparent shadow-none focus-visible:ring-1 px-1 w-16"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, "quantity", parseInt(e.target.value) || 1)}
                          />
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
                    );
                  })}
                </tbody>
              </table>
              <div className="p-2 border-t border-border/40">
                <Button variant="ghost" size="sm" className="text-primary" onClick={() => addItem(dayInfo.day, dayInfo.date)}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Dodaj pozycję
                </Button>
              </div>
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

      <div className="flex justify-end">
        <Button onClick={saveAll} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Zapisuję..." : "Zapisz pozycje"}
        </Button>
      </div>
    </div>
  );
}
