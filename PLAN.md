# PLAN MVP — SaaS Hotele

## Kontekst

System webowy dla hoteli — zarządzanie ofertami eventowymi i agendami. Model SaaS-Matka: **1 instancja = 1 hotel = 1 baza = 1 deployment**. Nowy hotel = kopiuj-wklej + zmień konfigurację. NIE multi-tenant. MVP-demo. Główna przewaga: prostota UX. Stack: Next.js + PostgreSQL + Prisma + TypeScript. Deployment: Railway.

---

## STATUS IMPLEMENTACJI

| Faza | Co | Status |
|------|----|--------|
| 0 | Szkielet: Next.js + Prisma + schema + seed + shadcn + layout + auth | UKOŃCZONA |
| 1 | Dane bazowe: CRUD pokoi, sal, hierarchii menu, ustawienia hotelu | UKOŃCZONA |
| 2 | Oferty: kreator, pickery, podsumowanie, statusy, PDF | UKOŃCZONA |
| 3 | Umowy: tworzenie z oferty, formularz, PDF | UKOŃCZONA |
| 4 | Agendy: kreator, bloki, tokeny, widok klienta, wybory, blokada, powiadomienia | UKOŃCZONA |
| 5 | Finalizacja: agenda finalna, widok kuchni, podsumowania kierownika | UKOŃCZONA |
| 6 | Polish: tooltips, onboarding, error handling, responsywność | UKOŃCZONA |

---

## FAZA 0: Szkielet — UKOŃCZONA (2026-03-31)

### Co zrobione:
- Next.js z TypeScript + Tailwind v4 + App Router
- Prisma 7 + PostgreSQL (schemat kompletny: 17 modeli, enumy)
- Prisma client wygenerowany (adapter-pg dla Prisma 7)
- shadcn/ui zainicjalizowany (button, card, input, label, sonner)
- NextAuth v5 (CredentialsProvider, JWT, RBAC middleware)
- Strona logowania (`/login`)
- Layout panelu z sidebar (nawigacja po wszystkich sekcjach)
- Dashboard (placeholder z 4 kartami statystyk)
- Providers (SessionProvider + Toaster)
- Middleware auth guard (publiczne: /login, /klient, /kuchnia, /api/auth, /api/public)
- Seed danych testowych (ustawienia hotelu, 2 użytkowników, 4 pokoje, 5 sal, hierarchia menu)
- Build przechodzi bez błędów

### Loginy testowe:
- anna@hotel.pl / test1234 (PRACOWNIK)
- kierownik@hotel.pl / test1234 (KIEROWNIK)

### WAŻNE — uwagi techniczne:
- Prisma 7 wymaga adaptera `PrismaPg` — import z `@/generated/prisma/client`
- Seed uruchamiany przez `npx tsx prisma/seed.ts`
- **Baza nie jest jeszcze zmigrowana** (potrzebny PostgreSQL lokalnie lub na Railway)
- Brak `hotelId` na modelach — single-tenant (1 instancja = 1 hotel)

---

## FAZA 1: CRUD danych bazowych — UKOŃCZONA (2026-03-31)

### Co zrobione:
- shadcn/ui: dodano table, dialog, select, textarea, badge, tabs, separator, dropdown-menu
- **Pokoje** (`/pokoje`): tabela, dodawanie/edycja (modal), dezaktywacja, API routes
- **Sale** (`/sale`): tabela, dodawanie/edycja (modal), dezaktywacja, sprawdzanie dostępności po dacie, API routes
- **Hierarchia menu** (`/menu`): 4-poziomowy akordeon (OfferType → Package → Section → MenuItem), CRUD na każdym poziomie, tryby sekcji (ALL_INCLUDED / CHOOSE_X_FROM_Y), ceny opcjonalne, API routes (8 endpointów)
- **Ustawienia** (`/ustawienia`): formularz z sekcjami (dane, kontakt, adres, branding, konfiguracja, regulamin, stopka), tylko KIEROWNIK, API routes
- Build przechodzi bez błędów

