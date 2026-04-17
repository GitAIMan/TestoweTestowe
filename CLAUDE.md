# SaaS Hotele — Dokumentacja Projektu

## Kontekst projektu

### Kim jest twórca
- Początkujący developer (vibe coding), nie pisze kodu samodzielnie — Claude pisze cały kod, użytkownik wydaje polecenia i nadzoruje
- Przez 2 lata współpracował przy budowie podobnego systemu dla hotelu — zna domenę biznesową od środka
- Siedział z pracownikami hotelu, rozumiał ich problemy
- Efekt poprzedniego systemu: pracownica działu sprzedaży robiła 3 oferty dziennie → po wdrożeniu 11
- Nie współpracuje już z tamtym zespołem (byłym wspólnikiem). Zaczyna własny, konkurencyjny projekt od zera
- Nie ma jeszcze firmy ani formalnego portfolio

### Strategia
- **SaaS-Matka**: jedna baza kodu, z której powstają instancje per hotel (kopiuj-wklej + konfiguracja)
- Nie piszemy osobnego kodu per klient — zmieniamy branding/konfigurację i działa
- Główna przewaga konkurencyjna: **prostota i intuicyjność UX** (konkurencja była zbyt skomplikowana, pracownice się bały)
- Cel MVP: działające demo wszystkich 4 etapów — narzędzie sprzedażowe do pokazania hotelom

### Błędy poprzedniego projektu — których MUSIMY uniknąć
1. **BRAK PLANOWANIA ARCHITEKTURY** przed kodowaniem — wymagania niszczyły gotową logikę
2. **NIEDOSZACOWANIE CZASU** — obiecano 1 miesiąc, zajęło 6 i nie było gotowe
3. **BRAK AUDYTU DOMENOWEGO** — wymagania wychodziły w trakcie budowania
4. **NIESTABILNY SCHEMAT BAZY** — poprawiany w trakcie, kaskady problemów

---

## Co budujemy

System SaaS webowy dla hoteli — narzędzie do zarządzania ofertami eventowymi i agendami.
Multi-tenant: wiele hoteli, każdy ma oddzielny panel, własne dane, własny branding.

MVP obejmuje WSZYSTKIE 4 etapy + zarządzanie pakietami/menu.

---

## Stack technologiczny

- **Frontend + Backend**: Next.js (React + SSR + API routes)
- **Baza danych**: PostgreSQL
- **ORM**: Prisma (system migracji, zapobieganie problemom ze schematem)
- **Język**: TypeScript
- **Waluta**: tylko PLN (na start)
- **Język interfejsu**: tylko polski (na start)
- **PDF**: czytelne i poprawne na MVP, ładny design później
- **Emailing**: brak na MVP (ręcznie kopiuj-wklej linki/PDF), architektura gotowa na automatyzację

### Deployment pipeline
Lokalnie → GitHub → Railway (staging) → test → Railway (main/produkcja)

---

## Użytkownicy systemu (role)

### Pracownik działu sprzedaży/marketingu
- Loguje się mailem + hasłem
- Tworzy oferty podczas rozmowy telefonicznej z klientem
- Tworzy agendy na podstawie ofert
- Wysyła linki klientom i kuchni (ręcznie kopiuj-wklej)
- Zarządza pakietami, sekcjami menu, pozycjami menu

### Koordynator / Kierownik
- Loguje się mailem + hasłem
- Widzi to samo co pracownik + podsumowania
- Podgląd, zarządzanie

### Kuchnia
- **NIE loguje się** — dostaje link z tokenem
- Widzi tylko agendy finalne z wyborami klienta (tylko podgląd)

### Klient hotelowy
- **NIE loguje się** — dostaje link z tokenem (unikalny hash)
- Widzi swoją agendę wstępną
- Wybiera pozycje (np. 1 z 5 dań głównych)
- Może zmieniać wybory wielokrotnie AŻ DO 14 DNI PRZED WYDARZENIEM — potem blokada
- Każda zmiana klienta → powiadomienie w systemie dla pracownika

---

## Dane bazowe (admin hotelu konfiguruje raz)

### Pokoje
- Lista pokoi z typami (2-os, 3-os, itd.) i cenami

### Sale
- Lista sal z pojemnością i ceną
- Dostępność per data — pracownik wpisuje datę → widzi które sale wolne
- Logika blokowania sal: DO USTALENIA per hotel (konfigurowalne)

### Pakiety cateringowe
- Pakiety przypisane do typów ofert (np. "Oferta weselna", "Oferta konferencyjna")
- WAŻNE: pakiety mogą mieć te same nazwy w różnych ofertach (np. "Mięsa" z weselnej ≠ "Mięsa" z konferencyjnej) — dlatego pakiet MUSI mieć przypisaną ofertę źródłową

