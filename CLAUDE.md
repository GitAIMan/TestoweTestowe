# SaaS Hotele — Dokumentacja Projektu

> ⏭️ **NASTĘPNA SESJA: gdy użytkownik powie „Zapoznaj się z projektem" — po przeczytaniu tego pliku otwórz `START_TUTAJ_WDROZENIE_RAILWAY.md` i zacznij od jego Punktu 0 (zwiad przed wdrożeniem na Railway).**
>
> **Historia zmian i log implementacji** — patrz `CHANGELOG.md` (nie jest auto-ładowany).
> Ten plik zawiera tylko trwałe zasady, architekturę i wzorce. Trzymaj go zwięzłym.

---

## Kontekst projektu

### Kim jest twórca
- Początkujący developer (vibe coding), nie pisze kodu samodzielnie — Claude pisze cały kod, użytkownik wydaje polecenia i nadzoruje
- Przez 2 lata współpracował przy budowie podobnego systemu dla hotelu — zna domenę biznesową od środka
- Efekt poprzedniego systemu: pracownica robiła 3 oferty dziennie → po wdrożeniu 11
- Zaczyna własny, konkurencyjny projekt od zera (rozstał się z byłym wspólnikiem)

### Strategia
- **SaaS-Matka**: jedna baza kodu → instancje per hotel (kopiuj-wklej + konfiguracja)
- Główna przewaga: **prostota i intuicyjność UX**
- Cel MVP: działające demo wszystkich 4 etapów — narzędzie sprzedażowe do pokazania hotelom

### Błędy poprzedniego projektu — których MUSIMY uniknąć
1. **BRAK PLANOWANIA ARCHITEKTURY** przed kodowaniem
2. **NIEDOSZACOWANIE CZASU**
3. **BRAK AUDYTU DOMENOWEGO** — wymagania wychodziły w trakcie
4. **NIESTABILNY SCHEMAT BAZY**

---

## Co budujemy

System SaaS webowy dla hoteli — narzędzie do zarządzania ofertami eventowymi i agendami.
MVP obejmuje WSZYSTKIE 4 etapy + zarządzanie pakietami/menu.

---

## Stack technologiczny

- **Frontend + Backend**: Next.js (App Router, React, SSR, API routes)
- **Baza**: PostgreSQL + Prisma
- **Język**: TypeScript
- **Styling**: Tailwind v4 + shadcn/ui
- **Auth**: NextAuth v5 (CredentialsProvider, JWT, RBAC)
- **PDF**: `@react-pdf/renderer` (TTF only — `@expo-google-fonts`)
- **Waluta**: PLN · **Język UI**: PL
- **Emailing**: brak na MVP (ręcznie kopiuj-wklej linki/PDF)

### Deployment
Lokalnie → GitHub → Railway (staging) → test → Railway (main/produkcja)

---

## Użytkownicy systemu (role)

- **Pracownik sprzedaży/marketingu** — mail+hasło; tworzy oferty/umowy/agendy, zarządza menu
- **Kierownik** — mail+hasło; to co pracownik + podsumowania + `PUT /api/settings`
- **Kuchnia** — link z tokenem (bez logowania); read-only agendy finalnej
- **Klient hotelowy** — link z tokenem (bez logowania); wybiera pozycje w agendzie wstępnej; blokada 14 dni przed wydarzeniem

---

## Dane bazowe (admin hotelu konfiguruje raz)

### Piramida menu
```
Typ oferty (Weselna, Konferencyjna, …)
  └── Pakiet (np. "Dania Główne")
        └── Sekcja (np. "Zupy", "Mięsa") — tryb: ALL_INCLUDED lub CHOOSE_X_FROM_Y
              └── Pozycja menu (np. "Rosół")
```

Pakiety mają cenę źródłową (różne nawet przy tych samych nazwach między typami ofert).
VAT per poziom (Package/Section/MenuItem pole `vatRate Int?`): 8% dla żywności, 23% dla usług.

