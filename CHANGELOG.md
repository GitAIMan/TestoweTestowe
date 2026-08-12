# Changelog — SaaS Hotele

> Historyczny dziennik zmian. **Nie jest auto-ładowany** do kontekstu Claude.
> Aktualne, trwałe zasady i wzorce — patrz `CLAUDE.md`.

---

### Sesja 2026-08-12 — audyt bezpieczeństwa + pierwsze testy jednostkowe

**Audyt bezpieczeństwa (52 endpointy API):** żaden endpoint pracowniczy nie brakuje sprawdzenia logowania. Znalezione i naprawione 2 luki w publicznych endpointach tokenowych (klient/kuchnia):
- `src/app/api/public/agenda/[token]/route.ts` — kuchnia dostawała te same dane co klient (ceny `unitPrice`/`vatRate`, historię wiadomości/propozycji). Naprawa: sprawdzenie `agendaToken.type`, dla `KUCHNIA_AGENDA` obcięcie cen i `selectionChanges`.
- `src/app/api/public/agenda/[token]/selections/route.ts` — zapis wyborów klienta ufał ID (`offerItemId`/`sectionId`/`menuItemId`) z body żądania bez weryfikacji przynależności do oferty spod tokenu (IDOR). Naprawa: whitelist z bazy, niepasujące wpisy odrzucane po cichu.
- Zweryfikowane na żywo (serwer dev + realne dane z bazy): kuchnia nie dostaje już cen, klient bez zmian; próba podstawienia cudzych ID w selections — odrzucona, legalny wpis przechodzi z odciętym podstawionym `menuItemId`.
- Znalezione, nienaprawione na razie (średni/niski priorytet): tokeny CUID przewidywalne (powinny być losowe `crypto.randomBytes`), brak rate-limitingu na publicznych endpointach.

**Pierwsze testy jednostkowe:** dodano Vitest (`npm run test`), 36 testów dla `package-pricing.ts`, `amendment-diff.ts`, `agenda-lock.ts`, `validation.ts` — cała logika liczenia cen pakietów, aneksów i blokady 14-dniowej. Wcześniej zero testów automatycznych w projekcie.

---

### Sesja 2026-06-21 (cz. 2) — bezpieczne odrzucanie ofert, numer umowy na aneksie, mniejsze ceny w PDF

**Odrzucanie oferty — potwierdzenie + przywracanie:**
- Problem: przycisk „Odrzucona" działał od razu, bez pytania — łatwo kliknąć przez przypadek; po odrzuceniu znikały przyciski i oferta *wyglądała* na utraconą (choć to tylko zmiana statusu, nie hard-delete).
- `prisma/schema.prisma` — nowe pole `Offer.statusBeforeRejection OfferStatus?` (przez `db push`). Pamięta status sprzed odrzucenia.
- `src/app/api/offers/[id]/status/route.ts` — przy `ODRZUCONA` zapisuje `statusBeforeRejection` (gdy poprzedni był ROBOCZA/WYSLANA). Nowy sygnał `PRZYWROCONA` (nie status DB) — przywraca ofertę na status sprzed odrzucenia (`?? ROBOCZA`), czyści `statusBeforeRejection` i `respondedAt`. Waliduje, że obecny status to `ODRZUCONA`.
- `src/app/(panel)/oferty/[id]/edycja/page.tsx` — „Odrzucona" pyta przez `confirmDialog` (variant destructive). Nowy przycisk „Przywróć ofertę" gdy status `ODRZUCONA`.
- `src/app/(panel)/oferty/page.tsx` — na liście ofert przy odrzuconych ikona „Przywróć" (RotateCcw) obok kosza.

**Aneks PDF — numer umowy:**
- `src/components/contracts/contract-pdf.tsx` — wyeksportowana funkcja `contractCode` (ten sam numer co na umowie).
- `src/components/contracts/amendment-pdf.tsx` — nagłówek aneksu: „Dotyczy umowy nr 260621-XXX z dnia ...". Dodane pole `contract.createdAt` do props.
- `src/app/api/contracts/[id]/amendments/[amendmentId]/pdf/route.ts` — przekazuje `contract.createdAt`.

