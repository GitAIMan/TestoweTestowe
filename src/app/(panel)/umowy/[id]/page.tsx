"use client";

import { use } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { ArrowLeft, FileDown, CheckCircle, CalendarDays } from "lucide-react";
import { Hint } from "@/components/ui/hint";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ContractDetail {
  id: string;
  clientFullName: string;
  clientAddress: string | null;
  clientNip: string | null;
  clientPesel: string | null;
  advanceAmount: string | null;
  advanceDueDate: string | null;
  paymentTerms: string | null;
  specialConditions: string | null;
  signedAt: string | null;
  createdAt: string;
  offer: {
    id: string;
    clientName: string;
    eventName: string | null;
    eventDateFrom: string;
    eventDateTo: string;
    adultsCount: number;
    childrenCount: number;
    totalPrice: string;
    offerRooms: Array<{
      quantity: number;
      nights: number;
      pricePerNight: string;
      room: { name: string; type: string };
    }>;
    offerHalls: Array<{
      date: string;
      pricePerDay: string;
      hall: { name: string; capacity: number };
    }>;
    offerPackages: Array<{
      priceSnapshot: string | null;
      package: {
        name: string;
        offerType: { name: string };
        sections: Array<{
          name: string;
          items: Array<{ name: string }>;
        }>;
      };
    }>;
  };
}

export default function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: contract, mutate } = useSWR<ContractDetail>(
    `/api/contracts/${id}`,
    fetcher
  );

  async function markSigned() {
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedAt: new Date().toISOString() }),
      });

      if (!res.ok) throw new Error("Błąd");
      toast.success("Umowa oznaczona jako podpisana");
      mutate();
    } catch {
      toast.error("Nie udało się oznaczyć umowy");
    }
  }

  if (!contract) {
    return <p className="text-muted-foreground">Ładowanie...</p>;
  }

  const offer = contract.offer;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/oferty/${contract.offer.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">
              Umowa — {contract.clientFullName}
            </h1>
            {offer.eventName && (
              <p className="text-muted-foreground">{offer.eventName}</p>
            )}
          </div>
          <Badge variant={contract.signedAt ? "default" : "secondary"}>
            {contract.signedAt ? "Podpisana" : "Niepodpisana"}
          </Badge>
        </div>
        <div className="flex gap-2">
          <a href={`/api/contracts/${id}/pdf`} target="_blank" rel="noopener">
            <Button variant="outline" size="sm">
              <FileDown className="mr-1 h-4 w-4" />
              PDF
            </Button>
          </a>
          {!contract.signedAt && (
            <Hint label="Klient podpisał umowę? Zatwierdź, aby odblokować tworzenie agendy.">
              <Button size="sm" onClick={markSigned}>
                <CheckCircle className="mr-1 h-4 w-4" />
                Oznacz jako podpisaną
              </Button>
            </Hint>
          )}
          {contract.signedAt && (
            <Hint label="Zaplanuj harmonogram wydarzenia: bloki czasowe, pakiety, wyposażenie.">
              <Link href={`/agendy/nowa/${contract.offer.id}`}>
                <Button size="sm">
                  <CalendarDays className="mr-1 h-4 w-4" />
                  Utwórz agendę
                </Button>
              </Link>
            </Hint>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dane klienta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dane klienta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Imię i nazwisko:</span>{" "}
              {contract.clientFullName}
            </p>
            {contract.clientAddress && (
              <p>
                <span className="text-muted-foreground">Adres:</span>{" "}
                {contract.clientAddress}
              </p>
            )}
            {contract.clientNip && (
              <p>
                <span className="text-muted-foreground">NIP:</span>{" "}
                {contract.clientNip}
              </p>
            )}
            {contract.clientPesel && (
              <p>
                <span className="text-muted-foreground">PESEL:</span>{" "}
                {contract.clientPesel}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Warunki */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Warunki umowy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {contract.advanceAmount && (
              <p>
                <span className="text-muted-foreground">Zaliczka:</span>{" "}
                {Number(contract.advanceAmount).toFixed(2)} zł
              </p>
            )}
            {contract.advanceDueDate && (
              <p>
                <span className="text-muted-foreground">Termin zaliczki:</span>{" "}
                {new Date(contract.advanceDueDate).toLocaleDateString("pl-PL")}
              </p>
            )}
            {contract.paymentTerms && (
              <p>
                <span className="text-muted-foreground">Płatności:</span>{" "}
                {contract.paymentTerms}
              </p>
            )}
            {contract.specialConditions && (
              <p>
                <span className="text-muted-foreground">Warunki specjalne:</span>{" "}
                {contract.specialConditions}
              </p>
            )}
            <p>
              <span className="text-muted-foreground">Utworzono:</span>{" "}
              {new Date(contract.createdAt).toLocaleDateString("pl-PL")}
            </p>
            {contract.signedAt && (
              <p>
                <span className="text-muted-foreground">Podpisano:</span>{" "}
                {new Date(contract.signedAt).toLocaleDateString("pl-PL")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Szczegóły oferty */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wydarzenie</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
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
        </CardContent>
      </Card>

      {offer.offerHalls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sale</CardTitle>
          </CardHeader>
          <CardContent>
            {offer.offerHalls.map((h, i) => (
              <div key={i} className="flex justify-between text-sm border-b py-2 last:border-0">
                <span>
                  {h.hall.name} — {new Date(h.date).toLocaleDateString("pl-PL")}
                </span>
                <span>{Number(h.pricePerDay).toFixed(2)} zł</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {offer.offerPackages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pakiety</CardTitle>
          </CardHeader>
          <CardContent>
            {offer.offerPackages.map((p, i) => (
              <div key={i} className="border-b py-2 last:border-0">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {p.package.name} ({p.package.offerType.name})
                  </span>
                  {p.priceSnapshot && (
                    <span>{Number(p.priceSnapshot).toFixed(2)} zł</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg bg-muted p-4 flex justify-between items-center">
        <span className="text-lg font-semibold">RAZEM</span>
        <span className="text-2xl font-bold">
          {Number(offer.totalPrice).toFixed(2)} zł
        </span>
      </div>
    </div>
  );
}
