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
  Lock,
  Unlock,
  Trash2,
  Info,
  Check,
  MapPin,
  ExternalLink,
  AlertCircle,
  Ban,
  MessageSquare,
  XCircle,
  Phone,
  CalendarDays,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useConfirm } from "@/components/ui/confirm-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface OfferItem {
  id: string;
  day: number;
  date: string | null;
  sortOrder: number;
  name: string;
  timeFrom: string | null;
  timeTo: string | null;
  quantity: number;
  sourceType: string | null;
  sourceId: string | null;
  hall: { id: string; name: string } | null;
}

interface AgendaDetail {
  id: string;
  type: string;
  isLocked: boolean;
  notes: string | null;
  createdAt: string;
  offer: {
    id: string;
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
    items?: OfferItem[];
  };
  createdBy: { firstName: string; lastName: string };
  tokens: Array<{
    id: string;
    token: string;
    type: string;
    createdAt: string;
    expiresAt: string | null;
    isRevoked: boolean;
  }>;
  selections: Array<{
    sectionId: string;
    offerItemId: string | null;
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
  const router = useRouter();
  const confirmDialog = useConfirm();
  const { data, mutate } = useSWR<AgendaDetail>(`/api/agendas/${id}`, fetcher);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [relocking, setRelocking] = useState(false);
  const [savingSelection, setSavingSelection] = useState<string | null>(null);
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null);

  // Pozycje oferty (Excel) — jedyne źródło harmonogramu
  const { data: items } = useSWR<OfferItem[]>(
    data?.offer?.id ? `/api/offers/${data.offer.id}/items` : null,
    fetcher
  );

  // Pełne drzewo menu — potrzebne żeby pokazać sekcje CHOOSE dla AKTUALNIE
  // używanych pakietów (mogły zostać dodane podczas poprawek, nie ma ich w offerPackages).
  const { data: offerTypes } = useSWR<
    Array<{
      id: string;
      packages: Array<{
        id: string;
        sections: Array<{
          id: string;
          name: string;
          selectionMode: string;
          selectionCount: number | null;
          items: Array<{ id: string; name: string }>;
        }>;
      }>;
    }>
  >("/api/menu/offer-types", fetcher);

  async function deleteAgenda() {
    const ok = await confirmDialog({
      title: "Usunąć agendę?",
      description: "Linki klienta i kuchni przestaną działać. Tej operacji nie da się cofnąć.",
      confirmLabel: "Tak, usuń",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/agendas/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd usuwania");
      }
      toast.success("Agenda usunięta");
      router.push("/agendy");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się usunąć agendy");
    }
  }

