"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OfferFormData } from "./offer-wizard-types";

interface Props {
  data: OfferFormData;
  onChange: (data: Partial<OfferFormData>) => void;
}

export function StepEvent({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Dane wydarzenia</h2>
      <div>
        <Label>Nazwa wydarzenia (opcjonalnie)</Label>
        <Input
          value={data.eventName}
          onChange={(e) => onChange({ eventName: e.target.value })}
          placeholder="np. Wesele Kowalskich"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data od *</Label>
          <Input
            type="date"
            value={data.eventDateFrom}
            onChange={(e) => onChange({ eventDateFrom: e.target.value })}
          />
        </div>
        <div>
          <Label>Data do *</Label>
          <Input
            type="date"
            value={data.eventDateTo}
            onChange={(e) => onChange({ eventDateTo: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Liczba dorosłych *</Label>
          <Input
            type="number"
            min="1"
            value={data.adultsCount}
            onChange={(e) =>
              onChange({ adultsCount: parseInt(e.target.value) || 1 })
            }
          />
        </div>
        <div>
          <Label>Liczba dzieci</Label>
          <Input
            type="number"
            min="0"
            value={data.childrenCount}
            onChange={(e) =>
              onChange({ childrenCount: parseInt(e.target.value) || 0 })
            }
          />
        </div>
      </div>
    </div>
  );
}
