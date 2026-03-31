"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Link2,
  Copy,
  Clock,
  Package,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OfferPackage {
  id: string;
  package: {
    name: string;
    offerType: { name: string };
  };
}

interface OfferData {
  id: string;
  clientName: string;
  eventName: string | null;
  eventDateFrom: string;
  eventDateTo: string;
  adultsCount: number;
  offerPackages: OfferPackage[];
  offerHalls: Array<{
    hall: { id: string; name: string };
    date: string;
  }>;
}

interface Block {
  id: string;
  date: string;
  timeFrom: string;
  timeTo: string | null;
  title: string;
  description: string | null;
  hallId: string | null;
  hall: { name: string } | null;
  personCount: number | null;
  blockPackages: Array<{ offerPackageId: string }>;
  equipment: Array<{ id: string; name: string; quantity: number }>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function getDatesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from);
  const end = new Date(to);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

export default function NowaAgendaPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = use(params);
  const router = useRouter();
  const { data: offer } = useSWR<OfferData>(`/api/offers/${offerId}`, fetcher);

  const [agendaId, setAgendaId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [clientToken, setClientToken] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Dialog bloku
  const [blockDialog, setBlockDialog] = useState(false);
  const [blockForm, setBlockForm] = useState({
    date: "",
    timeFrom: "",
    timeTo: "",
    title: "",
    description: "",
    hallId: "",
    personCount: "",
    selectedPackages: [] as string[],
    equipmentList: "" ,
  });

  // Utwórz agendę
  async function createAgenda() {
    setCreating(true);
    try {
      const res = await fetch("/api/agendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      const agenda = await res.json();
      setAgendaId(agenda.id);
      toast.success("Agenda utworzona — dodaj bloki czasowe");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd");
    } finally {
      setCreating(false);
    }
  }

  // Automatycznie utwórz agendę po załadowaniu oferty
  useEffect(() => {
    if (offer && !agendaId && !creating) {
      createAgenda();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer]);

  // Otwórz dialog nowego bloku
  function openBlockDialog() {
    if (!offer) return;
    const dates = getDatesInRange(offer.eventDateFrom, offer.eventDateTo);
    setBlockForm({
      date: dates[0] || "",
      timeFrom: "09:00",
      timeTo: "10:00",
      title: "",
      description: "",
      hallId: "",
      personCount: String(offer.adultsCount),
      selectedPackages: [],
      equipmentList: "",
    });
    setBlockDialog(true);
  }

  // Zapisz blok
  async function saveBlock() {
    if (!agendaId || !blockForm.title) {
      toast.error("Podaj tytuł bloku");
      return;
    }

    const equipment = blockForm.equipmentList
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((name) => ({ name, quantity: 1 }));

    try {
      const res = await fetch(`/api/agendas/${agendaId}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: blockForm.date,
          timeFrom: blockForm.timeFrom,
          timeTo: blockForm.timeTo || null,
          title: blockForm.title,
          description: blockForm.description || null,
          hallId: blockForm.hallId || null,
          personCount: blockForm.personCount
            ? parseInt(blockForm.personCount)
            : null,
          packages: blockForm.selectedPackages.map((id) => ({
            offerPackageId: id,
          })),
          equipment,
        }),
      });

      if (!res.ok) throw new Error("Błąd zapisu bloku");

      const block = await res.json();
      setBlocks((prev) => [...prev, block]);
      setBlockDialog(false);
      toast.success("Blok dodany");
    } catch {
      toast.error("Nie udało się dodać bloku");
    }
  }

  // Usuń blok
  async function deleteBlock(blockId: string) {
    if (!agendaId) return;
    try {
      await fetch(`/api/agendas/${agendaId}/blocks`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockId }),
      });
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      toast.success("Blok usunięty");
    } catch {
      toast.error("Błąd usuwania");
    }
  }

  // Generuj link klienta
  async function generateClientLink() {
    if (!agendaId) return;
    try {
      const res = await fetch(`/api/agendas/${agendaId}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "KLIENT_AGENDA" }),
      });
      if (!res.ok) throw new Error("Błąd");
      const token = await res.json();
      setClientToken(token.token);
      toast.success("Link wygenerowany");
    } catch {
      toast.error("Nie udało się wygenerować linku");
    }
  }

  function copyLink() {
    if (!clientToken) return;
    const url = `${window.location.origin}/klient/${clientToken}`;
    navigator.clipboard.writeText(url);
    toast.success("Link skopiowany do schowka");
  }

  if (!offer) {
    return <p className="text-muted-foreground">Ładowanie oferty...</p>;
  }

  const eventDates = getDatesInRange(offer.eventDateFrom, offer.eventDateTo);

  // Unikalne sale z oferty
  const hallOptions = offer.offerHalls
    .map((h) => ({ id: h.hall.id, name: h.hall.name }))
    .filter((h, i, arr) => arr.findIndex((x) => x.id === h.id) === i);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/agendy">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Kreator agendy</h1>
          <p className="text-muted-foreground text-sm">
            {offer.clientName}
            {offer.eventName && ` — ${offer.eventName}`} (
            {new Date(offer.eventDateFrom).toLocaleDateString("pl-PL")} —{" "}
            {new Date(offer.eventDateTo).toLocaleDateString("pl-PL")})
          </p>
        </div>
      </div>

      {/* Pakiety z oferty */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pakiety z oferty
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {offer.offerPackages.map((op) => (
              <Badge key={op.id} variant="outline">
                {op.package.name} ({op.package.offerType.name})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bloki czasowe */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Bloki czasowe
        </h2>
        <Button onClick={openBlockDialog} disabled={!agendaId}>
          <Plus className="mr-1 h-4 w-4" />
          Dodaj blok
        </Button>
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Brak bloków — dodaj pierwszy blok czasowy (np. &quot;Obiad&quot;, &quot;Wynajem sali&quot;).
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {eventDates.map((date) => {
            const dayBlocks = blocks.filter(
              (b) => b.date.split("T")[0] === date
            );
            if (dayBlocks.length === 0) return null;
            return (
              <Card key={date}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {new Date(date).toLocaleDateString("pl-PL", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dayBlocks.map((block) => (
                    <div
                      key={block.id}
                      className="flex items-start justify-between rounded border p-3"
                    >
                      <div>
                        <div className="font-medium">
                          {block.timeFrom}
                          {block.timeTo && ` — ${block.timeTo}`} ·{" "}
                          {block.title}
                        </div>
                        {block.hall && (
                          <span className="text-xs text-muted-foreground">
                            Sala: {block.hall.name}
                          </span>
                        )}
                        {block.personCount && (
                          <span className="text-xs text-muted-foreground ml-2">
                            · {block.personCount} os.
                          </span>
                        )}
                        {block.equipment.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Wyposażenie:{" "}
                            {block.equipment.map((e) => e.name).join(", ")}
                          </div>
                        )}
                        {block.blockPackages.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {block.blockPackages.map((bp) => {
                              const op = offer.offerPackages.find(
                                (p) => p.id === bp.offerPackageId
                              );
                              return op ? (
                                <Badge
                                  key={bp.offerPackageId}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {op.package.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteBlock(block.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Separator />

      {/* Link klienta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Link dla klienta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clientToken ? (
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/klient/${clientToken}`}
              />
              <Button variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={generateClientLink}
              disabled={!agendaId || blocks.length === 0}
            >
              Wygeneruj link dla klienta
            </Button>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Klient otworzy ten link bez logowania i będzie mógł wybrać pozycje
            menu.
          </p>
        </CardContent>
      </Card>

      {/* Przycisk zakończenia */}
      {agendaId && (
        <div className="flex justify-end">
          <Button onClick={() => router.push(`/agendy/${agendaId}`)}>
            Przejdź do agendy
          </Button>
        </div>
      )}

      {/* Dialog dodawania bloku */}
      <Dialog open={blockDialog} onOpenChange={setBlockDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nowy blok czasowy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Data *</Label>
                <Select
                  value={blockForm.date}
                  onValueChange={(v) =>
                    setBlockForm({ ...blockForm, date: v ?? blockForm.date })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {eventDates.map((d) => (
                      <SelectItem key={d} value={d}>
                        {new Date(d).toLocaleDateString("pl-PL", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Od *</Label>
                <Input
                  type="time"
                  value={blockForm.timeFrom}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, timeFrom: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Do</Label>
                <Input
                  type="time"
                  value={blockForm.timeTo}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, timeTo: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Tytuł *</Label>
              <Input
                value={blockForm.title}
                onChange={(e) =>
                  setBlockForm({ ...blockForm, title: e.target.value })
                }
                placeholder="np. Obiad, Wynajem sali, Przerwa kawowa"
              />
            </div>
            <div>
              <Label>Opis</Label>
              <Textarea
                value={blockForm.description}
                onChange={(e) =>
                  setBlockForm({ ...blockForm, description: e.target.value })
                }
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sala</Label>
                <Select
                  value={blockForm.hallId}
                  onValueChange={(v) =>
                    setBlockForm({ ...blockForm, hallId: v ?? "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz salę" />
                  </SelectTrigger>
                  <SelectContent>
                    {hallOptions.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Liczba osób</Label>
                <Input
                  type="number"
                  min="1"
                  value={blockForm.personCount}
                  onChange={(e) =>
                    setBlockForm({ ...blockForm, personCount: e.target.value })
                  }
                />
              </div>
            </div>
            {/* Pakiety */}
            <div>
              <Label>Pakiety</Label>
              <div className="space-y-1 mt-1">
                {offer.offerPackages.map((op) => (
                  <label
                    key={op.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={blockForm.selectedPackages.includes(op.id)}
                      onChange={(e) => {
                        const selected = e.target.checked
                          ? [...blockForm.selectedPackages, op.id]
                          : blockForm.selectedPackages.filter(
                              (id) => id !== op.id
                            );
                        setBlockForm({
                          ...blockForm,
                          selectedPackages: selected,
                        });
                      }}
                    />
                    {op.package.name} ({op.package.offerType.name})
                  </label>
                ))}
              </div>
            </div>
            {/* Wyposażenie */}
            <div>
              <Label>Wyposażenie (jedno na linię)</Label>
              <Textarea
                value={blockForm.equipmentList}
                onChange={(e) =>
                  setBlockForm({ ...blockForm, equipmentList: e.target.value })
                }
                placeholder={"Flipchart\nRzutnik\nGłośnik\nHDMI"}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setBlockDialog(false)}
              >
                Anuluj
              </Button>
              <Button onClick={saveBlock}>Dodaj blok</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
