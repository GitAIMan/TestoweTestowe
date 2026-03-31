"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, ScrollText, CalendarDays, CheckCircle } from "lucide-react";

interface DashboardData {
  totalOffers: number;
  totalContracts: number;
  totalAgendas: number;
  acceptedThisMonth: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {data ? (
                <>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.desc}</p>
                </>
              ) : (
                <>
                  <Skeleton className="h-8 w-16 mb-1" />
                  <Skeleton className="h-3 w-24" />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
