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
   - Kolumny: NR | NAZWA | GODZ | ILOŚĆ | CENA NETTO | VAT (8%/23%) | BRUTTO
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
- Pola: offerId, day, date, sortOrder, name, description, timeFrom, quantity, unitPrice, vatRate, sourceType, sourceId
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

**Tooltips/podpowiedzi na przyciskach:**
- Komponent `<Hint>` — tooltip na hover z krótkim opisem
- Dodane na: Nowa oferta, PDF, Utwórz umowę, Oznacz jako podpisaną, Utwórz agendę, Dodaj blok, Wygeneruj link, Finalizuj agendę, Dodaj salę, Dodaj pokój

**Inne fixy:**
- DELETE endpoint dla ofert (kaskadowe usuwanie)
- Pola numeryczne: ukryte strzałki CSS + zablokowany scroll/keyboard JS (capture phase)
- Pakiety na stronie oferty: ładne formatowanie (ramki, badge typ, tryb sekcji, chipsy pozycji)

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

**UWAGA:** Baza danych wymaga migracji `add_offer_items`. Uruchom `npm run db:migrate` po pobraniu kodu.

**Pełny plan implementacji:** patrz `PLAN.md` w katalogu projektu.

---

## Zasady pracy

- Claude pisze CAŁY kod, użytkownik wydaje polecenia i nadzoruje
- Planowanie architektury PRZED kodem — najważniejsza zasada
- Każda decyzja musi odpowiadać na: "czy to zadziała gdy skopiuję to dla innego hotelu?"