### Pliki utworzone:

### 1.1 Pokoje (`/pokoje`)
- Lista pokoi z tabelą (nazwa, typ, cena/noc, status aktywny/nieaktywny)
- Modal/formularz: dodawanie nowego pokoju
- Edycja inline lub modal
- Dezaktywacja (soft delete: `isActive = false`)
- API: `GET/POST /api/rooms`, `PUT/DELETE /api/rooms/[id]`

### 1.2 Sale (`/sale`)
- Lista sal (nazwa, pojemność, cena/dzień, status)
- Kalendarz dostępności — wybranie daty → system pokazuje wolne/zajęte sale
- Dodawanie/edycja/dezaktywacja
- API: `GET/POST /api/halls`, `PUT/DELETE /api/halls/[id]`, `GET /api/halls/availability?dateFrom=X&dateTo=Y`

### 1.3 Hierarchia menu (`/menu`)
- Widok drzewa/akordeon: **Typy ofert → Pakiety → Sekcje → Pozycje menu**
- CRUD na każdym poziomie (dodaj/edytuj/usuń)
- Ustawianie trybu sekcji: `ALL_INCLUDED` lub `CHOOSE_X_FROM_Y` + `selectionCount`
- Cena na każdym poziomie (opcjonalna — null = w cenie)
- Sortowanie drag & drop (lub strzałki góra/dół)
- API: CRUD endpointy per poziom:
  - `GET/POST /api/menu/offer-types`, `PUT/DELETE /api/menu/offer-types/[id]`
  - `GET/POST /api/menu/packages`, `PUT/DELETE /api/menu/packages/[id]`
  - `GET/POST /api/menu/sections`, `PUT/DELETE /api/menu/sections/[id]`
  - `GET/POST /api/menu/items`, `PUT/DELETE /api/menu/items/[id]`

### 1.4 Ustawienia hotelu (`/ustawienia`) — tylko KIEROWNIK
- Formularz: nazwa hotelu, logo (upload), kolory (primary/secondary), dane kontaktowe, NIP, adres, regulamin, stopka
- API: `GET/PUT /api/settings`

---

## FAZA 2: Oferty — UKOŃCZONA (2026-03-31)

### Co zrobione:
- Kreator oferty: 6-krokowy wizard (klient, wydarzenie, sale z dostępnością, pokoje, pakiety LEGO, podsumowanie)
- Zapis oferty: jeden POST na końcu, transakcja Prisma (oferta + klocki + rezerwacje sal)
- Lista ofert: tabela z filtrami (status, wyszukiwanie po kliencie)
- Szczegóły oferty: podgląd danych + klocków, zmiana statusu (WYSLANA/ZAAKCEPTOWANA/ODRZUCONA)
- PDF oferty: @react-pdf/renderer, generowany po stronie serwera
- Snapshot cen: ceny kopiowane z Room/Hall/Package w momencie tworzenia oferty
- totalPrice obliczane decimal.js (nie float!)
- Build przechodzi bez błędów

### Pliki (Faza 2):

### 2.1 Kreator oferty (`/oferty/nowa`) — multi-step wizard
**Step 1 — Dane klienta:**
- Imię i nazwisko, email, telefon, firma (opcjonalnie)

**Step 2 — Dane wydarzenia:**
- Data od / do
- Nazwa wydarzenia (opcjonalnie)
- Typ wydarzenia (informacyjny — konferencja, wesele, event firmowy)
- Liczba dorosłych, liczba dzieci

**Step 3 — Sale:**
- Picker z real-time dostępnością (na podstawie wybranych dat)
- Wybór sali → `POST /api/offers/[id]/halls` → tworzy `OfferHall` + `HallReservation`
- SNAPSHOT ceny: `pricePerDay` kopiowany z `Hall.pricePerDay` w momencie dodania

**Step 4 — Pokoje:**
- Lista dostępnych typów pokoi z cenami
- Wybór: typ, ilość, liczba nocy
- SNAPSHOT ceny: `pricePerNight` kopiowany z `Room.pricePerNight`