**Ceny w PDF — zmniejszone wizualnie (oferta, umowa, aneks):**
- `offer-pdf.tsx` / `contract-pdf.tsx`: `hlValue` 22→16, `totalAmount` 14→12, brutto w tabeli 11→10.
- `amendment-pdf.tsx`: `totalAfterValue` 20→15, `totalBeforeValue`/`totalDeltaValue` 12→11.
- Labele („Do zapłaty" itd.) bez zmian.

---

### Sesja 2026-06-21 — sesja testowa (nowy pracownik) + poprawki UX

Sesja testowa: nowa osoba przeszła cały system jako pracownik. Wyłapane i poprawione realne problemy UX.

**Wybory klienta — limit pozycji (widok klienta):**
- `src/app/klient/[token]/page.tsx` — usunięty dublujący się komunikat. Wcześniej przy przekroczeniu limitu (np. 2 zupy zamiast 1) leciał `toast.error` na środku ekranu — przy szybkim klikaniu toasty się nakładały i wyglądało jak dwa komunikaty. Teraz: stały czerwony napis przy nagłówku sekcji (stan `limitReached` per sekcja, ikona `AlertCircle`), znika po odznaczeniu pozycji. Toast usunięty.

**Prośba o kontakt telefoniczny — mylący tekst (klient + panel):**
- `src/app/klient/[token]/page.tsx` — gdy hotel odpowiada „proszę o kontakt" i wpisuje numer, klient widział „Zadzwonimy na: <numer>" co sugerowało, że to JEGO numer. To numer HOTELU. Poprawione w 2 miejscach (wiadomości + propozycje wyborów): nagłówek „Skontaktujemy się z Tobą telefonicznie", treść „Zadzwonimy z numeru: <numer>".
- `src/app/(panel)/agendy/[id]/page.tsx` — pole numeru po stronie hotelu (2 miejsca): usunięta etykieta, dodana szara podpowiedź pod polem „Numer, z którego zadzwonisz do klienta (zobaczy go u siebie)". Placeholder neutralny.

**Kreator oferty — kalendarz w kroku 2 tylko do podglądu:**
- `src/components/offers/step-event.tsx` — duży kalendarz przestał wybierać daty (był bug: po przypadkowym kliknięciu nie dało się odznaczyć dnia — `pickDate` bez logiki cofania). Usunięta funkcja `pickDate`. Klik w wolny dzień → nic (przycisk `disabled` dla wolnych). Klik w czerwony (zajęty) → pop-up szczegółów sal, BEZ przycisku „Wybierz ten dzień". Daty wpisuje się tylko w polach „Data od / Data do" (kalendarz podświetla wpisany zakres przez `inRange`). Dodany nagłówek „Podgląd zajętości — daty wpisz w polach wyżej", poprawiona legenda i hover.

**Kreator oferty — walidacja e-maila na żywo (krok 1):**
- Nowy helper `src/lib/validation.ts` — `isValidEmail` (pusty = dozwolony, bo e-mail opcjonalny; regex spójny z zod `.email()` na backendzie). Pierwszy wspólny helper walidacji w projekcie.
- `src/components/offers/step-client.tsx` — e-mail walidowany w trakcie wpisywania: `aria-invalid` (czerwona obwódka z `input.tsx`) + czerwony tekst pod polem. Wcześniej zły mail (np. `kupa@lalalal`) przechodził przez cały kreator i dopiero backend zwracał 400 przy zapisie szkicu.
- `src/app/(panel)/oferty/nowa/page.tsx` — `validateStep()` (krok 0) blokuje „Dalej" gdy mail niepusty i niepoprawny (toast).

**Git:** zacommitowana + wypchnięta na `staging` cała zaległa praca z poprzednich sesji (aneksy, wiadomości, propozycje wyborów, kalendarz, powiadomienia — 64 pliki) — wcześniej wisiała tylko lokalnie od 2026-04-18.

---

### Sesja 2026-04-19 — aneksy + propozycje wyborów klienta

**Naprawa aneksów do umowy (puste aneksy + fałszywe flagi):**
- **Blokada tworzenia pustego aneksu** (`src/app/api/contracts/[id]/amendments/route.ts`): POST teraz liczy `computeAmendmentDiff` vs poprzedni snapshot + porównuje `totalBefore` z `totalAfter` (decimal.js). Gdy brak zmian merytorycznych ORAZ kwoty równe → 400 „Brak zmian merytorycznych" + reset `needsAmendment=false`.
- **Mądrzejsze włączanie flagi `needsAmendment`** (`src/app/api/offers/[id]/items/route.ts`):
  - POST pozycji — flaga ON tylko gdy `unitPrice > 0` lub `sourceType === "PACKAGE"` (pusta pozycja nie pali).
  - DELETE — przed usunięciem pobiera pozycję, flaga ON tylko jeśli miała cenę/była pakietem.
  - PUT — detekcja rozdzielona: `hasMaterialChanges` (bez sortOrder → drag&drop nie liczy się) dla flagi aneksu; `hasAnyChanges` (z sortOrder) dla `lastItemsChangedAt`. `description` traktowane jako merytoryczne (decyzja: opis "bez cebuli" jest wiążący prawnie).
- **DELETE aneksu** (`src/app/api/contracts/[id]/amendments/[amendmentId]/route.ts` — NOWY): usuwa `ContractAmendment` (cascade czyści `ContractItemSnapshot`). Blokada 403 dla wysłanych (`resolvedAt != null`). Auto-reset `needsAmendment=false` gdy ostatni pending aneks usunięty.
- **UI** (`src/app/(panel)/oferty/[id]/edycja/page.tsx`): funkcja `deleteAmendment()` + czerwony kosz w liście aneksów (tylko przy niewysłanych). `createAmendment()` NAJPIERW zapisuje pozycje z tabeli do bazy (PUT items) — inaczej snapshot brał starą bazę (np. 0 zł dla świeżo dodanej pozycji).

**Wybory klienta per dzień (nagłówki):**
- `src/app/(panel)/agendy/[id]/page.tsx` — sekcja „Wybory klienta" rozbita na grupy per dzień (nagłówek `CalendarDays`). Fix klucza React `legacy-*` dla rekordów z `offerItemId=null` — dodany `idx` do klucza.

**Odpowiedź hotelu odświeża banner u klienta:**
- `src/app/api/client-messages/[id]/respond/route.ts` — po zapisie odpowiedzi aktualizuje `agenda.updatedAt`, żeby baner „Ostatnia aktualizacja" na linku klienta pokazał nową datę po F5.

**Akceptacja wyborów klienta — ten sam schemat co wiadomości (FLOW ZMIENIONY):**

Było: klient zmienia wybór → natychmiast zapisane jako obowiązujące. Hotel dostaje tylko powiadomienie dzwonkiem, bez kontroli.

Jest: klient zmienia wybór → tworzy się **propozycja** czekająca na akceptację. Hotel: Akceptuj / Odrzuć (z powodem) / Poproś o kontakt (z telefonem). Analogiczne do `ClientMessage`.

- **Nowy model**: `ClientSelectionChange` w `prisma/schema.prisma` (+ relacje `User.clientSelectionChanges`, `Agenda.clientSelectionChanges`). Pola: `agendaId, offerItemId, sectionId, proposedMenuItemIds[], previousMenuItemIds[], createdAt, responseStatus (ClientMessageStatus enum reuse), responseReason, responsePhone, respondedById, respondedAt`. Cascade delete z Agenda. Migracja: `prisma db push` (bez pliku migracji).
- **Nowy helper** `src/lib/amendment-detection.ts` — wyciągnięta z `selections/route.ts` logika liczenia faktycznej ceny po wyborach + ustawienia `contract.needsAmendment`. Używana po `ACCEPTED` w endpoint respond.
- **PUT `/api/public/agenda/[token]/selections`** (`selections/route.ts`) — PRZEPISANY. Zamiast natychmiastowego zapisu w `AgendaSectionSelection`:
  - Porównuje z aktualnymi wyborami + pending propozycjami.
  - Dla każdej sekcji gdzie klient zmienił → `ClientSelectionChange` (nowe lub update istniejącego pending).
  - Gdy klient wraca do poprzedniego wyboru → usuwa pending (rezygnacja).
  - Jedno wspólne powiadomienie `KLIENT_ZMIANA_WYBORU` z podsumowaniem („zaproponował(a) X zmian").
  - Touch `agenda.updatedAt`.
  - Blokada też dla `agenda.type === "FINALNA"` (nie da się proponować w finalnej).
- **Nowy endpoint PATCH** `/api/client-selection-changes/[id]/respond/route.ts` — analogiczny do `client-messages/[id]/respond`. `ACCEPTED` → zapisuje `proposedMenuItemIds` jako aktualny wybór (upsert `AgendaSectionSelection` + delete/create `AgendaItemSelection`) + `detectAmendmentFromSelections()`. `REJECTED`/`CALL_BACK` → wybór nie zmienia się. Touch `agenda.updatedAt`.
- **Nowy endpoint GET** `/api/agendas/[id]/selection-changes/route.ts` — zwraca propozycje z dociągniętymi nazwami pozycji menu + nazwą sekcji + info o pozycji oferty (dzień, data, nazwa pakietu).
- **`/api/public/agenda/[token]/route.ts`** — rozszerzony response o `selectionChanges[]` (z nazwami pozycji menu) żeby klient widział status swoich propozycji.
- **Panel agendy** (`src/app/(panel)/agendy/[id]/page.tsx`) — nowy komponent `ClientSelectionChangesSection`: lista propozycji (pending na górze, historia w `<details>`), 3 przyciski (zielony Zaakceptuj / Odrzuć z Textarea / Proszę o kontakt z Input tel.), po odpowiedzi status-box (green/red/blue) z imieniem pracownika i datą. Umieszczony nad sekcją wiadomości.
- **Widok klienta** (`src/app/klient/[token]/page.tsx`):
  - Przycisk zmieniony z „Zapisz wybory" na „Wyślij propozycję" + podpis wyjaśniający flow.
  - Nowa karta „Twoje propozycje zmian" — żółte = czeka, zielone = zaakceptowane, czerwone = odrzucone (z powodem + „stary wybór pozostał"), niebieskie = oddzwonimy (z numerem).
  - Banner dla FINALNEJ: zielony „Agenda zatwierdzona" + info że można pisać wiadomości.
  - Banner dla WSTEPNEJ+lock (termin minął): czerwony, ale teraz z dopiskiem że wiadomości działają.
- **Finalizacja** (`src/app/api/agendas/[id]/finalize/route.ts`) — nierozwiązane propozycje z wstępnej automatycznie `REJECTED` z powodem „Agenda została sfinalizowana — wcześniejsza propozycja zmiany nie została rozpatrzona."
- **Komunikat „Odblokuj do poprawek"** (`agendy/[id]/page.tsx:254`) — poprawiony na jasny: „Klient nadal widzi ją tylko w trybie podglądu — nie może zmieniać wyborów, ale może wysyłać wiadomości."

**Dlaczego taka architektura (decyzja):** Poprzedni system kolegi Generała generował nową agendę dla każdej zmiany — rozlewało się to po bazie, kuchnia gubiła wersje, klient dostawał nowe linki. Nasz model (propozycja + akceptacja w jednej agendzie) trzyma historię w jednym miejscu, hotel kontroluje ZANIM zmiana wejdzie, kuchnia ma jedną wersję, klient jeden link. Ten sam wzór UX co wiadomości — jeden schemat do nauki.

---

## Postęp implementacji (aktualizacja: 2026-03-31)

**Faza 0: Szkielet — UKOŃCZONA**
- Next.js + TypeScript + Tailwind v4 + App Router
- Prisma 7 + PostgreSQL (schemat: 17 modeli) — `prisma/schema.prisma`
- shadcn/ui (button, card, input, label, sonner)
- NextAuth v5 (CredentialsProvider, JWT, RBAC)
- Strona logowania `/login`
- Layout panelu z sidebar + topbar
- Dashboard placeholder
- Middleware auth guard
- Seed danych testowych
- Build przechodzi bez błędów

**Faza 1: CRUD danych bazowych — UKOŃCZONA**
- shadcn/ui: dodano table, dialog, select, textarea, badge, tabs, separator, dropdown-menu
- `/pokoje` — tabela, modal dodawania/edycji, dezaktywacja, API (GET/POST/PUT/DELETE)
- `/sale` — tabela, modal, dezaktywacja, sprawdzanie dostępności po dacie, API
- `/menu` — 4-poziomowy akordeon (OfferType→Package→Section→MenuItem), CRUD na każdym poziomie, tryby sekcji, 8 API endpointów
- `/ustawienia` — formularz konfiguracji hotelu (dane, kontakt, adres, branding, regulamin, stopka), tylko KIEROWNIK

**Loginy testowe:** anna@hotel.pl / test1234 (PRACOWNIK), kierownik@hotel.pl / test1234 (KIEROWNIK)

**Faza 2: Oferty — UKOŃCZONA**
- Kreator oferty `/oferty/nowa` — 6-krokowy wizard (klient, wydarzenie, sale z real-time dostępnością, pokoje, pakiety LEGO, podsumowanie + kalkulacja)
- Lista ofert `/oferty` — tabela z filtrami (status, wyszukiwanie), status badge kolorowy
- Szczegóły oferty `/oferty/[id]` — podgląd + zmiana statusu + przycisk PDF
- PDF oferty — `@react-pdf/renderer` po stronie serwera, API: `GET /api/offers/[id]/pdf`
- Zapis w transakcji Prisma (oferta + klocki + rezerwacje sal)
- Snapshot cen: decimal.js (nie float)

**Faza 3: Umowy — UKOŃCZONA**
- Tworzenie umowy z zaakceptowanej oferty `/umowy/nowa/[offerId]` — pre-fill z oferty
- Formularz: dane klienta (adres, NIP/PESEL) + warunki (zaliczka, termin, płatności, specjalne)
- Lista umów `/umowy` — tabela, status podpisana/niepodpisana
- Szczegóły umowy `/umowy/[id]` — podgląd + "Oznacz jako podpisaną" + PDF
- PDF umowy — `@react-pdf/renderer`, strony umowy, przedmiot, warunki, podpisy
- Przycisk "Utwórz umowę" w `/oferty/[id]` aktywny

**Faza 4: Agendy — UKOŃCZONA**
- Kreator agendy `/agendy/nowa/[offerId]` — bloki czasowe, pakiety, wyposażenie, link klienta
- Lista agend `/agendy` + szczegóły `/agendy/[id]` — harmonogram, linki, wybory klienta
- Widok klienta `/klient/[token]` — publiczny, bez logowania, branding hotelu, harmonogram, wybory interaktywne, blokada 14 dni
- API: agendas CRUD + blocks + tokens + public/agenda + selections + notifications
- Powiadomienia: dzwonek w topbar z badge, dropdown, auto-refresh 30s
- Przycisk "Utwórz agendę" w ofercie aktywny

**Faza 5: Finalizacja — UKOŃCZONA**
- Finalizacja agendy: przycisk w `/agendy/[id]`, walidacja wyborów, kopia do agendy FINALNA
- Widok kuchni `/kuchnia/[token]` — publiczny read-only, harmonogram z wyborami, wyposażenie, branding
- Podsumowania `/podsumowania` — tylko KIEROWNIK, statystyki, tabela agend finalnych, filtry dat

**Faza 6: Polish — UKOŃCZONA**
- Skeleton loaders na wszystkich tabelach + dashboard
- Responsywność: hamburger menu na mobile, sidebar overlay
- Dashboard: prawdziwe dane z API (oferty, umowy, agendy, zaakceptowane)
- TooltipProvider, skeleton, tooltip komponenty
- 52 route'y, build przechodzi bez błędów

**MVP KOMPLETNE — wszystkie 6 faz ukończone.**

### Poprawki po MVP:
- Fix: middleware Edge Runtime — rozdzielono auth na `auth.config.ts` (bez Prisma, do middleware) i `auth.ts` (z Prisma, do API routes). Naprawia błąd `node:path` w Edge Runtime.
- Fix: build script — dodano `prisma generate` przed `next build` (wymagane na Railway)
- Baza lokalna działa: PostgreSQL + migracja + seed OK
- Fix: DELETE endpoint dla ofert — usuwanie oferty z kaskadowym usunięciem powiązanych danych (agendy, umowy, rezerwacje)
- Fix: pola numeryczne — ukryte strzałki (CSS), zablokowany scroll i strzałki klawiatury (JS w providers)

### Redesign wizualny (2026-03-31):
- **Font:** Geist → Plus Jakarta Sans (latin-ext, ciepły, zaokrąglony)
- **Paleta:** Coral-Rose primary (oklch 0.637 0.137 15), ciepłe piaskowe neutraly
- **Tło:** kremowe, nie białe (background oklch 0.93 0.03 50, card oklch 0.97 0.015 50)
- **Sidebar:** gradient, aktywny pasek po lewej, hover shift, user info na dole, logo z cieniem
- **Topbar:** sticky + backdrop-blur-md + shadow
- **Karty:** custom multi-layer shadow, hover lift (-translate-y-0.5)
- **Tabele:** rounded container z shadow, uppercase headers, alternating rows
- **Buttony:** shadow-md, hover lift, active press
- **Dashboard:** pełny coral gradient banner "Dzień dobry!", kolorowe stat karty z top-bar akcentem
- **Login:** gradient tło, duże logo z shadow, elevated card
- **Badge:** nowe warianty success/warning/info (semantyczne kolory statusów ofert)
- **Animacja:** slide-up 0.35s na wejściu strony
- **Nowe tokeny:** --shadow-card, --shadow-card-hover, --shadow-elevated, --shadow-topbar

### Przebudowa flow oferty (2026-03-31):

**WAŻNE — nowy flow (zmiana architektury):**

1. **Kreator oferty** — 5 kroków (nie 6):
   - Klient → Wydarzenie → Sale → Pakiety → Podsumowanie
   - Pokoje USUNIĘTE z kreatora (do dodania osobno później)
   - Przycisk "Zapisz szkic" (nie "Zapisz ofertę")
   - Popup `beforeunload` przy wyjściu bez zapisu
   - Typ wydarzenia: dropdown z typów ofert (nie ręczne wpisywanie nazwy)
   - Daty: walidacja min (dziś), "Do" nie wcześniej niż "Od"

2. **Po zapisie szkicu → redirect na `/oferty/[id]/edycja`** (CENTRUM STEROWANIA):
   - Tabela edycyjna typu Excel z pozycjami rozbitymi na dni
   - Kolumny: NR | NAZWA | GODZ OD | GODZ DO | SALA | ILOŚĆ | CENA NETTO | VAT (8%/23%) | BRUTTO
   - Inline editing — każde pole edytowalne
   - "+ Dodaj pozycję" per dzień — pozycje "z palca" (CUSTOM)
   - Podsumowanie: netto, VAT, brutto
   - **Panel akcji** — w jednej karcie, warunkowe przyciski:
     - Zmiana statusu: Wysłana / Zaakceptowana / Odrzucona
     - PDF oferty
     - Utwórz umowę (po ZAAKCEPTOWANA)
     - Oznacz umowę jako podpisaną
     - Utwórz agendę (po podpisaniu umowy)
     - Link klienta / Link kuchni (kopiowanie)

3. **Stara strona `/oferty/[id]`** → automatyczny redirect na `/oferty/[id]/edycja`

4. **Lista ofert** — kliknięcie klienta prowadzi do centrum sterowania

**Nowy model bazy: `OfferItem`** (migracja `add_offer_items`):
- Zunifikowany model dla WSZYSTKICH pozycji oferty (sale, pokoje, pakiety, custom)
- Pola: offerId, day, date, sortOrder, name, description, timeFrom, timeTo, hallId, quantity, unitPrice, vatRate, sourceType, sourceId
- Generowany automatycznie po zapisie szkicu z OfferHall/OfferRoom/OfferPackage
- sourceType: "HALL" / "ROOM" / "PACKAGE" / "CUSTOM"

**Nowe API endpointy:**
- `GET/POST/PUT/DELETE /api/offers/[id]/items` — CRUD pozycji oferty
- `GET /api/offers/[id]/full` — oferta + umowa + agenda w jednym zapytaniu
- `PUT /api/agendas/[id]` — aktualizacja notatek agendy

**Zmiana flow umowa → agenda:**
- Przycisk "Utwórz agendę" przeniesiony z oferty na stronę UMOWY (po podpisaniu)
- Teraz dostępny też w centrum sterowania ofertą
- Kreator agendy: nowe pole "Pozycje niestandardowe / uwagi" per blok (placeholder: tort, DJ, dekoracje)
- Agenda: jeśli wstępna już istnieje — używa istniejącej zamiast 400

**Nawigacja poprawiona:**
- Po utworzeniu umowy → redirect na ofertę (nie na umowę)
- Strzałka wstecz na umowie → oferta (nie lista umów)
- Strzałka wstecz na agendzie → oferta (nie lista agend)

**Tooltips/podpowiedzi — USUNIĘTE (2026-04-02):**
- Komponent `<Hint>` usunięty ze wszystkich stron (oferty, agendy, pokoje, sale, umowy)
- Podpowiedzi będą zrobione inaczej w przyszłości

**Inne fixy:**
- DELETE endpoint dla ofert (kaskadowe usuwanie)
- Pola numeryczne: ukryte strzałki CSS + zablokowany scroll/keyboard JS (capture phase)
- Pakiety na stronie oferty: ładne formatowanie (ramki, badge typ, tryb sekcji, chipsy pozycji)
- Fix: walidacja email w API ofert — pusty email nie blokuje zapisu (z.union z z.literal(""))

### Przebudowa kreatora pakietów (2026-04-02):
- Krok 4 "Pakiety" w kreatorze oferty: zamiana klikalnych kafelków na **checkboxy**
- Rozwijalny podgląd składu pakietu (sekcje → pozycje menu) niezależnie od zaznaczenia
- Podsumowanie wybranych pakietów z **sumą cen** aktualizowaną na żywo

### Rozszerzenie tabeli Excel w centrum sterowania (2026-04-02):
- Nowe kolumny: **GODZ OD | GODZ DO | SALA** (dropdown z bazy)
- Model `OfferItem`: dodano pola `timeTo String?` i `hallId String?` (relacja do Hall)
- Migracja: `add_hall_and_timeto_to_offer_items`
- API items: POST i PUT obsługują nowe pola

### Uproszczenie flow agendy (2026-04-02):
- **Kreator bloków czasowych POMINIĘTY** — harmonogram budowany w tabeli Excel oferty
- Przycisk "Utwórz agendę" w centrum sterowania tworzy agendę + token klienta **jednym kliknięciem**
- Nie ma redirectu na kreator bloków — wszystko w centrum sterowania
- Link klienta pojawia się od razu w panelu akcji do skopiowania
- Strona `/agendy/nowa/[offerId]` nadal istnieje w kodzie ale nie jest używana w flow

### Usuwanie umów, agend i ofert (2026-04-06):
- **DELETE endpoint dla umów** — `DELETE /api/contracts/[id]`, blokuje usunięcie jeśli istnieje agenda (najpierw usuń agendę)
- **DELETE endpoint dla agend** — `DELETE /api/agendas/[id]`, kaskadowe usunięcie bloków, tokenów, wyborów klienta (wzorzec z ofert)
- **Przyciski usuwania** dodane w 5 miejscach:
  - Lista ofert `/oferty` — ikona kosza per wiersz
  - Lista umów `/umowy` — ikona kosza per wiersz
  - Lista agend `/agendy` — ikona kosza per wiersz
  - Strona umowy `/umowy/[id]` — przycisk "Usuń umowę"
  - Strona agendy `/agendy/[id]` — przycisk "Usuń agendę"
  - Centrum sterowania oferty `/oferty/[id]/edycja` — przyciski usuwania umowy i agendy w panelu akcji
- **Zasada zależności**: usunięcie umowy blokowane jeśli istnieje agenda → komunikat "Najpierw usuń agendę"
- **Hard delete** (zgodne z istniejącym wzorcem kaskadowego usuwania ofert)

### Przycisk "Nowa oferta" na dashboardzie (2026-04-06):
- Duży przycisk `+ Nowa oferta` w bannerze "Dzień dobry!" na dashboardzie

### Przebudowa strony Menu (2026-04-06):
- **Strona `/menu`** — przepisana z akordeonu na **kafelki typów ofert**
  - Każdy typ oferty (np. "Oferta Weselna") to klikalna karta
  - Kliknięcie przenosi do `/menu/[id]` — osobny edytor
  - Przycisk "+ Stwórz nową ofertę menu" jako kafelek z dashed border
  - Edycja nazwy i usuwanie per kafelek (ikony ołówka i kosza)
- **Nowa strona `/menu/[id]`** — edytor pakietów/sekcji/pozycji
  - Pakiety jako duże karty z niebieskim gradientem i ikoną
  - Sekcje jako zielone sub-karty z ramką
  - Pozycje menu jako lista z pomarańczowymi ikonami
  - Kolorowe badge VAT (8% zielony, 23% bursztynowy)
  - Duże, czytelne przyciski "Edytuj" / "Usuń" z tekstem
  - Kolorowe przyciski "Dodaj sekcję" (zielony dashed) i "Dodaj pozycję menu" (pomarańczowy)
  - Dialog z kolorową ikoną w tytule, duże pola (h-11)
- **Nowy GET endpoint** — `GET /api/menu/offer-types/[id]` zwraca jeden typ z pełnym drzewem

### VAT na poziomie menu (2026-04-06):
- **Migracja:** `add_vat_rate_to_menu_models` — dodano pole `vatRate Int?` do modeli Package, Section, MenuItem
- **API:** vatRate dodany do POST/PUT w 6 plikach route (packages, sections, items)
- Każdy poziom (pakiet, sekcja, pozycja) ma **osobny VAT** (8% lub 23%)
- Typ oferty NIE ma ceny ani VAT

### Bulk save w edytorze menu (2026-04-06):
- **Lokalny stan edycji** — dodawanie/edycja/usuwanie pakietów/sekcji/pozycji działa lokalnie w React state
- **Jeden przycisk ZAPISZ** na górze strony — wysyła wszystkie zmiany naraz do API
- Żółty banner "Masz niezapisane zmiany" gdy są niezapisane zmiany
- Badge "Nowy" na nowo dodanych elementach (tymczasowe id `temp_*`)
- Ostrzeżenie `beforeunload` przy próbie wyjścia bez zapisania
- **Cena domyślnie 0 zł** — puste pole ceny = 0.00 zł (nie "w cenie")
- Każdy element MUSI mieć cenę (minimum 0 zł)
- Bulk save: porównuje stan lokalny z oryginalnym, wysyła tylko różnice (POST nowe, PUT zmienione, DELETE usunięte)

### Inline formularze w edytorze menu (2026-04-07):
- **Dialogi (modale) usunięte** — dodawanie/edycja pakietów, sekcji, pozycji odbywa się inline na stronie
- **PackageInlineForm** — formularz pakietu z dynamicznym dodawaniem sekcji i pozycji w jednym widoku
  - Klik "Dodaj pakiet" → pola pakietu + wewnątrz "+ Dodaj sekcję" + w każdej sekcji "+ Dodaj pozycję"
  - Enter na pozycji → zielony flash ✓ + auto-dodaj nową pozycję + focus
  - Edycja pakietu: ten sam formularz, istniejące sekcje zachowane
- **InlineForm** (sekcja/pozycja) — dla edycji/dodawania pojedynczych sekcji i pozycji w zapisanym pakiecie
- VAT domyślnie **8%** dla sekcji i pozycji (żywność), pakiet 23% (usługi)
- Jeden przycisk "Zapisz zmiany" (usunięto duplikat z bannera)

### Notatnik z rozmowy (2026-04-07):
- **Kreator oferty** — sticky notatnik po prawej stronie (desktop) / zwijany na dole (mobile)
  - Widoczny przez wszystkie 5 kroków kreatora
  - Pole `notes` z `OfferFormData` — zapisuje się razem z ofertą
  - Amber kolor jak karteczka, placeholder z przykładami
- **Centrum sterowania (widok Excel)** — edytowalny panel notatek na dole strony
  - Przycisk "Zapisz notatki" pojawia się gdy coś zmienione
  - API: `PATCH /api/offers/[id]` — aktualizacja notatek

### Przycisk "Dodaj z menu" w widoku Excel (2026-04-07):
- **Autocomplete w polu NAZWA** — wpisz "pak" → podpowiedź "Pakiety" → klik otwiera pop-up
- **Pop-up krok 1** — wszystkie pakiety pogrupowane po typach ofert (Weselna, Konferencyjna...)
- **Pop-up krok 2** — read-only podgląd składu pakietu (sekcje + pozycje), badge "Wszystko w cenie" / "Klient wybiera X z Y"
- **Wiersz pakietu w tabeli** — 1 wiersz z ikoną Package (niebieski), strzałka rozwinięcia
  - Rozwinięcie: read-only lista sekcji i pozycji, badge trybu sekcji
  - Cena i VAT edytowalne, nazwa edytowalna
  - `sourceType: "PACKAGE"`, `sourceId: ID pakietu`
  - `description`: JSON z kompozycją pakietu (snapshot składu)
- **Pusta pozycja usuwana** automatycznie po wybraniu pakietu z menu
- Komponent `NameInputWithSuggest` — input z dropdown podpowiedzią
- Komponent `Checkbox` (shadcn) zainstalowany

### Ceny za osobę (2026-04-07):
- **Zasada:** wszystko z menu (pakiety/sekcje/pozycje) = cena za osobę. Sale i custom = ryczałt.
- **Kolumna OSOBY** w tabeli Excel — read-only, z oferty (adultsCount + childrenCount)
  - Dla PACKAGE: pokazuje liczbę osób
  - Dla HALL/CUSTOM: "—"
- **Formuła brutto:**
  - PACKAGE: `unitPrice × osoby × ilość × (1 + VAT/100)`
  - Reszta: `unitPrice × ilość × (1 + VAT/100)`
- **Backend PUT** (`/api/offers/[id]/items`) — przelicza totalPrice z uwzględnieniem osób
- **POST tworzenie oferty** — pakiet: `quantity = 1`, `unitPrice = cena/os`, totalPrice × osoby
- **PDF oferty** — pakiety: `cena zł/os × X os.`

### Przebudowa PDF oferty (2026-04-07):
- PDF bierze dane z **OfferItems** (nie ze starych snapshotów offerRooms/offerHalls/offerPackages)
- Tabela per dzień: NR, NAZWA, ILOŚĆ, OSOBY, CENA/JM, VAT, BRUTTO
- Pakiety: `[/os]` przy nazwie, kolumna OSOBY
- Podsumowanie: netto + VAT + brutto
- PDF **pobiera plik** (attachment) zamiast otwierać w przeglądarce

### Flow wysyłki oferty (2026-04-07):
- Przycisk **"Wysyłam ofertę"** (zamiast "Oznacz jako wysłaną")
- Pop-up potwierdzenia: imię klienta, checklist (oferta gotowa, PDF wysłany), przycisk "Potwierdzam wysłanie"

### Termin zaliczki w umowie (2026-04-07):
- **Szybkie przyciski**: "7 dni przed", "14 dni przed", "21 dni przed", "30 dni przed" wydarzeniem
- Data wydarzenia widoczna jako przypomnienie
- Pole date: min = dziś, max = data wydarzenia
- Podgląd wybranej daty słownie

### Banner odliczania + blokada edycji (2026-04-07):
- **Banner** pod nagłówkiem w widoku Excel:
  - Zielony (>14 dni): "Wydarzenie za X dni — zmiany dozwolone"
  - Czerwony (≤14 dni): "Wydarzenie za X dni — edycja zablokowana"
  - Szary (≤0 dni): "Wydarzenie zakończone"
- **Blokada** gdy ≤14 dni: pola tabeli wyszarzone (pointer-events-none), ukryty "Dodaj pozycję", ukryty "Zapisz pozycje"
- Notatki: nadal edytowalne (nie część oferty)

### Przycisk "Odśwież agendę" (2026-04-07):
- W karcie akcji, widoczny gdy agenda istnieje i edycja dozwolona
- Klik: confirm → usuwa WSZYSTKIE agendy oferty → tworzy nową WSTĘPNĄ + token klienta
- API GET `/api/agendas?offerId=` — dodano filtrowanie po offerId
- Finalizacja agendy → redirect do widoku Excel oferty (nie zostaje na stronie agendy)

### Przewodnik krok po kroku (2026-04-07):
- **Przycisk "?"** — okrągły, w prawym górnym rogu nagłówka widoku Excel
- **Pop-up z 7 krokami**: od "Uzupełnij ofertę" po "Finalizuj agendę"
- **Interaktywny** — system wykrywa aktualny krok z danych (status oferty, umowa, agenda):
  - Aktualny: niebieska ramka + numer
  - Ukończone: zielone + ptaszek ✓
  - Przyszłe: wyszarzone
- Info o blokadzie 14 dni na dole

### Pola numeryczne (2026-04-07):
- Pole ILOŚĆ: `value={quantity || ""}` — da się wyczyścić i wpisać od nowa
- Kreator oferty krok 2: pole "Liczba osób" — osobny stan `totalField`, da się kasować
  - Walidacja dorośli+dzieci: czerwony komunikat gdy suma się nie zgadza

### Audyt i fix precyzji cenowej (2026-04-07):
- **BUG naprawiony: totalPrice netto vs brutto** — POST `/api/offers` liczył totalPrice jako netto (bez VAT), a PUT `/api/offers/[id]/items` jako brutto (z VAT). Teraz WSZĘDZIE = brutto (z VAT).
- **BUG naprawiony: precyzja groszowa** — obliczenia cenowe w 4 plikach zamienione z `Number()` na `decimal.js`:
  - `src/app/api/offers/route.ts` — POST tworzenie oferty (totalPrice brutto z VAT)
  - `src/app/api/offers/[id]/items/route.ts` — PUT przeliczanie totalPrice po edycji
  - `src/app/(panel)/oferty/[id]/edycja/page.tsx` — frontend: podsumowanie + obliczenia per wiersz
  - `src/components/offers/offer-pdf.tsx` — PDF: sumy + obliczenia per wiersz

### Filtr sal po pojemności + Drag & Drop (2026-04-17):
- **Krok "Sale" w kreatorze** (`src/components/offers/step-halls.tsx`): sale o pojemności `< adultsCount + childrenCount` są wyciszone (`opacity-50`), z badge "mała" + tooltip pokazujący wymaganą liczbę gości, przeniesione na dół listy. Klikalne (nie blokujemy).
- **Drag & Drop w tabeli Excel** (`src/app/(panel)/oferty/[id]/edycja/page.tsx`): biblioteka `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`. Uchwyt `GripVertical` w kolumnie NR, drag tylko w obrębie dnia (SortableContext per dzień), po drop natychmiastowy PUT `/api/offers/[id]/items` z przeliczonym sortOrder. Blokada przy ≤14 dni. Pakiety — rozwinięcie chowa się przy drop (wymuszamy `expandedRows: new Set()`).
- Strzałka rozwijania pakietu ma `pointer-events: auto` — działa nawet gdy tbody ma `pointer-events-none` (blokada edycji).

### Fix Rules of Hooks po DnD (2026-04-17):
- `useSensors` MUSI być przed early-return `if (!fullData) return <p>` — inaczej React wykrywa zmianę kolejności hooków. Przeniesione zaraz po useState, przed useEffect.

### Skład pakietu w tabeli Excel dla ofert z kreatora (2026-04-17):
**Problem:** Pakiety dodane w kreatorze oferty (krok 4) miały pustą strzałkę rozwijania w tabeli Excel. `description` = null, więc `tryParseComposition` zwracał null. Działało tylko dla pakietów z pickera "Dodaj z menu" (centrum sterowania).
- **Zmiana A (backend):** `POST /api/offers` (`src/app/api/offers/route.ts`) — przy tworzeniu OfferItem dla pakietów rozszerzono `findUnique` o `sections → items`, budowana jest kompozycja JSON i zapisywana w `description`. Struktura: `{packageName, offerTypeName, sections: [{name, mode, count, items: string[]}]}`. Kompozycja = cały pakiet (wszystkie sekcje, wszystkie pozycje).
- **Zmiana B (frontend fallback):** `src/app/(panel)/oferty/[id]/edycja/page.tsx` — zbudowana `menuCompositionMap: Map<packageId, PackageComposition>` z `offerTypes` (SWR `/api/menu/offer-types`, już fetchowane dla pickera). Fallback: `tryParseComposition(item.description) ?? menuCompositionMap.get(item.sourceId)`. Bez migracji danych, stare oferty działają na bieżąco.
- **Zmiana C (PDF fallback):** `/api/offers/[id]/pdf` — dla pakietów bez `description` dociąga kompozycje z bazy (findMany po sourceId) i wstrzykuje do serializedItems.

### Redesign PDF oferty — "editorial boutique" (2026-04-17):
**Cel:** PDF z oceny 2/10 (surowa tabela) do 9/10 (poziom butikowego hotelu). Klient ma mieć efekt WOW.

**Stack graficzny:**
- **Czcionki:** Fraunces (display serif, 400/500/600/700 + italic) + Manrope (body sans, 400/500/600/700/800). Zainstalowane z `@expo-google-fonts/fraunces` i `@expo-google-fonts/manrope` (TTF, bo `@react-pdf/renderer` nie obsługuje WOFF). Polskie znaki OK (ą, ć, ę, ł, ń, ó, ś, ź, ż) — font files zawierają latin-ext. `Font.registerHyphenationCallback((w) => [w])` wyłącza auto-hyphenation (psuła polskie słowa).
- **Kolor:** pobierany z `Settings.primaryColor` (coral-rose `#d16470`, pochodzi z `--primary: oklch(0.637 0.137 15)` z globals.css). Jasny wariant (+40 delta) i ciemny (-55) obliczane z `adjustHex`. Fallback jeśli brak brandu: `#d16470`.
- **Gradient (bez SVG LinearGradient — nie działa w pdfjs):** symulowany przez wiele trapezów/prostokątów z interpolowanymi kolorami (`lerpHexMulti`). 80 trapezów dla okładki (diagonalny), 40 prostokątów dla totalBox (horyzontalny ciemny→coral).
- **Paleta neutralna:** INK `#1a1210`, BODY `#3f2e2a`, MUTE `#8f7872`, RULE `#ecd9d4`, CREAM `#fbf4f1`, SOFT `#f5e0dc`.

**Layout strony 1 (cover):**
- **Cover band** (200px wysokości) — coralowy gradient diagonalny + dekoracyjne koła (białe z opacity) + winieta dolna (accentDark @ 0.35) + cienki pasek akcentowy accentLight na dole. W środku: eyebrow "Propozycja · {kod}", nazwa hotelu (Fraunces 26/600) w białym, tagline "Przygotowane dla {klient}" italic. Po prawej: monogram w kwadracie z białym borderem (inicjały hotelu).
- **Title block:** eyebrow "OFERTA WYDARZENIA" z coralową kreską, tytuł `eventName` (Fraunces 42/600, letterSpacing -1), data italic accent, 4-kolumnowy meta (NUMER/WYSTAWIONO/WAŻNA DO/GOŚCIE).
- **Sekcja "i. Szczegóły":** dwie karty CREAM z lewym coralowym paskiem — Klient (imię, firma, email, telefon) i Wydarzenie (termin, dorośli, dzieci, razem).
- **Highlights strip:** 3 kolumny z ikonami SVG coral — Goście (ikona osoby), Dni (ikona kalendarza), Wartość (ikona $). Wielkie liczby Fraunces 22/700, labele uppercase + wartość + italic sub.

**Layout strony 2 (program):**
- **Sekcja "ii. Program i pozycje":** per dzień duży numer "01"/"02" coral (Fraunces 38/700, letterSpacing -1.5) + label "Dzień" + data słownie.
- **Tabela:** INK top border, kolumny # / POZYCJA / GODZ. / IL. / OS. / CENA / VAT / BRUTTO. Pakiety mają subtelnie kremowe tło + tag "PAKIET · CENA ZA OSOBĘ" coral.
- **Rozwinięcie pakietu:** lista sekcji (Fraunces italic 9/600) z badge trybu ("· W CENIE" / "· DO WYBORU X Z Y") + pozycje z myślnikami (Manrope 8.5). Read-only.
- **Total:** netto/VAT jako subtotalRow (małe, w prawo), TotalBox 84px — horyzontalny gradient (INK→accentDark→accent) + dekoracyjne koła, "Razem brutto / Do zapłaty" (italic) po lewej, kwota + PLN po prawej. **Kwota Fraunces 14/600** — celowo nie krzyczy (klient nie lubi wyeksponowanej ceny). Gradient zachowany jako "wizualny podpis".
- **Pasek ważności** (SOFT tło): ikona tarczy coral + tekst "Oferta ważna do {data}. Potwierdzenie rezerwacji następuje po podpisaniu umowy."
- **Notatki** (jeśli są): "Uwagi" tytuł italic + body.
- **Footer fixed:** dane hotelu + numer strony "01 / 02" uppercase letterSpacing.

**Kluczowe pliki:**
- `src/components/offers/offer-pdf.tsx` — cały komponent PDF (~1300 linii)
- `src/app/api/offers/[id]/pdf/route.ts` — dociąganie composition dla pakietów bez description

**Ograniczenia `@react-pdf/renderer`:**
- Brak CSS gradientów, brak cieni — wszystko przez SVG Rects/Paths
- `<LinearGradient>` w `<Defs>` nie działa (przynajmniej w pdfjs preview)
- Tylko TTF/OTF (nie WOFF) — dlatego `@expo-google-fonts`
- Brak emoji (używamy SVG ikonek)

### Poprawki do agendy FINALNEJ (2026-04-18):
**Problem:** Klient po finalizacji dzwoni z poprawkami (zmiana wyboru, dodać tort, zmienić salę). Stara logika blokowała wszystko: agenda FINALNA `isLocked=true`, widok Excel blokowany ≤14 dni. Pracownik nie miał jak zmieniać.
**Rozwiązanie:** FINALNA ma dwa stany — `isLocked=true` (zatwierdzona) lub `isLocked=false` (w trakcie poprawek). Przycisk „Wprowadź poprawki" toggluje. Podczas poprawek edytujesz harmonogram (Excel oferty) i wybory klienta (checkboxy w agendzie). Potem „Zatwierdź zmiany".
**Nowe endpointy:**
- `POST /api/agendas/[id]/unlock` — ustawia `isLocked=false` dla FINALNA
- `POST /api/agendas/[id]/relock` — ustawia `isLocked=true` dla FINALNA
- `PUT /api/agendas/[id]/selections` — pracownik zmienia wybory klienta (wymaga `isLocked=false`)
**Zmiana blokady widoku Excel:**
- Było: `isLocked = daysLeft <= 14` (blokowało pracownika)
- Jest: `isLocked = (agenda?.type === "FINALNA" && agenda?.isLocked) || isFinished`
- Blokada 14 dni zostaje TYLKO dla klienta (w jego widoku publicznym)
**Baner kuchni:** `/kuchnia/[token]` pokazuje „Zaktualizowano DD.MM.YYYY HH:MM" z `agenda.updatedAt`. Zmiany w offerItems (POST/PUT/DELETE) dotykają agendy (`touchAgendas`), żeby baner się odświeżał po edycji harmonogramu.
**Badge agendy:** nowe warianty — „Wstępna" (szare), „Zatwierdzona" (zielone success), „W trakcie poprawek" (żółte warning).
**Umiejscowienie kart:** karty „Wprowadź poprawki" / „Agenda w trakcie poprawek" są na GÓRZE strony `/agendy/[id]` (zaraz pod nagłówkiem, przed linkami), żeby pracownik nie musiał scrollować.

**Dynamiczne sekcje CHOOSE (kluczowe!):**
Gdy pracownik w trakcie poprawek DODA nowy pakiet w Excelu oferty (sekcja CHOOSE 1/5 itd.), system musi pokazać nowe checkboxy do wyboru — zarówno pracownikowi (w `/agendy/[id]`) jak i klientowi (w `/klient/[token]`).
- **Widok klienta** (`/api/public/agenda/[token]`): `packageCompositions` budowane z `offerItems` (sourceType=PACKAGE) → dociąga aktualne `Package.sections` z bazy menu. Nowe pakiety widoczne automatycznie.
- **Widok pracownika** (`/agendy/[id]`): strona fetchuje `/api/menu/offer-types` (pełne drzewo menu) i buduje `allChooseSections` z **packageIdsInSchedule** (aktualne scheduleItems), nie ze starego `offer.offerPackages`. Fallback na offerPackages tylko gdy menu jeszcze się nie załadowało.

**Scenariusze flow:**
- **Event za >14 dni** (klient nieblokowany czasowo):
  1. Pracownik: „Wprowadź poprawki" → dodaje pakiet „Desery" w Excelu
  2. Wysyła klientowi ten sam link: „zerknij, dodałam desery, wybierz ulubione"
  3. Klient widzi nowy pakiet, klika wybory 1/3, zapisuje
  4. Pracownik wraca na agendę → sekcja „Wybory klienta" pokazuje świeże dane
  5. Pracownik „Zatwierdź zmiany" → kuchnia widzi nowy pakiet + baner „Zaktualizowano..."
- **Event za ≤14 dni** (klient zablokowany czasowo, to zostaje z definicji):
  1. Pracownik: „Wprowadź poprawki" → dodaje pakiet w Excelu
  2. Klient NIE MOŻE kliknąć (blokada czasowa 14 dni dla klienta pozostaje)
  3. Pracownik sam zaznacza wybory w panelu agendy (checkboxy pod nazwą „Wybory klienta")
  4. „Zatwierdź zmiany"

**Ograniczenia (na MVP):**
- Klient nie dostaje maila/SMS-a „twoja agenda została zaktualizowana" — musisz go zawiadomić ręcznie
- Brak historii zmian (kto co zmienił) — tylko `updatedAt` + baner kuchni z datą
- Brak notyfikacji dla innych pracowników (pracownik klika sam, wie co robi)

### Nawigacja krok-po-kroku w centrum sterowania (2026-04-18):
**Problem:** pracownicy w poprzednim systemie się gubili — nie wiedzieli co zrobić dalej, czy trzeba wysłać nowy PDF, aneks, nowy link.
**Rozwiązanie:** trzy warstwy pewności:
1. **Stały pasek 7 kroków** (`StepProgressBar`) pod nagłówkiem: Szkic → Wysłana → Zaakcept. → Umowa → Podpis → Agenda → Finał. Aktualny krok pulsuje na coral.
2. **„Następny krok"** — nad panelem akcji etykieta + podświetlony przycisk (pulsowanie, ring, cień). Reszta przycisków `opacity-70`. Helper `getNextAction` oblicza co klikać wg stanu.
3. **3 bannery warunkowe** (znikają po ręcznym potwierdzeniu, nie auto):
   - Czerwony: „Zmieniłeś po wysyłce PDF" → `[Pobierz nowy PDF]` + `[Potwierdzam — wysłałem]`
   - Czerwony: „Kwota zmieniła się po podpisanej umowie" → `[Aneks wysłany]`
   - Amber: „Zmieniłeś harmonogram — zawiadom klienta" → `[Powiadomiłem]`

**Migracja:** `add_change_tracking_timestamps` — nowe pola:
- `Offer.offerSentConfirmedAt`, `Offer.lastItemsChangedAt`
- `Contract.needsAmendment`, `Contract.contractSentConfirmedAt`
- `Agenda.clientNotifiedAt`

**Nowe endpointy PATCH** (każdy zeruje jeden banner):
- `POST /api/offers/[id]/confirm-sent`
- `POST /api/contracts/[id]/resolve-amendment`
- `POST /api/agendas/[id]/notify-client`

**Automatyka:** POST/PUT/DELETE w `/api/offers/[id]/items` ustawia `lastItemsChangedAt`. PUT dodatkowo porównuje nową kwotę z poprzednią — gdy się różni i umowa podpisana, ustawia `contract.needsAmendment = true`.

### Fix sal za małych (2026-04-18):
`src/components/offers/step-halls.tsx` — przycisk „Dodaj" `disabled` gdy `tooSmall` + `cursor-not-allowed`, label zmienia się na „Za mała". Wcześniej dało się kliknąć mimo badge'a.

### Redesign PDF umowy — butikowy styl (2026-04-18):
`src/components/contracts/contract-pdf.tsx` — 1:1 ten sam system co PDF oferty:
- Cover band z coralowym gradientem (80 trapezów) + monogram hotelu
- Eyebrow „Umowa · {kod}" (zamiast „Propozycja · {kod}"), tytuł „Umowa na wydarzenie"
- Dwie karty CREAM z coralowym paskiem lewym: „Zleceniobiorca" / „Zleceniodawca"
- Highlights strip z 3 ikonami SVG: Goście / Termin / Wartość
- Tabela pozycji (sale/pokoje/pakiety) z sub-etykietami
- Gradientowy TotalBox „Wartość umowy — Do zapłaty łącznie"
- Warunki płatności jako paragrafy § 1 / § 2 / § 3
- Regulamin + warunki specjalne w tym samym stylu sekcji
- Pasek „Umowę sporządzono w dwóch egzemplarzach" + dolne podpisy
- Footer z numerem strony `01 / 02` (uppercase)

### Elastyczne ceny menu — sekcje i pozycje liczą się (2026-04-19):
**Bug krytyczny:** system liczył do oferty wyłącznie `Package.price × osoby`. Ceny na sekcjach/pozycjach były ignorowane. Przypadek „Bufety": pakiet 0 zł, sekcje (Słodki 80 zł, Mięsny 120 zł, Karmazynowy 150 zł) → w ofercie wychodziło **0 zł**.

**Zaktualizowane pliki:**
- `src/app/api/offers/route.ts` (POST) — dociąga pakiety z sekcjami/pozycjami, liczy serwerowo (nie ufa `priceSnapshot` z frontu)
- `src/components/offers/step-packages.tsx` — krok 4 kreatora: obliczona cena + label „cena pakietu / suma sekcji / z pozycji menu"
- `src/app/(panel)/oferty/[id]/edycja/page.tsx` — `confirmMenuPick` używa nowej funkcji
- `src/app/api/public/agenda/[token]/selections/route.ts` — detekcja różnicy faktycznej vs `offer.totalPrice`

**Dopiski w UI i PDF:**
- PDF oferty (pod TotalBox): „Wycena uwzględnia najwyższy wariant z menu. Po wyborze dań przez klienta kwota może zostać skorygowana w dół aneksem do umowy." — widoczne tylko gdy są pakiety
- Widok Excel (pod podsumowaniem brutto): info-box „Wycena od góry" z wyjaśnieniem mechanizmu aneksu

**Naprawa podsumowania kroku 5 kreatora (2026-04-19):** `step-summary.tsx` liczył sale/pakiety bez VAT i bez mnożnika osób. Fix: sale × 1.23, pokoje × 1.08, pakiety × osoby × 1.08 — zgodne z backendem. Zamiast „5443 zł" teraz poprawnie „~73 941 zł" brutto.

### Potwierdzenia usuwania + autor + cascade sal + Kalendarz (2026-04-19):

**A) Globalny `ConfirmDialog` + hook `useConfirm`** — `src/components/ui/confirm-dialog.tsx` + Provider w `providers.tsx`. Zastąpił natywny `confirm()` przeglądarki w: lista ofert/umów/agend, centrum sterowania, strony szczegółów umowy/agendy, menu.

