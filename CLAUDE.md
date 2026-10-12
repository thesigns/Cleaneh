# Cleaneh

PWA (apka webowa do zainstalowania na ekranie głównym, przede wszystkim telefony), która zadaje pytania o stan konkretnych miejsc w mieszkaniu i proponuje krótkie zadania sprzątania ze stoperem. Następca Cleanerr (natywny Android), bez powiadomień: apka czeka, aż użytkownik ją otworzy.

Stan: krok 0 z planu budowy (specyfikacja 14.3) zrobiony. Następny: krok 1, szkielet.

## Dokumenty

- `docs/cleaneh-design.md` — główna specyfikacja. Źródło prawdy dla zachowania apki.
- `docs/cleaneh-questions.md` — katalog pytań (zaakceptowany): teksty PL/EN, zadania PL/EN, czas, interwał, priorytet, sezon, wymagany sprzęt, etap generalnych porządków, ★ (pierwszy Obchód), zestaw; na końcu przełączniki i rodzaje pomieszczeń z zestawami. **Zmiany treści, czasów, interwałów czy zestawów tylko po akceptacji użytkownika.**
- Zmiana zachowania apki najpierw w specyfikacji, potem w kodzie. Rozbieżność między kodem a specyfikacją zgłaszaj, nie rozstrzygaj po cichu.
- Ikony: źródła w `design/icons/*.svg` (siatka 24×24, kontur 1,75, drugi ton jako półprzezroczyste wypełnienie), w apce bezpośrednio jako SVG z `currentColor`. Nowe ikony i zmiany najpierw w źródłach, z podglądem.

## Wzorzec: Cleanerr

- Repozytorium obok: `E:\Alu\Cleanerr` (Release 1.4). Tylko do czytania, nic tam nie zmieniaj.
- Logika do przeniesienia: moduł `core/` (Kotlin) razem z testami, w tym symulacja puli. Wartości strojenia (wagi, mnożniki, progi) te same.
- Generator katalogu `tools/generate_catalog.py` jako punkt wyjścia dla generatora w Node.
- Krój: `app/src/main/res/font/nunito.ttf` (zmienny) i licencja `app/src/main/assets/licenses/nunito-OFL.txt`. W Cleaneh jako WOFF2, licencja dołączona do apki.
- Różnice względem Cleanerr: bez slotów, powiadomień, alarmów, "Tylko w domu", podpisywania i migracji danych z Cleanerr. Porzuconą serię, porządki i zapomniane zadanie zamyka zdarzenie "otwarcie apki" (specyfikacja 4.3).

## Architektura

- **Vanilla JS**: moduły ES, HTML, CSS. Bez frameworka, TypeScriptu, bundlera i kroku budowania: pliki z repozytorium są tym, co dostaje przeglądarka.
- **Biblioteki w apce: żadnych.** Wyjątek tylko z uzasadnieniem w specyfikacji. Narzędzia deweloperskie (Node LTS, `node:test`, Playwright, ESLint, serwer plików) nie trafiają do apki.
- **`src/core`** — czysta logika decyzyjna, działa w przeglądarce i w Node. Bez DOM, bez API przeglądarki, bez tekstów. Katalog, mieszkanie, harmonogram, pętla (maszyna stanów serii, zadania, porządków), Obchód z cofaniem, plan porządków, ostatnie sprzątanie, stan przełączników.
  - Czas przez interfejs zegara, losowość przez generator z ziarnem. **Nigdy `Date.now()`, `new Date()` bez argumentu ani `Math.random()` bezpośrednio w `core`.**
  - Każda zmiana logiki ma testy jednostkowe (`node --test`). Symulacja puli pokazuje skutki zmian w interwałach.
  - JSDoc przy modelu danych i publicznych funkcjach.
- **`src/data`** — IndexedDB przez cienką nakładkę na obietnicach, zapis tylko zmian. Bieżąca aktywność i Obchód w toku jako JSON z dyskryminatorem `kind`. Obszar jako tekst `room#3` / `group#LAUNDRY`.
- **`src/engine`** — jedyne miejsce, które zmienia stan: wczytaj, wywołaj `core`, zapisz. Kolejka także między kartami (`navigator.locks`), potem sygnał dla innych kart (`BroadcastChannel`).
- **`src/ui`** — ekrany i komponenty na DOM, motyw, teksty z plików tłumaczeń. Bez własnej logiki decyzyjnej.
- **`tools/`** — generator katalogu: z `docs/cleaneh-questions.md` tworzy moduły JS dla `core` i tekstów. Wygenerowanych plików nie edytuj ręcznie; test sprawdza, że są aktualne.
- **Service worker**: numer wersji w nazwie pamięci podręcznej i lista plików apki. Wydanie to zmiana numeru; test sprawdza, że lista zgadza się z plikami. Nowa wersja nigdy nie przeładowuje strony w trakcie serii, zadania, Obchodu ani porządków.
- **Schemat danych**: każda zmiana to nowa wersja z migracją i testem. Brakująca migracja ma się wywrócić z błędem, nigdy po cichu kasować danych.

