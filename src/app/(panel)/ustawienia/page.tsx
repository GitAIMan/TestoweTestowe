"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Settings {
  id: string;
  hotelName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  nip: string | null;
  regulamin: string | null;
  footerText: string | null;
  offerExpiryDays: number;
  agendaLockDaysBefore: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function UstawieniaPage() {
  const { data: settings, mutate } = useSWR<Settings>(
    "/api/settings",
    fetcher
  );
  const [form, setForm] = useState<Partial<Settings>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm(settings);
    }
  }, [settings]);

  function updateField(field: keyof Settings, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Błąd zapisu");
      }

      toast.success("Ustawienia zapisane");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Ustawienia hotelu</h1>
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ustawienia hotelu</h1>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Zapisywanie..." : "Zapisz zmiany"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dane podstawowe */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dane podstawowe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Nazwa hotelu *</Label>
              <Input
                value={form.hotelName || ""}
                onChange={(e) => updateField("hotelName", e.target.value)}
              />
            </div>
            <div>
              <Label>URL logo</Label>
              <Input
                value={form.logoUrl || ""}
                onChange={(e) => updateField("logoUrl", e.target.value)}
              />
            </div>
            <div>
              <Label>NIP</Label>
              <Input
                value={form.nip || ""}
                onChange={(e) => updateField("nip", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Kontakt */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dane kontaktowe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email kontaktowy</Label>
              <Input
                type="email"
                value={form.contactEmail || ""}
                onChange={(e) => updateField("contactEmail", e.target.value)}
              />
            </div>
            <div>
              <Label>Telefon</Label>
              <Input
                value={form.contactPhone || ""}
                onChange={(e) => updateField("contactPhone", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Adres */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Adres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Ulica i numer</Label>
              <Input
                value={form.address || ""}
                onChange={(e) => updateField("address", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kod pocztowy</Label>
                <Input
                  value={form.postalCode || ""}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                />
              </div>
              <div>
                <Label>Miasto</Label>
                <Input
                  value={form.city || ""}
                  onChange={(e) => updateField("city", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kolory */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Branding</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Kolor główny</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.primaryColor || "#1a56db"}
                  onChange={(e) => updateField("primaryColor", e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded border"
                />
                <Input
                  value={form.primaryColor || ""}
                  onChange={(e) => updateField("primaryColor", e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <div>
              <Label>Kolor drugorzędny</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={form.secondaryColor || "#f3f4f6"}
                  onChange={(e) =>
                    updateField("secondaryColor", e.target.value)
                  }
                  className="h-10 w-14 cursor-pointer rounded border"
                />
                <Input
                  value={form.secondaryColor || ""}
                  onChange={(e) =>
                    updateField("secondaryColor", e.target.value)
                  }
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Konfiguracja systemu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Konfiguracja systemu</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Wygaśnięcie oferty (dni)</Label>
              <Input
                type="number"
                min="1"
                value={form.offerExpiryDays || 14}
                onChange={(e) =>
                  updateField("offerExpiryDays", parseInt(e.target.value) || 14)
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Po ilu dniach oferta automatycznie wygasa
              </p>
            </div>
            <div>
              <Label>Blokada agendy (dni przed)</Label>
              <Input
                type="number"
                min="1"
                value={form.agendaLockDaysBefore || 14}
                onChange={(e) =>
                  updateField(
                    "agendaLockDaysBefore",
                    parseInt(e.target.value) || 14
                  )
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ile dni przed wydarzeniem klient nie może zmieniać wyborów
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Regulamin i stopka */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Regulamin</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={8}
              value={form.regulamin || ""}
              onChange={(e) => updateField("regulamin", e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stopka dokumentów</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={8}
              value={form.footerText || ""}
              onChange={(e) => updateField("footerText", e.target.value)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