  async function finalizeAgenda() {
    const ok = await confirmDialog({
      title: "Sfinalizować agendę?",
      description: "Po finalizacji klient nie będzie mógł już zmieniać wyborów, a kuchnia dostanie link z agendą. Tej operacji nie da się cofnąć.",
      confirmLabel: "Tak, finalizuj",
      variant: "default",
    });
    if (!ok) {
      return;
    }
    setFinalizing(true);
    try {
      const res = await fetch(`/api/agendas/${id}/finalize`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd finalizacji");
      }
      const finalAgenda = await res.json();
      toast.success("Agenda sfinalizowana!");
      if (data?.offer?.id) {
        router.push(`/oferty/${data.offer.id}/edycja`);
      } else {
        router.push(`/agendy/${finalAgenda.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd finalizacji");
    } finally {
      setFinalizing(false);
    }
  }

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

  async function revokeToken(tokenId: string, label: "klienta" | "kuchni") {
    const ok = await confirmDialog({
      title: `Unieważnić link ${label}?`,
      description:
        "Stary link przestanie działać. Aby wygenerować nowy, po unieważnieniu kliknij „Wygeneruj link\".",
      confirmLabel: "Unieważnij",
      variant: "destructive",
    });
    if (!ok) return;
    setRevokingTokenId(tokenId);
    try {
      const res = await fetch(`/api/agendas/${id}/tokens/${tokenId}/revoke`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd");
      }
      toast.success("Link unieważniony");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się unieważnić");
    } finally {
      setRevokingTokenId(null);
    }
  }

  function formatExpiry(iso: string | null): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  async function unlockAgenda() {
    const ok = await confirmDialog({
      title: "Odblokować agendę do poprawek?",
      description: "Odblokujesz agendę finalną do edycji po swojej stronie. Klient nadal widzi ją tylko w trybie podglądu — nie może zmieniać wyborów, ale może wysyłać wiadomości.",
      confirmLabel: "Tak, odblokuj",
      variant: "default",
    });
    if (!ok) return;
    setUnlocking(true);
    try {
      const res = await fetch(`/api/agendas/${id}/unlock`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd");
      }
      toast.success("Agenda odblokowana — wprowadź poprawki");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się odblokować");
    } finally {
      setUnlocking(false);
    }
  }

  async function relockAgenda() {
    const ok = await confirmDialog({
      title: "Zatwierdzić zmiany?",
      description: "Kuchnia zobaczy świeże dane, klient nie będzie mógł już zmieniać wyborów.",
      confirmLabel: "Tak, zatwierdź",
      variant: "default",
    });
    if (!ok) return;
    setRelocking(true);
    try {
      const res = await fetch(`/api/agendas/${id}/relock`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd");
      }
      toast.success("Zmiany zatwierdzone");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się zatwierdzić");
    } finally {
      setRelocking(false);
    }
  }

  async function updateSelection(
    offerItemId: string,
    sectionId: string,
    menuItemIds: string[]
  ) {
    const key = `${offerItemId}:${sectionId}`;
    setSavingSelection(key);
    try {
      const res = await fetch(`/api/agendas/${id}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections: [{ offerItemId, sectionId, menuItemIds }] }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd zapisu");
      }
      toast.success("Wybory zaktualizowane");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nie udało się zapisać");
    } finally {
      setSavingSelection(null);
    }
  }

  if (!data) {
    return <p className="text-muted-foreground">Ładowanie...</p>;
  }

  const clientToken = data.tokens.find(
    (t) => t.type === "KLIENT_AGENDA" && !t.isRevoked
  );
  const kitchenToken = data.tokens.find(
    (t) => t.type === "KUCHNIA_AGENDA" && !t.isRevoked
  );
  const scheduleItems = items || [];
  const hasSchedule = scheduleItems.length > 0;

  // Pary (offerItem, sekcja CHOOSE) — każdy dzień / pakiet to osobny wybór
  const menuPackageMap = new Map<
    string,
    Array<{ id: string; name: string; count: number | null; items: Array<{ id: string; name: string }> }>
  >();
  if (offerTypes) {
    for (const ot of offerTypes) {
      for (const p of ot.packages) {
        menuPackageMap.set(
          p.id,
          p.sections
            .filter((s) => s.selectionMode === "CHOOSE_X_FROM_Y")
            .map((s) => ({ id: s.id, name: s.name, count: s.selectionCount, items: s.items }))
        );
      }
    }
  }

  const allChooseSections: Array<{
    offerItemId: string;
    dayLabel: string;
    packageName: string;
    id: string;
    name: string;
    count: number | null;
    items: Array<{ id: string; name: string }>;
  }> = [];

