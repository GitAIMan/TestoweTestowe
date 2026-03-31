"use client";

import { use } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  FileDown,
  FileText,
  CalendarDays,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  ROBOCZA: { label: "Robocza", variant: "secondary" },
  WYSLANA: { label: "Wysłana", variant: "default" },
  ZAAKCEPTOWANA: { label: "Zaakceptowana", variant: "default" },
  ODRZUCONA: { label: "Odrzucona", variant: "destructive" },
  WYGASLA: { label: "Wygasła", variant: "outline" },
};

interface OfferDetail {
  id: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  clientCompany: string | null;
  eventName: string | null;
  eventDateFrom: string;
  eventDateTo: string;
  adultsCount: number;
  childrenCount: number;
  totalPrice: string;
  notes: string | null;
  status: string;
  sentAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: { firstName: string; lastName: string };
  offerRooms: Array<{
    id: string;
    quantity: number;
    nights: number;
    pricePerNight: string;
    room: { name: string; type: string };
  }>;
  offerHalls: Array<{
    id: string;
    date: string;
    pricePerDay: string;
    hall: { name: string; capacity: number };
  }>;
  offerPackages: Array<{
    id: string;
    priceSnapshot: string | null;
    package: {
      name: string;
      offerType: { name: string };
      sections: Array<{
        name: string;
        selectionMode: string;
        selectionCount: number | null;
        items: Array<{ name: string; price: string | null }>;
      }>;
    };
  }>;
}

