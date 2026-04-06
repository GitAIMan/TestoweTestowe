"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ScrollText, CalendarDays, CheckCircle, Plus } from "lucide-react";

interface DashboardData {
  totalOffers: number;
  totalContracts: number;
  totalAgendas: number;
  acceptedThisMonth: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CARD_COLORS = [
  { bg: "bg-[oklch(0.637_0.137_15/0.15)]", text: "text-[oklch(0.637_0.137_15)]", bar: "oklch(0.637 0.137 15)" },
  { bg: "bg-[oklch(0.65_0.14_155/0.15)]", text: "text-[oklch(0.65_0.14_155)]", bar: "oklch(0.65 0.14 155)" },
  { bg: "bg-[oklch(0.62_0.16_280/0.15)]", text: "text-[oklch(0.62_0.16_280)]", bar: "oklch(0.62 0.16 280)" },
  { bg: "bg-[oklch(0.7_0.13_80/0.15)]", text: "text-[oklch(0.7_0.13_80)]", bar: "oklch(0.7 0.13 80)" },
];

export default function DashboardPage() {
  const { data } = useSWR<DashboardData>("/api/dashboard", fetcher);

  const cards = [
    {
      title: "Oferty",
      value: data?.totalOffers,
      desc: "aktywnych ofert",
      icon: FileText,
    },
    {
      title: "Umowy",
      value: data?.totalContracts,
      desc: "podpisanych umów",
      icon: ScrollText,
    },
    {
      title: "Agendy",
      value: data?.totalAgendas,
      desc: "aktywnych agend",
      icon: CalendarDays,
    },
    {
      title: "Zaakceptowane",
      value: data?.acceptedThisMonth,
      desc: "w tym miesiącu",
      icon: CheckCircle,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting banner */}
      <div className="rounded-2xl bg-gradient-to-r from-primary via-primary/85 to-primary/70 p-6 shadow-lg shadow-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary-foreground">Dzień dobry!</h1>
            <p className="text-primary-foreground/80 mt-1">Co dzisiaj robimy?</p>
          </div>
          <Link href="/oferty/nowa">
            <Button size="lg" variant="secondary" className="shadow-md">
              <Plus className="mr-2 h-5 w-5" />
              Nowa oferta
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => {
          const color = CARD_COLORS[i];
          return (
            <Card key={card.title} className="relative overflow-hidden">
              <div
                className="absolute top-0 inset-x-0 h-1 rounded-b-full"
                style={{ backgroundColor: color.bar }}
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${color.bg}`}>
                  <card.icon className={`h-4 w-4 ${color.text}`} />
                </div>
              </CardHeader>
              <CardContent>
                {data ? (
                  <>
                    <div className="text-3xl font-bold tracking-tight">{card.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
                  </>
                ) : (
                  <>
                    <Skeleton className="h-9 w-16 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