  for (const item of scheduleItems) {
    if (item.sourceType !== "PACKAGE" || !item.sourceId) continue;
    const fromMenu = menuPackageMap.get(item.sourceId);
    if (!fromMenu) continue;
    const dayLabel = item.date
      ? new Date(item.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })
      : `Dzień ${item.day}`;
    for (const sec of fromMenu) {
      allChooseSections.push({
        offerItemId: item.id,
        dayLabel,
        packageName: item.name,
        id: sec.id,
        name: sec.name,
        count: sec.count,
        items: sec.items,
      });
    }
  }
  // Fallback gdy menu jeszcze nie załadowane — bierzemy pierwszy offerItem z sourceId i sekcje z offerPackages
  if (allChooseSections.length === 0 && !offerTypes) {
    const firstPackageItem = scheduleItems.find(
      (i) => i.sourceType === "PACKAGE" && i.sourceId
    );
    if (firstPackageItem) {
      for (const op of data.offer.offerPackages) {
        for (const s of op.package.sections) {
          if (s.selectionMode === "CHOOSE_X_FROM_Y") {
            allChooseSections.push({
              offerItemId: firstPackageItem.id,
              dayLabel: "—",
              packageName: firstPackageItem.name,
              id: s.id,
              name: s.name,
              count: s.selectionCount,
              items: s.items,
            });
          }
        }
      }
    }
  }

  const missingSelections: string[] = [];
  for (const sec of allChooseSections) {
    const sel = data.selections.find(
      (s) => s.sectionId === sec.id && s.offerItemId === sec.offerItemId
    );
    const complete =
      sel && sel.completedAt && (sec.count == null || sel.items.length === sec.count);
    if (!complete) missingSelections.push(`${sec.dayLabel} · ${sec.name}`);
  }

  const canFinalize = hasSchedule && missingSelections.length === 0;

  // Grupuj items po dniu
  const dayMap = new Map<number, { date: string | null; items: OfferItem[] }>();
  for (const it of scheduleItems) {
    if (!dayMap.has(it.day)) dayMap.set(it.day, { date: it.date, items: [] });
    dayMap.get(it.day)!.items.push(it);
  }
  const days = Array.from(dayMap.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href={`/oferty/${data.offer.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">
            Agenda — {data.offer.clientName}
          </h1>
          <p className="text-muted-foreground text-sm">
            {data.offer.eventName && `${data.offer.eventName} · `}
            {new Date(data.offer.eventDateFrom).toLocaleDateString("pl-PL")} —{" "}
            {new Date(data.offer.eventDateTo).toLocaleDateString("pl-PL")}
          </p>
          {data.createdBy && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Utworzył: <span className="font-medium text-foreground">{data.createdBy.firstName} {data.createdBy.lastName}</span>
            </p>
          )}
        </div>
        <Badge
          variant={
            data.type === "FINALNA"
              ? data.isLocked
                ? "success"
                : "warning"
              : "secondary"
          }
        >
          {data.type === "WSTEPNA"
            ? "Wstępna"
            : data.isLocked
            ? "Zatwierdzona"
            : "W trakcie poprawek"}
        </Badge>
        <Button size="sm" variant="destructive" onClick={deleteAgenda}>
          <Trash2 className="mr-1 h-4 w-4" />
          Usuń agendę
        </Button>
      </div>

      {/* Karta: Wprowadź poprawki (FINALNA, zablokowana) — na górze, żeby było widoczne */}
      {data.type === "FINALNA" && data.isLocked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Unlock className="h-4 w-4" />
              Wprowadź poprawki
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Klient dzwoni z poprawkami? Odblokuj agendę, wprowadź zmiany (harmonogram w widoku Excel
              oferty + wybory klienta poniżej), a potem zatwierdź ponownie. Kuchnia zobaczy świeże dane
              po zatwierdzeniu.
            </p>
            <div>
              <Button onClick={unlockAgenda} disabled={unlocking}>
                <Unlock className="mr-1 h-4 w-4" />
                {unlocking ? "Odblokowywanie..." : "Wprowadź poprawki"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Karta: Agenda w trakcie poprawek (FINALNA, odblokowana) — na górze */}
      {data.type === "FINALNA" && !data.isLocked && (
        <Card className="border-amber-300 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Agenda w trakcie poprawek
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              Edytuj harmonogram w{" "}
              <Link
                href={`/oferty/${data.offer.id}/edycja`}
                className="underline font-medium"
              >
                widoku Excel oferty
              </Link>
              , zmień wybory klienta w sekcji „Wybory klienta" poniżej.
              Gdy skończysz — kliknij „Zatwierdź zmiany". Kuchnia zobaczy świeże dane.
            </p>
            <div>
              <Button onClick={relockAgenda} disabled={relocking}>
                <Lock className="mr-1 h-4 w-4" />
                {relocking ? "Zatwierdzanie..." : "Zatwierdź zmiany"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pasek-przewodnik (tylko dla wstępnej) */}
      {data.type === "WSTEPNA" && !data.isLocked && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm">
              <GuideStep
                number={1}
                label="Wyślij link klientowi"
                done={Boolean(clientToken)}
                active={!clientToken}
              />
              <GuideStep
                number={2}
                label="Poczekaj na wybory klienta"
                done={missingSelections.length === 0 && allChooseSections.length > 0}
                active={Boolean(clientToken) && missingSelections.length > 0}
              />
              <GuideStep
                number={3}
                label="Finalizuj"
                done={false}
                active={canFinalize}
              />
            </div>
          </CardContent>
        </Card>
      )}

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
              <div className="space-y-2">
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
                    title="Kopiuj"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeToken(clientToken.id, "klienta")}
                    disabled={revokingTokenId === clientToken.id}
                    title="Unieważnij"
                    className="text-destructive hover:text-destructive"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                </div>
                {formatExpiry(clientToken.expiresAt) && (
                  <p className="text-xs text-muted-foreground">
                    Wygasa: {formatExpiry(clientToken.expiresAt)}
                  </p>
                )}
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
              <div className="space-y-2">
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
                    title="Kopiuj"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => revokeToken(kitchenToken.id, "kuchni")}
                    disabled={revokingTokenId === kitchenToken.id}
                    title="Unieważnij"
                    className="text-destructive hover:text-destructive"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                </div>
                {formatExpiry(kitchenToken.expiresAt) && (
                  <p className="text-xs text-muted-foreground">
                    Wygasa: {formatExpiry(kitchenToken.expiresAt)}
                  </p>
                )}
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

      <ClientSelectionChangesSection agendaId={id} />

      <Separator />

      <ClientMessagesSection agendaId={id} />

      <Separator />

      {/* Harmonogram (read-only z Excela) */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Harmonogram
          <Badge variant="outline" className="text-xs">z oferty</Badge>
        </h2>
        <Link href={`/oferty/${data.offer.id}/edycja`}>
          <Button size="sm" variant="outline">
            <ExternalLink className="mr-1 h-4 w-4" />
            Edytuj w ofercie
          </Button>
        </Link>
      </div>

      {!hasSchedule ? (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Brak pozycji w ofercie. Harmonogram (godziny, sale, pakiety) ustawiasz w widoku Excel
                oferty — tam dodajesz też DJ, tort, wyposażenie jako pozycje niestandardowe.
              </p>
            </div>
            <Link href={`/oferty/${data.offer.id}/edycja`}>
              <Button size="sm">
                <ExternalLink className="mr-1 h-4 w-4" />
                Przejdź do widoku Excel
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        days.map(([dayNum, dayData]) => {
          const label = dayData.date
            ? new Date(dayData.date).toLocaleDateString("pl-PL", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })
            : `Dzień ${dayNum}`;
          return (
            <Card key={dayNum}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  <span className="text-primary font-bold mr-2">Dzień {dayNum}</span>
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {dayData.items.map((item) => {
                  const time = item.timeFrom
                    ? `${item.timeFrom}${item.timeTo ? ` — ${item.timeTo}` : ""}`
                    : "—";
                  const isPackage = item.sourceType === "PACKAGE";
                  return (
                    <div key={item.id} className="rounded border p-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="text-primary font-medium">{time}</span>
                        <span className="font-medium">{item.name}</span>
                        {item.hall && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {item.hall.name}
                          </span>
                        )}
                        {isPackage && (
                          <Badge variant="secondary" className="text-[10px]">Pakiet</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Wybory klienta */}
      {(() => {
        const editableMode = data.type === "FINALNA" && !data.isLocked;
        if (editableMode) {
          return (
            <>
              <Separator />
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Wybory klienta
                <Badge variant="warning" className="text-xs">Edytujesz</Badge>
              </h2>
              <div className="space-y-3">
                {allChooseSections.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Brak sekcji wymagających wyboru w tej agendzie.
                  </p>
                )}
                {allChooseSections.map((sec) => {
                  const sel = data.selections.find(
                    (s) => s.sectionId === sec.id && s.offerItemId === sec.offerItemId
                  );
                  const selectedIds = new Set(
                    (sel?.items || []).map((it) => it.menuItem.name)
                  );
                  const selectedMenuItemIds = new Set<string>();
                  for (const item of sec.items) {
                    if (selectedIds.has(item.name)) selectedMenuItemIds.add(item.id);
                  }
                  const count = sec.count ?? 0;
                  const selectedCount = selectedMenuItemIds.size;
                  const savingKey = `${sec.offerItemId}:${sec.id}`;
                  const isSaving = savingSelection === savingKey;
                  return (
                    <Card key={savingKey}>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">
                            {sec.dayLabel}
                          </Badge>
                          <span className="font-medium">{sec.name}</span>
                          <span className="text-xs text-muted-foreground italic">
                            ({sec.packageName})
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Wybierz {count}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {selectedCount}/{count}
                          </span>
                          {isSaving && (
                            <span className="text-xs text-muted-foreground">
                              Zapisywanie...
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {sec.items.map((mi) => {
                            const isChecked = selectedMenuItemIds.has(mi.id);
                            return (
                              <label
                                key={mi.id}
                                className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-2 py-1"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  disabled={isSaving}
                                  onChange={() => {
                                    const next = new Set(selectedMenuItemIds);
                                    if (isChecked) {
                                      next.delete(mi.id);
                                    } else {
                                      if (count > 0 && next.size >= count) {
                                        toast.error(
                                          `Można wybrać maksymalnie ${count} pozycji`
                                        );
                                        return;
                                      }
                                      next.add(mi.id);
                                    }
                                    updateSelection(sec.offerItemId, sec.id, Array.from(next));
                                  }}
                                  className="h-4 w-4"
                                />
                                <span>{mi.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          );
        }
        if (data.selections.length > 0) {
          // Mapa offerItemId → { day, dayLabel, packageName } — żeby podpisać wybory klienta
          const itemInfoMap = new Map<
            string,
            { day: number; dayLabel: string; packageName: string }
          >();
          for (const it of scheduleItems) {
            const dayLabel = it.date
              ? new Date(it.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })
              : `Dzień ${it.day}`;
            itemInfoMap.set(it.id, { day: it.day, dayLabel, packageName: it.name });
          }

          // Grupuj wybory po dniu (order: dzień rosnąco, legacy na końcu)
          const groups = new Map<
            string,
            { day: number; dayLabel: string; sels: typeof data.selections }
          >();
          for (const sel of data.selections) {
            const info = sel.offerItemId ? itemInfoMap.get(sel.offerItemId) : null;
            const key = info ? `d-${info.day}` : "legacy";
            const dayLabel = info ? info.dayLabel : "Bez dnia";
            const day = info ? info.day : 9999;
            if (!groups.has(key)) groups.set(key, { day, dayLabel, sels: [] });
            groups.get(key)!.sels.push(sel);
          }
          const orderedGroups = Array.from(groups.values()).sort((a, b) => a.day - b.day);

          return (
            <>
              <Separator />
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Wybory klienta
              </h2>
              <div className="space-y-5">
                {orderedGroups.map((group) => (
                  <div key={`group-${group.day}`}>
                    <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      {group.dayLabel}
                    </h3>
                    <div className="space-y-3">
                      {group.sels.map((sel, idx) => {
                        const info = sel.offerItemId ? itemInfoMap.get(sel.offerItemId) : null;
                        const uniqueKey = `${sel.offerItemId || "legacy"}-${sel.sectionId}-${idx}`;
                        return (
                          <Card key={uniqueKey}>
                            <CardContent className="pt-4">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="font-medium">{sel.section.name}</span>
                                {info && (
                                  <span className="text-xs text-muted-foreground italic">
                                    ({info.packageName})
                                  </span>
                                )}
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
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        }
        return null;
      })()}

      {/* Karta finalizacji */}
      {data.type === "WSTEPNA" && !data.isLocked && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Finalizacja agendy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!canFinalize && (
                <div className="flex items-start gap-2 rounded-lg bg-muted/50 border border-border/60 px-3 py-2 text-sm">
                  <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-muted-foreground">
                    {!hasSchedule && (
                      <p>Brak pozycji w ofercie. Uzupełnij harmonogram w widoku Excel.</p>
                    )}
                    {hasSchedule && missingSelections.length > 0 && (
                      <p>
                        Klient nie dokonał jeszcze wszystkich wyborów. Czekamy na sekcje:{" "}
                        <span className="font-medium">{missingSelections.join(", ")}</span>.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {canFinalize && (
                <p className="text-sm text-muted-foreground">
                  Wszystko gotowe. Po finalizacji wybory klienta zostaną zamrożone.
                </p>
              )}
              <div>
                <Button onClick={finalizeAgenda} disabled={finalizing || !canFinalize}>
                  <Lock className="mr-1 h-4 w-4" />
                  {finalizing ? "Finalizowanie..." : "Finalizuj agendę"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}

function GuideStep({
  number,
  label,
  done,
  active,
}: {
  number: number;
  label: string;
  done: boolean;
  active: boolean;
}) {
  const color = done ? "text-green-600" : active ? "text-primary" : "text-muted-foreground/60";
  const ring = done
    ? "bg-green-600 text-white border-green-600"
    : active
      ? "bg-primary text-primary-foreground border-primary"
      : "bg-muted text-muted-foreground border-border";
  return (
    <div className={`flex items-center gap-2 ${color}`}>
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold ${ring}`}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : number}
      </span>
      <span className={active ? "font-medium" : ""}>{label}</span>
    </div>
  );
}