### Pokoje i Sale
- Pokoje: typy i ceny
- Sale: pojemność + cena, dostępność per data (real-time check w kreatorze)

---

## Główny flow — 4 etapy

### ETAP 1 — Oferta (5 kroków kreatora)
Klient → Wydarzenie → Sale → Pakiety → Podsumowanie. **Pokoje NIE są w kreatorze** (do dodania później). „Zapisz szkic" → redirect na `/oferty/[id]/edycja` (centrum sterowania).

### ETAP 2 — Umowa
Z zaakceptowanej oferty (`/umowy/nowa/[offerId]`): pre-fill + dane klienta (NIP/PESEL, adres) + warunki płatności (zaliczka z szybkimi przyciskami „7/14/21/30 dni przed").

### ETAP 3 — Agenda wstępna
Tworzy się z centrum sterowania oferty **jednym kliknięciem** (nie ma osobnego kreatora bloków — harmonogram budowany w tabeli Excel oferty). Link klienta pojawia się od razu. Klient wybiera pozycje wg trybu sekcji. Blokada klienta 14 dni przed wydarzeniem. Każda zmiana → powiadomienie.

### ETAP 4 — Agenda FINALNA + dystrybucja
Finalizacja kopiuje wybory do agendy FINALNA. Link do kuchni read-only. Podsumowania w panelu (tylko KIEROWNIK).

**Agenda FINALNA — dwa stany:**
- `isLocked=true` — zatwierdzona (kuchnia widzi pewne dane)
- `isLocked=false` — pracownik w trakcie poprawek (edytuje Excel + wybory klienta w agendzie)

Toggle: `POST /api/agendas/[id]/unlock` ↔ `POST /api/agendas/[id]/relock`.

---

## SaaS-Matka — model deploymentu

**NIE multi-tenant.** Model: **1 instancja = 1 hotel = 1 folder = 1 baza = 1 deployment Railway**.
- W bazie ZAWSZE jeden hotel
- Brak `hotelId` na modelach
- `Settings` = konfiguracja tego hotelu (logo, kolory, dane). Branding z panelu, nie z kodu
- Żadnych hardkodowanych wartości specyficznych

---

## Krytyczne wzorce architektoniczne

### 1. Model `OfferItem` — zunifikowane pozycje oferty
Pola: `offerId, day, date, sortOrder, name, description, timeFrom, timeTo, hallId, quantity, unitPrice, vatRate, sourceType, sourceId`.
`sourceType`: `"HALL" | "ROOM" | "PACKAGE" | "CUSTOM"`. Dla `PACKAGE` → `description` = JSON kompozycji (sekcje, pozycje, tryb). Generowane automatycznie przy zapisie oferty.

### 2. Ceny — brutto z VAT, decimal.js, za osobę dla menu
- **`totalPrice` w bazie = ZAWSZE brutto (z VAT)**. Nie mieszać netto/brutto.
- Obliczenia przez `decimal.js`, nigdy `Number()`.
- Wzory:
  - `sourceType === "PACKAGE"` → `unitPrice × quantity × personCount × (1 + VAT/100)`
  - `HALL / ROOM / CUSTOM` → `unitPrice × quantity × (1 + VAT/100)`
  - `personCount = adultsCount + childrenCount` (z `Offer`)

### 3. Wycena pakietów „od góry" (`src/lib/package-pricing.ts`)
Centralna funkcja `calculatePackagePrice`. Hierarchia:
1. Pakiet > 0 → cena pakietu
2. Pakiet = 0, sekcja > 0 → cena sekcji
3. Pakiet = 0, sekcja = 0, pozycje > 0:
   - `ALL_INCLUDED` → suma wszystkich pozycji
   - `CHOOSE_X_FROM_Y` → suma **X najdroższych** (pesymistycznie)

Oferta = najdroższy wariant. Po wyborze klienta `calculatePackagePriceFromClientSelection` porównuje z `offer.totalPrice` i gdy różnica + umowa podpisana → `contract.needsAmendment = true` → banner aneksu.

### 4. Wybory klienta — klucz `${offerItemId}:${sectionId}`
`AgendaSectionSelection` ma `offerItemId` (nullable dla starych). Unique: `(agendaId, offerItemId, sectionId)`. Ten sam pakiet na 2 dniach → niezależne wybory. Stare rekordy z `offerItemId=null` są ignorowane w UI.

### 5. Blokada widoku Excel
`isLocked = (agenda?.type === "FINALNA" && agenda?.isLocked) || isFinished`. Blokada 14 dni dotyczy **tylko klienta** (w publicznym widoku). Pracownik może edytować zawsze, dopóki FINALNA nie jest `isLocked=true`.

### 6. Cascade DELETE oferty
`HallReservation.onDelete: Cascade` + explicit `tx.hallReservation.deleteMany` w transakcji DELETE. Usuwanie umowy blokowane gdy istnieje agenda („najpierw usuń agendę"). Hard delete wszędzie.

### 7. RBAC
`PUT /api/settings` — **tylko KIEROWNIK** (branding = decyzja biznesowa). DELETE/PUT ofert/umów/agend na MVP **nie sprawdza roli** (świadoma decyzja).

### 8a. Umowa: żywa przed podpisem, zamrożona po (+ aneksy)
Przed `signedAt`: PDF umowy dociąga `offerItems` — zmienia się z Excelem. W chwili `signedAt = now()`: snapshot pozycji → `ContractItemSnapshot` (amendmentId=null) + `totalAtSigning = offer.totalPrice`. Po podpisie PDF umowy czyta snapshot.
Zmiana pozycji po podpisie → `contract.needsAmendment = true` → żółty banner „Utwórz aneks". `POST /api/contracts/[id]/amendments` tworzy `ContractAmendment` + snapshot z `amendmentId=<nowy>`. PDF aneksu (`/amendments/[amendmentId]/pdf`) = diff vs poprzedni snapshot. `resolve-amendment` oznacza najnowszy aneks `resolvedAt=now()`; gdy wszystkie rozwiązane → `needsAmendment=false`.

### 8. Bannery „niedomknięte akcje" w centrum sterowania
Znikają po ręcznym potwierdzeniu, nie auto:
- **Umowa utworzona** (niebieski) → `POST /api/contracts/[id]/confirm-sent` (wysłano PDF klientowi).
- **Zmiana po wysyłce PDF oferty** (czerwony, tylko gdy umowa NIE podpisana) → `POST /api/offers/[id]/confirm-sent`.
- **Zmiany po podpisie umowy → utwórz aneks** (żółty) → `POST /api/contracts/[id]/amendments` + auto otwarcie PDF. Znika gdy wszystkie aneksy `resolvedAt != null`.
- **Zmiana harmonogramu w agendzie** (amber) → `POST /api/agendas/[id]/notify-client`.
- **Nowa wiadomość od klienta** (niebieski, w widoku Excel) → link do `/agendy/[id]` (sekcja „Wiadomości od klienta"). Znika gdy wszystkie wiadomości mają `responseStatus`.

Pola tracking: `Offer.offerSentConfirmedAt`, `Offer.lastItemsChangedAt`, `Contract.needsAmendment`, `Contract.contractSentConfirmedAt`, `Agenda.clientNotifiedAt`.

### 9. Wiadomości klient ↔ hotel (append-only)
Model `ClientMessage` (id, agendaId, content, createdAt + responseStatus/Reason/Phone/respondedBy/respondedAt). Enum `ClientMessageStatus`: `ACCEPTED | REJECTED | CALL_BACK`. Cascade delete z Agenda.
- Publiczny `POST /api/public/agenda/[token]/messages` (min 3 / max 2000 znaków, soft limit 50/agenda). Tworzy `Notification` typu `WIADOMOSC_OD_KLIENTA`.
- Publiczny `GET /api/public/agenda/[token]/messages` — klient widzi historię + odpowiedzi.
- Autoryzowany `PATCH /api/client-messages/[id]/respond` — status + reason (dla REJECTED) / phone (dla CALL_BACK).
- **Brak DELETE/PUT** — append-only z definicji.

### 10. Powiadomienia — pełny panel z filtrami
`/powiadomienia` (link w sidebarze + w dzwonku „Zobacz wszystkie →"). Filtry: klient (fuzzy po `metadata.clientName`/title/message), NIP, PESEL (przez join `Contract.clientNip/Pesel` + `metadata.offerId`), typ, zakres dat. `POST /api/notifications/mark-all-read`. Dzwonek w topbar: quick-view 5 najnowszych.

Typy: `KLIENT_ZMIANA_WYBORU`, `WIADOMOSC_OD_KLIENTA`, `OFERTA_ZAAKCEPTOWANA`, `OFERTA_ODRZUCONA`, `OFERTA_WYGASLA`.

### 11. Walidacja pól formularzy — na żywo, nie dopiero na backendzie
Helper `src/lib/validation.ts` → `isValidEmail(value)` (pusty = dozwolony bo opcjonalny; regex spójny z zod `.email()` na backendzie). Reużywać w nowych formularzach zamiast pisać od zera. Wzorzec błędu inline: `aria-invalid` na `<Input>` (komponent `src/components/ui/input.tsx` maluje czerwoną obwódkę) + czerwony `<p className="text-xs text-destructive">` pod polem. W kreatorach blokada przejścia w funkcji `validateStep()` (toast). Zasada: błędne dane łap jak najwcześniej (w trakcie wpisywania / przy „Dalej"), nie dopiero przy zapisie na końcu.

### 12. Kalendarz w kroku 2 oferty — tylko podgląd zajętości
Mini-kalendarz w `step-event.tsx` NIE wybiera dat (świadoma decyzja UX — wcześniej był bug bez odznaczania). Daty wpisuje się wyłącznie w polach „Data od / Data do". Kalendarz: czerwone = zajęte (klik → pop-up szczegółów sal, read-only), wpisany zakres podświetlony przez `inRange`. Wolne dni nieklikalne (`disabled`).

---

## Autentykacja i bezpieczeństwo

- Logowanie: mail + hasło (pracownik, kierownik)
- NextAuth rozdzielony: `auth.config.ts` (Edge-safe, bez Prisma, do middleware) + `auth.ts` (z Prisma, do API)
- Tokeny klienta/kuchni: `expiresAt = eventDateFrom − 14 dni` (helper `src/lib/agenda-lock.ts`), ręczne unieważnianie przyciskiem „Unieważnij" w `/agendy/[id]` → `POST /api/agendas/[id]/tokens/[tokenId]/revoke`. Po revoke nowy link na osobne kliknięcie „Wygeneruj link".

---

## Wymagania techniczne

### Precyzja finansowa
- `decimal.js` wszędzie. Błędy groszowe niedopuszczalne.

### Dostępność sal
- Real-time check w kreatorze (filtr po pojemności: sale za małe wyciszone + `disabled`).
- Kalendarz rezerwacji `/kalendarz`: `GET /api/calendar?month=YYYY-MM`, filtr `status=ZAAKCEPTOWANA AND contract.signedAt != null`.

### UX — PRIORYTET NADRZĘDNY
- Każdy ekran: minimum elementów, jasna ścieżka co dalej
- Prostota > funkcjonalność
- Stały pasek kroków + podświetlony „Następny krok" w centrum sterowania (8 kroków — ostatni rozbudowany o aneksy po podpisie)
- Test: „czy osoba, która nigdy nie widziała systemu, zrozumie co robić?"
- Globalny `ConfirmDialog` (hook `useConfirm`) zamiast natywnego `confirm()`
- Enter w polu „Nazwa" w widoku Excel = zapisuje wszystkie pozycje
- W widoku klienta agendy: amber baner „Ostatnia aktualizacja DD.MM.YYYY HH:MM" + instrukcja F5/pull-to-refresh. Bez auto-refresh
- Mini-kalendarz inline w kreatorze (krok „Dane wydarzenia"): czerwone zajęte dni + klik w zajęty dzień → pop-up ze szczegółami zajętych/wolnych sal + przycisk „Wybierz ten dzień" (świadoma decyzja). Klik w wolny dzień → etykiety OD/DO, 2-klikowy zakres

---

## Outputy systemu

| Output | Format | Odbiorca |
|--------|--------|----------|
| Oferta | PDF (butikowy: Fraunces + Manrope, coral gradient) | Klient |
| Umowa | PDF (ten sam system co oferta) | Klient |
| Agenda wstępna | Interaktywny link webowy | Klient |
| Agenda finalna | Link webowy read-only | Kuchnia |
| Podsumowanie | Widok w panelu | Kierownik |

---

## Status implementacji

**MVP KOMPLETNE** — wszystkie 6 faz ukończone (Szkielet, CRUD, Oferty, Umowy, Agendy, Finalizacja, Polish). 52+ route'y. Szczegółowa historia zmian w `CHANGELOG.md`.

### Konfiguracja lokalna
- PostgreSQL lokalnie, baza `saas_hotele`, hasło `MBT`
- `npm run db:migrate` + `npx tsx prisma/seed.ts`
- `npm run dev` → `http://localhost:3000`

### Narzędzia bazodanowe
- `npx tsx prisma/clear.ts` — czyści bazę (zostawia użytkowników)
- `npx tsx prisma/seed.ts` — wgrywa dane testowe

### Loginy testowe
- `anna@hotel.pl` / `test1234` — PRACOWNIK
- `kierownik@hotel.pl` / `test1234` — KIEROWNIK

### Migracje (kolejność)
`add_offer_items` → `add_hall_and_timeto_to_offer_items` → `add_vat_rate_to_menu_models` → `add_change_tracking_timestamps` → `add_creator_and_cascade`.
Od 2026-04-20: dalsze zmiany schematu przez `prisma db push` (dev) bez formalnych migracji — `AgendaToken.expiresAt/isRevoked` już istniały, `Contract.totalAtSigning` + `ContractAmendment` + `ContractItemSnapshot` + `ClientMessage` + `ClientMessageStatus` + `NotificationType.WIADOMOSC_OD_KLIENTA` dołożone przez `db push`. `Offer.statusBeforeRejection` (2026-06-21) — pamięta status sprzed odrzucenia, do przywracania ofert.

### Git
- Repo: https://github.com/GitAIMan/TestoweTestowe
- `main` — produkcja, `staging` — praca (tu).
- **NIGDY commit/push bez zgody użytkownika.**

---

## Rzeczy do doprecyzowania później
- Szczegóły umowy, zaliczki, logika blokowania sal (per hotel, konfigurowalna)
- Edycja oferty po wysyłce (per hotel)
- Własne propozycje klienta w agendzie (pole tekstowe)
- Automatyzacja maili, wygasanie ofert
- Multi-language / multi-currency
- Decyzje otwarte z audytu: RBAC poza Settings. (Tokeny: ✅ 2026-04-20. Aneksy: ✅ 2026-04-20 — punkt 2 zamknięty.)

---

## Zasady pracy

- Claude pisze CAŁY kod, użytkownik wydaje polecenia i nadzoruje
- Planowanie architektury PRZED kodem
- Każda decyzja: „czy to zadziała, gdy skopiuję dla innego hotelu?"
- **Po każdej istotnej zmianie**: dopisz krótki wpis w `CHANGELOG.md` (z datą). W `CLAUDE.md` aktualizuj tylko jeśli zmienia się trwały wzorzec/zasada.
