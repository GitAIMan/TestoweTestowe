"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { AlertTriangle, CheckCircle2, Users, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
import type { OfferFormData } from "./offer-wizard-types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface OfferType {
  id: string;
  name: string;
}

interface Props {
  data: OfferFormData;
  onChange: (data: Partial<OfferFormData>) => void;
}

export function StepEvent({ data, onChange }: Props) {
  const { data: offerTypes } = useSWR<OfferType[]>(
    "/api/menu/offer-types",
    fetcher
  );

  const [showSplit, setShowSplit] = useState(data.childrenCount > 0);
  const [totalField, setTotalField] = useState((data.adultsCount + data.childrenCount).toString());
  const today = new Date().toISOString().split("T")[0];
  const minDateTo = data.eventDateFrom || today;
  const totalNum = parseInt(totalField) || 0;

  // Sprawdź czy wybrane daty kolidują z innymi rezerwacjami
  const [viewMonth, setViewMonth] = useState(() => {
    const base = data.eventDateFrom || today;
    return base.slice(0, 7);
  });
  type DayReservation = {
    hallName: string;
    clientName: string;
    adultsCount: number;
    childrenCount: number;
    timeFrom: string | null;
    timeTo: string | null;
  };
  type DayData = {
    date: string;
    reservations: DayReservation[];
    freeHalls: Array<{ id: string; name: string; capacity: number }>;
  };
  const { data: calData } = useSWR<{ days: DayData[] }>(
    `/api/calendar?month=${viewMonth}`,
    fetcher
  );

  const [dayDialog, setDayDialog] = useState<DayData | null>(null);

  const conflicts = useMemo(() => {
    if (!data.eventDateFrom || !data.eventDateTo || !calData?.days) return [];
    const from = new Date(data.eventDateFrom);
    const to = new Date(data.eventDateTo);
    const result: string[] = [];
    for (const d of calData.days) {
      const cur = new Date(d.date);
      if (cur >= from && cur <= to && d.reservations.length > 0) {
        result.push(d.date);
      }
    }
    return result;
  }, [data.eventDateFrom, data.eventDateTo, calData]);

  function formatPL(iso: string) {
    return new Date(iso).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  // Dni w mini-kalendarzu (tygodnie pon-nie)
  const miniDays = useMemo(() => {
    const [yStr, mStr] = viewMonth.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1;
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const startWeekday = (first.getDay() + 6) % 7; // pon=0
    const cells: Array<{ date: string | null; day: number | null }> = [];
    for (let i = 0; i < startWeekday; i++) cells.push({ date: null, day: null });
    for (let d = 1; d <= last.getDate(); d++) {
      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({ date: iso, day: d });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
    return cells;
  }, [viewMonth]);

  const occupiedMap = useMemo(() => {
    const m = new Map<string, { count: number; label: string }>();
    if (!calData?.days) return m;
    for (const d of calData.days) {
      if (d.reservations.length > 0) {
        const first = d.reservations[0];
        m.set(d.date, {
          count: d.reservations.length,
          label: `${first.hallName} · ${first.clientName}${d.reservations.length > 1 ? ` + ${d.reservations.length - 1}` : ""}`,
        });
      }
    }
    return m;
  }, [calData]);

  function shiftMonth(delta: number) {
    const [yStr, mStr] = viewMonth.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10) - 1 + delta;
    const d = new Date(y, m, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function monthLabel() {
    const [y, m] = viewMonth.split("-");
    return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1).toLocaleDateString("pl-PL", {
      month: "long",
      year: "numeric",
    });
  }

  function inRange(iso: string) {
    if (!data.eventDateFrom) return false;
    if (!data.eventDateTo) return iso === data.eventDateFrom;
    return iso >= data.eventDateFrom && iso <= data.eventDateTo;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Dane wydarzenia</h2>
      <div>
        <Label>Typ wydarzenia *</Label>
        <Select
          value={data.eventName}
          onValueChange={(v) => { if (v) onChange({ eventName: v }); }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Wybierz typ wydarzenia" />
          </SelectTrigger>
          <SelectContent>
            {offerTypes?.map((t) => (
              <SelectItem key={t.id} value={t.name}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data od *</Label>
          <Input
            type="date"
            min={today}
            value={data.eventDateFrom}
            onChange={(e) => {
              const newFrom = e.target.value;
              onChange({ eventDateFrom: newFrom });
              if (data.eventDateTo && data.eventDateTo < newFrom) {
                onChange({ eventDateFrom: newFrom, eventDateTo: newFrom });
              }
            }}
          />
        </div>
        <div>
          <Label>Data do *</Label>
          <Input
            type="date"
            min={minDateTo}
            value={data.eventDateTo}
            onChange={(e) => onChange({ eventDateTo: e.target.value })}
          />
        </div>
      </div>

      {/* Kalendarz — podgląd zajętości (nie wybiera dat) */}
      <div className="rounded-lg border border-border/60 bg-white dark:bg-card p-3">
        <div className="text-xs font-semibold text-muted-foreground mb-2">
          Podgląd zajętości — daty wpisz w polach wyżej
        </div>
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center text-sm"
            aria-label="Poprzedni miesiąc"
          >
            ‹
          </button>
          <div className="text-sm font-semibold capitalize">{monthLabel()}</div>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center text-sm"
            aria-label="Następny miesiąc"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-[10px] text-muted-foreground uppercase mb-1">
          {["pon", "wto", "śr", "czw", "pt", "sob", "nie"].map((d) => (
            <div key={d} className="text-center py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {miniDays.map((c, i) => {
            if (!c.date) return <div key={i} className="aspect-square" />;
            const occ = occupiedMap.get(c.date);
            const selected = inRange(c.date);
            const isStart = data.eventDateFrom === c.date;
            const isEnd = data.eventDateTo === c.date;
            const isPast = c.date < today;
            const dayObj = calData?.days.find((d) => d.date === c.date);
            return (
              <button
                key={i}
                type="button"
                disabled={isPast || !occ}
                onClick={() => {
                  if (occ && dayObj) setDayDialog(dayObj);
                }}
                title={occ ? `Zajęte: ${occ.label} · kliknij po szczegóły` : "Wolne"}
                className={[
                  "aspect-square rounded text-xs font-semibold flex items-center justify-center relative transition",
                  isPast && "opacity-30",
                  occ && !selected && "bg-red-100 text-red-900 ring-1 ring-red-300 hover:bg-red-200 cursor-pointer",
                  !occ && !selected && "text-foreground cursor-default",
                  selected && !occ && "bg-primary text-primary-foreground ring-2 ring-primary shadow-sm",
                  selected && occ && "bg-red-600 text-white ring-2 ring-red-700 shadow-sm cursor-pointer",
                ].filter(Boolean).join(" ")}
              >
                {c.day}
                {(isStart || isEnd) && (
                  <span className="absolute top-0.5 right-0.5 text-[8px] leading-none bg-white/90 text-primary rounded px-0.5 font-bold">
                    {isStart && isEnd ? "•" : isStart ? "OD" : "DO"}
                  </span>
                )}
                {occ && !selected && (
                  <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-red-600" />
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-100 ring-1 ring-red-300" /> zajęte
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" /> wybrane
          </span>
          <span className="ml-auto">Kliknij zajęty dzień po szczegóły</span>
        </div>
      </div>

      {/* Ostrzeżenie o kolizji z innymi rezerwacjami */}
      {data.eventDateFrom && data.eventDateTo && (
        conflicts.length > 0 ? (
          <div className="rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-950/30 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-red-900 dark:text-red-200">
                Uwaga! W wybranym terminie są już rezerwacje
              </div>
              <div className="text-red-800 dark:text-red-300 text-xs mt-1">
                Zajęte dni: {conflicts.map(formatPL).join(", ")}. Sprawdź szczegóły w kalendarzu
                (ikona „Podgląd kalendarza" obok), żeby zobaczyć, które sale są wolne.
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-green-300 bg-green-50 dark:bg-green-950/20 px-4 py-2.5 flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-green-900 dark:text-green-200 font-medium">
              Wybrany termin jest wolny
            </span>
          </div>
        )
      )}
      <div>
        <Label>Liczba osób *</Label>
        <Input
          type="number"
          min="1"
          value={totalField}
          onChange={(e) => {
            setTotalField(e.target.value);
            const val = parseInt(e.target.value) || 0;
            if (showSplit) {
              // Zachowaj dzieci w granicach totalu, reszta to dorośli
              const children = Math.min(data.childrenCount, val);
              onChange({ adultsCount: Math.max(0, val - children), childrenCount: children });
            } else {
              onChange({ adultsCount: val, childrenCount: 0 });
            }
          }}
        />
      </div>
      <div>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => {
            const next = !showSplit;
            setShowSplit(next);
            // Gdy chowamy rozbicie — wszystko jako dorośli
            if (!next) {
              onChange({ adultsCount: totalNum, childrenCount: 0 });
            }
          }}
        >
          {showSplit ? "Ukryj rozbicie" : "Rozbij na dorosłych i dzieci (opcjonalnie)"}
        </button>
      </div>
      {showSplit && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Dorośli</Label>
            <Input
              type="number"
              min="0"
              max={totalNum}
              value={data.adultsCount || ""}
              onChange={(e) => {
                const adults = Math.min(Math.max(0, parseInt(e.target.value) || 0), totalNum);
                onChange({ adultsCount: adults, childrenCount: totalNum - adults });
              }}
            />
          </div>
          <div>
            <Label>Dzieci</Label>
            <Input
              type="number"
              min="0"
              max={totalNum}
              value={data.childrenCount || ""}
              onChange={(e) => {
                const children = Math.min(Math.max(0, parseInt(e.target.value) || 0), totalNum);
                onChange({ adultsCount: totalNum - children, childrenCount: children });
              }}
            />
          </div>
          <p className="col-span-2 text-xs text-muted-foreground">
            Razem: {totalNum} osób ({data.adultsCount} dorosłych + {data.childrenCount} dzieci)
          </p>
        </div>
      )}

      {/* Pop-up szczegółów zajętego dnia */}
      <Dialog open={!!dayDialog} onOpenChange={(o) => { if (!o) setDayDialog(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dayDialog && new Date(dayDialog.date).toLocaleDateString("pl-PL", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </DialogTitle>
          </DialogHeader>
          {dayDialog && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold mb-2 text-red-700">
                  Zajęte sale ({dayDialog.reservations.length})
                </div>
                <div className="space-y-2">
                  {dayDialog.reservations.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm"
                    >
                      <div className="font-semibold">{r.hallName}</div>
                      <div className="text-muted-foreground text-xs mt-1 flex flex-wrap gap-3">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {r.clientName} · {r.adultsCount + r.childrenCount} os.
                        </span>
                        {(r.timeFrom || r.timeTo) && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {r.timeFrom || "—"}{r.timeTo ? ` – ${r.timeTo}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2 text-green-700">
                  Wolne sale ({dayDialog.freeHalls.length})
                </div>
                {dayDialog.freeHalls.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak wolnych sal tego dnia.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {dayDialog.freeHalls.map((h) => (
                      <span
                        key={h.id}
                        className="text-xs px-2 py-1 rounded bg-green-100 text-green-900 border border-green-300"
                      >
                        {h.name} · {h.capacity} os.
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setDayDialog(null)}>
                  Zamknij
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