// ==================== CLIENT MESSAGES ====================

interface ClientMessageDTO {
  id: string;
  content: string;
  createdAt: string;
  responseStatus: "ACCEPTED" | "REJECTED" | "CALL_BACK" | null;
  responseReason: string | null;
  responsePhone: string | null;
  respondedAt: string | null;
  respondedBy: { firstName: string; lastName: string } | null;
}

function ClientMessagesSection({ agendaId }: { agendaId: string }) {
  const { data, mutate } = useSWR<{ messages: ClientMessageDTO[] }>(
    `/api/agendas/${agendaId}/messages`,
    fetcher
  );
  const messages = data?.messages || [];
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"REJECTED" | "CALL_BACK" | null>(null);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function respond(id: string, status: "ACCEPTED" | "REJECTED" | "CALL_BACK", extra?: string) {
    setSaving(true);
    try {
      const body: Record<string, string> = { status };
      if (status === "REJECTED") body.reason = extra || "";
      if (status === "CALL_BACK") body.phone = extra || "";
      const res = await fetch(`/api/client-messages/${id}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd");
      }
      toast.success("Odpowiedź zapisana");
      setRespondingId(null);
      setMode(null);
      setInput("");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <MessageSquare className="h-4 w-4" />
        Wiadomości od klienta
        {messages.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {messages.length}
          </Badge>
        )}
      </h2>
      {messages.length === 0 ? (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">
            Klient nie wysłał jeszcze żadnej wiadomości.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {[...messages].reverse().map((m) => (
            <Card key={m.id}>
              <CardContent className="pt-4 space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Klient ·{" "}
                    {new Date(m.createdAt).toLocaleString("pl-PL", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                </div>

                {m.responseStatus ? (
                  <div
                    className={`rounded-md p-3 border text-sm ${
                      m.responseStatus === "ACCEPTED"
                        ? "bg-green-50 border-green-200"
                        : m.responseStatus === "REJECTED"
                        ? "bg-red-50 border-red-200"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium mb-1">
                      {m.responseStatus === "ACCEPTED" && (
                        <>
                          <CheckCircle className="h-4 w-4 text-green-700" />
                          <span className="text-green-900">Zaakceptowano</span>
                        </>
                      )}
                      {m.responseStatus === "REJECTED" && (
                        <>
                          <XCircle className="h-4 w-4 text-red-700" />
                          <span className="text-red-900">Odrzucono</span>
                        </>
                      )}
                      {m.responseStatus === "CALL_BACK" && (
                        <>
                          <Phone className="h-4 w-4 text-blue-700" />
                          <span className="text-blue-900">Prośba o kontakt</span>
                        </>
                      )}
                    </div>
                    {m.responseStatus === "REJECTED" && m.responseReason && (
                      <p>Powód: {m.responseReason}</p>
                    )}
                    {m.responseStatus === "CALL_BACK" && m.responsePhone && (
                      <p>
                        Telefon: <strong>{m.responsePhone}</strong>
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Odpowiedział/a:{" "}
                      {m.respondedBy
                        ? `${m.respondedBy.firstName} ${m.respondedBy.lastName}`
                        : "—"}
                      {m.respondedAt &&
                        ` · ${new Date(m.respondedAt).toLocaleString("pl-PL", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`}
                    </p>
                  </div>
                ) : respondingId === m.id ? (
                  <div className="space-y-2 border-t pt-3">
                    {mode === null ? (
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => respond(m.id, "ACCEPTED")}
                          disabled={saving}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Zaakceptuj
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMode("REJECTED")}
                        >
                          <XCircle className="mr-1 h-4 w-4" />
                          Odrzuć
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMode("CALL_BACK")}
                        >
                          <Phone className="mr-1 h-4 w-4" />
                          Proszę o kontakt
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setRespondingId(null);
                            setMode(null);
                            setInput("");
                          }}
                        >
                          Anuluj
                        </Button>
                      </div>
                    ) : mode === "REJECTED" ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Powód odrzucenia</label>
                        <Textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Np. nie mamy możliwości zorganizowania..."
                          className="min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => respond(m.id, "REJECTED", input)}
                            disabled={saving || input.trim().length < 2}
                          >
                            Zapisz
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMode(null);
                              setInput("");
                            }}
                          >
                            Wstecz
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Input
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="np. 600 100 200"
                          type="tel"
                        />
                        <p className="text-xs text-muted-foreground">
                          Numer, z którego zadzwonisz do klienta (zobaczy go u siebie).
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => respond(m.id, "CALL_BACK", input)}
                            disabled={saving || input.trim().length < 5}
                          >
                            Zapisz
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setMode(null);
                              setInput("");
                            }}
                          >
                            Wstecz
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRespondingId(m.id)}
                  >
                    Odpowiedz
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