**B) Widoczność autora** — migracja `add_creator_and_cascade` dodała `Contract.createdById` + relację User. Ofert/Agend już miały. UI:
- Centrum sterowania: jedna linijka „Ofertę utworzył: X · Umowę: Y · Agendę: Z" pod nagłówkiem
- Szczegóły umowy/agendy: „Utworzył: Imię Nazwisko"
- Listy: kolumna „Utworzył" (w Umowach nowo dodana)

**C) Cascade HallReservation** (CRITICAL bug z audytu) — `schema.prisma:127` zmienione na `onDelete: Cascade` + explicit `tx.hallReservation.deleteMany` w transakcji DELETE oferty (`src/app/api/offers/[id]/route.ts`). Wcześniej usunięcie oferty zostawiało osieroconą rezerwację → sala wyglądała na zajętą na zawsze.

**D) Kalendarz rezerwacji** — nowa sekcja `/kalendarz`:
- `GET /api/calendar?month=YYYY-MM` → dni z rezerwacjami + wolne sale, filtr: `offer.status = ZAAKCEPTOWANA` AND `contract.signedAt != null`
- `MonthCalendar` (`src/components/calendar/month-calendar.tsx`): widok miesięczny jak Google Calendar, zielone/czerwone komórki, chipy z nazwą sali + liczbą osób (max 2 widoczne + „+N więcej")
- Klik w dzień → Dialog ze szczegółami: klient, firma, godziny, liczba osób, link do oferty + lista wolnych sal
- Link „Kalendarz" w sidebarze (ikona `CalendarCheck2`) między „Agendy" a „Menu"
- Przycisk „Podgląd kalendarza" w kreatorze oferty (każdy krok) — modal fullscreen, nie przerywa kreatora

### Audyt systemu — 4 krytyczne luki (2026-04-19):
Przeprowadzony audyt wykrył 4 obszary wymagające uwagi. Dwa już naprawione (confirm + autor + cascade + kalendarz), dwa **czekają na decyzję**:

1. **Brak RBAC poza Settings** — DELETE/PUT ofert/umów/agend nie sprawdza roli. Zgodnie z decyzją użytkownika — zostawione (na MVP nie zajmujemy się kierownikiem).
2. **Blokada edycji po wysyłce / tryb aneksu** — użytkownik rozważa. Obecnie: banner ostrzega o zmianie, ale nic nie blokuje.
3. **Revoke + expiry tokenów** — linki klienta działają wiecznie, nie da się unieważnić. Użytkownik rozważa.
4. ✅ **Cascade HallReservation** — NAPRAWIONE.

### Pobieranie PDF — ujednolicenie etykiet (2026-04-19):
- `/oferty/[id]/edycja`: przycisk „PDF" → **„Pobierz ofertę"**. Gdy istnieje umowa — dodatkowo przycisk **„Pobierz umowę"** obok.
- `/umowy/[id]`: dwa przyciski obok siebie — **„Pobierz ofertę"** + **„Pobierz umowę"**. Wcześniej pracownik musiał wracać do zakładki Oferty, żeby pobrać PDF oferty.

### Auto-rozbicie dorośli/dzieci w kreatorze (2026-04-19):
`src/components/offers/step-event.tsx`: wpisujesz np. 80 osób łącznie, klikasz „Rozbij", wpisujesz 10 dzieci → dorośli **automatycznie** 70. Reguła: `total` (łącznie) jest prawdą, zmiana jednego pola (dorośli lub dzieci) przelicza drugie. Zmiana totalu zachowuje liczbę dzieci, reguluje dorosłych. `splitMismatch` usunięty — nie może się zdarzyć.

### Duży widoczny przycisk „Zapisz pozycje" w widoku Excel (2026-04-19):
Przeniesiony pod nagłówek (nad pasek 7 kroków), wyrównany do prawej. `size="lg"`, h-12, `shadow-elevated`, `animate-pulse-slow`. Wcześniej był mały w rogu nagłówka — pracownicy go nie zauważali.

### Wybory klienta per dzień/pakiet (2026-04-19):
**Problem krytyczny:** ten sam pakiet rozłożony na 2 dni → zaznaczenie zupy w dniu 1 powodowało automatyczne zaznaczenie tej samej w dniu 2. Wybory były łączone na poziomie „sekcja agendy".

**Rozwiązanie:** `AgendaSectionSelection` dostała pole `offerItemId` (nullable dla kompatybilności ze starymi rekordami). Unique zmieniony na `(agendaId, offerItemId, sectionId)`. Migracja zastosowana przez `prisma db push` (nie tworzy pliku migracji — środowisko dev).

**Klucz wszędzie:** `${offerItemId}:${sectionId}`. Logika:
- `POST /api/public/agenda/[token]/selections` + `PUT /api/agendas/[id]/selections` — input rozszerzony o `offerItemId`, upsert po trójce
- `klient/[token]` — `localSelections` używa `selKey(offerItemId, sectionId)`, `allChoosePairs` zawiera parę (offerItem, sekcja CHOOSE). Walidacja i zapis iterują po parach — nie sekcjach
- `kuchnia/[token]` — `selectionMap` kluczowana trójką, key w JSX `${item.id}-${sec.id}`
- `agendy/[id]` — `allChooseSections` to teraz lista par `{offerItemId, dayLabel, packageName, id, name, count, items}`. Każda karta edycji ma badge daty + nazwę pakietu, unikalny klucz
- Sekcja „Wybory klienta" (read-only) podpisuje karty `dayLabel` + `packageName`, klucz `${offerItemId}-${sectionId}` (rozwiązuje duplikaty React)
- Detekcja aneksu w `public/agenda/.../selections`: `selectionMap` kluczowana trójką, iteracja `for (const item)` używa `selectionMap.get(\`${item.id}:${sec.id}\`)` — różne wybory w różnych dniach liczone osobno

**Stare wybory** (sprzed migracji) mają `offerItemId = null` i są ignorowane w UI — klient/pracownik widzi czysty formularz.

### Wygaszanie i unieważnianie linków agendy (2026-04-20):
Zamknięcie punktu 3 audytu. Linki `/klient/[token]` i `/kuchnia/[token]` miały nieograniczony czas życia — brak expiry, brak revoke. Pola `expiresAt` i `isRevoked` były w schemacie od dnia 1, ale bez logiki. **Bez migracji.**

- **Automatyczne wygaśnięcie**: `expiresAt = eventDateFrom − lockDays` (domyślnie 14, konfigurowalne przez `settings.agendaLockDaysBefore`). Ta sama data, co blokada wyborów klienta — spójność. Dotyczy obu typów (KLIENT + KUCHNIA).
- **Nowy helper**: `src/lib/agenda-lock.ts` → `computeClientLockDate`, `isClientLocked`, stała `DEFAULT_LOCK_DAYS_BEFORE`. Refactor dwóch miejsc liczących blokadę inline: `src/app/api/public/agenda/[token]/route.ts`, `src/app/api/public/agenda/[token]/selections/route.ts`.
- **POST `/api/agendas/[id]/tokens`** — teraz dociąga `offer.eventDateFrom`, liczy `expiresAt` i zapisuje razem z tokenem.
- **Nowy endpoint `POST /api/agendas/[id]/tokens/[tokenId]/revoke`** — `isRevoked=true`, wymaga sesji (`auth()`), waliduje że token należy do tej agendy.
- **UI `/agendy/[id]`**:
  - Nowy przycisk **„Unieważnij"** (ikona `Ban`, wariant destructive) obok „Kopiuj" w obu kartach linków. `useConfirm` → toast → `mutate`.
  - Linijka „Wygasa: DD.MM.YYYY" pod inputem linku (z `token.expiresAt`).
  - Filtry `clientToken` / `kitchenToken` rozszerzone o `!t.isRevoked` — po unieważnieniu karta pokazuje przycisk „Wygeneruj link".
  - Stan `revokingTokenId` (nie booleany, bo token klienta i kuchni mają osobne operacje).
- **GET `/api/agendas/[id]`** — `tokens.select` poszerzony o `expiresAt, isRevoked` (wciąż filtruje `where: { isRevoked: false }`, ale frontend widzi pełną informację).
- **Widoki publiczne**: jeden wspólny komunikat **„Ten link nie jest już aktywny. Skontaktuj się z hotelem, aby uzyskać nowy link."** Bez rozróżniania wygasły vs unieważniony (prościej i bezpieczniej). Zmienione w `klient/[token]` i `kuchnia/[token]` (+ dodano brakujący sub-tekst „Skontaktuj się z hotelem" w kuchni).
- **Po revoke nowy token**: istniejący `POST /api/agendas/[id]/tokens` już filtrował `isRevoked: false`, więc wygenerowanie nowego działa out-of-the-box. Flow: Unieważnij → Wygeneruj link (dwa klik).

