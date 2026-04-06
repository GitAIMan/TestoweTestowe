"use client";

import { useState } from "react";
import useSWR from "swr";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const total = data.adultsCount + data.childrenCount;
  const splitMismatch = showSplit && totalField !== "" && total !== (parseInt(totalField) || 0);

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
      <div>
        <Label>Liczba osób *</Label>
        <Input
          type="number"
          min="1"
          value={totalField}
          onChange={(e) => {
            setTotalField(e.target.value);
            if (!showSplit) {
              const val = parseInt(e.target.value) || 0;
              onChange({ adultsCount: val, childrenCount: 0 });
            }
          }}
        />
      </div>
      <div>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => setShowSplit(!showSplit)}
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
              value={data.adultsCount || ""}
              onChange={(e) =>
                onChange({ adultsCount: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label>Dzieci</Label>
            <Input
              type="number"
              min="0"
              value={data.childrenCount || ""}
              onChange={(e) =>
                onChange({ childrenCount: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          {splitMismatch ? (
            <p className="col-span-2 text-xs text-red-600 font-medium">
              Dorośli ({data.adultsCount}) + Dzieci ({data.childrenCount}) = {total} — nie zgadza się z liczbą osób ({totalField})
            </p>
          ) : (
            <p className="col-span-2 text-xs text-muted-foreground">
              Razem: {total} osób
            </p>
          )}
        </div>
      )}
    </div>
  );
}
