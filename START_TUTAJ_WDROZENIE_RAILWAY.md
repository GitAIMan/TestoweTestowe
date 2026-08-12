# 🚀 START TUTAJ — Wdrożenie na Railway (plan na następną sesję)

> ⏰ **WAŻNOŚĆ TEGO PLANU: tylko 21.06.2026, od ok. 8:00 rano.** Po tym dniu plan jest nieaktualny — wtedy zapytaj Generała o aktualny stan zamiast działać wg tego pliku.
>
> **Claude: gdy użytkownik powie „Zapoznaj się z projektem" — przeczytaj CLAUDE.md, potem TEN plik i ZACZNIJ od punktu 0 poniżej.**
> Cel sesji: wypchnąć aplikację na Railway (staging) tak, żeby DZIAŁAŁA — z naciskiem na interaktywne linki klienta/kuchni.
> Tryb pracy: protokół wojskowy, krótkie meldunki, NIE commituj/pushuj bez zgody. Po każdym punkcie melduj wynik i czekaj.

---

## Kontekst (dlaczego ta sesja)

System (SaaS Hotele) jest gotowy i wypchnięty na `staging` w GitHub (`GitAIMan/TestoweTestowe`). Działa lokalnie na http://localhost:3000.
Teraz pierwsze wdrożenie na Railway. Generał słusznie przewiduje problemy — głównie wokół **interaktywnych linków** (klient `/klient/[token]`, kuchnia `/kuchnia/[token]`), które muszą działać pod adresem Railway, nie localhost.
**Interaktywność sama w sobie NIE jest problemem** (ten sam kod) — problem to: adresy linków, baza w chmurze, sekrety, build produkcyjny.

---

## Punkt 0 — ZWIAD (zrób to NAJPIERW, zanim cokolwiek innego)

Cel: ustalić fakty, dopiero potem plan. Wyślij Explore / przeszukaj kod i sprawdź:

1. **Hardkodowany localhost / origin linków** — jak generowany jest pełny adres linku klienta i kuchni?
   - Szukaj: `localhost`, `NEXTAUTH_URL`, `process.env`, `window.location.origin`, `req.headers.host`, `baseUrl`, miejsca gdzie składany jest URL `/klient/` i `/kuchnia/`.
   - Pliki podejrzane: `src/app/api/agendas/[id]/tokens/route.ts`, gdziekolwiek tworzy się/wyświetla link tokenu, `auth.ts` / `auth.config.ts`.
   - PYTANIE do rozstrzygnięcia: czy adres bazowy da się ustawić JEDNĄ zmienną środowiskową, czy jest porozrzucany po kodzie.
2. **Zmienne środowiskowe** — przejrzyj `.env` lokalny (NIE commituj), wypisz jakie klucze są potrzebne (DB, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, itp.). Sprawdź `auth.config.ts`/`auth.ts` i Prisma `schema.prisma` (`datasource db { url = env(...) }`).
3. **Build produkcyjny** — sprawdź `package.json` skrypt `build` (jest: `npx prisma generate && next build`) i czy `next.config` nic nie zakłada o localhost.
4. **Migracje vs db push** — wg CLAUDE.md od 2026-04-20 schema idzie przez `prisma db push`. Ustalić jak wgrać strukturę na świeżą bazę Railway (prawdopodobnie `prisma db push` + `prisma/seed.ts`).

Po zwiadzie: zamelduj Generałowi co znalezione i przedstaw plan wdrożenia (najlepiej w plan mode).

---

## Punkty do wykonania (kolejność wdrożenia)

### 1. Adresy linków (NAJWAŻNIEJSZE — to o to martwi się Generał)
- Linki klienta/kuchni muszą wskazywać domenę Railway (`*.up.railway.app`), nie `localhost:3000`.
- Jeśli adres jest hardkodowany → wprowadzić jedną zmienną bazową (np. `NEXTAUTH_URL` / `APP_URL`) i używać jej wszędzie.
- Zweryfikować: wygenerowany link otwarty w przeglądarce prowadzi do działającej strony klienta.

### 2. Baza danych (Railway Postgres)
- Dodać usługę Postgres w projekcie Railway.
- Podpiąć `DATABASE_URL` do aplikacji.
- Wgrać strukturę: `prisma db push` (wg CLAUDE.md, nie formalne migracje).
- Wgrać dane testowe: `npx tsx prisma/seed.ts` (loginy: `anna@hotel.pl` / `kierownik@hotel.pl`, hasło `test1234`).

### 3. Zmienne środowiskowe (sekrety) w panelu Railway
- Wpisać ręcznie wszystko z lokalnego `.env`: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (= adres Railway), reszta z punktu 0.2.
- `NEXTAUTH_URL` MUSI być adresem Railway, inaczej logowanie nie zadziała.

### 4. Build produkcyjny
- Railway zbuduje aplikację „na twardo" (`next build`). Może wyłapać błędy niewidoczne w trybie dev.
- Naprawiać błędy buildu po kolei. To normalne przy pierwszym wdrożeniu.

### 5. Test końcowy na żywo (Railway)
- Logowanie pracownika ✓
- Stworzenie oferty ✓
- Wygenerowanie linku klienta → otwarcie w przeglądarce (najlepiej incognito) → klient wybiera pozycje ✓
- Link kuchni read-only ✓
- PDF oferty/umowy się generuje ✓

---

## Przypomnienia
- Lokalny serwer dev: `npm run dev` → localhost:3000.
- NIE commituj `Notatnik.env` / żadnych `.env`.
- Generał wydaje rozkazy, ja wykonuję. Krótkie meldunki. Zgoda przed commit/push.
