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
  const personCount = (data.adultsCount || 0) + (data.childrenCount || 0);
  const VAT_ROOMS = new Decimal(1.08); // 8%
  const VAT_HALLS = new Decimal(1.23); // 23%
  const VAT_PACKAGES = new Decimal(1.08); // 8% (żywność)

  // Sale — ryczałt × VAT 23%
  const hallsNetto = data.halls.reduce(
    (sum, h) => sum.add(new Decimal(h.pricePerDay)),
    new Decimal(0)
  );
  const hallsTotal = hallsNetto.mul(VAT_HALLS);

  // Pokoje — ryczałt × VAT 8%
  const roomsNetto = data.rooms.reduce(
    (sum, r) =>
      sum.add(new Decimal(r.pricePerNight).mul(r.quantity).mul(r.nights)),
    new Decimal(0)
  );
  const roomsTotal = roomsNetto.mul(VAT_ROOMS);

  // Pakiety — cena/os × osoby × VAT 8%
  const packagesUnitNetto = data.packages.reduce(
    (sum, p) => (p.priceSnapshot ? sum.add(new Decimal(p.priceSnapshot)) : sum),
    new Decimal(0)
  );
  const packagesTotal = packagesUnitNetto
    .mul(personCount)
    .mul(VAT_PACKAGES);

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
              Suma sal: <span className="text-muted-foreground font-normal">{hallsNetto.toFixed(2)} zł netto · </span>
              {hallsTotal.toFixed(2)} zł brutto
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
              Suma pokoi: <span className="text-muted-foreground font-normal">{roomsNetto.toFixed(2)} zł netto · </span>
              {roomsTotal.toFixed(2)} zł brutto
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
                {p.priceSnapshot && ` — ${Number(p.priceSnapshot).toFixed(2)} zł/os.`}
              </p>
            ))}
            <p className="text-sm font-medium mt-1">
              {packagesUnitNetto.toFixed(2)} zł/os. × {personCount} os. ={" "}
              <span className="text-muted-foreground font-normal">
                {packagesUnitNetto.mul(personCount).toFixed(2)} zł netto ·{" "}
              </span>
              {packagesTotal.toFixed(2)} zł brutto
            </p>
          </div>
          <Separator />
        </>
      )}

      {/* TOTAL */}
      <div className="rounded-lg bg-muted p-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-lg font-semibold">RAZEM BRUTTO</span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Zawiera VAT. Pakiety liczone × liczba osób ({personCount}).
            </p>
          </div>
          <span className="text-2xl font-bold">{grandTotal.toFixed(2)} zł</span>
        </div>
      </div>

      {/* Notatki */}
      <div>
        <Label>Notatki (opcjonalnie)</Label>
        <Textarea
          value={data.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}
