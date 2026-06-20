"use client";

import { use, useEffect, useState } from "react";
import { CheckCircle, UtensilsCrossed, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    offerItemId: string | null;
    items: Array<{ menuItemId: string }>;
  }>;
  hotel: { hotelName: string; primaryColor: string; logoUrl?: string | null } | null;
  lastModifiedAt?: string;
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
        if (!res.ok) throw new Error("Ten link nie jest już aktywny.");
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
            <p className="text-sm text-muted-foreground mt-2">
              Skontaktuj się z hotelem, aby uzyskać nowy link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { agenda, selections, hotel, packageCompositions } = data;
  const offer = agenda.offer;
  const personCount = offer.adultsCount + offer.childrenCount;

  // Mapa wyborów: klucz "offerItemId:sectionId" → Set<menuItemId>
  const selectionMap = new Map<string, Set<string>>();
  for (const sel of selections) {
    if (!sel.offerItemId) continue;
    selectionMap.set(
      `${sel.offerItemId}:${sel.sectionId}`,
      new Set(sel.items.map((i) => i.menuItemId))
    );
  }

  // Grupuj items po dniu
  const dayMap = new Map<number, { date: string | null; items: OfferItem[] }>();
  for (const item of offer.items) {
    if (!dayMap.has(item.day)) dayMap.set(item.day, { date: item.date, items: [] });
    dayMap.get(item.day)!.items.push(item);
  }
  const days = Array.from(dayMap.entries()).sort(([a], [b]) => a - b);

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

      {data.lastModifiedAt && (
        <div className="border-b border-border bg-amber-50 print:hidden">
          <div className="max-w-4xl mx-auto px-6 py-2.5 text-sm flex items-center gap-2 text-amber-900">
            <Clock className="h-4 w-4" />
            <span>
              Zaktualizowano:{" "}
              <strong>
                {new Date(data.lastModifiedAt).toLocaleDateString("pl-PL", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
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
                year: "numeric",
              })
            : `Dzień ${dayNum}`;
          return (
            <div key={dayNum}>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="text-primary">Dzień {dayNum}</span>
                <span className="text-foreground">· {label}</span>
              </h2>

              <div className="space-y-3">
                {dayData.items.map((item) => {
                  const isPackage = item.sourceType === "PACKAGE";
                  const comp =
                    isPackage && item.sourceId ? packageCompositions[item.sourceId] : null;
                  const time = item.timeFrom
                    ? `${item.timeFrom}${item.timeTo ? ` — ${item.timeTo}` : ""}`
                    : null;
                  return (
                    <Card key={item.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2">
                            {time && <span className="text-primary">{time}</span>}
                            <span>· {item.name}</span>
                          </span>
                          <div className="flex gap-2 text-sm font-normal">
                            {item.hall && (
                              <Badge variant="outline">
                                <MapPin className="h-3 w-3 mr-1" />
                                {item.hall.name}
                              </Badge>
                            )}
                            {isPackage && (
                              <Badge variant="secondary">{personCount} os.</Badge>
                            )}
                          </div>
                        </CardTitle>
                      </CardHeader>
                      {comp && comp.sections.length > 0 && (
                        <CardContent className="space-y-3">
                          {comp.sections.map((sec) => {
                            const selectedIds = selectionMap.get(`${item.id}:${sec.id}`);
                            const isChoose = sec.selectionMode === "CHOOSE_X_FROM_Y";
                            const displayItems = isChoose
                              ? sec.items.filter((i) => selectedIds?.has(i.id))
                              : sec.items;
                            if (displayItems.length === 0) {
                              return (
                                <div key={`${item.id}-${sec.id}`} className="ml-1">
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    {sec.name}
                                    {isChoose && (
                                      <span className="ml-1 italic">
                                        (klient jeszcze nie wybrał)
                                      </span>
                                    )}
                                  </p>
                                </div>
                              );
                            }
                            return (
                              <div key={sec.id} className="ml-1">
                                <p className="text-xs font-medium text-muted-foreground mb-1">
                                  {sec.name}
                                  {isChoose && (
                                    <span className="ml-1">(wybór klienta)</span>
                                  )}
                                </p>
                                <ul className="space-y-0.5">
                                  {displayItems.map((mi) => (
                                    <li
                                      key={mi.id}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                                      {mi.name}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

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
