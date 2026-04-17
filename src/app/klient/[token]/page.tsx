"use client";

import { use, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Clock, Lock, MapPin, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "sonner";

interface OfferItem {
  id: string;
  day: number;
  date: string | null;
  sortOrder: number;
  name: string;
  description: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  quantity: number;
  sourceType: string | null;
  sourceId: string | null;
  hall: { id: string; name: string } | null;
}

interface CompositionSection {
  id: string;
  name: string;
  selectionMode: "ALL_INCLUDED" | "CHOOSE_X_FROM_Y" | string;
  selectionCount: number | null;
  items: Array<{ id: string; name: string }>;
}

interface Composition {
  packageName: string;
  offerTypeName: string;
  sections: CompositionSection[];
}

interface AgendaData {
  agenda: {
    id: string;
    type: string;
    offer: {
      id: string;
      clientName: string;
      eventName: string | null;
      eventDateFrom: string;
      eventDateTo: string;
      adultsCount: number;
      childrenCount: number;
      items: OfferItem[];
    };
  };
  packageCompositions: Record<string, Composition>;
  selections: Array<{
    sectionId: string;
    items: Array<{ menuItemId: string }>;
  }>;
  isLocked: boolean;
  hotel: { hotelName: string; primaryColor: string } | null;
}

export default function KlientPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<AgendaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Lokalne wybory klienta: sectionId → Set<menuItemId>
  const [localSelections, setLocalSelections] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    fetch(`/api/public/agenda/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Nieprawidłowy lub wygasły link");
        return res.json();
      })
      .then((result: AgendaData) => {
        setData(result);
        const initial: Record<string, Set<string>> = {};
        for (const sel of result.selections) {
          initial[sel.sectionId] = new Set(sel.items.map((i) => i.menuItemId));
        }
        setLocalSelections(initial);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  function toggleItem(sectionId: string, menuItemId: string, section: CompositionSection) {
    if (data?.isLocked) return;
    setLocalSelections((prev) => {
      const current = new Set(prev[sectionId] || []);
      if (current.has(menuItemId)) {
        current.delete(menuItemId);
      } else {
        if (
          section.selectionMode === "CHOOSE_X_FROM_Y" &&
          section.selectionCount &&
          current.size >= section.selectionCount
        ) {
          toast.error(`Możesz wybrać maksymalnie ${section.selectionCount} pozycji`);
          return prev;
        }
        current.add(menuItemId);
      }
      return { ...prev, [sectionId]: current };
    });
  }

  // Zbiór wszystkich sekcji CHOOSE z kompozycji — dla walidacji
  const allChooseSections = useMemo(() => {
    if (!data) return [] as CompositionSection[];
    const set = new Map<string, CompositionSection>();
    for (const item of data.agenda.offer.items) {
      if (item.sourceType !== "PACKAGE" || !item.sourceId) continue;
      const comp = data.packageCompositions[item.sourceId];
      if (!comp) continue;
      for (const sec of comp.sections) {
        if (sec.selectionMode === "CHOOSE_X_FROM_Y") set.set(sec.id, sec);
      }
    }
    return Array.from(set.values());
  }, [data]);

  async function saveSelections() {
    if (!data) return;
    for (const section of allChooseSections) {
      if (section.selectionCount) {
        const selected = localSelections[section.id]?.size || 0;
        if (selected !== section.selectionCount) {
          toast.error(
            `Sekcja "${section.name}": wybierz dokładnie ${section.selectionCount} pozycji (masz ${selected})`
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      const selections = Object.entries(localSelections).map(([sectionId, items]) => ({
        sectionId,
        menuItemIds: Array.from(items),
      }));
      const res = await fetch(`/api/public/agenda/${token}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd zapisu");
      }
      toast.success("Wybory zapisane!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Ładowanie agendy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Skontaktuj się z hotelem, aby uzyskać nowy link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { agenda, isLocked, hotel, packageCompositions } = data;
  const offer = agenda.offer;

  // Grupuj items po dniu (używamy numeru dnia, nie daty — spójne z resztą systemu)
  const dayMap = new Map<number, { date: string | null; items: OfferItem[] }>();
  for (const item of offer.items) {
    if (!dayMap.has(item.day)) dayMap.set(item.day, { date: item.date, items: [] });
    dayMap.get(item.day)!.items.push(item);
  }
  const days = Array.from(dayMap.entries()).sort(([a], [b]) => a - b);

  const hasChooseSections = allChooseSections.length > 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster position="top-center" />

      {/* Header */}
      <div
        className="bg-primary text-primary-foreground px-6 py-8"
        style={hotel ? { backgroundColor: hotel.primaryColor } : {}}
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold">{hotel?.hotelName || "Hotel"}</h1>
          <p className="text-lg mt-1 opacity-90">{offer.eventName || "Agenda wydarzenia"}</p>
          <p className="text-sm mt-1 opacity-75">
            {offer.clientName} ·{" "}
            {new Date(offer.eventDateFrom).toLocaleDateString("pl-PL")} —{" "}
            {new Date(offer.eventDateTo).toLocaleDateString("pl-PL")} · {offer.adultsCount}
            {offer.childrenCount > 0 ? ` + ${offer.childrenCount}` : ""} os.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {isLocked && (
          <Card className="border-destructive">
            <CardContent className="pt-4 flex items-center gap-3">
              <Lock className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Wybory zamknięte</p>
                <p className="text-sm text-muted-foreground">
                  Nie można już zmieniać wyborów — termin minął.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLocked && hasChooseSections && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4 text-sm">
              Przejrzyj harmonogram. W pozycjach oznaczonych jako pakiet znajdziesz sekcje do wyboru —
              zaznacz pozycje i zapisz.
            </CardContent>
          </Card>
        )}

        <h2 className="text-lg font-semibold">Harmonogram</h2>

        {days.length === 0 && (
          <Card>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              Harmonogram jeszcze nie jest gotowy.
            </CardContent>
          </Card>
        )}

        {days.map(([dayNum, dayData]) => {
          const label = dayData.date
            ? new Date(dayData.date).toLocaleDateString("pl-PL", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
            : `Dzień ${dayNum}`;
          return (
            <Card key={dayNum}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <span className="text-primary font-bold mr-2">Dzień {dayNum}</span>
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dayData.items.map((item) => {
                  const isPackage = item.sourceType === "PACKAGE";
                  const comp = isPackage && item.sourceId ? packageCompositions[item.sourceId] : null;
                  const time = item.timeFrom
                    ? `${item.timeFrom}${item.timeTo ? ` — ${item.timeTo}` : ""}`
                    : null;
                  return (
                    <div key={item.id} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        {time && (
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                            <Clock className="h-3.5 w-3.5" />
                            {time}
                          </span>
                        )}
                        <span className="font-medium">{item.name}</span>
                        {item.hall && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {item.hall.name}
                          </span>
                        )}
                        {isPackage && (
                          <Badge variant="secondary" className="text-[10px]">Pakiet</Badge>
                        )}
                      </div>

                      {comp && comp.sections.length > 0 && (
                        <div className="pt-2 space-y-3">
                          {comp.sections.map((sec) => {
                            const isChoose = sec.selectionMode === "CHOOSE_X_FROM_Y";
                            const selected = localSelections[sec.id] || new Set<string>();
                            return (
                              <div key={sec.id} className="rounded-md bg-muted/40 p-3 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium">{sec.name}</span>
                                  {isChoose ? (
                                    <>
                                      <Badge variant="secondary" className="text-[10px]">
                                        Wybierz {sec.selectionCount} z {sec.items.length}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        ({selected.size}/{sec.selectionCount})
                                      </span>
                                    </>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px]">
                                      W cenie
                                    </Badge>
                                  )}
                                </div>

                                {isChoose ? (
                                  <ul className="space-y-1.5">
                                    {sec.items.map((mi) => {
                                      const isChecked = selected.has(mi.id);
                                      return (
                                        <li key={mi.id}>
                                          <label
                                            className={`flex items-center gap-3 rounded border p-2.5 cursor-pointer transition-colors text-sm ${
                                              isChecked
                                                ? "border-primary bg-primary/5"
                                                : "hover:bg-muted/50 border-border"
                                            } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => toggleItem(sec.id, mi.id, sec)}
                                              disabled={isLocked}
                                              className="h-4 w-4"
                                            />
                                            <span>{mi.name}</span>
                                          </label>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <ul className="space-y-1">
                                    {sec.items.map((mi) => (
                                      <li
                                        key={mi.id}
                                        className="flex items-center gap-2 text-sm text-muted-foreground"
                                      >
                                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                        {mi.name}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {hasChooseSections && !isLocked && (
          <div className="flex justify-center pt-2">
            <Button size="lg" onClick={saveSelections} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Zapisywanie..." : "Zapisz wybory"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
