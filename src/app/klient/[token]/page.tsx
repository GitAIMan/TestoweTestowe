"use client";

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "sonner";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
}

interface Section {
  id: string;
  name: string;
  selectionMode: "ALL_INCLUDED" | "CHOOSE_X_FROM_Y";
  selectionCount: number | null;
  items: MenuItem[];
}

interface OfferPackage {
  id: string;
  package: {
    name: string;
    offerType: { name: string };
    sections: Section[];
  };
}

interface Block {
  id: string;
  date: string;
  timeFrom: string;
  timeTo: string | null;
  title: string;
  description: string | null;
  hall: { name: string } | null;
  personCount: number | null;
  blockPackages: Array<{ offerPackageId: string }>;
  equipment: Array<{ name: string; quantity: number }>;
}

interface AgendaData {
  agenda: {
    id: string;
    type: string;
    offer: {
      clientName: string;
      eventName: string | null;
      eventDateFrom: string;
      eventDateTo: string;
      adultsCount: number;
      childrenCount: number;
      offerPackages: OfferPackage[];
    };
    blocks: Block[];
  };
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
  const [localSelections, setLocalSelections] = useState<
    Record<string, Set<string>>
  >({});

  useEffect(() => {
    fetch(`/api/public/agenda/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Nieprawidłowy lub wygasły link");
        return res.json();
      })
      .then((result: AgendaData) => {
        setData(result);
        // Inicjalizuj lokalne wybory z zapisanych
        const initial: Record<string, Set<string>> = {};
        for (const sel of result.selections) {
          initial[sel.sectionId] = new Set(
            sel.items.map((i) => i.menuItemId)
          );
        }
        setLocalSelections(initial);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  function toggleItem(sectionId: string, menuItemId: string, section: Section) {
    if (data?.isLocked) return;

    setLocalSelections((prev) => {
      const current = new Set(prev[sectionId] || []);

      if (current.has(menuItemId)) {
        current.delete(menuItemId);
      } else {
        // Jeśli tryb CHOOSE_X — sprawdź limit
        if (
          section.selectionMode === "CHOOSE_X_FROM_Y" &&
          section.selectionCount &&
          current.size >= section.selectionCount
        ) {
          toast.error(
            `Możesz wybrać maksymalnie ${section.selectionCount} pozycji`
          );
          return prev;
        }
        current.add(menuItemId);
      }

      return { ...prev, [sectionId]: current };
    });
  }

  async function saveSelections() {
    if (!data) return;

    // Walidacja — sprawdź czy wybrano wymaganą liczbę
    const allSections = data.agenda.offer.offerPackages.flatMap(
      (op) => op.package.sections
    );

    for (const section of allSections) {
      if (section.selectionMode === "CHOOSE_X_FROM_Y" && section.selectionCount) {
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
      const selections = Object.entries(localSelections).map(
        ([sectionId, items]) => ({
          sectionId,
          menuItemIds: Array.from(items),
        })
      );

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

  const { agenda, isLocked, hotel } = data;
  const offer = agenda.offer;

  // Grupuj bloki po dniach
  const blocksByDate = agenda.blocks.reduce(
    (acc, block) => {
      const date = block.date.split("T")[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(block);
      return acc;
    },
    {} as Record<string, Block[]>
  );

  // Zbierz wszystkie sekcje z CHOOSE_X_FROM_Y
  const chooseSections = offer.offerPackages.flatMap((op) =>
    op.package.sections
      .filter((s) => s.selectionMode === "CHOOSE_X_FROM_Y")
      .map((s) => ({ ...s, packageName: op.package.name }))
  );

  const allIncludedSections = offer.offerPackages.flatMap((op) =>
    op.package.sections
      .filter((s) => s.selectionMode === "ALL_INCLUDED")
      .map((s) => ({ ...s, packageName: op.package.name }))
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster position="top-center" />

      {/* Header */}
      <div
        className="bg-primary text-primary-foreground px-6 py-8"
        style={hotel ? { backgroundColor: hotel.primaryColor } : {}}
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold">
            {hotel?.hotelName || "Hotel"}
          </h1>
          <p className="text-lg mt-1 opacity-90">
            {offer.eventName || "Agenda wydarzenia"}
          </p>
          <p className="text-sm mt-1 opacity-75">
            {offer.clientName} ·{" "}
            {new Date(offer.eventDateFrom).toLocaleDateString("pl-PL")} —{" "}
            {new Date(offer.eventDateTo).toLocaleDateString("pl-PL")} ·{" "}
            {offer.adultsCount} os.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Blokada */}
        {isLocked && (
          <Card className="border-destructive">
            <CardContent className="pt-4 flex items-center gap-3">
              <Lock className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  Wybory zamknięte
                </p>
                <p className="text-sm text-muted-foreground">
                  Nie można już zmieniać wyborów — termin minął.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Harmonogram */}
        {Object.keys(blocksByDate).length > 0 && (
          <>
            <h2 className="text-lg font-semibold">Harmonogram</h2>
            {Object.entries(blocksByDate).map(([date, dayBlocks]) => (
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
                    <div key={block.id} className="rounded border p-3">
                      <div className="font-medium">
                        {block.timeFrom}
                        {block.timeTo && ` — ${block.timeTo}`} · {block.title}
                      </div>
                      {block.hall && (
                        <p className="text-xs text-muted-foreground">
                          Sala: {block.hall.name}
                        </p>
                      )}
                      {block.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {block.description}
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
            <Separator />
          </>
        )}

        {/* Sekcje ALL_INCLUDED */}
        {allIncludedSections.length > 0 && (
          <>
            <h2 className="text-lg font-semibold">W pakiecie</h2>
            {allIncludedSections.map((sec) => (
              <Card key={sec.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {sec.name}
                    <Badge variant="outline" className="text-xs">
                      {sec.packageName}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {sec.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        {item.name}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
            <Separator />
          </>
        )}

        {/* Sekcje CHOOSE_X_FROM_Y — interaktywne */}
        {chooseSections.length > 0 && (
          <>
            <h2 className="text-lg font-semibold">
              Twoje wybory
              {!isLocked && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  (zaznacz pozycje i kliknij &quot;Zapisz&quot;)
                </span>
              )}
            </h2>
            {chooseSections.map((sec) => {
              const selected = localSelections[sec.id] || new Set();
              return (
                <Card key={sec.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {sec.name}
                      <Badge variant="outline" className="text-xs">
                        {sec.packageName}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Wybierz {sec.selectionCount} z {sec.items.length}
                      </Badge>
                      <span className="text-sm font-normal text-muted-foreground">
                        ({selected.size}/{sec.selectionCount})
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {sec.items.map((item) => {
                        const isChecked = selected.has(item.id);
                        return (
                          <li key={item.id}>
                            <label
                              className={`flex items-center gap-3 rounded border p-3 cursor-pointer transition-colors ${
                                isChecked
                                  ? "border-primary bg-primary/5"
                                  : "hover:bg-muted/50"
                              } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  toggleItem(sec.id, item.id, sec)
                                }
                                disabled={isLocked}
                                className="h-4 w-4"
                              />
                              <div>
                                <span className="font-medium">{item.name}</span>
                                {item.description && (
                                  <p className="text-xs text-muted-foreground">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}

            {/* Przycisk zapisu */}
            {!isLocked && (
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={saveSelections}
                  disabled={saving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? "Zapisywanie..." : "Zapisz wybory"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
