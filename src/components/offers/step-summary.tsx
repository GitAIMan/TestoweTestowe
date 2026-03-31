"use client";

import Decimal from "decimal.js";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { OfferFormData } from "./offer-wizard-types";

interface Props {
  data: OfferFormData;
  onChange: (data: Partial<OfferFormData>) => void;
}

export function StepSummary({ data, onChange }: Props) {
  // Oblicz sumy z decimal.js
  const roomsTotal = data.rooms.reduce(
    (sum, r) =>
      sum.add(new Decimal(r.pricePerNight).mul(r.quantity).mul(r.nights)),
    new Decimal(0)
  );

  const hallsTotal = data.halls.reduce(
    (sum, h) => sum.add(new Decimal(h.pricePerDay)),
    new Decimal(0)
  );

  const packagesTotal = data.packages.reduce(
    (sum, p) => (p.priceSnapshot ? sum.add(new Decimal(p.priceSnapshot)) : sum),
    new Decimal(0)
  );

  const grandTotal = roomsTotal.add(hallsTotal).add(packagesTotal);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Podsumowanie oferty</h2>

      {/* Klient */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          Klient
        </h3>
        <p className="font-medium">{data.clientName}</p>
        {data.clientCompany && (
          <p className="text-sm text-muted-foreground">{data.clientCompany}</p>
        )}
        {data.clientEmail && (
          <p className="text-sm">{data.clientEmail}</p>
        )}
        {data.clientPhone && (
          <p className="text-sm">{data.clientPhone}</p>
        )}
      </div>

      <Separator />

      {/* Wydarzenie */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          Wydarzenie
        </h3>
        {data.eventName && <p className="font-medium">{data.eventName}</p>}
        <p className="text-sm">
          {data.eventDateFrom &&
            new Date(data.eventDateFrom).toLocaleDateString("pl-PL")}{" "}
          —{" "}
          {data.eventDateTo &&
            new Date(data.eventDateTo).toLocaleDateString("pl-PL")}
        </p>
        <p className="text-sm">
          {data.adultsCount} dorosłych
          {data.childrenCount > 0 && `, ${data.childrenCount} dzieci`}
        </p>
      </div>

      <Separator />

      {/* Sale */}
      {data.halls.length > 0 && (
        <>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Sale ({data.halls.length})
            </h3>
            {data.halls.map((h, i) => (
              <p key={i} className="text-sm">
                {h.hallName} —{" "}
                {new Date(h.date).toLocaleDateString("pl-PL")} —{" "}
                {Number(h.pricePerDay).toFixed(2)} zł
              </p>
            ))}
            <p className="text-sm font-medium mt-1">
              Suma sal: {hallsTotal.toFixed(2)} zł
            </p>
          </div>
          <Separator />
        </>
      )}

      {/* Pokoje */}
      {data.rooms.length > 0 && (
        <>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Pokoje ({data.rooms.length})
            </h3>
            {data.rooms.map((r, i) => (
              <p key={i} className="text-sm">
                {r.roomName} — {r.quantity} szt. × {r.nights} nocy ×{" "}
                {Number(r.pricePerNight).toFixed(2)} zł ={" "}
                {(Number(r.pricePerNight) * r.quantity * r.nights).toFixed(2)} zł
              </p>
            ))}
            <p className="text-sm font-medium mt-1">
              Suma pokoi: {roomsTotal.toFixed(2)} zł
            </p>
          </div>
          <Separator />
        </>
      )}

      {/* Pakiety */}
      {data.packages.length > 0 && (
        <>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">
              Pakiety ({data.packages.length})
            </h3>
            {data.packages.map((p) => (
              <p key={p.packageId} className="text-sm">
                {p.packageName} ({p.offerTypeName})
                {p.priceSnapshot && ` — ${Number(p.priceSnapshot).toFixed(2)} zł`}
              </p>
            ))}
            <p className="text-sm font-medium mt-1">
              Suma pakietów: {packagesTotal.toFixed(2)} zł
            </p>
          </div>
          <Separator />
        </>
      )}

      {/* TOTAL */}
      <div className="rounded-lg bg-muted p-4">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">RAZEM</span>
          <span className="text-2xl font-bold">{grandTotal.toFixed(2)} zł</span>
        </div>
      </div>

      {/* Notatki */}
      <div>
        <Label>Notatki (opcjonalnie)</Label>
        <Textarea
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          placeholder="Dodatkowe informacje do oferty..."
          rows={3}
        />
      </div>
    </div>
  );
}
