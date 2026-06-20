"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bell,
  CheckCheck,
  ExternalLink,
  MessageSquare,
  ListChecks,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: { offerId?: string; agendaId?: string; clientName?: string } | null;
  createdAt: string;
  isRead: boolean;
}

const TYPE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  KLIENT_ZMIANA_WYBORU: {
    label: "Klient zmienił wybory",
    icon: <ListChecks className="h-4 w-4" />,
    color: "text-purple-600",
  },
  WIADOMOSC_OD_KLIENTA: {
    label: "Wiadomość od klienta",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-blue-600",
  },
  OFERTA_ZAAKCEPTOWANA: {
    label: "Oferta zaakceptowana",
    icon: <CheckCircle className="h-4 w-4" />,
    color: "text-green-600",
  },
  OFERTA_ODRZUCONA: {
    label: "Oferta odrzucona",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-red-600",
  },
  OFERTA_WYGASLA: {
    label: "Oferta wygasła",
    icon: <Clock className="h-4 w-4" />,
    color: "text-amber-600",
  },
};

export default function PowiadomieniaPage() {
  const [search, setSearch] = useState("");
  const [nip, setNip] = useState("");
  const [pesel, setPesel] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  if (nip) qs.set("nip", nip);
  if (pesel) qs.set("pesel", pesel);
  if (type) qs.set("type", type);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  qs.set("limit", "100");

  const { data, mutate } = useSWR<{
    notifications: Notification[];
    unreadCount: number;
    total: number;
  }>(`/api/notifications?${qs.toString()}`, fetcher);

  const notifications = data?.notifications || [];

  async function markOne(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      mutate();
    } catch {
      toast.error("Błąd");
    }
  }

  async function markAll() {
    try {
      const res = await fetch(`/api/notifications/mark-all-read`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Wszystko oznaczone jako przeczytane");
      mutate();
    } catch {
      toast.error("Błąd");
    }
  }

  function clearFilters() {
    setSearch("");
    setNip("");
    setPesel("");
    setType("");
    setFrom("");
    setTo("");
  }

  function getLink(n: Notification): string | null {
    if (n.metadata?.agendaId && n.type === "WIADOMOSC_OD_KLIENTA") {
      return `/agendy/${n.metadata.agendaId}`;
    }
    if (n.metadata?.offerId) {
      return `/oferty/${n.metadata.offerId}/edycja`;
    }
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Powiadomienia
            {data && data.unreadCount > 0 && (
              <Badge variant="destructive">{data.unreadCount} nieprzeczytanych</Badge>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Historia zdarzeń z Twoich ofert i agend.
          </p>
        </div>
        <Button onClick={markAll} variant="outline">
          <CheckCheck className="mr-1 h-4 w-4" />
          Oznacz wszystkie jako przeczytane
        </Button>
      </div>

      {/* Filtry */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Klient (imię, nazwisko, firma)</label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Szukaj..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">NIP</label>
              <Input value={nip} onChange={(e) => setNip(e.target.value)} placeholder="NIP" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">PESEL</label>
              <Input
                value={pesel}
                onChange={(e) => setPesel(e.target.value)}
                placeholder="PESEL"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Typ</label>
              <Select value={type || "all"} onValueChange={(v) => setType(!v || v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Wszystkie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie</SelectItem>
                  <SelectItem value="WIADOMOSC_OD_KLIENTA">Wiadomość od klienta</SelectItem>
                  <SelectItem value="KLIENT_ZMIANA_WYBORU">Klient zmienił wybory</SelectItem>
                  <SelectItem value="OFERTA_ZAAKCEPTOWANA">Oferta zaakceptowana</SelectItem>
                  <SelectItem value="OFERTA_ODRZUCONA">Oferta odrzucona</SelectItem>
                  <SelectItem value="OFERTA_WYGASLA">Oferta wygasła</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Od</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Do</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Wyczyść filtry
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Brak powiadomień spełniających kryteria.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-border/60 bg-white dark:bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Typ</th>
                <th className="px-3 py-2 text-left">Klient / treść</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((n) => {
                const tl = TYPE_LABELS[n.type];
                const link = getLink(n);
                return (
                  <tr
                    key={n.id}
                    className={`border-t border-border/40 ${!n.isRead ? "bg-blue-50/40 dark:bg-blue-950/10" : ""}`}
                  >
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString("pl-PL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-3">
                      <div className={`flex items-center gap-1.5 ${tl?.color || ""}`}>
                        {tl?.icon}
                        <span className="text-xs font-medium">{tl?.label || n.type}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {n.metadata?.clientName && (
                        <div className="font-medium">{n.metadata.clientName}</div>
                      )}
                      <div className="text-xs text-muted-foreground truncate max-w-md">
                        {n.message}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {n.isRead ? (
                        <Badge variant="outline" className="text-xs">
                          Przeczytane
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Nowe
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {!n.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markOne(n.id)}
                          className="mr-1"
                        >
                          <CheckCheck className="h-4 w-4" />
                        </Button>
                      )}
                      {link && (
                        <Link href={link}>
                          <Button size="sm" variant="outline">
                            <ExternalLink className="mr-1 h-4 w-4" />
                            Otwórz
                          </Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