export default function OfferDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: offer, mutate } = useSWR<OfferDetail>(
    `/api/offers/${id}`,
    fetcher
  );

  async function changeStatus(status: string) {
    try {
      const res = await fetch(`/api/offers/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Błąd zmiany statusu");

      const statusLabels: Record<string, string> = {
        WYSLANA: "Oferta oznaczona jako wysłana",
        ZAAKCEPTOWANA: "Oferta zaakceptowana!",
        ODRZUCONA: "Oferta odrzucona",
      };
      toast.success(statusLabels[status] || "Status zmieniony");
      mutate();
    } catch {
      toast.error("Nie udało się zmienić statusu");
    }
  }

  if (!offer) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Ładowanie...</p>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[offer.status] || STATUS_CONFIG.ROBOCZA;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/oferty">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{offer.clientName}</h1>
            {offer.eventName && (
              <p className="text-muted-foreground">{offer.eventName}</p>
            )}
          </div>
          <Badge variant={cfg.variant} className="ml-2">
            {cfg.label}
          </Badge>
        </div>
        <div className="flex gap-2">
          <a href={`/api/offers/${id}/pdf`} target="_blank" rel="noopener">
            <Button variant="outline" size="sm">
              <FileDown className="mr-1 h-4 w-4" />
              PDF
            </Button>
          </a>
        </div>
      </div>

      {/* Akcje statusu */}
      {(offer.status === "ROBOCZA" || offer.status === "WYSLANA") && (
        <div className="flex gap-2 flex-wrap">
          {offer.status === "ROBOCZA" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => changeStatus("WYSLANA")}
            >
              <Send className="mr-1 h-4 w-4" />
              Oznacz jako wysłana
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => changeStatus("ZAAKCEPTOWANA")}
          >
            <CheckCircle className="mr-1 h-4 w-4" />
            Zaakceptowana
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => changeStatus("ODRZUCONA")}
          >
            <XCircle className="mr-1 h-4 w-4" />
            Odrzucona
          </Button>
        </div>
      )}

      {/* Akcje po zaakceptowaniu */}
      {offer.status === "ZAAKCEPTOWANA" && (
        <div className="flex gap-2">
          <Link href={`/umowy/nowa/${offer.id}`}>
            <Button size="sm" variant="outline">
              <FileText className="mr-1 h-4 w-4" />
              Utwórz umowę
            </Button>
          </Link>
          <Link href={`/agendy/nowa/${offer.id}`}>
            <Button size="sm" variant="outline">
              <CalendarDays className="mr-1 h-4 w-4" />
              Utwórz agendę
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dane klienta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Klient</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Imię i nazwisko:</span>{" "}
              {offer.clientName}
            </p>
            {offer.clientCompany && (
              <p>
                <span className="text-muted-foreground">Firma:</span>{" "}
                {offer.clientCompany}
              </p>
            )}
            {offer.clientEmail && (
              <p>
                <span className="text-muted-foreground">Email:</span>{" "}
                {offer.clientEmail}
              </p>
            )}
            {offer.clientPhone && (
              <p>
                <span className="text-muted-foreground">Telefon:</span>{" "}
                {offer.clientPhone}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Dane wydarzenia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Wydarzenie</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {offer.eventName && (
              <p>
                <span className="text-muted-foreground">Nazwa:</span>{" "}
                {offer.eventName}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Data:</span>{" "}
              {new Date(offer.eventDateFrom).toLocaleDateString("pl-PL")} —{" "}
              {new Date(offer.eventDateTo).toLocaleDateString("pl-PL")}
            </p>
            <p>
              <span className="text-muted-foreground">Osoby:</span>{" "}
              {offer.adultsCount} dorosłych
              {offer.childrenCount > 0 && `, ${offer.childrenCount} dzieci`}
            </p>
            <p>
              <span className="text-muted-foreground">Utworzył:</span>{" "}
              {offer.createdBy.firstName} {offer.createdBy.lastName}
            </p>
            <p>
              <span className="text-muted-foreground">Utworzono:</span>{" "}
              {new Date(offer.createdAt).toLocaleDateString("pl-PL")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sale */}
      {offer.offerHalls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {offer.offerHalls.map((h) => (
                <div
                  key={h.id}
                  className="flex justify-between items-center text-sm border-b pb-2 last:border-0"
                >
                  <div>
                    <span className="font-medium">{h.hall.name}</span>
                    <span className="text-muted-foreground ml-2">
                      ({h.hall.capacity} os.)
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {new Date(h.date).toLocaleDateString("pl-PL")}
                    </span>
                  </div>
                  <span>{Number(h.pricePerDay).toFixed(2)} zł</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pokoje */}
      {offer.offerRooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pokoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {offer.offerRooms.map((r) => (
                <div
                  key={r.id}
                  className="flex justify-between items-center text-sm border-b pb-2 last:border-0"
                >
                  <div>
                    <span className="font-medium">{r.room.name}</span>
                    <span className="text-muted-foreground ml-2">
                      ({r.room.type})
                    </span>
                    <span className="text-muted-foreground ml-2">
                      {r.quantity} szt. × {r.nights} nocy
                    </span>
                  </div>
                  <span>
                    {(Number(r.pricePerNight) * r.quantity * r.nights).toFixed(2)} zł
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pakiety */}
      {offer.offerPackages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pakiety cateringowe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {offer.offerPackages.map((p) => (
                <div key={p.id}>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{p.package.name}</span>
                      <span className="text-muted-foreground ml-2 text-sm">
                        ({p.package.offerType.name})
                      </span>
                    </div>
                    {p.priceSnapshot && (
                      <span className="text-sm">
                        {Number(p.priceSnapshot).toFixed(2)} zł
                      </span>
                    )}
                  </div>
                  <div className="ml-4 mt-1 text-xs text-muted-foreground">
                    {p.package.sections.map((sec) => (
                      <div key={sec.name}>
                        <span className="font-medium">{sec.name}</span>
                        {" — "}
                        {sec.items.map((i) => i.name).join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Total */}
      <div className="rounded-lg bg-muted p-4 flex justify-between items-center">
        <span className="text-lg font-semibold">RAZEM</span>
        <span className="text-2xl font-bold">
          {Number(offer.totalPrice).toFixed(2)} zł
        </span>
      </div>

      {/* Notatki */}
      {offer.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notatki</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{offer.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
