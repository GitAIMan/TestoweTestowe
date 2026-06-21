"use client";

import { use, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Clock, Lock, MapPin, Save, Info, MessageSquare, XCircle, Phone, Send, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "sonner";

interface OfferItem {
  id: string;
  day: number;
  date: string | null;
  sortOrder: number;
  name: string;
  description: string | null;
  timeFrom: string | null;
  timeTo: string | null;
  quantity: number;
  sourceType: string | null;
  sourceId: string | null;
  hall: { id: string; name: string } | null;
}

interface CompositionSection {
  id: string;
  name: string;
  selectionMode: "ALL_INCLUDED" | "CHOOSE_X_FROM_Y" | string;
  selectionCount: number | null;
  items: Array<{ id: string; name: string }>;
}

interface Composition {
  packageName: string;
  offerTypeName: string;
  sections: CompositionSection[];
}

interface AgendaData {
  agenda: {
    id: string;
    type: string;
    offer: {
      id: string;
      clientName: string;
      eventName: string | null;
      eventDateFrom: string;
      eventDateTo: string;
      adultsCount: number;
      childrenCount: number;
      items: OfferItem[];
    };
  };
  packageCompositions: Record<string, Composition>;
  selections: Array<{
    sectionId: string;
    offerItemId: string | null;
    items: Array<{ menuItemId: string }>;
  }>;
  selectionChanges: Array<{
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
  }>;
  isLocked: boolean;
  hotel: { hotelName: string; primaryColor: string } | null;
  lastModifiedAt: string;
}

function selKey(offerItemId: string, sectionId: string): string {
  return `${offerItemId}:${sectionId}`;
}

export default function KlientPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [data, setData] = useState<AgendaData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Lokalne wybory klienta: sectionId → Set<menuItemId>
  const [localSelections, setLocalSelections] = useState<Record<string, Set<string>>>({});
  const [limitReached, setLimitReached] = useState<Record<string, boolean>>({});

  // Wiadomości klienta
  type ClientMsg = {
    id: string;
    content: string;
    createdAt: string;
    responseStatus: "ACCEPTED" | "REJECTED" | "CALL_BACK" | null;
    responseReason: string | null;
    responsePhone: string | null;
    respondedAt: string | null;
    respondedBy: { firstName: string; lastName: string } | null;
  };
  const [messages, setMessages] = useState<ClientMsg[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  async function loadMessages() {
    try {
      const res = await fetch(`/api/public/agenda/${token}/messages`);
      if (!res.ok) return;
      const json = await res.json();
      setMessages(json.messages || []);
    } catch {
      // ignore
    }
  }

  async function sendMessage() {
    const content = newMessage.trim();
    if (content.length < 3) {
      toast.error("Wiadomość za krótka (min 3 znaki)");
      return;
    }
    setSendingMessage(true);
    try {
      const res = await fetch(`/api/public/agenda/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd");
      }
      toast.success("Wiadomość wysłana do hotelu");
      setNewMessage("");
      loadMessages();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd");
    } finally {
      setSendingMessage(false);
    }
  }

  useEffect(() => {
    fetch(`/api/public/agenda/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Ten link nie jest już aktywny.");
        return res.json();
      })
      .then((result: AgendaData) => {
        setData(result);
        const initial: Record<string, Set<string>> = {};
        for (const sel of result.selections) {
          // Klucz = offerItemId:sectionId (stare wybory bez offerItemId: pomiń — wymuś reselekcję)
          if (!sel.offerItemId) continue;
          initial[selKey(sel.offerItemId, sel.sectionId)] = new Set(
            sel.items.map((i) => i.menuItemId)
          );
        }
        setLocalSelections(initial);
        loadMessages();
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function toggleItem(
    offerItemId: string,
    sectionId: string,
    menuItemId: string,
    section: CompositionSection
  ) {
    if (data?.isLocked) return;
    const key = selKey(offerItemId, sectionId);
    setLocalSelections((prev) => {
      const current = new Set(prev[key] || []);
      if (current.has(menuItemId)) {
        current.delete(menuItemId);
        setLimitReached((lr) => ({ ...lr, [key]: false }));
      } else {
        if (
          section.selectionMode === "CHOOSE_X_FROM_Y" &&
          section.selectionCount &&
          current.size >= section.selectionCount
        ) {
          setLimitReached((lr) => ({ ...lr, [key]: true }));
          return prev;
        }
        current.add(menuItemId);
        setLimitReached((lr) => ({ ...lr, [key]: false }));
      }
      return { ...prev, [key]: current };
    });
  }

  // Wszystkie pary (offerItemId, sekcja CHOOSE) do walidacji — osobno per dzień/pakiet
  const allChoosePairs = useMemo(() => {
    if (!data) return [] as Array<{ offerItemId: string; section: CompositionSection; dayLabel: string }>;
    const out: Array<{ offerItemId: string; section: CompositionSection; dayLabel: string }> = [];
    for (const item of data.agenda.offer.items) {
      if (item.sourceType !== "PACKAGE" || !item.sourceId) continue;
      const comp = data.packageCompositions[item.sourceId];
      if (!comp) continue;
      const dayLabel = item.date
        ? new Date(item.date).toLocaleDateString("pl-PL", { day: "numeric", month: "long" })
        : `Dzień ${item.day}`;
      for (const sec of comp.sections) {
        if (sec.selectionMode === "CHOOSE_X_FROM_Y") {
          out.push({ offerItemId: item.id, section: sec, dayLabel });
        }
      }
    }
    return out;
  }, [data]);

  async function saveSelections() {
    if (!data) return;
    for (const { offerItemId, section, dayLabel } of allChoosePairs) {
      if (section.selectionCount) {
        const key = selKey(offerItemId, section.id);
        const selected = localSelections[key]?.size || 0;
        if (selected !== section.selectionCount) {
          toast.error(
            `${dayLabel} · "${section.name}": wybierz dokładnie ${section.selectionCount} pozycji (masz ${selected})`
          );
          return;
        }
      }
    }

    setSaving(true);
    try {
      // Rozpakuj klucz "offerItemId:sectionId"
      const selections = Object.entries(localSelections).map(([key, items]) => {
        const [offerItemId, sectionId] = key.split(":");
        return {
          offerItemId,
          sectionId,
          menuItemIds: Array.from(items),
        };
      });
      const res = await fetch(`/api/public/agenda/${token}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Błąd zapisu");
      }
      const json = await res.json();
      const total = (json.created || 0) + (json.updated || 0);
      if (total > 0) {
        toast.success("Propozycja wysłana — hotel zatwierdzi zmianę");
      } else {
        toast.success("Brak zmian do zapisania");
      }
      // Odśwież dane — pokaż pending
      const refresh = await fetch(`/api/public/agenda/${token}`);
      if (refresh.ok) {
        const refreshed = await refresh.json();
        setData(refreshed);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Ładowanie agendy...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Skontaktuj się z hotelem, aby uzyskać nowy link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { agenda, isLocked, hotel, packageCompositions } = data;
  const offer = agenda.offer;

  // Grupuj items po dniu (używamy numeru dnia, nie daty — spójne z resztą systemu)
  const dayMap = new Map<number, { date: string | null; items: OfferItem[] }>();
  for (const item of offer.items) {
    if (!dayMap.has(item.day)) dayMap.set(item.day, { date: item.date, items: [] });
    dayMap.get(item.day)!.items.push(item);
  }
  const days = Array.from(dayMap.entries()).sort(([a], [b]) => a - b);

  const hasChooseSections = allChoosePairs.length > 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster position="top-center" />

      {/* Header */}
      <div
        className="bg-primary text-primary-foreground px-6 py-8"
        style={hotel ? { backgroundColor: hotel.primaryColor } : {}}
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold">{hotel?.hotelName || "Hotel"}</h1>
          <p className="text-lg mt-1 opacity-90">{offer.eventName || "Agenda wydarzenia"}</p>
          <p className="text-sm mt-1 opacity-75">
            {offer.clientName} ·{" "}
            {new Date(offer.eventDateFrom).toLocaleDateString("pl-PL")} —{" "}
            {new Date(offer.eventDateTo).toLocaleDateString("pl-PL")} · {offer.adultsCount}
            {offer.childrenCount > 0 ? ` + ${offer.childrenCount}` : ""} os.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Banner: ostatnia aktualizacja */}
        {data.lastModifiedAt && (
          <Card className="border-amber-300 bg-amber-50">
            <CardContent className="pt-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold text-base">
                  Ostatnia aktualizacja:{" "}
                  {new Date(data.lastModifiedAt).toLocaleDateString("pl-PL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}{" "}
                  o{" "}
                  {new Date(data.lastModifiedAt).toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-1">
                  Jeśli czegoś brakuje albo właśnie rozmawiałeś/aś z hotelem — odśwież tę stronę.
                  Na komputerze wciśnij klawisz <strong>F5</strong> albo przycisk odświeżania w przeglądarce.
                  Na telefonie przeciągnij palcem w dół.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLocked && agenda.type === "FINALNA" && (
          <Card className="border-green-300 bg-green-50">
            <CardContent className="pt-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-700" />
              <div>
                <p className="font-medium text-green-900">Agenda zatwierdzona</p>
                <p className="text-sm text-green-900/80">
                  Wybory są już zamknięte. Jeśli coś musisz zmienić lub dodać — skontaktuj się z hotelem przez wiadomości poniżej.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {isLocked && agenda.type !== "FINALNA" && (
          <Card className="border-destructive">
            <CardContent className="pt-4 flex items-center gap-3">
              <Lock className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Wybory zamknięte</p>
                <p className="text-sm text-muted-foreground">
                  Nie można już zmieniać wyborów — termin minął. Wiadomości do hotelu wciąż działają poniżej.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLocked && hasChooseSections && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-4 text-sm">
              Przejrzyj harmonogram. W pozycjach oznaczonych jako pakiet znajdziesz sekcje do wyboru —
              zaznacz pozycje i zapisz.
            </CardContent>
          </Card>
        )}

        <h2 className="text-lg font-semibold">Harmonogram</h2>

        {days.length === 0 && (
          <Card>
            <CardContent className="pt-4 text-sm text-muted-foreground">
              Harmonogram jeszcze nie jest gotowy.
            </CardContent>
          </Card>
        )}

        {days.map(([dayNum, dayData]) => {
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
              <CardContent className="space-y-3">
                {dayData.items.map((item) => {
                  const isPackage = item.sourceType === "PACKAGE";
                  const comp = isPackage && item.sourceId ? packageCompositions[item.sourceId] : null;
                  const time = item.timeFrom
                    ? `${item.timeFrom}${item.timeTo ? ` — ${item.timeTo}` : ""}`
                    : null;
                  return (
                    <div key={item.id} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        {time && (
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                            <Clock className="h-3.5 w-3.5" />
                            {time}
                          </span>
                        )}
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

                      {comp && comp.sections.length > 0 && (
                        <div className="pt-2 space-y-3">
                          {comp.sections.map((sec) => {
                            const isChoose = sec.selectionMode === "CHOOSE_X_FROM_Y";
                            const key = selKey(item.id, sec.id);
                            const selected = localSelections[key] || new Set<string>();
                            return (
                              <div key={`${item.id}-${sec.id}`} className="rounded-md bg-muted/40 p-3 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium">{sec.name}</span>
                                  {isChoose ? (
                                    <>
                                      <Badge variant="secondary" className="text-[10px]">
                                        Wybierz {sec.selectionCount} z {sec.items.length}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        ({selected.size}/{sec.selectionCount})
                                      </span>
                                      {limitReached[key] && (
                                        <span className="ml-auto flex items-center gap-1 text-xs font-medium text-red-600">
                                          <AlertCircle className="h-3.5 w-3.5" />
                                          Możesz wybrać maksymalnie {sec.selectionCount} pozycji
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px]">
                                      W cenie
                                    </Badge>
                                  )}
                                </div>

                                {isChoose ? (
                                  <ul className="space-y-1.5">
                                    {sec.items.map((mi) => {
                                      const isChecked = selected.has(mi.id);
                                      return (
                                        <li key={mi.id}>
                                          <label
                                            className={`flex items-center gap-3 rounded border p-2.5 cursor-pointer transition-colors text-sm ${
                                              isChecked
                                                ? "border-primary bg-primary/5"
                                                : "hover:bg-muted/50 border-border"
                                            } ${isLocked ? "cursor-not-allowed opacity-60" : ""}`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => toggleItem(item.id, sec.id, mi.id, sec)}
                                              disabled={isLocked}
                                              className="h-4 w-4"
                                            />
                                            <span>{mi.name}</span>
                                          </label>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                ) : (
                                  <ul className="space-y-1">
                                    {sec.items.map((mi) => (
                                      <li
                                        key={mi.id}
                                        className="flex items-center gap-2 text-sm text-muted-foreground"
                                      >
                                        <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                        {mi.name}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {hasChooseSections && !isLocked && (
          <div className="flex flex-col items-center gap-2 pt-2">
            <Button size="lg" onClick={saveSelections} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Wysyłanie..." : "Wyślij propozycję"}
            </Button>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Twoja zmiana zostanie przesłana do hotelu. Hotel ją zatwierdzi, odrzuci (z powodem) lub poprosi o kontakt telefoniczny. Stare wybory pozostają aktywne do momentu akceptacji.
            </p>
          </div>
        )}

        {/* Propozycje zmian — status */}
        {data.selectionChanges && data.selectionChanges.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Twoje propozycje zmian
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.selectionChanges.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-lg border p-3 text-sm ${
                    c.responseStatus === null
                      ? "border-amber-200 bg-amber-50"
                      : c.responseStatus === "ACCEPTED"
                      ? "border-green-200 bg-green-50"
                      : c.responseStatus === "REJECTED"
                      ? "border-red-200 bg-red-50"
                      : "border-blue-200 bg-blue-50"
                  }`}
                >
                  <div className="text-xs text-muted-foreground mb-1">
                    {new Date(c.createdAt).toLocaleString("pl-PL", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="mb-2">
                    <span className="text-muted-foreground">Było: </span>
                    {c.previousNames.length > 0 ? c.previousNames.join(", ") : "—"}
                    <span className="mx-1">→</span>
                    <span className="font-medium">
                      {c.proposedNames.length > 0 ? c.proposedNames.join(", ") : "brak"}
                    </span>
                  </div>
                  {c.responseStatus === null && (
                    <div className="flex items-center gap-2 font-medium text-amber-900">
                      <Clock className="h-4 w-4" />
                      Czeka na zatwierdzenie przez hotel
                    </div>
                  )}
                  {c.responseStatus === "ACCEPTED" && (
                    <div className="flex items-center gap-2 font-medium text-green-900">
                      <CheckCircle className="h-4 w-4" />
                      Zaakceptowane przez hotel
                    </div>
                  )}
                  {c.responseStatus === "REJECTED" && (
                    <div>
                      <div className="flex items-center gap-2 font-medium text-red-900">
                        <XCircle className="h-4 w-4" />
                        Hotel odrzucił zmianę
                      </div>
                      {c.responseReason && (
                        <p className="mt-1">Powód: {c.responseReason}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Stary wybór pozostał aktywny.
                      </p>
                    </div>
                  )}
                  {c.responseStatus === "CALL_BACK" && (
                    <div>
                      <div className="flex items-center gap-2 font-medium text-blue-900">
                        <Phone className="h-4 w-4" />
                        Skontaktujemy się z Tobą telefonicznie
                      </div>
                      {c.responsePhone && (
                        <p className="mt-1">
                          Zadzwonimy z numeru: <strong>{c.responsePhone}</strong>
                        </p>
                      )}
                    </div>
                  )}
                  {c.respondedAt && c.respondedBy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Odpowiedział/a: {c.respondedBy.firstName} {c.respondedBy.lastName} ·{" "}
                      {new Date(c.respondedAt).toLocaleString("pl-PL", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Wiadomości do hotelu */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Wiadomości do hotelu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nie wysłałeś/aś jeszcze żadnej wiadomości. Poniżej możesz napisać uwagę do hotelu — np. prośbę o zmianę pozycji, pytanie o wybory z menu, uwagi do harmonogramu.
              </p>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      Twoja wiadomość ·{" "}
                      {new Date(m.createdAt).toLocaleString("pl-PL", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    {m.responseStatus && (
                      <div
                        className={`mt-3 rounded-md p-3 border text-sm ${
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
                              <span className="text-blue-900">Skontaktujemy się z Tobą telefonicznie</span>
                            </>
                          )}
                        </div>
                        {m.responseStatus === "REJECTED" && m.responseReason && (
                          <p className="text-sm text-red-900">Powód: {m.responseReason}</p>
                        )}
                        {m.responseStatus === "CALL_BACK" && m.responsePhone && (
                          <p className="text-sm text-blue-900">
                            Zadzwonimy z numeru: <strong>{m.responsePhone}</strong>
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Odpowiedź od{" "}
                          {m.respondedBy
                            ? `${m.respondedBy.firstName} ${m.respondedBy.lastName}`
                            : "pracownika hotelu"}{" "}
                          ·{" "}
                          {m.respondedAt
                            ? new Date(m.respondedAt).toLocaleString("pl-PL", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!isLocked && (
              <div className="space-y-2 pt-2 border-t">
                <label className="text-sm font-medium">Dodaj nową wiadomość</label>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Np. prośba o zmianę pozycji w harmonogramie, pytanie do wyborów menu..."
                  className="min-h-[90px]"
                  maxLength={2000}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Hotel odpowie w ciągu 24h. Nowe wiadomości dopisują się do historii — poprzednich nie można edytować.
                  </p>
                  <Button onClick={sendMessage} disabled={sendingMessage || newMessage.trim().length < 3}>
                    <Send className="mr-2 h-4 w-4" />
                    {sendingMessage ? "Wysyłanie..." : "Wyślij"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