### Hierarchia menu (piramida)
```
Typ oferty (np. Weselna, Konferencyjna)
  └── Pakiet (np. "Dania Główne")
        └── Sekcja (np. "Zupy", "Przystawki", "Mięsa")
              └── Pozycja menu (np. "Rosół z makaronem", "Polędwiczka wieprzowa")
```

### Tryby wyboru per sekcja
Każda sekcja ma ustawiony tryb:
1. **"Wszystko w cenie"** — klient dostaje wszystkie pozycje, nic nie klika
2. **"Wybierz X z Y"** — klient musi wybrać np. 1 z 5 pozycji

Każda pozycja/sekcja/pakiet może mieć przypisaną cenę lub być "w cenie".

---

## Główny przepływ (flow) — 4 etapy

### ETAP 1: Tworzenie oferty
1. Klient dzwoni do hotelu
2. Pracownik ma otwarty system
3. Podczas rozmowy tworzy ofertę na żywo:
   - Data od/do
   - Typ wydarzenia (konferencja, wesele, event firmowy itd.)
   - Liczba osób (dorośli / dzieci osobno)
   - Noclegi (ile pokoi, jakiego typu, cena za pokój)
   - Sale (sprawdzenie dostępności w czasie rzeczywistym)
   - Pakiety cateringowe — **pracownik składa z gotowych klocków** (jak LEGO)
   - WAŻNE: pracownik może mieszać pakiety z RÓŻNYCH typów ofert (np. zupy z weselnej + przystawki z konferencyjnej)
4. Po rozmowie klient szybko dostaje gotową ofertę (PDF)

### Statusy oferty
- **Robocza** — w trakcie tworzenia
- **Wysłana** — klient dostał PDF
- **Zaakceptowana** — klient mówi "biorę"
- **Odrzucona** — klient mówi "nie"
- **Wygasła** — klient nie odpowiedział przez X dni
- Edycja po wysłaniu: DO USTALENIA per hotel (konfigurowalne)

### ETAP 2: Umowa
- Klient akceptuje ofertę → powstaje umowa (PDF)
- Umowa zawiera dodatkowe dane (dane firmy, warunki płatności, zaliczki)
- Szczegóły umowy: do doprecyzowania później
- Na MVP: czytelny PDF, design później

### ETAP 3: Agenda
#### Agenda wstępna (interaktywna — dla klienta)
- Powstaje NA PODSTAWIE OFERTY (nie od zera!)
- Pracownik dodaje: harmonogram godzinowy, przypisanie sal do bloków czasowych, wyposażenie techniczne
- Pracownik ustawia tryby wyboru per sekcja
- Wysyłana klientowi jako LINK WEBOWY (nie PDF)
- Link zabezpieczony unikalnym tokenem/hashem — bez logowania
- Klient wchodzi i wybiera pozycje wg ustawionych trybów
- Klient może zmieniać wybory wielokrotnie
- **BLOKADA: 14 dni przed wydarzeniem** — klient nie może już zmieniać
- Każda zmiana → powiadomienie w systemie dla pracownika

#### Agenda finalna (dokument — dla kuchni i archiwum)
- Zawiera wszystkie wybory klienta
- Struktura: dzień po dniu, godzina po godzinie
- Każda pozycja: godzina, nazwa, liczba osób, sala, skład menu
- Wyposażenie techniczne per dzień (flipchart, HDMI, głośnik itd.)
- Regulamin na końcu
- Stopka z danymi hotelu

### ETAP 4: Dystrybucja
- Agenda finalna → link do kuchni (bez logowania, token)
- Podsumowanie → widok w panelu dla kierownika
- Maile automatyczne → NIE na MVP (ręcznie kopiuj-wklej)

---

## SaaS-Matka — model deploymentu

**WAŻNE: To NIE jest multi-tenant (wielu hoteli w jednej bazie)!**

Model: **1 instancja = 1 hotel = 1 folder = 1 baza = 1 deployment na Railway**
- Nowy hotel-klient → kopiuj-wklej cały projekt → zmień konfigurację → nowy deployment
- W bazie danych jest ZAWSZE tylko JEDEN hotel
- NIE ma `hotelId` na modelach — to niepotrzebne
- Model `Settings` (lub `Hotel`) = konfiguracja tego jednego hotelu (logo, kolory, dane kontaktowe)
- Branding z panelu administracyjnego (NIE z kodu)
- Żadnych hardkodowanych wartości specyficznych — config w panelu lub .env

---

## Autentykacja i bezpieczeństwo

- Logowanie: mail + hasło (tylko pracownicy i kierownik)
- Role-based access control (RBAC)
- Klient hotelowy: link z unikalnym tokenem (bez logowania)
- Kuchnia: link z unikalnym tokenem (bez logowania)
- JWT lub sesje — do ustalenia przy implementacji

---

## Wymagania techniczne

### Precyzja finansowa
- Ceny liczone przez bibliotekę decimal (NIE float!)
- Błędy na groszach niedopuszczalne w kontekście umów i faktur

