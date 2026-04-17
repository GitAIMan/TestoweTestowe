"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OfferFormData } from "./offer-wizard-types";

interface Props {
  data: OfferFormData;
  onChange: (data: Partial<OfferFormData>) => void;
}

export function StepClient({ data, onChange }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Dane klienta</h2>
      <div>
        <Label>Imię i nazwisko *</Label>
        <Input
          value={data.clientName}
          onChange={(e) => onChange({ clientName: e.target.value })}
        />
      </div>
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={data.clientEmail}
          onChange={(e) => onChange({ clientEmail: e.target.value })}
        />
      </div>
      <div>
        <Label>Telefon</Label>
        <Input
          value={data.clientPhone}
          onChange={(e) => onChange({ clientPhone: e.target.value })}
        />
      </div>
      <div>
        <Label>Firma (opcjonalnie)</Label>
        <Input
          value={data.clientCompany}
          onChange={(e) => onChange({ clientCompany: e.target.value })}
        />
      </div>
    </div>
  );
}