## Wygląd

- Ma być bardzo ładnie i atrakcyjnie, jak w Cleanerr 1.4: morska zieleń / morela (NIE, nigdy alarmowa czerwień) / lawenda (NIE MAM), ciepłe "papierowe" tło, krój Nunito, siedem kolorów pomieszczeń i odcienie grup (wartości w specyfikacji 13.1), karta przejścia przy zmianie pomieszczenia, plamy pod ikonami, sprężyste animacje.
- Kolor lawendowy należy do generalnych porządków, zielony do zadań i Obchodu.
- Kolory jako zmienne CSS; jasny i ciemny motyw według `prefers-color-scheme`. Animacje ciągłe wyłączone przy `prefers-reduced-motion`.
- Nagrody pełnoekranowe: konfetti na `<canvas>`, dźwięk syntezowany przez Web Audio (bez plików audio, zawsze po stuknięciu), wibracja tam, gdzie jest.
- Gesty kart przez Pointer Events; nie mogą uruchamiać przewijania, odświeżania przeciągnięciem ani gestu "wstecz" (`touch-action`, `overscroll-behavior`).
- Układ znosi czcionkę 130% i dłuższe polskie teksty; najpierw maleje dekoracja, tekst i przyciski zostają całe.

## Teksty i języki

- Angielski (domyślny) i polski. Każdy tekst w obu językach od razu, także w trybie deweloperskim. Żadnych tekstów zaszytych w kodzie.
- Oba pliki tłumaczeń mają ten sam zestaw kluczy z tymi samymi parametrami; test to sprawdza.
- Liczebniki przez `Intl.PluralRules` (polski: 1 zadanie, 2 zadania, 5 zadań). Nigdy "zadań: 3" jako obejście. Daty, godziny i czas trwania przez `Intl`.
- **Polskie teksty neutralne płciowo.** Bez form osobowych czasu przeszłego („Skończyłeś?” → „Gotowe?”, „Ostatnio sprzątałeś” → „Ostatnie sprzątanie”). Formy bezosobowe, tryb rozkazujący, rzeczowniki.
- **TAK = czysto.** Każde pytanie pyta o stan rzeczy, nie o działanie użytkownika.
- **Nazwa pomieszczenia nigdy w treści pytania.** Jest etykietą nad pytaniem i nazwą na karcie przejścia.
- Ton: ciepły, krótki, z lekkim humorem. Nigdy oceniający ani zawstydzający. Żadnych streaków ani list zaległości.

## Środowisko

- Windows, Git Bash i PowerShell. Node LTS i npm tylko dla narzędzi deweloperskich.
- Telefon testowy: Xiaomi Redmi Note 10 (Android 11, MIUI, Chrome). Service worker, instalacja i trwałe miejsce wymagają HTTPS albo `localhost`, więc na telefonie najprościej wdrożony podgląd.
- Większe zmiany wielu plików najprościej skryptem z katalogu tymczasowego; heredoki w Git Bash psują się na cudzysłowach i ukośnikach.

## Proces pracy

- Pętla: zmiana → testy (`node --test`) → lint (ESLint, ma być czysto) → zrzuty Playwright → telefon na koniec.
- Zrzuty na stałych rozmiarach: 393×820 (jak Redmi), mały telefon 360×616, ten sam z czcionką 130%; wybrane ekrany w ciemnym motywie i po angielsku. W testach przeglądarkowych emulacja `prefers-reduced-motion`.
- Tryb deweloperski (specyfikacja 13.4) tylko w wersji deweloperskiej (serwer deweloperski, podglądy wdrożeń), nigdy w produkcyjnej.
- Małe kroki, commit po każdym działającym etapie. **`git push` i wdrożenie produkcyjne tylko na wyraźne polecenie użytkownika.**
- Projekt zamknięty, prywatne repozytorium. Bez pliku LICENSE i bez nagłówków licencyjnych w kodzie (licencja kroju Nunito dołączona do apki to co innego).
