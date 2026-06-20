"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CalendarReservation {
  hallId: string;
  hallName: string;
  capacity: number;
  offerId: string;
  offerStatus: string;
  clientName: string;
  clientCompany: string | null;
  eventName: string | null;
  eventDateFrom: string;
  eventDateTo: string;
  adultsCount: number;
  childrenCount: number;
  timeFrom: string | null;
  timeTo: string | null;
}

export interface CalendarDayData {
  date: string; // YYYY-MM-DD
  reservations: CalendarReservation[];
  freeHalls: Array<{ id: string; name: string; capacity: number }>;
}

interface MonthCalendarProps {
  month: string; // YYYY-MM
  days: CalendarDayData[];
  onMonthChange: (newMonth: string) => void;
  onDayClick: (day: CalendarDayData) => void;
  loading?: boolean;
}

const WEEKDAYS_PL = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];
const MONTHS_PL = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function todayMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthCalendar({
  month,
  days,
  onMonthChange,
  onDayClick,
  loading,
}: MonthCalendarProps) {
  const [year, monthNum] = month.split("-").map(Number);

  // Dzień tygodnia 1-go dnia miesiąca (0=Nd → przerabiamy na 6)
  // W PL tydzień zaczyna się w poniedziałek = 0
  const firstDayWeekday = useMemo(() => {
    const d = new Date(year, monthNum - 1, 1).getDay();
    return d === 0 ? 6 : d - 1; // Nd=6, Pn=0
  }, [year, monthNum]);

  // Placeholdery na początku (przed 1. dniem miesiąca)
  const blanksBefore = Array.from({ length: firstDayWeekday });

  const monthLabel = `${MONTHS_PL[monthNum - 1]} ${year}`;
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-[var(--shadow-card)] overflow-hidden">
      {/* Nagłówek */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/40">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            aria-label="Poprzedni miesiąc"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onMonthChange(todayMonth())}
          >
            Dziś
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            aria-label="Następny miesiąc"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h3 className="text-lg font-semibold">{monthLabel}</h3>
        <div className="text-xs text-muted-foreground flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-green-100 border border-green-300" /> wolne
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-red-100 border border-red-300" /> zajęte
          </span>
        </div>
      </div>

      {/* Dni tygodnia */}
      <div className="grid grid-cols-7 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/20">
        {WEEKDAYS_PL.map((d) => (
          <div key={d} className="px-2 py-2 text-center border-b border-border/60">
            {d}
          </div>
        ))}
      </div>

      {/* Siatka */}
      <div className="grid grid-cols-7">
        {blanksBefore.map((_, i) => (
          <div key={`b-${i}`} className="aspect-square border-r border-b border-border/40 bg-muted/10" />
        ))}
        {days.map((day) => {
          const hasReservations = day.reservations.length > 0;
          const isToday = day.date === todayStr;
          const dayNum = parseInt(day.date.split("-")[2], 10);

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onDayClick(day)}
              className={[
                "aspect-square relative text-left p-2 border-r border-b border-border/40 transition-all",
                "hover:shadow-md hover:z-10 focus:outline-none focus:ring-2 focus:ring-primary",
                hasReservations
                  ? "bg-red-100 hover:bg-red-200 ring-1 ring-red-300"
                  : "bg-green-50/60 hover:bg-green-100",
                loading && "opacity-50 pointer-events-none",
              ].join(" ")}
            >
              <div
                className={[
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold",
                  isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground",
                ].join(" ")}
              >
                {dayNum}
              </div>
              {hasReservations && (
                <div className="mt-1 space-y-0.5">
                  {day.reservations.slice(0, 2).map((r, i) => (
                    <div
                      key={i}
                      className="text-[10px] leading-tight px-1.5 py-0.5 rounded bg-red-200/70 text-red-900 font-medium truncate"
                      title={`${r.hallName} · ${r.adultsCount + r.childrenCount} os.`}
                    >
                      {r.hallName}
                      <span className="text-red-700 ml-0.5">
                        · {r.adultsCount + r.childrenCount}
                      </span>
                    </div>
                  ))}
                  {day.reservations.length > 2 && (
                    <div className="text-[10px] leading-tight px-1.5 py-0.5 text-red-800 font-semibold">
                      +{day.reservations.length - 2} więcej
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
