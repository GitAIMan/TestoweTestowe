"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  INITIAL_FORM_DATA,
  STEP_LABELS,
  type OfferFormData,
} from "@/components/offers/offer-wizard-types";
import { StepClient } from "@/components/offers/step-client";
import { StepEvent } from "@/components/offers/step-event";
import { StepHalls } from "@/components/offers/step-halls";
import { StepRooms } from "@/components/offers/step-rooms";
import { StepPackages } from "@/components/offers/step-packages";
import { StepSummary } from "@/components/offers/step-summary";

export default function NowaOfertaPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OfferFormData>(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);

  function updateData(partial: Partial<OfferFormData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function validateStep(): string | null {
    if (step === 0 && !data.clientName.trim()) {
      return "Podaj imię i nazwisko klienta";
    }
    if (step === 1) {
      if (!data.eventDateFrom || !data.eventDateTo) {
        return "Podaj daty wydarzenia";
      }
      if (new Date(data.eventDateFrom) > new Date(data.eventDateTo)) {
        return "Data rozpoczęcia nie może być późniejsza niż data zakończenia";
      }
      if (data.adultsCount < 1) {
        return "Minimum 1 osoba dorosła";
      }
    }
    return null;
  }

  function next() {
    const error = validateStep();
    if (error) {
      toast.error(error);
      return;
    }
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1));
  }

  function prev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body = {
        clientName: data.clientName,
        clientEmail: data.clientEmail || undefined,
        clientPhone: data.clientPhone || undefined,
        clientCompany: data.clientCompany || undefined,
        eventName: data.eventName || undefined,
        eventDateFrom: data.eventDateFrom,
        eventDateTo: data.eventDateTo,
        adultsCount: data.adultsCount,
        childrenCount: data.childrenCount,
        notes: data.notes || undefined,
        rooms: data.rooms.map((r) => ({
          roomId: r.roomId,
          quantity: r.quantity,
          nights: r.nights,
          pricePerNight: r.pricePerNight,
        })),
        halls: data.halls.map((h) => ({
          hallId: h.hallId,
          date: h.date,
          pricePerDay: h.pricePerDay,
        })),
        packages: data.packages.map((p) => ({
          packageId: p.packageId,
          priceSnapshot: p.priceSnapshot,
        })),
      };

      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd zapisu oferty");
      }

      const offer = await res.json();
      toast.success("Oferta utworzona!");
      router.push(`/oferty/${offer.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Nowa oferta</h1>

      {/* Stepper */}
      <div className="flex items-center gap-1">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center">
            <button
              onClick={() => {
                if (i < step) setStep(i);
              }}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/20 text-primary cursor-pointer"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <span>{i + 1}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEP_LABELS.length - 1 && (
              <div className="w-4 h-px bg-border mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Krok */}
      <Card>
        <CardContent className="pt-6">
          {step === 0 && <StepClient data={data} onChange={updateData} />}
          {step === 1 && <StepEvent data={data} onChange={updateData} />}
          {step === 2 && <StepHalls data={data} onChange={updateData} />}
          {step === 3 && <StepRooms data={data} onChange={updateData} />}
          {step === 4 && <StepPackages data={data} onChange={updateData} />}
          {step === 5 && <StepSummary data={data} onChange={updateData} />}
        </CardContent>
      </Card>

      {/* Nawigacja */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={prev} disabled={step === 0}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Wstecz
        </Button>

        {step < STEP_LABELS.length - 1 ? (
          <Button onClick={next}>
            Dalej
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-1 h-4 w-4" />
            {saving ? "Zapisywanie..." : "Zapisz ofertę"}
          </Button>
        )}
      </div>
    </div>
  );
}