interface SelectionChangeDTO {
  id: string;
  offerItemId: string;
  sectionId: string;
  proposedNames: string[];
  previousNames: string[];
  createdAt: string;
  responseStatus: "ACCEPTED" | "REJECTED" | "CALL_BACK" | null;
  responseReason: string | null;
  responsePhone: string | null;
  respondedAt: string | null;
  respondedBy: { firstName: string; lastName: string } | null;
  sectionName: string;
  sectionMode: string;
  sectionCount: number | null;
  offerItemName: string;
  day: number;
  date: string | null;
}

function ClientSelectionChangesSection({ agendaId }: { agendaId: string }) {
  const { data, mutate } = useSWR<SelectionChangeDTO[]>(
    `/api/agendas/${agendaId}/selection-changes`,
    fetcher
  );
  const changes = data || [];
  const pending = changes.filter((c) => c.responseStatus === null);
  const history = changes.filter((c) => c.responseStatus !== null);

  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [mode, setMode] = useState<"REJECTED" | "CALL_BACK" | null>(null);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function respond(
    id: string,
    status: "ACCEPTED" | "REJECTED" | "CALL_BACK",
    extra?: string
  ) {
    setSaving(true);
    try {
      const body: Record<string, string> = { status };
      if (status === "REJECTED") body.reason = extra || "";
      if (status === "CALL_BACK") body.phone = extra || "";
      const res = await fetch(`/api/client-selection-changes/${id}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd");
      }
      toast.success("Odpowiedź zapisana");
      setRespondingId(null);
      setMode(null);
      setInput("");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd");
    } finally {
      setSaving(false);
    }
  }

  if (changes.length === 0) return null;

  const renderDayLabel = (c: SelectionChangeDTO) =>
    c.date
      ? new Date(c.date).toLocaleDateString("pl-PL", {
          day: "numeric",
          month: "long",
        })
      : `Dzień ${c.day}`;

  const renderChange = (c: SelectionChangeDTO) => (
    <Card key={c.id}>
      <CardContent className="pt-4 space-y-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mb-1">
            <Badge variant="secondary" className="text-[10px]">
              {renderDayLabel(c)}
            </Badge>
            <span>{c.offerItemName}</span>
            <span>·</span>
            <span className="font-medium">{c.sectionName}</span>
            <span>·</span>
            <span>
              {new Date(c.createdAt).toLocaleString("pl-PL", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Było: </span>
              {c.previousNames.length > 0 ? (
                <span>{c.previousNames.join(", ")}</span>
              ) : (
                <span className="italic text-muted-foreground">brak</span>
              )}
            </div>
            <div>
              <span className="text-muted-foreground">Chce: </span>
              <span className="font-medium">
                {c.proposedNames.length > 0
                  ? c.proposedNames.join(", ")
                  : "nic (odznaczenie)"}
              </span>
            </div>
          </div>
        </div>

        {c.responseStatus ? (
          <div
            className={`rounded-md p-3 border text-sm ${
              c.responseStatus === "ACCEPTED"
                ? "bg-green-50 border-green-200"
                : c.responseStatus === "REJECTED"
                ? "bg-red-50 border-red-200"
                : "bg-blue-50 border-blue-200"
            }`}
          >
            <div className="flex items-center gap-2 font-medium mb-1">
              {c.responseStatus === "ACCEPTED" && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-700" />
                  <span className="text-green-900">Zaakceptowano</span>
                </>
              )}
              {c.responseStatus === "REJECTED" && (
                <>
                  <XCircle className="h-4 w-4 text-red-700" />
                  <span className="text-red-900">Odrzucono</span>
                </>
              )}
              {c.responseStatus === "CALL_BACK" && (
                <>
                  <Phone className="h-4 w-4 text-blue-700" />
                  <span className="text-blue-900">Prośba o kontakt</span>
                </>
              )}
            </div>
            {c.responseStatus === "REJECTED" && c.responseReason && (
              <p>Powód: {c.responseReason}</p>
            )}
            {c.responseStatus === "CALL_BACK" && c.responsePhone && (
              <p>
                Telefon: <strong>{c.responsePhone}</strong>
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Odpowiedział/a:{" "}
              {c.respondedBy
                ? `${c.respondedBy.firstName} ${c.respondedBy.lastName}`
                : "—"}
              {c.respondedAt &&
                ` · ${new Date(c.respondedAt).toLocaleString("pl-PL", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
            </p>
          </div>
        ) : respondingId === c.id ? (
          <div className="space-y-2 border-t pt-3">
            {mode === null ? (
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => respond(c.id, "ACCEPTED")}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Zaakceptuj
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMode("REJECTED")}
                >
                  <XCircle className="mr-1 h-4 w-4" />
                  Odrzuć
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMode("CALL_BACK")}
                >
                  <Phone className="mr-1 h-4 w-4" />
                  Proszę o kontakt
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRespondingId(null);
                    setMode(null);
                    setInput("");
                  }}
                >
                  Anuluj
                </Button>
              </div>
            ) : mode === "REJECTED" ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Powód odrzucenia</label>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Np. danie niedostępne w tym sezonie..."
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => respond(c.id, "REJECTED", input)}
                    disabled={saving || input.trim().length < 2}
                  >
                    Zapisz
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMode(null);
                      setInput("");
                    }}
                  >
                    Wstecz
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Numer telefonu</label>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="np. 600 100 200"
                  type="tel"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => respond(c.id, "CALL_BACK", input)}
                    disabled={saving || input.trim().length < 5}
                  >
                    Zapisz
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMode(null);
                      setInput("");
                    }}
                  >
                    Wstecz
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRespondingId(c.id)}
          >
            Odpowiedz
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        Propozycje zmian od klienta
        {pending.length > 0 && (
          <Badge variant="warning" className="text-xs">
            {pending.length} czeka
          </Badge>
        )}
      </h2>
      {pending.length > 0 && (
        <div className="space-y-2">{pending.map(renderChange)}</div>
      )}
      {history.length > 0 && (
        <details className="mt-2">
          <summary className="text-sm text-muted-foreground cursor-pointer">
            Historia ({history.length})
          </summary>
          <div className="space-y-2 mt-2">{history.map(renderChange)}</div>
        </details>
      )}
    </div>
  );
}