**Step 5 — Pakiety (LEGO):**
- Drzewko: Typy ofert → Pakiety → podgląd sekcji/pozycji
- Pracownik może dodać pakiety z RÓŻNYCH typów ofert (mieszanie)
- SNAPSHOT ceny pakietu
- Klocki = `OfferPackage`

**Step 6 — Podsumowanie:**
- Zestawienie: klient, wydarzenie, sale, pokoje, pakiety
- Kalkulacja `totalPrice` (Decimal! — nie float)
- Notatki (opcjonalnie)
- Przycisk "Zapisz ofertę" → `POST /api/offers`

### 2.2 Lista ofert (`/oferty`)
- Tabela: nazwa klienta, data wydarzenia, status, kwota, data utworzenia
- Filtry: status, zakres dat, wyszukiwanie po nazwie klienta
- Status badge kolorowy (ROBOCZA=szary, WYSŁANA=niebieski, ZAAKCEPTOWANA=zielony, ODRZUCONA=czerwony, WYGASŁA=żółty)
- API: `GET /api/offers`

### 2.3 Szczegóły oferty (`/oferty/[id]`)
- Podgląd wszystkich danych + klocków (pokoje, sale, pakiety)
- Przyciski akcji:
  - "Zmień status" (dropdown: WYSŁANA, ZAAKCEPTOWANA, ODRZUCONA)
  - "Pobierz PDF"
  - "Utwórz umowę" (tylko gdy ZAAKCEPTOWANA)
  - "Utwórz agendę" (tylko gdy ZAAKCEPTOWANA)
- API: `GET /api/offers/[id]`, `PATCH /api/offers/[id]/status`

### 2.4 PDF oferty
- Prosty, czytelny dokument z `@react-pdf/renderer`
- Zawiera: dane hotelu (z Settings), dane klienta, wydarzenie, sale, pokoje, pakiety z pozycjami, cena łączna
- API: `GET /api/offers/[id]/pdf`

---

## FAZA 3: Umowy — UKOŃCZONA (2026-03-31)

### Co zrobione:
- Tworzenie umowy z zaakceptowanej oferty (`/umowy/nowa/[offerId]`)
- Pre-fill danych klienta z oferty
- Formularz: dane klienta (adres, NIP, PESEL) + warunki (zaliczka, termin, płatności, specjalne)
- Lista umów (`/umowy`) z tabelą i statusem podpisana/niepodpisana
- Szczegóły umowy (`/umowy/[id]`) z przyciskiem "Oznacz jako podpisaną" + PDF
- PDF umowy (@react-pdf/renderer) — strony umowy, przedmiot, warunki, podpisy
- Przycisk "Utwórz umowę" w szczegółach oferty aktywny (link do `/umowy/nowa/[offerId]`)
- Build przechodzi bez błędów

### 3.1 Tworzenie umowy (`/umowy`)
- Tworzenie z zaakceptowanej oferty
- Formularz: dane klienta (pre-filled z oferty) + dodatkowe:
  - Pełne dane (adres, NIP/PESEL)
  - Zaliczka (kwota + termin)
  - Warunki płatności
  - Warunki specjalne
- API: `POST /api/contracts`, `GET/PUT /api/contracts/[id]`

### 3.2 PDF umowy
- `@react-pdf/renderer`
- Dane hotelu + dane klienta + warunki + kwoty
- API: `GET /api/contracts/[id]/pdf`

---

## FAZA 4: Agendy — UKOŃCZONA (2026-03-31)

