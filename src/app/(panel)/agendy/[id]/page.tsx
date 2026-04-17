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
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
  const router = useRouter();
  const { data, mutate } = useSWR<AgendaDetail>(`/api/agendas/${id}`, fetcher);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [relocking, setRelocking] = useState(false);
  const [savingSelection, setSavingSelection] = useState<string | null>(null);

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
    if (!confirm("Czy na pewno chcesz usunąć tę agendę? Linki klienta i kuchni przestaną działać.")) return;
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
    if (!confirm("Czy na pewno chcesz sfinalizować agendę? Ta operacja jest nieodwracalna.")) {
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

  async function unlockAgenda() {
    if (!confirm("Odblokować agendę do poprawek? Klient nadal nie będzie mógł zmieniać wyborów (poza swoim linkiem w oknie 14 dni).")) return;
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
    if (!confirm("Zatwierdzić zmiany? Kuchnia zobaczy świeże dane, klient nie będzie mógł już zmieniać wyborów.")) return;
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

  async function updateSelection(sectionId: string, menuItemIds: string[]) {
    setSavingSelection(sectionId);
    try {
      const res = await fetch(`/api/agendas/${id}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections: [{ sectionId, menuItemIds }] }),
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

  const clientToken = data.tokens.find((t) => t.type === "KLIENT_AGENDA");
  const kitchenToken = data.tokens.find((t) => t.type === "KUCHNIA_AGENDA");
  const scheduleItems = items || [];
  const hasSchedule = scheduleItems.length > 0;

  // Sekcje CHOOSE_X_FROM_Y z AKTUALNIE używanych pakietów (scheduleItems).
  // Priorytet: offerTypes (pełne drzewo menu), fallback: offerPackages z endpointu agendy.
  const packageIdsInSchedule = Array.from(
    new Set(
      scheduleItems
        .filter((i) => i.sourceType === "PACKAGE" && i.sourceId)
        .map((i) => i.sourceId as string)
    )
  );

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

  const offerPackageFallback = new Map<
    string,
    Array<{ id: string; name: string; count: number | null; items: Array<{ id: string; name: string }> }>
  >();
  for (const op of data.offer.offerPackages) {
    // offerPackages ma tylko package.sections, nie mamy bezpośrednio package.id.
    // Fallback używamy tylko jeśli menu nie odpowiedział jeszcze (świeży stan).
    for (const s of op.package.sections) {
      if (s.selectionMode === "CHOOSE_X_FROM_Y") {
        const key = `__fallback_${s.id}`;
        if (!offerPackageFallback.has(key)) offerPackageFallback.set(key, []);
        offerPackageFallback.get(key)!.push({
          id: s.id,
          name: s.name,
          count: s.selectionCount,
          items: s.items,
        });
      }
    }
  }

  const collectedSections: Array<{
    id: string;
    name: string;
    count: number | null;
    items: Array<{ id: string; name: string }>;
  }> = [];
  const seenSectionIds = new Set<string>();
  for (const pkgId of packageIdsInSchedule) {
    const fromMenu = menuPackageMap.get(pkgId);
    if (fromMenu) {
      for (const sec of fromMenu) {
        if (!seenSectionIds.has(sec.id)) {
          seenSectionIds.add(sec.id);
          collectedSections.push(sec);
        }
      }
    }
  }
  // Jeśli nic nie zebraliśmy a menu jeszcze nie załadowane — użyj offerPackages jako fallback
  if (collectedSections.length === 0 && !offerTypes) {
    for (const op of data.offer.offerPackages) {
      for (const s of op.package.sections) {
        if (s.selectionMode === "CHOOSE_X_FROM_Y" && !seenSectionIds.has(s.id)) {
          seenSectionIds.add(s.id);
          collectedSections.push({
            id: s.id,
            name: s.name,
            count: s.selectionCount,
            items: s.items,
          });
        }
      }
    }
  }
  const allChooseSections = collectedSections;

  const missingSelections: string[] = [];
  for (const sec of allChooseSections) {
    const sel = data.selections.find((s) => s.sectionId === sec.id);
    const complete =
      sel && sel.completedAt && (sec.count == null || sel.items.length === sec.count);
    if (!complete) missingSelections.push(sec.name);
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
                  const sel = data.selections.find((s) => s.sectionId === sec.id);
                  const selectedIds = new Set(
                    (sel?.items || []).map((it) => it.menuItem.name)
                  );
                  const selectedMenuItemIds = new Set<string>();
                  for (const item of sec.items) {
                    if (selectedIds.has(item.name)) selectedMenuItemIds.add(item.id);
                  }
                  const count = sec.count ?? 0;
                  const selectedCount = selectedMenuItemIds.size;
                  const isSaving = savingSelection === sec.id;
                  return (
                    <Card key={sec.id}>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{sec.name}</span>
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
                                    updateSelection(sec.id, Array.from(next));
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
          return (
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
