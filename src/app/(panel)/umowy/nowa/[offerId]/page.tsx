"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Offer {
  id: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientCompany: string | null;
  eventName: string | null;
  eventDateFrom: string;
  eventDateTo: string;
  totalPrice: string;
  status: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function NowaUmowaPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = use(params);
  const router = useRouter();
  const { data: offer } = useSWR<Offer>(`/api/offers/${offerId}`, fetcher);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    clientFullName: "",
    clientAddress: "",
    clientNip: "",
    clientPesel: "",
    advanceAmount: "",
    advanceDueDate: "",
    paymentTerms: "",
    specialConditions: "",
  });

  // Pre-fill z oferty
  useEffect(() => {
    if (offer) {
      setForm((prev) => ({
        ...prev,
        clientFullName: offer.clientName,
      }));
    }
  }, [offer]);

  async function handleSave() {
    if (!form.clientFullName.trim()) {
      toast.error("Podaj imię i nazwisko klienta");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId,
          ...form,
          advanceAmount: form.advanceAmount || null,
          advanceDueDate: form.advanceDueDate || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Błąd zapisu");
      }

      const contract = await res.json();
      toast.success("Umowa utworzona!");
      router.push(`/umowy/${contract.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  if (!offer) {
    return <p className="text-muted-foreground">Ładowanie oferty...</p>;
  }

  if (offer.status !== "ZAAKCEPTOWANA") {
    return (
      <div className="space-y-4">
        <p className="text-destructive">
          Umowę można utworzyć tylko z zaakceptowanej oferty.
        </p>
        <Link href={`/oferty/${offerId}`}>
          <Button variant="outline">Wróć do oferty</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={`/oferty/${offerId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold">Nowa umowa</h1>
      </div>

      {/* Info z oferty */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Na podstawie oferty</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <p>
            <span className="text-muted-foreground">Klient:</span>{" "}
            {offer.clientName}
          </p>
          {offer.eventName && (
            <p>
              <span className="text-muted-foreground">Wydarzenie:</span>{" "}
              {offer.eventName}
            </p>
          )}
          <p>
            <span className="text-muted-foreground">Data:</span>{" "}
            {new Date(offer.eventDateFrom).toLocaleDateString("pl-PL")} —{" "}
            {new Date(offer.eventDateTo).toLocaleDateString("pl-PL")}
          </p>
          <p>
            <span className="text-muted-foreground">Kwota:</span>{" "}
            {Number(offer.totalPrice).toFixed(2)} zł
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Formularz umowy */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dane klienta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Imię i nazwisko *</Label>
              <Input
                value={form.clientFullName}
                onChange={(e) =>
                  setForm({ ...form, clientFullName: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Adres</Label>
              <Input
                value={form.clientAddress}
                onChange={(e) =>
                  setForm({ ...form, clientAddress: e.target.value })
                }
                placeholder="ul. Przykładowa 1, 00-000 Miasto"
              />
            </div>
            <div>
              <Label>NIP (firma)</Label>
              <Input
                value={form.clientNip}
                onChange={(e) =>
                  setForm({ ...form, clientNip: e.target.value })
                }
                placeholder="np. 1234567890"
              />
            </div>
            <div>
              <Label>PESEL (osoba prywatna)</Label>
              <Input
                value={form.clientPesel}
                onChange={(e) =>
                  setForm({ ...form, clientPesel: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Warunki</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Kwota zaliczki (PLN)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.advanceAmount}
                onChange={(e) =>
                  setForm({ ...form, advanceAmount: e.target.value })
                }
                placeholder="np. 5000.00"
              />
            </div>
            <div>
              <Label>Termin wpłaty zaliczki</Label>
              <Input
                type="date"
                value={form.advanceDueDate}
                onChange={(e) =>
                  setForm({ ...form, advanceDueDate: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Warunki płatności</Label>
              <Textarea
                value={form.paymentTerms}
                onChange={(e) =>
                  setForm({ ...form, paymentTerms: e.target.value })
                }
                placeholder="np. Pozostała kwota płatna 7 dni przed wydarzeniem..."
                rows={3}
              />
            </div>
            <div>
              <Label>Warunki specjalne</Label>
              <Textarea
                value={form.specialConditions}
                onChange={(e) =>
                  setForm({ ...form, specialConditions: e.target.value })
                }
                placeholder="Dodatkowe ustalenia..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-1 h-4 w-4" />
          {saving ? "Zapisywanie..." : "Utwórz umowę"}
        </Button>
      </div>
    </div>
  );
}
