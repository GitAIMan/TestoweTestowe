"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import type { OfferFormData, OfferHallItem } from "./offer-wizard-types";

interface HallAvailability {
  id: string;
  name: string;
  capacity: number;
  pricePerDay: string;
  reservedDates: string[];
}

interface Props {
  data: OfferFormData;
  onChange: (data: Partial<OfferFormData>) => void;
}

export function StepHalls({ data, onChange }: Props) {
  const [availability, setAvailability] = useState<HallAvailability[]>([]);
  const [loading, setLoading] = useState(false);

  const dateFrom = data.eventDateFrom;
  const dateTo = data.eventDateTo;

  // Generuj listę dat w zakresie
  function getDatesInRange(from: string, to: string): string[] {
    const dates: string[] = [];
    const start = new Date(from);
    const end = new Date(to);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }

  const eventDates = dateFrom && dateTo ? getDatesInRange(dateFrom, dateTo) : [];
  const totalPeople = (data.adultsCount ?? 0) + (data.childrenCount ?? 0);

  const sortedAvailability = [...availability].sort((a, b) => {
    const aTooSmall = totalPeople > 0 && a.capacity < totalPeople;
    const bTooSmall = totalPeople > 0 && b.capacity < totalPeople;
    if (aTooSmall === bTooSmall) return 0;
    return aTooSmall ? 1 : -1;
  });

  useEffect(() => {
    if (!dateFrom || !dateTo) return;

    setLoading(true);
    fetch(`/api/halls/availability?dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then((res) => res.json())
      .then((data) => setAvailability(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  function addHall(hall: HallAvailability, date: string) {
    const already = data.halls.some(
      (h) => h.hallId === hall.id && h.date === date
    );
    if (already) return;

    const item: OfferHallItem = {
      hallId: hall.id,
      hallName: hall.name,
      capacity: hall.capacity,
      date,
      pricePerDay: hall.pricePerDay,
    };
    onChange({ halls: [...data.halls, item] });
  }

  function removeHall(index: number) {
    const newHalls = data.halls.filter((_, i) => i !== index);
    onChange({ halls: newHalls });
  }

  function isHallReserved(hall: HallAvailability, date: string): boolean {
    return hall.reservedDates.includes(date);
  }

  function isHallSelected(hallId: string, date: string): boolean {
    return data.halls.some((h) => h.hallId === hallId && h.date === date);
  }

  if (!dateFrom || !dateTo) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Sale</h2>
        <p className="text-muted-foreground">
          Najpierw uzupełnij daty wydarzenia w kroku 2.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Sale</h2>
      <p className="text-sm text-muted-foreground">
        Wybierz sale na poszczególne dni wydarzenia. Zielony = wolna, czerwony = zajęta.
        {totalPeople > 0 && (
          <> Liczba gości: <strong>{totalPeople}</strong>. Sale o mniejszej pojemności są wyciszone.</>
        )}
      </p>

      {loading ? (
        <p className="text-muted-foreground">Ładowanie dostępności...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="border p-2 text-left bg-muted">Sala</th>
                {eventDates.map((date) => (
                  <th key={date} className="border p-2 text-center bg-muted">
                    {new Date(date).toLocaleDateString("pl-PL", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedAvailability.map((hall) => {
                const tooSmall = totalPeople > 0 && hall.capacity < totalPeople;
                return (
                <tr key={hall.id} className={tooSmall ? "opacity-50" : ""}>
                  <td className="border p-2">
                    <div className="font-medium flex items-center gap-2">
                      {hall.name}
                      {tooSmall && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          mała
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {hall.capacity} os. · {Number(hall.pricePerDay).toFixed(0)} zł/dzień
                    </div>
                  </td>
                  {eventDates.map((date) => {
                    const reserved = isHallReserved(hall, date);
                    const selected = isHallSelected(hall.id, date);
                    return (
                      <td key={date} className="border p-1 text-center">
                        {reserved && !selected ? (
                          <Badge variant="destructive" className="text-xs">
                            Zajęta
                          </Badge>
                        ) : selected ? (
                          <Badge variant="default" className="text-xs">
                            Wybrana
                          </Badge>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-7 text-xs ${tooSmall ? "cursor-not-allowed opacity-40" : ""}`}
                            onClick={() => {
                              if (tooSmall) return;
                              addHall(hall, date);
                            }}
                            disabled={tooSmall}
                            title={tooSmall ? `Sala na ${hall.capacity} os., gości ${totalPeople} — za mała` : undefined}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            {tooSmall ? "Za mała" : "Dodaj"}
                          </Button>
                        )}
                      </td>
                    );
                  })}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Wybrane sale */}
      {data.halls.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Wybrane sale:</h3>
          <div className="space-y-1">
            {data.halls.map((hall, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded border px-3 py-2"
              >
                <span className="text-sm">
                  {hall.hallName} —{" "}
                  {new Date(hall.date).toLocaleDateString("pl-PL")} —{" "}
                  {Number(hall.pricePerDay).toFixed(2)} zł
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeHall(i)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
