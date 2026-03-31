"use client";

import { use, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  ArrowLeft,
  Link2,
  Copy,
  Clock,
  CheckCircle,
  Package,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AgendaDetail {
  id: string;
  type: string;
  isLocked: boolean;
  notes: string | null;
  createdAt: string;
  offer: {
    clientName: string;
    eventName: string | null;
    eventDateFrom: string;
    eventDateTo: string;
    offerPackages: Array<{
      id: string;
      package: {
        name: string;
        offerType: { name: string };
        sections: Array<{
          id: string;
          name: string;
          selectionMode: string;
          selectionCount: number | null;
          items: Array<{ id: string; name: string }>;
        }>;
      };
    }>;
  };
  createdBy: { firstName: string; lastName: string };
  blocks: Array<{
    id: string;
    date: string;
    timeFrom: string;
    timeTo: string | null;
    title: string;
    hall: { name: string } | null;
    personCount: number | null;
    blockPackages: Array<{ offerPackageId: string }>;
    equipment: Array<{ name: string; quantity: number }>;
  }>;
  tokens: Array<{ id: string; token: string; type: string; createdAt: string }>;
  selections: Array<{
    sectionId: string;
    section: { name: string; selectionMode: string; selectionCount: number | null };
    completedAt: string | null;
    items: Array<{ menuItem: { name: string } }>;
  }>;
}

export default function AgendaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, mutate } = useSWR<AgendaDetail>(`/api/agendas/${id}`, fetcher);
  const [generatingToken, setGeneratingToken] = useState(false);

  async function generateToken(type: "KLIENT_AGENDA" | "KUCHNIA_AGENDA") {
    setGeneratingToken(true);
    try {
      const res = await fetch(`/api/agendas/${id}/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error("Błąd");
      toast.success("Link wygenerowany");
      mutate();
    } catch {
      toast.error("Nie udało się wygenerować linku");
    } finally {
      setGeneratingToken(false);
    }
  }

  function copyToken(token: string, path: string) {
    const url = `${window.location.origin}/${path}/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link skopiowany");
  }

  if (!data) {
    return <p className="text-muted-foreground">Ładowanie...</p>;
  }

  const clientToken = data.tokens.find((t) => t.type === "KLIENT_AGENDA");
  const kitchenToken = data.tokens.find((t) => t.type === "KUCHNIA_AGENDA");

  // Grupuj bloki po dniach
  const blocksByDate = data.blocks.reduce(
    (acc, block) => {
      const date = block.date.split("T")[0];
      if (!acc[date]) acc[date] = [];
      acc[date].push(block);
      return acc;
    },
    {} as Record<string, typeof data.blocks>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/agendy">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">
            Agenda — {data.offer.clientName}
          </h1>
          <p className="text-muted-foreground text-sm">
            {data.offer.eventName &&`${data.offer.eventName} · `}
            {new Date(data.offer.eventDateFrom).toLocaleDateString("pl-PL")} —{" "}
            {new Date(data.offer.eventDateTo).toLocaleDateString("pl-PL")}
          </p>
        </div>
        <Badge variant={data.type === "FINALNA" ? "default" : "secondary"}>
          {data.type === "WSTEPNA" ? "Wstępna" : "Finalna"}
        </Badge>
      </div>

      {/* Linki */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link dla klienta
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientToken ? (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/klient/${clientToken.token}`}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToken(clientToken.token, "klient")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => generateToken("KLIENT_AGENDA")}
                disabled={generatingToken}
                size="sm"
              >
                Wygeneruj link
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Link dla kuchni
            </CardTitle>
          </CardHeader>
          <CardContent>
            {kitchenToken ? (
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/kuchnia/${kitchenToken.token}`}
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToken(kitchenToken.token, "kuchnia")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => generateToken("KUCHNIA_AGENDA")}
                disabled={generatingToken}
                size="sm"
              >
                Wygeneruj link
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Bloki czasowe */}
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Harmonogram
      </h2>

      {Object.keys(blocksByDate).length === 0 ? (
        <p className="text-muted-foreground">Brak bloków czasowych.</p>
      ) : (
        Object.entries(blocksByDate).map(([date, dayBlocks]) => (
          <Card key={date}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {new Date(date).toLocaleDateString("pl-PL", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dayBlocks.map((block) => (
                <div key={block.id} className="rounded border p-3">
                  <div className="font-medium">
                    {block.timeFrom}
                    {block.timeTo && ` — ${block.timeTo}`} · {block.title}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 space-x-3">
                    {block.hall && <span>Sala: {block.hall.name}</span>}
                    {block.personCount && <span>{block.personCount} os.</span>}
                  </div>
                  {block.equipment.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Wyposażenie: {block.equipment.map((e) => e.name).join(", ")}
                    </div>
                  )}
                  {block.blockPackages.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {block.blockPackages.map((bp) => {
                        const op = data.offer.offerPackages.find(
                          (p) => p.id === bp.offerPackageId
                        );
                        return op ? (
                          <Badge key={bp.offerPackageId} variant="secondary" className="text-xs">
                            {op.package.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      {/* Wybory klienta */}
      {data.selections.length > 0 && (
        <>
          <Separator />
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Wybory klienta
          </h2>
          <div className="space-y-3">
            {data.selections.map((sel) => (
              <Card key={sel.sectionId}>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{sel.section.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {sel.section.selectionMode === "ALL_INCLUDED"
                        ? "Wszystko"
                        : `Wybierz ${sel.section.selectionCount}`}
                    </Badge>
                    {sel.completedAt && (
                      <span className="text-xs text-muted-foreground">
                        (zapisano{" "}
                        {new Date(sel.completedAt).toLocaleDateString("pl-PL")})
                      </span>
                    )}
                  </div>
                  <ul className="text-sm space-y-1">
                    {sel.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        {item.menuItem.name}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
