"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ExternalLink, Users, Clock, MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MonthCalendar,
  type CalendarDayData,
} from "@/components/calendar/month-calendar";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function todayMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function KalendarzPage() {
  const [month, setMonth] = useState(todayMonth());
  const [selectedDay, setSelectedDay] = useState<CalendarDayData | null>(null);

  const { data, isLoading } = useSWR<{ month: string; days: CalendarDayData[] }>(
    `/api/calendar?month=${month}`,
    fetcher
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Kalendarz rezerwacji</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Widok zajętości sal. Tylko oferty zaakceptowane z podpisaną umową.
        </p>
      </div>

      <MonthCalendar
        month={month}
        days={data?.days || []}
        onMonthChange={setMonth}
        onDayClick={setSelectedDay}
        loading={isLoading}
      />

      <Dialog open={!!selectedDay} onOpenChange={(o) => { if (!o) setSelectedDay(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedDay && formatDateLong(selectedDay.date)}
            </DialogTitle>
          </DialogHeader>

          {selectedDay && (
            <div className="space-y-5 mt-2">
              {/* Zajęte sale */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-red-400" />
                  Zajęte sale ({selectedDay.reservations.length})
                </h3>
                {selectedDay.reservations.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Brak rezerwacji tego dnia
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedDay.reservations.map((r, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-red-200 bg-red-50/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="font-semibold flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-red-600" />
                              {r.hallName}
                              <Badge variant="outline" className="text-[10px]">
                                {r.capacity} os.
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground mt-0.5">
                              {r.clientName}
                              {r.clientCompany && ` · ${r.clientCompany}`}
                            </div>
                            {r.eventName && (
                              <div className="text-xs text-muted-foreground italic">
                                {r.eventName}
                              </div>
                            )}
                          </div>
                          <Link href={`/oferty/${r.offerId}/edycja`}>
                            <Button variant="outline" size="sm" className="h-8">
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              Oferta
                            </Button>
                          </Link>
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {r.adultsCount + r.childrenCount} os.
                            {r.childrenCount > 0 && (
                              <span className="text-[10px]">
                                ({r.adultsCount} dorośli + {r.childrenCount} dzieci)
                              </span>
                            )}
                          </span>
                          {(r.timeFrom || r.timeTo) && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {r.timeFrom || "—"}
                              {r.timeTo && ` — ${r.timeTo}`}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Wolne sale */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm bg-green-400" />
                  Wolne sale ({selectedDay.freeHalls.length})
                </h3>
                {selectedDay.freeHalls.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    Wszystkie sale zajęte
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedDay.freeHalls.map((h) => (
                      <div
                        key={h.id}
                        className="rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm"
                      >
                        <span className="font-medium">{h.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {h.capacity} os.
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