### Co zrobione:
- Kreator agendy `/agendy/nowa/[offerId]` — tworzenie bloków czasowych, przypisanie pakietów i wyposażenia, generowanie linku klienta
- Lista agend `/agendy` — tabela z typem (wstępna/finalna), statusem, klientem
- Szczegóły agendy `/agendy/[id]` — harmonogram, linki (klient/kuchnia), wybory klienta
- Widok klienta `/klient/[token]` — publiczny (bez logowania), harmonogram, sekcje ALL_INCLUDED (statyczne), CHOOSE_X_FROM_Y (checkboxy z walidacją), blokada 14 dni, branding hotelu
- API: agendas CRUD, blocks CRUD, tokens, public/agenda GET/PUT selections, notifications GET + read
- Powiadomienia: dzwonek w topbar z badge (nieprzeczytane), dropdown z listą, auto-refresh co 30s
- Notyfikacja KLIENT_ZMIANA_WYBORU tworzona przy każdym zapisie wyborów
- Przycisk "Utwórz agendę" w ofercie — aktywny
- Build przechodzi bez błędów

### 4.1 Kreator agendy (`/agendy/nowa/[offerId]`)
- Automatyczny import pakietów z oferty (OfferPackages → AgendaBlockPackages)
- Tworzenie bloków czasowych:
  - Dzień (z zakresu dat wydarzenia)
  - Godzina od / do
  - Tytuł (np. "Lunch serwowany", "Wynajem sali")
  - Sala (opcjonalne przypisanie)
  - Liczba osób
  - Wyposażenie techniczne (flipchart, HDMI, głośnik — lista edytowalna)
- Przypisanie pakietów do bloków
- API: `POST /api/agendas`, `POST/PUT/DELETE /api/agendas/[id]/blocks`

### 4.2 Generowanie linku klienta
- Przycisk "Wygeneruj link dla klienta"
- Tworzy `AgendaToken` (type: KLIENT_AGENDA)
- Wyświetla URL do skopiowania: `/klient/[token]`
- API: `POST /api/agendas/[id]/tokens`

### 4.3 Widok klienta (`/klient/[token]`) — PUBLICZNY
- Bez logowania — walidacja tokenu
- Wyświetla agendę dzień po dniu, godzina po godzinie
- Dla sekcji `ALL_INCLUDED` → statyczny podgląd (zielony checkmark, "w pakiecie")
- Dla sekcji `CHOOSE_X_FROM_Y` → interaktywne checkboxy/radio
  - Walidacja: klient musi wybrać dokładnie `selectionCount` pozycji
- Przycisk "Zapisz wybory"
- **BLOKADA: 14 dni przed wydarzeniem** → komunikat "Wybory zamknięte"
- Każda zmiana → `Notification` w systemie (KLIENT_ZMIANA_WYBORU)
- API: `GET /api/public/agenda/[token]`, `PUT /api/public/agenda/[token]/selections`

### 4.4 Powiadomienia
- Ikona dzwonka w topbar z badge (liczba nieprzeczytanych)
- Dropdown z listą powiadomień
- Kliknięcie → oznacz jako przeczytane
- API: `GET /api/notifications`, `POST /api/notifications/[id]/read`

---

## FAZA 5: Finalizacja — UKOŃCZONA (2026-03-31)

### Co zrobione:
- Finalizacja agendy: przycisk w /agendy/[id], walidacja wyborów, kopiowanie bloków/pakietów/wyposażenia/wyborów do nowej agendy FINALNA, blokada wstępnej
- Widok kuchni `/kuchnia/[token]` — publiczny read-only, harmonogram dzień po dniu z wyborami klienta, wyposażenie, branding hotelu
- Podsumowania `/podsumowania` — tylko KIEROWNIK, karty statystyk, tabela agend finalnych, filtry po datach
- Build przechodzi bez błędów

### 5.1 Finalizacja agendy
- Przycisk "Finalizuj agendę" (w widoku agendy)
- Walidacja: wszystkie sekcje CHOOSE_X_FROM_Y mają kompletne wybory
- Tworzy nowy rekord `Agenda` (type: FINALNA) z zamrożonymi wyborami
- API: `POST /api/agendas/[id]/finalize`

### 5.2 Link dla kuchni
- Generuje `AgendaToken` (type: KUCHNIA_AGENDA)
- URL: `/kuchnia/[token]`
- API: `POST /api/agendas/[id]/tokens`

