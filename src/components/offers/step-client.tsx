"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidEmail } from "@/lib/validation";
import type { OfferFormData } from "./offer-wizard-types";

interface Props {
  data: OfferFormData;
  onChange: (data: Partial<OfferFormData>) => void;
}

export function StepClient({ data, onChange }: Props) {
  const emailInvalid = data.clientEmail.trim() !== "" && !isValidEmail(data.clientEmail);
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
          aria-invalid={emailInvalid}
        />
        {emailInvalid && (
          <p className="mt-1 text-xs text-destructive">
            Podaj prawidłowy adres e-mail (np. jan@firma.pl)
          </p>
        )}
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
