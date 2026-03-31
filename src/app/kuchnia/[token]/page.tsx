"use client";

import { use, useEffect, useState } from "react";
import { CheckCircle, UtensilsCrossed, Clock, Monitor } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface MenuItem {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
  selectionMode: string;
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
  hotel: {
    hotelName: string;
    primaryColor: string;
    logoUrl?: string | null;
  } | null;
}

export default function KuchniaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<AgendaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/agenda/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Nieprawidłowy lub wygasły link");
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Ładowanie agendy...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">
              {error || "Nie udało się załadować agendy"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { agenda, selections, hotel } = data;
  const offer = agenda.offer;

  // Mapa wyborów: sectionId → Set<menuItemId>
  const selectionMap = new Map<string, Set<string>>();
  for (const sel of selections) {
    selectionMap.set(sel.sectionId, new Set(sel.items.map((i) => i.menuItemId)));
  }

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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div
        className="bg-primary text-primary-foreground px-6 py-8 print:bg-white print:text-black"
        style={hotel ? { backgroundColor: hotel.primaryColor } : {}}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="h-6 w-6" />
            <h1 className="text-2xl font-bold">
              {hotel?.hotelName || "Hotel"} — Kuchnia
            </h1>
          </div>
          <p className="text-lg mt-2 opacity-90">
            {offer.eventName || "Agenda wydarzenia"}
          </p>
          <p className="text-sm mt-1 opacity-75">
            {offer.clientName} ·{" "}
            {new Date(offer.eventDateFrom).toLocaleDateString("pl-PL")} —{" "}
            {new Date(offer.eventDateTo).toLocaleDateString("pl-PL")} ·{" "}
            {offer.adultsCount} dorosłych
            {offer.childrenCount > 0 && ` + ${offer.childrenCount} dzieci`}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Harmonogram dzień po dniu */}
        {Object.entries(blocksByDate).map(([date, dayBlocks]) => (
          <div key={date}>
            <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {new Date(date).toLocaleDateString("pl-PL", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h2>

            <div className="space-y-3">
              {dayBlocks.map((block) => {
                // Pakiety przypisane do tego bloku
                const blockPkgs = block.blockPackages
                  .map((bp) =>
                    offer.offerPackages.find((op) => op.id === bp.offerPackageId)
                  )
                  .filter(Boolean) as OfferPackage[];

                return (
                  <Card key={block.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center justify-between">
                        <span>
                          {block.timeFrom}
                          {block.timeTo && ` — ${block.timeTo}`} · {block.title}
                        </span>
                        <div className="flex gap-2 text-sm font-normal">
                          {block.hall && (
                            <Badge variant="outline">{block.hall.name}</Badge>
                          )}
                          {block.personCount && (
                            <Badge variant="secondary">
                              {block.personCount} os.
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {block.description && (
                        <p className="text-sm text-muted-foreground">
                          {block.description}
                        </p>
                      )}

                      {/* Menu z wyborami klienta */}
                      {blockPkgs.map((op) => (
                        <div key={op.id}>
                          <p className="text-sm font-medium mb-1">
                            {op.package.name} ({op.package.offerType.name})
                          </p>
                          {op.package.sections.map((sec) => {
                            const selectedIds = selectionMap.get(sec.id);
                            const isChoose =
                              sec.selectionMode === "CHOOSE_X_FROM_Y";

                            // Filtruj pozycje: ALL_INCLUDED = wszystkie, CHOOSE = tylko wybrane
                            const displayItems = isChoose
                              ? sec.items.filter(
                                  (i) => selectedIds?.has(i.id)
                                )
                              : sec.items;

                            if (displayItems.length === 0) return null;

                            return (
                              <div key={sec.id} className="ml-4 mb-2">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  {sec.name}
                                  {isChoose && (
                                    <span className="ml-1">
                                      (wybór klienta)
                                    </span>
                                  )}
                                </p>
                                <ul className="space-y-0.5">
                                  {displayItems.map((item) => (
                                    <li
                                      key={item.id}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                                      {item.name}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      ))}

                      {/* Wyposażenie */}
                      {block.equipment.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                          <Monitor className="h-3 w-3" />
                          {block.equipment
                            .map(
                              (e) =>
                                `${e.name}${e.quantity > 1 ? ` ×${e.quantity}` : ""}`
                            )
                            .join(", ")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Separator className="mt-6" />
          </div>
        ))}

        {/* Stopka */}
        <div className="text-center text-xs text-muted-foreground pt-4">
          <p>{hotel?.hotelName}</p>
          <p>
            Wygenerowano:{" "}
            {new Date().toLocaleDateString("pl-PL", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