### Dostępność sal
- Sprawdzanie w czasie rzeczywistym podczas tworzenia oferty
- Pracownik wpisuje datę → system pokazuje wolne sale
- Logika blokowania: konfigurowalna per hotel

### Skala
- 1-8 pracowników jednocześnie w jednym hotelu
- Konflikt rezerwacji sal jest realny scenariusz — musi być obsłużony

### UX — PRIORYTET NADRZĘDNY
- Każdy ekran: minimum elementów, jasna ścieżka co kliknąć dalej
- Podpowiedzi / tooltips / onboarding — pracownica nie może czuć się zagubiona
- Prostota > funkcjonalność — lepiej mniej opcji ale czytelnych
- Test mentalny: "czy osoba która nigdy nie widziała tego systemu zrozumie co robić?"
- Konkurencja była zbyt skomplikowana — pracownice się bały. TO JEST NASZA GŁÓWNA PRZEWAGA.

---

## Outputy systemu

| Output | Format | Odbiorca |
|--------|--------|----------|
| Oferta | PDF (prosty na MVP) | Klient hotelowy |
| Umowa | PDF (prosty na MVP) | Klient hotelowy |
| Agenda wstępna | Interaktywny link webowy | Klient hotelowy |
| Agenda finalna | Link webowy (podgląd) | Kuchnia |
| Podsumowanie | Widok w panelu | Kierownik/Koordynator |

---

## Rzeczy do doprecyzowania później
- Szczegóły umowy (dokładne pola, warunki)
- Zaliczki i płatności
- Logika blokowania sal (per hotel)
- Edycja oferty po wysłaniu (per hotel)
- Własne propozycje klienta w agendzie (pole tekstowe)
- Automatyzacja maili
- Multi-language / multi-currency
- Ładny design PDF-ów (współpraca z designerem)
- System wygasania ofert (po ilu dniach)
- **Aneksy do umów (po MVP)** — gdy po podpisaniu umowy zmienią się pozycje (liczba osób, dodatkowy pakiet, inna sala), system generuje PDF aneksu: "do umowy nr X z dnia Y zmieniamy: [lista zmian z kwotami]". Przycisk "Generuj aneks" w centrum sterowania oferty. Aneks = standard w branży hotelowej (hotele robią aneksy na 7-21 dni przed eventem gdy klient podaje ostateczną liczbę gości). Na MVP: pracownik pisze aneks ręcznie w Wordzie.

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

### Narzędzia bazodanowe:
- `npx tsx prisma/clear.ts` — czyści całą bazę (zostawia użytkowników)
- `npx tsx prisma/seed.ts` — wgrywa dane testowe

### Konfiguracja lokalna:
- PostgreSQL lokalnie, baza `saas_hotele`, hasło `MBT`
- `npm run db:migrate` + `npx tsx prisma/seed.ts`
- `npm run dev` → `http://localhost:3000`
- 54 route'y, build przechodzi bez błędów

### Git:
- Repo: https://github.com/GitAIMan/TestoweTestowe
- Branch `main` — produkcja
- Branch `staging` — testowanie (praca tutaj)
- NIGDY commit/push bez zgody użytkownika

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
- **Zasada cen za osobę** (5 miejsc w kodzie, wszystkie spójne):
  - `sourceType === "PACKAGE"` → `unitPrice × quantity × personCount × (1 + VAT/100)`
  - `sourceType === "HALL" / "ROOM" / "CUSTOM"` → `unitPrice × quantity × (1 + VAT/100)`
  - `personCount = adultsCount + childrenCount` (z modelu Offer, linie 221-222 schema.prisma)
- **Zasada:** totalPrice w bazie = ZAWSZE brutto (z VAT). Nie mieszać netto/brutto.

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

### Uprawnienia Settings (RBAC):
- `PUT /api/settings` — **tylko KIEROWNIK**. PRACOWNIK dostaje 403 "Brak uprawnień".
- Logika: zmiana brandingu (logo, kolor, NIP, nazwa) to decyzja biznesowa, nie operacyjna.
- Loginy testowe: `anna@hotel.pl` (PRACOWNIK), `kierownik@hotel.pl` (KIEROWNIK), hasło `test1234`.

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

**Scenariusze flow (zapamiętać!):**
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

**UWAGA:** Baza danych wymaga migracji `add_offer_items` + `add_hall_and_timeto_to_offer_items` + `add_vat_rate_to_menu_models`. Uruchom `npm run db:migrate` po pobraniu kodu.

**Pełny plan implementacji:** patrz `PLAN.md` w katalogu projektu.

---

## Zasady pracy

- Claude pisze CAŁY kod, użytkownik wydaje polecenia i nadzoruje
- Planowanie architektury PRZED kodem — najważniejsza zasada
- Każda decyzja musi odpowiadać na: "czy to zadziała gdy skopiuję to dla innego hotelu?"