### Aneksy do umowy (2026-04-20, wpis drugi):
Zamknięcie punktu 2 audytu. Umowa jest teraz prawdziwa: przed podpisem żywa (zmienia się z Excelem), po podpisie zamrożona, zmiany = aneks PDF. Koniec pisania aneksów w Wordzie.

**Nowe modele (db push, bez formalnej migracji — drift z db push #2 wcześniej):**
- `Contract.totalAtSigning Decimal?` — kwota brutto w chwili podpisu.
- `ContractAmendment {id, contractId, number, totalBefore, totalAfter, resolvedAt, createdById, createdAt}` — unique `(contractId, number)`.
- `ContractItemSnapshot` — kopia pozycji z `OfferItem` z polami 1:1 (name, day, sortOrder, timeFrom/timeTo, hallName jako string, quantity, unitPrice, vatRate, sourceType, offerItemId). `amendmentId` nullable (null = snapshot bazowy przy podpisie).
- Relacja `User.contractAmendments`.

**Fix bug #1 (PDF umowy używał starych snapshotów):** `src/app/api/contracts/[id]/pdf/route.ts` teraz dociąga `offerItems` (gdy niepodpisana) lub `contractItemSnapshot` gdzie `amendmentId=null` (po podpisie). Komponent `src/components/contracts/contract-pdf.tsx` — interfejs przepisany na `items` + `offer.totalPrice`, tabela renderuje pozycje spójnie z ofertą (dzień, godziny, sala, cena/os dla pakietów).

**Fix bug #2 (czerwony banner „wyślij ofertę" po podpisie):** `showOfferChangedBanner` dostał warunek `&& !contract?.signedAt`. Po podpisie umowy zmiany pozycji NIE pokazują już bannera oferty — pokazują banner aneksu.

**Snapshot przy podpisie:** `PUT /api/contracts/[id]` wykrywa przejście `signedAt null → wartość` i w transakcji kopiuje `offerItems` do `ContractItemSnapshot` + zapisuje `totalAtSigning`.

**Tworzenie aneksu:** `POST /api/contracts/[id]/amendments` — wymaga podpisanej umowy. Auto-numer (ostatni+1). `totalBefore` = kwota z poprzedniego aneksu (albo `totalAtSigning` jeśli pierwszy), `totalAfter` = aktualna `offer.totalPrice`. Snapshot pozycji z `amendmentId=<nowy>`. Frontend po POST otwiera PDF aneksu w nowej karcie.

**PDF aneksu:** `GET /api/contracts/[id]/amendments/[amendmentId]/pdf` + nowy komponent `src/components/contracts/amendment-pdf.tsx` (Fraunces/Manrope, coral, 1 strona). Baseline dla diff: poprzedni aneks (jeśli istnieje) albo snapshot bazowy. Sekcje „Dodano" (czerwone, +), „Usunięto" (zielone, −), „Zmieniono" (coral, z deltą brutto). Total box: kwota przed (przekreślona) / różnica / nowa wartość.

**Helper `src/lib/amendment-diff.ts`:** `computeAmendmentDiff(baseline, current)` porównuje po `offerItemId`, wykrywa dodane/usunięte/zmienione (nazwa, ilość, cena, VAT, godziny, sala). `itemBrutto(item, personCount)` — spójne z regułą `PACKAGE = × osoby`.

**Endpoint `resolve-amendment` przepisany:** zamiast ustawiać `needsAmendment=false` bezpośrednio, oznacza ostatni nierozwiązany aneks `resolvedAt=now()`. Dopiero gdy wszystkie są rozwiązane → `needsAmendment=false` (banner znika).

**UI centrum sterowania (`edycja/page.tsx`):**
- Żółty banner „Zmieniłeś pozycje po podpisaniu umowy — potrzebny aneks" z przyciskiem **[Utwórz aneks]** (ikona FileText).
- Nowa sekcja „Aneksy do umowy" w panelu akcji: lista z numerem, datą, deltą (czerwona/zielona), badge „Do wysyłki"/„Wysłany", przyciski [Pobierz PDF] + [Wysłany].
- `FullData.contract` poszerzony o `amendments[]` + `totalAtSigning`.
- Funkcja `createAmendment()` — POST + toast + `window.open` PDF + `mutateFull()`.

**Weryfikacja 3× (z planu):**
1. PDF umowy przed podpisem → offerItems (żywy). Po podpisie → snapshot bazowy (zamrożony). ✓
2. Banner czerwony „wyślij ofertę" nie pokazuje się po podpisie. ✓
3. Aneksy się kumulują: `number` auto-inc przez `(contractId, number)` unique, `totalBefore` bierzemy z ostatniego aneksu lub `totalAtSigning` dla pierwszego. ✓

**Co nie zmieniło się:** edycja liczby osób (osobne zadanie), blokada 14 dni, wygaszanie tokenów, agenda. Model `OfferItem` bez zmian.

### UX klienta + panel powiadomień (2026-04-20, wpis trzeci):
Trzy funkcje UX jeden pakiet.

**1. Baner „ostatnia aktualizacja" na widoku klienta** — `src/app/klient/[token]/page.tsx`. Amber Card z datą + godziną `agenda.updatedAt` + instrukcja ręcznego odświeżania (F5, pull-to-refresh na mobile). Bez auto-refresh/WebSocket. Używa już istniejące `lastModifiedAt` w response publicznym.

**2. Wiadomości od klienta (append-only):**
- Nowe modele: `ClientMessage` (id, agendaId, content, createdAt, responseStatus, responseReason, responsePhone, respondedById/respondedAt) + enum `ClientMessageStatus` (ACCEPTED | REJECTED | CALL_BACK). Cascade delete z Agenda.
- Nowy enum value: `NotificationType += WIADOMOSC_OD_KLIENTA`.
- Endpoint publiczny `POST /api/public/agenda/[token]/messages` — walidacja tokenu (isRevoked/expiresAt), min 3 / max 2000 znaków, soft limit 50 wiadomości per agenda (429). Tworzy też `Notification`.
- Endpoint publiczny `GET /api/public/agenda/[token]/messages` — klient widzi historię + odpowiedzi.
- Endpoint pracownika `PATCH /api/client-messages/[id]/respond` — status + (reason dla REJECTED / phone dla CALL_BACK) + respondedBy z sesji.
- Endpoint `GET /api/agendas/[id]/messages` (autoryzowany) dla panelu.
- UI klienta: Card „Wiadomości do hotelu" — lista z data, odpowiedzi z ikoną kolorową (check/X/phone) + imię pracownika, textarea + przycisk Wyślij.
- UI panelu agendy: sekcja `ClientMessagesSection` pod statusami FINALNA, przed harmonogramem. Trzy akcje per wiadomość: [Zaakceptuj] (direct), [Odrzuć] (dialog z textarea powód), [Proszę o kontakt] (dialog z telefonem). Po odpowiedzi wiadomość pokazuje box z kolorowym statusem i imieniem pracownika.

**3. Panel powiadomień `/powiadomienia`:**
- Nowa strona z tabelą: data, typ (z ikoną i kolorem per `NotificationType`), klient (z `metadata.clientName`), message, status przeczytane/nowe, link „Otwórz" do oferty/agendy (dla `WIADOMOSC_OD_KLIENTA` → agenda, inne → oferta).
- Filtry: klient (fuzzy po `metadata.clientName` + title + message), NIP, PESEL (dociąga przez `Contract.clientNip`/`clientPesel` + `metadata.offerId`), typ, zakres dat.
- Przycisk „Oznacz wszystkie jako przeczytane" → `POST /api/notifications/mark-all-read` (createMany + skipDuplicates).
- Rozszerzony endpoint `GET /api/notifications` — query params `search`, `nip`, `pesel`, `type`, `from`, `to`, `limit`, `offset`. Filtrowanie po metadata w aplikacji (JSON field).
- Dzwonek topbar: skrócony do 5 najnowszych + link „Zobacz wszystkie →" prowadzący do `/powiadomienia`.
- Sidebar: nowy link „Powiadomienia" (ikona Bell) między „Kalendarz" i „Menu".

**Ryzyka zabezpieczone:** brak DELETE/PUT wiadomości publicznie (append-only), limit 50/agenda, walidacja tokenu identyczna jak selections.