### 5.3 Widok kuchni (`/kuchnia/[token]`) — PUBLICZNY
- Bez logowania — walidacja tokenu
- Read-only: agenda dzień po dniu z wyborami klienta
- Każda pozycja: godzina, nazwa, liczba osób, sala, skład menu
- Wyposażenie techniczne per dzień
- Branding hotelu (logo, stopka)

### 5.4 Podsumowania (`/podsumowania`) — tylko KIEROWNIK
- Lista agend finalnych
- Zestawienie: ile wydarzeń, ile osób, zestawienie menu
- Filtry po datach

---

## FAZA 6: Polish — UKOŃCZONA (2026-03-31)

### Co zrobione:
- Skeleton loaders na wszystkich tabelach (pokoje, sale, oferty, umowy, agendy) + dashboard
- Responsywność: hamburger menu na mobile, sidebar overlay z zamykaniem, padding responsywny
- Dashboard: podpięcie prawdziwych danych z API (oferty, umowy, agendy, zaakceptowane w tym miesiącu)
- TooltipProvider dodany do providers
- Komponenty: skeleton, tooltip, table-skeleton, panel-content
- Build przechodzi bez błędów (52 route'y)

- Tooltips i podpowiedzi na każdym ekranie (onboarding — żeby pracownica się nie bała)
- Loading states (skeleton loaders)
- Error handling (toast na błędy API)
- Responsywność (mobile sidebar → hamburger menu)
- Empty states ("Brak ofert — utwórz pierwszą ofertę")
- Walidacja formularzy (Zod + react-hook-form)

---

## SCHEMAT BAZY DANYCH

Kompletny schemat jest w `prisma/schema.prisma`. Kluczowe modele:

```
Settings (singleton — konfiguracja hotelu)
User (email+hasło, rola: PRACOWNIK/KIEROWNIK)
Room (typ, cena/noc)
Hall (pojemność, cena/dzień) + HallReservation (data, status)
OfferType → Package → Section → MenuItem (hierarchia menu)
Offer + OfferRoom/OfferHall/OfferPackage (klocki ze snapshotami cen)
Contract (umowa z oferty)
Agenda + AgendaBlock + AgendaBlockPackage + AgendaBlockEquipment
AgendaSectionSelection + AgendaItemSelection (wybory klienta)
AgendaToken (linki publiczne: klient/kuchnia)
Notification + NotificationRead
```

---

## KLUCZOWE DECYZJE ARCHITEKTONICZNE

1. **Single-tenant**: 1 instancja = 1 hotel. Brak `hotelId` na modelach.
2. **Snapshot cen**: oferta zapisuje kopie cen z momentu tworzenia.
3. **Agenda wstępna vs finalna**: dwa osobne rekordy w bazie.
4. **Rezerwacje sal**: osobna tabela z UNIQUE constraint na konflikt.
5. **Pakiety z różnych typów**: pracownik miesza dowolnie (LEGO).

---

## BIBLIOTEKI

| Cel | Biblioteka |
|-----|-----------|
| Auth | next-auth v5 + bcryptjs |
| PDF | @react-pdf/renderer |
| Decimal | decimal.js + Prisma Decimal |
| Walidacja | zod + @hookform/resolvers |
| UI | shadcn/ui + tailwindcss + lucide-react |
| Formularze | react-hook-form |
| Tabele | @tanstack/react-table |
| Toasty | sonner |
| Fetching | swr |
| Daty | date-fns |

---

## ŻEBY KONTYNUOWAĆ JUTRO

1. Powiedz "kontynuuj" — przeczytam ten plan i CLAUDE.md
2. Potrzebujesz **PostgreSQL** (lokalnie lub Railway) + `DATABASE_URL` w `.env`
3. Uruchomimy migrację: `npm run db:migrate` + `npm run db:seed`
4. Zaczniemy **Fazę 1**: CRUD pokoi, sal, hierarchii menu, ustawień
