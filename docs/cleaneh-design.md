# Cleaneh — Design Document

Wersja: 0.1 (2026-10-12)
Status: specyfikacja przed rozpoczęciem budowy
Platforma: PWA (aplikacja webowa do zainstalowania na ekranie głównym), przede wszystkim telefony
Języki: angielski, polski
Poprzednik: Cleanerr, natywna apka na Androida (wersje 1.0–1.4)

## 0. Skąd Cleaneh

Cleaneh to Cleanerr przeniesiony do przeglądarki, z jedną świadomą zmianą idei: apka nie przypomina o sobie.

- **Co przechodzi z Cleanerr**: katalog pytań (`docs/cleaneh-questions.md`, zaakceptowany), cała logika decyzyjna (pula, wagi, adaptacyjne interwały, kalibracja czasu zadań, seria, Obchód z cofaniem, generalne porządki), pomieszczenia wybierane przez użytkownika, każde z własnym kolorem, karta przejścia między pomieszczeniami, stoper zamiast odliczania, wygląd (paleta, krój Nunito, ikony, plamy, nagrody) i zasady tekstów.
- **Co odpada i dlaczego**: powiadomienia, sloty i godziny ciszy, alarmy, walka z oszczędzaniem baterii i nakładkami producentów (MIUI przesuwał alarmy o całe doby), "Tylko w domu" z lokalizacją w tle, podpisywanie APK, instalacja spoza sklepu i osobna wersja deweloperska obok prawdziwej. Większość pracy nad Cleanerr szła właśnie w to, a nie w samą apkę.
- **Bez migracji.** Cleaneh zaczyna od zera, dane z Cleanerr nie są przenoszone.
- **Repozytorium Cleanerr jest wzorcem.** Moduł `:core` (Kotlin) i jego testy do przeniesienia, źródła ikon `design/icons/*.svg`, plik kroju Nunito, generator katalogu `tools/generate_catalog.py` jako punkt wyjścia. Liczby w tej specyfikacji (wagi, mnożniki, progi, kolory) są te same co w Cleanerr 1.4, w części sprawdzone symulacją.

## 1. Idea w jednym zdaniu

Kiedy jest chwila na sprzątanie, Cleaneh zadaje pytania o stan konkretnych miejsc w mieszkaniu ("Kuchnia — Czy blat jest czysty?") i wybiera to, co najbardziej tego potrzebuje. Jeśli odpowiedź brzmi NIE, proponuje zrobić to od razu, z szacowanym czasem i stoperem. Po każdej odpowiedzi pada kolejne pytanie, aż użytkownik zakończy serię. Obchód pozwala w kilka minut przejść przez całe mieszkanie serią szybkich kart, a Porządki prowadzą przez większe sprzątanie w przemyślanej kolejności.

## 2. Problem

Sprzątanie jest odkładane nie dlatego, że jest trudne, ale dlatego, że "posprzątaj mieszkanie" wygląda jak jedno wielkie zadanie bez końca. Trudno zacząć, a łatwo nie zauważyć, co się zaniedbuje.

Cleaneh odpowiada na pytanie "od czego zacząć i ile to zajmie", a nie "kiedy". Moment wybiera użytkownik: otwiera apkę, kiedy ma chwilę albo chce posprzątać. Ekran główny łagodnie pokazuje, kiedy było ostatnie sprzątanie (5.1), a ikona na ekranie głównym telefonu (9.1) jest jedynym przypomnieniem.

## 3. Założenia projektowe

- **Inspekcja, nie rozkaz.** Apka pyta o stan, a nie każe sprzątać. Odpowiedź zajmuje sekundę.
- **Mikrozadania.** Każde pytanie dotyczy jednej, małej, konkretnej rzeczy, którą da się zrobić w kilka lub kilkanaście minut.
- **Bezbolesne NIE.** Odpowiedź NIE nie może być karana. Jeśli zacznie kosztować, użytkownicy zaczną klikać TAK i apka straci kontakt z rzeczywistością.
- **Czas zamiast zakresu.** Zadanie ma szacowany czas, pokazany przed startem ("~5 min"), więc wiadomo, na co się zgadza. W trakcie pracy nic nie odlicza do zera i nic nie mówi o przekroczeniu: stoper liczy w górę, bez presji.
- **Możesz przestać.** Seria pytań trwa, dopóki użytkownik jej nie zakończy przyciskiem X. Wyjście jest zawsze widoczne i nic nie kosztuje. TAK nie służy do wyjścia, więc nie ma powodu, żeby klikać je bez sprawdzenia.
- **Apka czeka, nie goni.** Bez powiadomień, przypomnień i liczników tykających w tle. Cleaneh jest gotowy, kiedy użytkownik go otworzy.
- **Bez poczucia winy.** Żadnych streaków, które "przepadają", żadnego zawstydzania, żadnych długich list zaległości. Także po dłuższej przerwie: ekran główny nie wylicza wtedy, ile czasu minęło (5.1).
- **Apka uczy się mieszkania.** Częstotliwość pytań dostosowuje się do tego, jak szybko brudzą się konkretne miejsca.
- **Tylko na urządzeniu.** Bez konta, serwera i analityki. Po pierwszym wczytaniu działa bez internetu.

## 4. Główna pętla

1. Użytkownik otwiera Cleaneh i wybiera **"Daj mi zadanie"**. Pada pierwsze pytanie, to początek serii. Obchód (6) i Porządki (4.4) to osobne tryby z tego samego ekranu.
2. Odpowiedzi:
   - **TAK** — miejsce jest czyste. Pytanie znika z puli na swój interwał. Pada kolejne pytanie.
   - **NIE** — apka proponuje: "Zrób to teraz" i pokazuje szacowany czas zadania. Start uruchamia stoper. Można też przejść do kolejnego pytania (NIE TERAZ) albo zakończyć serię (X); pytanie zostaje wtedy w puli.
   - **NIE TERAZ** — pytanie zostaje w puli bez kary. Pada kolejne pytanie.
   - **NIE MAM** — pytanie zostaje trwale wyłączone (np. brak zmywarki), po potwierdzeniu (5). Pada kolejne pytanie.
   - **X** — koniec serii. Bieżące pytanie zostaje w puli bez kary (jak NIE TERAZ). Apka wraca na ekran główny z podsumowaniem.
3. Po skończonej pracy użytkownik klika **ZROBIONE**. Pytanie znika z puli na swój interwał. Po nagrodzie pada kolejne pytanie.
4. Seria kończy się na X albo gdy pula jest pusta ("Wszystko ogarnięte, koniec na dziś" i podsumowanie).

### 4.1. Kolejne pytanie w serii

- Losowane z puli jak zwykle (patrz 8.2), z preferencją dla tego samego pomieszczenia lub grupy co poprzednie pytanie. Kto właśnie sprawdził blat, stoi w kuchni.
- Pytanie odłożone w tej serii (NIE TERAZ, NIE bez startu) nie wraca w tej samej serii.
- Gdy kolejne pytanie jest z innego pomieszczenia lub grupy niż poprzednie, najpierw pojawia się karta przejścia (4.5). Przed pierwszym pytaniem serii jej nie ma.

### 4.2. Stoper zadania

Odliczanie do zera (Cleanerr do wersji 1.3) sugerowało, że w szacowanym czasie trzeba się uwinąć, i budowało napięcie. Dlatego zadanie ma stoper, który liczy w górę od startu:

- Szacowany czas jest przy pytaniu i w propozycji "Zrobić to teraz?", ale nie na ekranie stopera. Stoper nie porównuje się z szacunkiem: bez "+2:15", bez "ponad plan", bez zmiany wyglądu po szacowanym czasie.
- Po starcie telefon zwykle ląduje w kieszeni, więc ekran jest spokojny: bez pierścienia i animacji, tylko zegar ("4:07", po godzinie "1:02:15").
- **ZROBIONE** — do kalibracji (8.4) idzie cały rzeczywisty czas. Seria trwa dalej.
- **Odpuszczam** — pytanie zostaje w puli, bez kary. Seria się kończy.
- Bez dźwięku i bez pytania "Gotowe?". Stoper liczy od zapisanej godziny startu, więc zamknięcie karty, zablokowanie telefonu ani przeładowanie strony go nie zatrzymuje.

### 4.3. Przypadki brzegowe

- **Powrót po przerwie.** Stan zapisuje się po każdej odpowiedzi, więc zamknięcie apki w trakcie serii niczego nie gubi. Przy otwarciu apki i przy powrocie do jej karty to, co porzucone, jest zamykane:
  - seria (pytanie albo propozycja zadania) bez żadnej reakcji od 15 minut — jak X, pytanie zostaje w puli bez kary; apka pokazuje ekran główny;
  - generalne porządki — dopiero po 2 godzinach bez reakcji, bo przerwa na kawę czy telefon jest normalna; jak X;
  - zadanie ze stoperem — po 2 godzinach ponad szacowany czas (zapomniane ZROBIONE), jak "Odpuszczam", bez uczenia czasu. Użytkownik tego progu nie widzi.

  Po krótszej przerwie apka wraca dokładnie tam, gdzie była.
- **Pusta pula w trakcie serii** — zamiast kolejnego pytania komunikat w stylu "Wszystko ogarnięte, koniec na dziś" i podsumowanie.
- **Pusta pula przy "Daj mi zadanie"** — apka mówi, że nic nie jest po terminie, i proponuje Obchód.
- **Jedno zadanie naraz** — nie można rozpocząć drugiego zadania, gdy trwa pierwsze.
- **Apka otwarta w dwóch kartach lub oknach** — stan jest wspólny. Zmiany idą po kolei przez jedno miejsce (13.2), a karta, która wraca na pierwszy plan, wczytuje stan od nowa. Odpowiedź, która nie pasuje już do stanu (pytanie obsłużone w drugiej karcie), jest ignorowana bez błędu.
- **Nowa wersja apki** nie przeładowuje strony w trakcie serii, zadania, Obchodu ani porządków (9.2). Gdyby do przeładowania doszło, nic nie ginie, bo stan jest zapisany.

### 4.4. Generalne porządki

Tryb na jednorazowe większe sprzątanie (goście, weekend, przed świętami): seria mikrozadań w przemyślanej kolejności, z budżetem czasu i wyraźnym końcem, zamiast jednego "posprzątaj wszystko".

- **Start** z ekranu głównego (przycisk "Porządki" obok "Obchód"): wybór budżetu czasu (30 min / 1 h / 2 h / bez limitu, domyślnie 1 h) i pomieszczeń (domyślnie wszystkie, w których jest coś do zrobienia). Na dole plan: liczba pytań i najwyżej tyle pracy, ile zajęłyby, gdyby wszystko trzeba było zrobić.
- **Plan**: aktywne pytania z wybranych pomieszczeń, również niepilne, z pominięciem posprzątanych w ostatniej dobie (prawdziwe TAK lub ZROBIONE, także TAK w Obchodzie; sztuczne daty z rozłożonego startu się nie liczą). Przy limicie czasu wybór według pilności (przeterminowanie, najwyżej 4, razy waga priorytetu) tak, żeby suma szacowanych czasów (8.4) mieściła się w budżecie. Pytania, które nie mieszczą się w budżecie, są pomijane, a mniejsze dalej mogą wejść.
- **Kolejność pomieszczeń** (od środka mieszkania do wyjścia): na start zadania, które pracują w tle (nastawienie prania, zmywarki), potem pokoje (pokój, sypialnia, pokój dziecka, salon, jadalnia, gabinet, garderoba; naczynia lądują przy okazji w kuchni), kuchnia i spiżarnia, łazienki, toalety i pralnia, schody, korytarz, przedpokój, pozostałe (schowek, piwnica, strych, balkon, taras, garaż, ogródek, grupy), na sam koniec wyniesienie śmieci. Pomieszczenia tego samego rodzaju w kolejności dodania.
- **Kolejność w pomieszczeniu** według etapu: bałagan → kurz z wyższych miejsc → blaty i powierzchnie → podłoga na sucho → podłoga na mokro. Z góry na dół, najpierw na sucho, potem na mokro. Etap każdego pytania jest w katalogu (kolumna "Etap").
- **Przebieg** jak w serii: TAK przechodzi dalej, NIE proponuje zadanie ze stoperem, NIE TERAZ pomija, X kończy. U góry: bieżący blok (pomieszczenie, "To, co pracuje samo", "Ostatnie drobiazgi"), "N z M", pasek postępu i górna granica pozostałego czasu. Pytania wyłączone po drodze (NIE MAM) są pomijane.
- **Nagrody** w lawendowym kolorze porządków: po każdym skończonym bloku ("Kuchnia: gotowe!", zadania i czas w bloku albo "Wszystko już było czyste") z opcją "Na razie wystarczy", i duża na koniec (sprawdzone miejsca, zadania i czas, dziś). Przy X bez żadnej odpowiedzi nagrody nie ma.
- **Karta przejścia** (4.5) przed pierwszym pytaniem i przy każdej zmianie pomieszczenia lub grupy, także wewnątrz bloku na start i na koniec. Po nagrodzie za blok najpierw nagroda, potem karta przejścia do następnego pomieszczenia. Na karcie górna granica czasu tego pomieszczenia: suma szacowanych czasów jego kolejnych pytań w planie, jak w górnym pasku.
- Przerwa w porządkach może trwać do 2 godzin (4.3).

### 4.5. Karta przejścia do pomieszczenia

Pytania z różnych pomieszczeń wyglądają tak samo, a mała etykieta łatwo umyka (w Cleanerr łatwo było przeoczyć, że po "Pokoju dużym" przyszły pytania o "Pokój mały"). Gdy zmienia się pomieszczenie (lub grupa), między pytaniami pojawia się karta przejścia, wyraźnie inna niż białe karty pytań.

- **Treść**: małymi literami "Przejdź do" ("Head to"), duża ikona rodzaju pomieszczenia (grupy) na białej plamie, nazwa pomieszczenia większymi literami, pod nią ile tego jest (Obchód: liczba pytań, "12 pytań"; porządki: górna granica czasu, "do 25 min", 4.4; w serii nic), przycisk "Dalej".
- **Wygląd**: cała karta wypełniona kolorem pomieszczenia (7.5, gradient z 13.1), biały tekst i ikona; tło ekranu też w kolorze pomieszczenia. Przyciski odpowiedzi pod kartą ustępują miejsca przyciskowi "Dalej" w tym samym miejscu, więc karta nie skacze.
- **Dalej** przyciskiem albo przesunięciem karty w dowolną stronę. Karta nie jest odpowiedzią: nie liczy się do postępu ("N z M") ani do historii.
- **Kiedy**: w serii przy zmianie pomieszczenia między pytaniami (4.1), w Obchodzie i porządkach także przed pierwszym pomieszczeniem (6.2, 4.4).
- Przejście raz pokazane w danym Obchodzie, porządkach czy serii nie wraca po cofnięciu. Po ponownym otwarciu apki na pierwszym pytaniu pomieszczenia karta przejścia pojawia się znowu.

## 5. Ekran główny

To, co widać po otwarciu apki (po zamknięciu porzuconych rzeczy, 4.3):

- **Trwa zadanie** — ekran stopera z czasem od startu i przyciskiem ZROBIONE.
- **Jest pytanie czekające na odpowiedź** (przerwana seria, krócej niż 15 minut temu) — karta z etykietą pomieszczenia, pytaniem i przyciskami TAK / NIE / NIE TERAZ / NIE MAM oraz X.
- **Nic nie trwa** — krótki komunikat dopasowany do sytuacji (spokój, właśnie skończona seria, nic po terminie), duży przycisk **"Daj mi zadanie"**, pod nim **Obchód** i **Porządki**, podsumowanie dnia albo ostatnie sprzątanie (niżej), wejście do ustawień.
- **Karta pytania w serii** wygląda jak karta Obchodu. Gesty: w prawo TAK, w lewo NIE, w górę NIE MAM, w dół NIE TERAZ; te same odpowiedzi są przyciskami pod kartą, X w górnym pasku kończy serię.
- **NIE MAM w serii wymaga potwierdzenia** (łatwo o pomyłkę, a pytanie znika na stałe): okno z powtórzonym pytaniem, "Zostaw" jako bezpieczna, wyróżniona opcja i "Wyłącz". W Obchodzie zamiast potwierdzenia jest "Cofnij", bo NIE MAM pada tam często.
- **Stoper** to osobny, spokojny ekran: nazwa pomieszczenia, polecenie, duży zegar liczący w górę w kolorze pomieszczenia, ZROBIONE i "Odpuszczam" (4.2).
- **Nagroda po ZROBIONE**: pełny ekran z konfetti, krótkim syntezowanym dźwiękiem i wibracją (tam, gdzie przeglądarka ją obsługuje, 9.5), polecenie i czas zadania, dzisiejszy wynik. "Dalej" prowadzi do kolejnego pytania, "Na razie wystarczy" kończy serię.

### 5.1. Podsumowanie dnia i ostatnie sprzątanie

- **Gdy dziś było już jakieś zadanie**: "Dziś: 2 zadania · 14 min" (zaczęte minuty, liczebniki przez 12.2).
- **Gdy dziś nie było zadania**: linijka o ostatnim sprzątaniu, czyli ostatnim ZROBIONE w Cleaneh (w serii, z podsumowania Obchodu albo w porządkach). TAK się nie liczy: mówi, że jest czysto, a nie że ktoś sprzątał.
  - poniżej godziny: "Ostatnie sprzątanie: przed chwilą";
  - poniżej doby: "Ostatnie sprzątanie: 5 godzin temu";
  - od doby do 7 dni: dni i godziny, bez minut ("1 dzień i 23 godziny temu", "3 dni temu" przy pełnych dobach);
  - powyżej 7 dni: bez liczby, ciepłe zdanie, np. "Miło znowu widzieć. Zacznijmy od czegoś małego.";
  - przed pierwszym ZROBIONE: linijki nie ma.
- Bez tykania: wartość liczona przy otwarciu apki i powrocie do niej, nie co minutę. Minut nie ma celowo, żeby linijka nie działała jak licznik wyrzutów sumienia.
- Teksty bez form osobowych ("Ostatnie sprzątanie", nie "Ostatnio sprzątałeś", 12.3).
- Przedział (przed chwilą / godziny / dni / dawno / nigdy) wylicza `core` z historii (czysta funkcja z testami), tekst składa UI.

### 5.2. Ustawienia

- **Pomieszczenia** (7.5) i **Sprzęty i domownicy** (7.6) — te same ekrany co w kreatorze.
- **Wyłączone pytania** (NIE MAM, także z Obchodu) z możliwością przywrócenia każdego.
- **Język** (12.1).
- **Dźwięk i wibracja** — jeden przełącznik, domyślnie włączony. Przeglądarka nie ma osobnego wyciszenia dla apki, więc wyłącznik jest w apce.
- **Zainstaluj apkę** (9.1) — tylko gdy Cleaneh nie jest zainstalowany.
- **Zacznij od nowa** — po potwierdzeniu usuwa wszystkie dane (pomieszczenia, przełączniki, stan pytań, historię, trwający Obchód i zadanie). Apka wraca do kreatora (10).
- **O aplikacji**: wersja, licencja kroju pisma.

## 6. Obchód

Szybki przegląd mieszkania w formie kart, w stylu Tindera. Pierwszy Obchód kończy onboarding (pomieszczenia i sprzęty są już wybrane w kreatorze, 10), kolejne służą jako okazjonalny przegląd stanu mieszkania.

### 6.1. Karta

- Bez dużej ikony: ikona pomieszczenia myliłaby przy pytaniu np. o podłogę, a osobna ikona do każdego pytania to za dużo. Ikona pomieszczenia jest w etykiecie.
- Etykieta pomieszczenia lub grupy (np. "Sypialnia", "Samochód") i szacowany czas zadania.
- Treść pytania, np. "Czy klawiatura i mysz są czyste?"
- Trzy odpowiedzi:
  - **TAK** — przesunięcie w prawo lub przycisk
  - **NIE** — przesunięcie w lewo lub przycisk
  - **NIE MAM** — przesunięcie w górę lub przycisk
- Przyciski są zawsze widoczne pod kartą. Gesty są skrótem, nie jedynym sposobem. Podczas przeciągania karta pokazuje pieczątkę odpowiedzi, a cały ekran lekko przybiera jej kolor.
- Pasek postępu (np. "Kuchnia 3/6").
- Możliwość cofnięcia ostatniej odpowiedzi.
- Możliwość przerwania w dowolnym momencie. Odpowiedzi udzielone do tej pory są zapisane.

### 6.2. Kolejność kart

- Karty są pogrupowane pomieszczeniami w kolejności z 7.5: najpierw całe jedno pomieszczenie, potem następne. Na końcu pytania poza pomieszczeniami (grupy w kolejności z 7.6).
- Przed pierwszą kartą każdego pomieszczenia i grupy karta przejścia (4.5) z liczbą pytań. Cofnięcie z pierwszej karty pomieszczenia wraca do ostatniej karty poprzedniego, z pominięciem karty przejścia.
- Pomieszczenia i sprzęty wybiera się w kreatorze (10) i w ustawieniach, nie w Obchodzie.
- Pytania poza sezonem (patrz 7.8) są pomijane.

### 6.3. NIE w Obchodzie nie uruchamia zadania

Obchód zbiera odpowiedzi bez przerywania. Zadania do zrobienia pokazywane są dopiero w podsumowaniu.

### 6.4. Podsumowanie

- Łagodne i skupione na następnym kroku, nie na liczbie zaległości.
- Pokazuje maksymalnie trzy najważniejsze rzeczy (według priorytetu, potem czasu), np. "Na start: wyrzuć śmieci (3 min)".
- Pozostałe: "reszta poczeka w kolejce".
- Proponuje start od pierwszego z pokazanych zadań, co uruchamia zwykłą pętlę ze stoperem i serią.

### 6.5. Wpływ na stan pytań

Obchód nie mówi nic o tym, jak szybko miejsce się brudzi, więc nie wydłuża ani nie skraca interwału.

- **TAK** — pytanie odpoczywa od dziś (nie wiadomo, kiedy było sprzątane, wiadomo tylko, że teraz jest czysto). Pierwszy Obchód ustawia interwał bazowy, kolejne zachowują wyuczony.
- **NIE** — pytanie trafia do puli jako mocno przeterminowane (przeterminowanie równe limitowi z 8.2), więc szybko wróci w seriach.
- **NIE MAM** — pytanie zostaje wyłączone w tym pomieszczeniu.

### 6.6. Kiedy uruchamiany

- **Pierwszy Obchód** — część onboardingu, po wyborze pomieszczeń i sprzętów. Obejmuje tylko pytania oznaczone w katalogu jako "w pierwszym Obchodzie" (★), z wybranych pomieszczeń i włączonych grup. Pozostałe pytania wchodzą do puli stopniowo (patrz 8.1) i użytkownik poznaje je w seriach.
- **Kolejne Obchody** — na żądanie z ekranu głównego, z wyborem zakresu: całe mieszkanie albo jedno pomieszczenie lub grupa (przy każdym liczba pytań po terminie). Pomijają pytania wyłączone, poza sezonem i pytania, które są jeszcze w okresie odpoczynku po TAK lub ZROBIONE.

## 7. Pytania

### 7.1. Model pytania

Każde pytanie w katalogu ma:
- **identyfikator** — stabilny, niezależny od języka, np. `kitchen_counter_clean`
- **treść** — w obu językach, bez nazwy pomieszczenia
- **polecenie** — to samo jako zadanie w trybie rozkazującym ("Wynieś śmieci"), pokazywane w propozycji "Zrobić to teraz?", na ekranie stopera, w nagrodzie i w podsumowaniu Obchodu
- **zestaw albo grupę** — zestaw dla pytań w pomieszczeniach (podstawa pokoju, łóżko, kuchnia…, patrz 7.5), grupa dla pytań poza pomieszczeniami (pranie, samochód, zwierzęta…, patrz 7.6)
- **wymagany sprzęt lub cechę** (opcjonalnie) — zmywarka, komputer, kot…
- **sezon** (opcjonalnie) — zakres miesięcy, w których pytanie jest aktywne (patrz 7.8)
- **etap** — kolejność w generalnych porządkach (4.4)
- **flagę "w pierwszym Obchodzie"** (★)
- **szacowany czas zadania** — od 2 do 15 minut
- **interwał bazowy** — po ilu dniach pytanie może wrócić
- **priorytet** — zwykły lub higieniczny (śmieci, resztki jedzenia, toaleta, pleśń)

Wszystkie pytania są sformułowane tak, żeby TAK oznaczało "jest czysto". Zamiast "Czy w kuchni są resztki opakowań?" — "Czy kuchnia jest wolna od opakowań?".

### 7.2. Przykładowe pytania

- Kuchnia — Czy blat jest czysty?
- Kuchnia — Czy śmieci są wyniesione?
- Sypialnia — Czy podłoga jest odkurzona?
- Kuchnia — Czy kuchnia jest wolna od resztek jedzenia?
- Komputer — Czy klawiatura i mysz są czyste?

### 7.3. Duże zadania

Zadania, które nie mieszczą się w ok. 15 minutach (mycie okien, pranie zasłon), są rozbijane na mniejsze ("Czy okno jest umyte?" osobno dla każdego pomieszczenia) albo wyłączone z puli. Przy pracach, których nie da się rozbić (koszenie większego trawnika), szacowany czas to porcja pracy; jeśli praca nie jest skończona, "Odpuszczam" zostawia pytanie w puli.

### 7.4. Ikony

Własny, spójny zestaw ikon pomieszczeń, grup, sprzętów i interfejsu, przejęty z Cleanerr. Źródła w `design/icons/*.svg` (siatka 24×24, kontur 1,75 z zaokrąglonymi końcami, drugi ton jako półprzezroczyste wypełnienie). W apce jako jeden arkusz SVG (`assets/icons/sprite.svg`, symbol na ikonę), który skrypt składa ze źródeł bez zmiany rysunku (klasy zamienione na atrybuty, warstwy jak w Cleanerr); kolor przez `currentColor`, więc ikona działa w każdym motywie i kolorze pomieszczenia. Nowe ikony i zmiany najpierw w źródłach, z podglądem przed wrzuceniem do apki.

### 7.5. Pomieszczenia

Użytkownik sam dodaje pomieszczenia, które sprząta: w kreatorze (10) i w ustawieniach. Żadne nie jest obowiązkowe ani ograniczone liczbą. Nastolatek może mieć tylko swój pokój, dom może mieć dwa przedpokoje.

- **Pomieszczenie** ma rodzaj, nazwę, kolor i stały identyfikator. Identyfikator instancji pytania = identyfikator pytania + identyfikator pomieszczenia. Każda instancja ma osobny stan, interwał i wyuczony czas.
- **Rodzaj decyduje o pytaniach.** Pytania w pomieszczeniach są w katalogu pogrupowane w zestawy (np. "podstawa pokoju": podłoga, kurz, okno; "łóżko"; "biurko"; "kanapa"). Rodzaj to lista zestawów. Pytanie trafia do każdego pomieszczenia, którego rodzaj zawiera jego zestaw. Nowy rodzaj to nowa lista zestawów, bez zmian w pytaniach.
- **Rodzaje** (kolejność tabeli to kolejność pomieszczeń w Obchodzie, na listach i w wyborze kolejnego pytania; pomieszczenia tego samego rodzaju w kolejności dodania):

| Rodzaj | EN | Zestawy |
|---|---|---|
| Przedpokój | Entryway | wejście, korytarz |
| Korytarz | Hallway | korytarz |
| Kuchnia | Kitchen | kuchnia, stół jadalny |
| Spiżarnia | Pantry | schowek |
| Jadalnia | Dining room | podstawa pokoju, stół jadalny |
| Salon | Living room | podstawa pokoju, kanapa, regał |
| Pokój | Room | podstawa pokoju, łóżko, biurko, kanapa, regał, szafa |
| Sypialnia | Bedroom | podstawa pokoju, łóżko, szafa |
| Pokój dziecka | Kids' room | podstawa pokoju, łóżko, biurko, szafa |
| Gabinet | Study | podstawa pokoju, biurko, regał |
| Garderoba | Walk-in closet | podstawa pokoju, szafa |
| Łazienka | Bathroom | łazienka |
| Toaleta | Toilet | toaleta |
| Pralnia | Laundry room | schowek |
| Schody | Stairs | schody |
| Schowek | Storeroom | schowek |
| Piwnica | Basement | schowek |
| Strych | Attic | schowek |
| Balkon | Balcony | balkon |
| Taras | Terrace | balkon |
| Garaż | Garage | garaż |
| Ogródek | Garden | ogródek |

- **Pokój** jest najszerszy: ma wszystkie zestawy pokojowe. Na liście rodzajów jest pierwszy, z podpisem "Dowolny, gdy nic innego nie pasuje". Pozostałe rodzaje alfabetycznie według języka apki (sortowanie zgodne z językiem, `Intl.Collator`, nie stała kolejność).
- **Ikona**: każdy rodzaj ma własną ikonę (7.4).
- **Kolor** należy do pomieszczenia, nie do rodzaju: dwie sypialnie mają różne kolory, żeby przejście z jednej do drugiej było widać (4.5). Jest siedem kolorów pomieszczeń, wyraźnie różnych od siebie (13.1). Nowe pomieszczenie dostaje pierwszy kolor, którego nie ma żadne pomieszczenie; gdy zajęte są wszystkie, ten używany najrzadziej (przy remisie pierwszy z nich). Bez usuwania wychodzi po kolei: pierwsze pomieszczenie kolor 1, siódme kolor 7, ósme znowu kolor 1. Kolor zostaje przy zmianie rodzaju i nazwy, zmienia się tylko ręcznie. Grupy (7.6) mają własne, stałe odcienie.
- **Dodawanie**: przycisk "Nowe pomieszczenie" otwiera okno na cały ekran: pole nazwy (opcjonalne, nad przewijaną częścią, żeby klawiatura go nie zasłaniała), wybór koloru (siedem kółek wypełnionych jak karta przejścia, zaznaczony kolor proponowany jak wyżej) i lista rodzajów z ikonami, przyciski "Anuluj" i "Dodaj" (aktywny po wybraniu rodzaju). Rodzaje na liście są szare, bo nie mają koloru; wybrany rodzaj podświetla się kolorem pomieszczenia. Przy dużej czcionce rodzaje w jednej kolumnie zamiast dwóch.
- **Nazwa**: bez wpisanej nazwy pomieszczenie nazywa się jak rodzaj, a kolejne tego samego rodzaju dostają numer: "Sypialnia", "Sypialnia 2". Nazwa domyślna jest tłumaczona razem z apką, wpisana zostaje tak, jak ją wpisano (12.4). Pod polem podpowiedź "Domyślnie: Sypialnia 2".
- **Edycja**: stuknięcie w pomieszczenie na liście otwiera to samo okno, z nazwą, kolorem, rodzajem i przyciskiem "Usuń".
- **Zmiana rodzaju**: pytania wspólne dla starego i nowego rodzaju zachowują stan i historię. Pytania tylko ze starego rodzaju przestają przychodzić, ale ich stan zostaje; po powrocie do tamtego rodzaju wracają z nim. Pytania nowe dla pomieszczenia startują jak w nowo dodanym. Bez ostrzeżenia, bo nic nie przepada.
- **Usuwanie**: po potwierdzeniu z opisem skutku ("Pytania o Sypialnię przestaną przychodzić"). Pytania znikają z puli, Obchodu i porządków, historia zostaje w danych. Ponowne dodanie tworzy nowe pomieszczenie, od zera.
- **Co najmniej jedno pomieszczenie**: w kreatorze "Dalej" jest aktywne od pierwszego dodanego, w ustawieniach ostatniego nie da się usunąć.
- **Nowe pomieszczenie po onboardingu**: jego pytania wchodzą do puli z rozłożonym startem (8.1).
- **Nazwa pomieszczenia nie występuje w treści pytania.** Jest etykietą nad pytaniem na karcie i nazwą na karcie przejścia. Dzięki temu nazwy nadane przez użytkownika nie wymagają odmiany.

### 7.6. Pytania poza pomieszczeniami

- Pralka, komputer, samochód, dziecko czy zwierzę są zwykle jedne na mieszkanie, więc ich pytania nie są przypisane do pomieszczenia ani powielane.
- Grupy: Pranie, Komputer i drobna elektronika, Sprzęt do sprzątania, Klimatyzacja i powietrze, Samochód, Dziecko, Zwierzęta. Etykietą na karcie jest nazwa grupy w krótszej postaci, jak w Cleanerr (np. „Komputer i elektronika”, EN „Computer & devices”, „Kids”); przełączniki mają pełne nazwy z katalogu.
- **Przełączniki** (krok "Sprzęty i domownicy" w kreatorze, 10, i ustawienia): lista z ikonami, na start wszystko wyłączone. Każda grupa ma swój przełącznik, żadna nie jest obowiązkowa. Obok jest zmywarka, od której zależą pytania w kuchni.
- Przełączniki mogą być zagnieżdżone; podrzędny widać dopiero po włączeniu nadrzędnego: Pranie → Pralka, Komputer i drobna elektronika → Komputer, Sprzęt do sprzątania → Robot sprzątający, Klimatyzacja i powietrze → Klimatyzacja, Nawilżacz powietrza, Oczyszczacz powietrza, Zwierzęta → Kot, Pies, Zwierzę w klatce, Akwarium, Dziecko → Niemowlę.
- Pytanie jest aktywne, gdy włączona jest jego grupa (jeśli ma grupę) i sprzęt lub cecha, której wymaga (jeśli wymaga).
- **Przełącznik podrzędny liczy się jako włączony tylko wtedy, gdy włączony jest też nadrzędny.** Dotyczy to także pytań w pomieszczeniach: "Czy trawnik jest wolny od psich kup?" w Ogródku wymaga Psa, więc przy wyłączonych Zwierzętach nie przychodzi. Wyłączenie nadrzędnego nie kasuje zapisanych podrzędnych: po ponownym włączeniu wracają takie, jakie były (jak przy zmianie rodzaju pomieszczenia, 7.5). Stan przełączników rozstrzyga `core` (czysta funkcja z testami), UI tylko go pokazuje.

### 7.7. Katalog pytań

- **Katalog jest w `docs/cleaneh-questions.md`**: dla każdego pytania identyfikator, treść PL i EN, polecenie PL i EN, czas, interwał bazowy, priorytet, wymagany sprzęt lub cecha, sezon (gdzie dotyczy), etap, flaga ★ i zestaw albo grupa. Na końcu tabele przełączników oraz rodzajów pomieszczeń z ich zestawami (7.5).
- Ok. 245 pytań w sekcjach według zestawów oraz Poza pomieszczeniami.
- **MVP używa całego katalogu.** Liczba pytań to dane, nie kod, a zachowanie puli warto sprawdzać od początku na docelowej wielkości.
- **Katalog jest zaakceptowany** (przejęty z Cleanerr bez zmian merytorycznych). Zmiany treści, czasów, interwałów czy zestawów wymagają akceptacji właściciela projektu.
- Skrypt Node w `tools/` tworzy z katalogu dane dla `core` (identyfikatory i metadane) oraz teksty pytań i poleceń w plikach tłumaczeń. Wynik to zwykłe moduły JS zapisane w repozytorium, bo apka nie ma kroku budowania. Wygenerowanych plików nie edytuje się ręcznie; po zmianie katalogu uruchamia się generator, a test sprawdza, że wynik jest aktualny.

### 7.8. Sezonowość

- Pytanie może mieć sezon: zakres miesięcy, w których jest aktywne (np. V–IX dla koszenia trawnika, XII–III dla odśnieżania). Zakres może przechodzić przez koniec roku.
- Pytanie poza sezonem nie trafia do puli ani do Obchodu i nie zmienia stanu.
- Po wejściu w sezon pytanie startuje jak nowe, z rozłożonym startem (patrz 8.1), żeby wszystkie pytania sezonowe nie spadły naraz.

## 8. Harmonogram i dobór pytań

### 8.1. Pula

- Do puli trafiają pytania aktywne (nie wyłączone, w sezonie), którym minął interwał od ostatniego TAK lub ZROBIONE. Pytania z odpowiedzią NIE lub NIE TERAZ zostają w puli.
- Przeterminowanie liczone jest od ostatniego TAK lub ZROBIONE, nie od ostatniej odpowiedzi. NIE TERAZ, X i porzucona seria nie zerują go.
- **Rozłożony start.** Pytania, które nie były w pierwszym Obchodzie (oraz pytania wchodzące w sezon i pytania nowego pomieszczenia), dostają datę ostatniego TAK losowaną z przedziału [dziś − interwał bazowy, dziś]. Wchodzą do puli stopniowo, a nie wszystkie naraz.

### 8.2. Losowanie ważone

Waga pytania rośnie z tym, jak bardzo jest "po terminie" (czas od ostatniego TAK lub ZROBIONE podzielony przez interwał), i jest mnożona przez priorytet.

Wartości startowe (do dostrojenia):
- waga = (min(przeterminowanie, 4))² × priorytet, gdzie priorytet higieniczny = 3, zwykły = 1
- górny limit przeterminowania (4) chroni przed sytuacją, w której pytania zaniedbane od dawna dominują losowanie (ważne po dłuższej przerwie w używaniu apki)
- w serii: waga × 2 dla pytań z tego samego pomieszczenia lub grupy co poprzednie pytanie

### 8.3. Adaptacyjne interwały

Interwały uczą się z odpowiedzi, podobnie jak w aplikacjach do powtórek rozłożonych w czasie (Anki, SuperMemo), z uwzględnieniem rzeczywistego czasu od ostatniego sprzątania (E dni):

- **TAK po E dniach** — miejsce wytrzymuje co najmniej E dni: interwał = max(interwał × 1,3, E). Wyjątki: TAK w Obchodzie (patrz 6.5) i TAK przed terminem (generalne porządki pytają też o to, co jeszcze nie jest pilne). Takie TAK nic nie mówi o zbyt krótkim interwale, więc interwał zostaje, a liczy się od teraz.
- **NIE po E dniach** — zapamiętywane jest pierwsze E w danym cyklu. Przy najbliższym sprzątaniu (ZROBIONE albo późniejsze TAK, czyli posprzątane poza apką) interwał = min(interwał, E × 0,75). NIE długo po terminie nie skraca więc interwału, bo nie wiadomo, kiedy miejsce się zabrudziło.
- Interwał ma minimum i maksimum.

Wartości startowe (do dostrojenia): mnożniki 1,3 i 0,75, granice: 1 dzień do 4× interwału bazowego.

Dlaczego nie same mnożniki: apka zwykle pyta po terminie (w Cleaneh tym bardziej, bo pyta tylko wtedy, gdy ktoś ją otworzy), więc przy stałych mnożnikach NIE pada często, a interwały zbiegają do ok. połowy prawdziwych i pula rośnie. Pokazała to symulacja w testach Cleanerr (wariant z mnożnikami może zostać w kodzie jako opcja do porównań).

### 8.4. Kalibracja czasu zadań

Szacowany czas zadania uczy się z rzeczywistego czasu wykonania.

- Każda instancja pytania (pytanie w konkretnym pomieszczeniu) ma własny szacowany czas; startowo z katalogu. Odkurzenie dużego salonu i małej sypialni to różne czasy.
- Po ZROBIONE: nowy szacunek = 0,7 × dotychczasowy + 0,3 × rzeczywisty. Rzeczywisty to czas od startu do ZROBIONE, cały, także ponad szacunek (4.2).
- Pomiary odstające są pomijane: krótsze niż 1/3 albo dłuższe niż 3× bieżącego szacunku (kliknięcie od razu po starcie, zapomniane ZROBIONE). "Odpuszczam" niczego nie uczy.
- Granice: od 0,5× do 2× czasu z katalogu, co najmniej 1 minuta, najwyżej 30 minut.
- Wyuczony czas jest używany wszędzie: karta pytania, propozycja zadania, karta przejścia w porządkach, podsumowania, plan generalnych porządków. Ekran stopera go nie pokazuje (4.2).

## 9. Instalacja, offline i dane

Cleaneh nie ma powiadomień (2, 3). Zamiast rozdziału o powiadomieniach i ich niezawodności jest ten.

### 9.1. Instalacja

- Cleaneh działa w zwykłej karcie przeglądarki, ale jest pomyślany jako apka na ekranie głównym: manifest z nazwą, ikoną (domek z iskrą, wersja zwykła i maskowalna), kolorami motywu, trybem pełnoekranowym bez paska przeglądarki (`standalone`) i orientacją pionową.
- **Android (Chrome)**: przycisk "Zainstaluj apkę" otwiera systemowe okno instalacji (`beforeinstallprompt`). **iPhone (Safari 16.4+)**: krótka instrukcja "Udostępnij → Do ekranu początkowego" z ikonami. Inne przeglądarki: ogólna wskazówka albo nic.
- Zachęta do instalacji w onboardingu (10) i w ustawieniach, tylko gdy apka nie jest zainstalowana (tryb wyświetlania inny niż `standalone`). Bez banerów i bez powtarzania.
- Dlaczego warto: ikona na ekranie głównym telefonu to jedyne przypomnienie, jakie Cleaneh ma, a zainstalowana apka ma trwalsze dane (9.3).

### 9.2. Offline i aktualizacje

- Service worker trzyma całą apkę (kod, krój, ikony) w pamięci podręcznej. Po pierwszym wczytaniu apka działa bez internetu.
- Wersja apki jest w service workerze: lista plików apki i skrót ich zawartości w nazwie pamięci podręcznej. Wpisuje je skrypt z `tools/` (`npm run stamp`), więc każda zmiana pliku apki to nowa wersja. Bez kroku budowania łatwo o to zapomnieć, dlatego test sprawdza, że lista i skrót zgadzają się z plikami apki.
- Nowa wersja pobiera się w tle i włącza przy następnym otwarciu apki, bez pytania użytkownika. Nigdy w trakcie serii, zadania, Obchodu ani porządków.
- Zmiana schematu danych to nowa wersja schematu z migracją (13.3).

### 9.3. Dane

- Wszystko w IndexedDB przeglądarki, tylko na tym urządzeniu i w tej przeglądarce. Bez konta i bez synchronizacji między urządzeniami.
- Po onboardingu apka prosi o trwałe miejsce (`navigator.storage.persist()`). Zainstalowane apki zwykle dostają je bez pytania.
- Ryzyko utraty danych: wyczyszczenie danych przeglądarki, a na iPhonie usunięcie danych strony nieużywanej przez 7 dni, jeśli nie jest dodana do ekranu głównego. Zabezpieczeniem na później jest eksport i import kopii (16, 19).
- "Zacznij od nowa" usuwa wszystkie dane apki.

### 9.4. Prywatność

- Bez serwera, konta, analityki, ciasteczek i zapytań do obcych serwerów (krój i ikony są częścią apki).
- Sieć jest potrzebna tylko do pobrania apki i jej aktualizacji.

### 9.5. Możliwości przeglądarki

- **Wibracja** (`navigator.vibrate`) działa na Androidzie; na iPhonie jej nie ma, apka po prostu z niej nie korzysta.
- **Dźwięk** nagród syntezowany na bieżąco (Web Audio), bez plików audio; zawsze po stuknięciu użytkownika (wymóg przeglądarek); wyłączany w ustawieniach (5.2).
- **Motyw** jasny albo ciemny według systemu (`prefers-color-scheme`). **Animacje ciągłe** (falujące plamy) wyłączone przy `prefers-reduced-motion`; krótkie przejścia zostają, skrócone.
- **Gesty**: przeciąganie kart nie może uruchamiać przewijania strony, odświeżania przeciągnięciem w dół (NIE TERAZ to przesunięcie w dół) ani gestu "wstecz" przeglądarki (`touch-action`, `overscroll-behavior`).
- **Wstecz** (przycisk i gest na Androidzie) zamyka okno albo wraca do poprzedniego ekranu, jak w natywnej apce; nawigacja przez historię przeglądarki. Na ekranie głównym apki Wstecz ją zamyka. W Obchodzie Wstecz działa jak X (przerwanie z zapisem), nie jak cofnięcie odpowiedzi.
- **Bezpieczne marginesy** (wycięcia ekranu, pasek gestów) przez `env(safe-area-inset-*)` i `viewport-fit=cover`.
- **Czcionka**: układ znosi powiększenie tekstu w przeglądarce i systemie (do ok. 130%).

## 10. Onboarding

Cel: od pierwszego otwarcia do pierwszego zadania w kilka minut. Konfiguracja tylko tam, gdzie bez niej nie wiadomo, o co pytać: pomieszczenia i sprzęty.

1. **Powitanie** (jeden ekran): jak działa apka w trzech punktach (jedno miejsce naraz; NIE to krótkie zadanie na kilka minut albo NIE TERAZ bez kary; apka uczy się mieszkania) i "Zaczynamy".
2. **Pomieszczenia** — "Dodaj pomieszczenia, które będziesz sprzątać", przycisk "Nowe pomieszczenie" (7.5), pod nim lista dodanych. Na start lista jest pusta. "Dalej" od pierwszego pomieszczenia.
3. **Sprzęty i domownicy** — przełączniki z 7.6, wszystkie wyłączone; "Dalej".
4. **Pierwszy Obchód** — pytania ★ z wybranych pomieszczeń i grup.
5. **Na ekranie głównym** — tylko gdy apka nie jest zainstalowana: "Cleaneh nie wysyła przypomnień. Ikona na ekranie głównym przypomni sama, a dane będą bezpieczniejsze." Przycisk instalacji albo instrukcja (9.1) i "Pomiń".
6. **Podsumowanie Obchodu** z propozycją pierwszego zadania.

Kroki 2–3 są przed Obchodem, bo bez nich nie wiadomo, o co pytać. Krok 5 jest po Obchodzie, a przed jego podsumowaniem (najpierw wartość, potem prośba), i można go pominąć. Po onboardingu apka prosi o trwałe miejsce na dane (9.3). Przerwany kreator wraca przy następnym otwarciu w tym samym kroku. Reset ("Zacznij od nowa") zaczyna od kroku 2.

Ekrany z kroków 2 i 3 są tymi samymi ekranami co "Pomieszczenia" i "Sprzęty i domownicy" w ustawieniach.

Dalsze dopasowanie w trakcie używania: NIE MAM przy pytaniu, kolejne Obchody, edycja pomieszczeń i przełączników w ustawieniach.

## 11. Podsumowania i historia

- Po serii: "Dziś 3 zadania, 22 minuty".
- Na ekranie głównym: podsumowanie dnia albo ostatnie sprzątanie (5.1).
- Bez streaków. Ewentualne cele są elastyczne, nie ciągłe.
- Historia odpowiedzi jest zapisywana od początku (na potrzeby przyszłego rankingu zaniedbań), nawet jeśli MVP jej nie wyświetla. Zapisywany jest też rzeczywisty czas zadań (od startu do ZROBIONE).

## 12. Wersje językowe

### 12.1. Zakres

- Dwa języki: angielski i polski.
- Angielski jest językiem domyślnym (fallback), używanym, gdy żaden z języków przeglądarki nie jest obsługiwany.
- Domyślnie apka bierze język z ustawień przeglądarki (`navigator.languages`, pierwszy obsługiwany). Użytkownik może go zmienić w ustawieniach apki; wybór jest zapamiętany. Atrybut `lang` dokumentu zgodny z językiem apki.

### 12.2. Teksty interfejsu

- Wszystkie teksty w plikach tłumaczeń (angielski i polski), także w narzędziach deweloperskich. Żadnych tekstów zaszytych w kodzie.
- Brakujące tłumaczenie to błąd w testach (oba języki mają ten sam zestaw kluczy, z tymi samymi parametrami).
- Liczebniki przez reguły liczby mnogiej (`Intl.PluralRules`). Polski ma trzy formy (1 zadanie, 2 zadania, 5 zadań) plus ułamki, angielski dwie. Konstrukcje typu "zadań: 3" są niedopuszczalne jako obejście.
- Daty, godziny i czas trwania formatowane przez `Intl` zgodnie z językiem apki, nie ręcznie.

### 12.3. Neutralność płciowa po polsku

Polskie czasowniki w czasie przeszłym mają rodzaj ("Skończyłeś?" / "Skończyłaś?"). Apka nie pyta o płeć, więc teksty są formułowane neutralnie:

- "Skończyłeś?" → "Gotowe?"
- "Zrobiłeś to?" → "Zrobione?"
- "Ostatnio sprzątałeś…" → "Ostatnie sprzątanie: …"
- Unikamy form osobowych czasu przeszłego, preferujemy formy bezosobowe, tryb rozkazujący i rzeczowniki.

Pytania w katalogu i tak są neutralne, bo pytają o stan rzeczy ("Czy blat jest czysty?"), nie o działanie użytkownika.

### 12.4. Katalog pytań a języki

- `core` nie zawiera tekstów. Pytania w katalogu mają stabilne identyfikatory, a treść jest w plikach tłumaczeń, w obu językach (generowanych z katalogu, 7.7).
- Nazwy rodzajów pomieszczeń, grup i sprzętów też są tłumaczone.
- Nazwy pomieszczeń nadane przez użytkownika są zapisywane tak, jak je wpisano, bez tłumaczenia.
- Zmiana języka nie wpływa na stan pytań, interwały ani historię.

### 12.5. Nazewnictwo

- Nazwa apki: Cleaneh w obu językach.
- Tryb przeglądu: "Obchód" (PL), "Sweep" (EN). Generalne porządki: "Porządki" (PL, w nagłówku trybu "Generalne porządki"), "Big clean" (EN).
- Odpowiedzi PL: TAK / NIE / NIE TERAZ / NIE MAM / ZROBIONE.
- Odpowiedzi EN: YES / NO / NOT NOW / N/A / DONE.
- Koniec serii: ikona X, opis dostępności "Zakończ" (PL), "Stop" (EN).
- Karta przejścia: "Przejdź do" / "Head to", przycisk "Dalej" / "Next".

### 12.6. Ton komunikatów

Ciepły, krótki, z lekkim humorem, nigdy oceniający ani zawstydzający. W obu językach ten sam charakter, ale teksty pisane naturalnie dla danego języka, nie tłumaczone dosłownie.

### 12.7. Interfejs

- Układ musi znosić teksty różnej długości. Polskie teksty bywają o kilkadziesiąt procent dłuższe od angielskich.
- Na niskim ekranie albo przy dużej czcionce najpierw maleje dekoracja (plamy z ikonami), tekst i przyciski zostają całe.

## 13. Technologia

### 13.1. Stack i wygląd

- **Vanilla JS.** Czysty JavaScript (moduły ES, `<script type="module">`), HTML i CSS. Bez frameworka, bez TypeScriptu, bez bundlera i bez kroku budowania: pliki z repozytorium są dokładnie tym, co dostaje przeglądarka.
- **UI:** własne, małe komponenty na DOM (funkcje tworzące elementy i odświeżające je ze stanu). Animacje przez przejścia i animacje CSS oraz Web Animations API, gesty kart przez Pointer Events, konfetti na `<canvas>`, dźwięk przez Web Audio.
- **PWA:** ręcznie napisany `manifest.webmanifest` i service worker (lista plików apki ze skrótem zawartości w nazwie pamięci podręcznej, 9.2).
- **Dane:** IndexedDB przez własną, cienką nakładkę na obietnicach.
- **Biblioteki w apce:** żadnych. Wyjątek tylko z uzasadnieniem w specyfikacji.
- **Narzędzia tylko deweloperskie** (nie trafiają do apki): Node w wersji LTS, testy jednostkowe na wbudowanym `node:test` (bez zależności), Playwright do przebiegów w przeglądarce i zrzutów ekranu, prosty serwer plików do pracy lokalnej, ESLint. Lint ma być czysty.
- **Typy i dokumentacja:** komentarze JSDoc przy modelu danych i publicznych funkcjach `core`.
- **Hosting:** GitHub Pages (statyczny, przez HTTPS). Apka działa pod podścieżką (`…github.io/Cleaneh/`), więc wszystkie ścieżki w apce, manifeście i service workerze są względne.
- **Przeglądarki:** Chrome na Androidzie (główny cel), Safari na iOS 16.4+, aktualne Chrome, Firefox, Safari i Edge na komputerze (układ wyśrodkowany, szerokość telefonu).
- **Rozmiar:** cała apka z krojem i ikonami najwyżej kilka MB; kod rzędu kilkudziesięciu kB po kompresji.

Wygląd (przejęty z Cleanerr 1.4): ma być bardzo ładnie i atrakcyjnie.

- Własna identyfikacja wizualna, jasny i ciemny motyw według systemu.
- Paleta: morska zieleń (marka), morela dla NIE (nigdy alarmowa czerwień), lawenda dla NIE MAM, ciepłe "papierowe" tło. Kolor lawendowy należy do generalnych porządków, zielony do zadań i Obchodu.
- Krój Nunito (SIL OFL, licencja dołączona do apki), plik zmienny w WOFF2, z własnego serwera apki.
- Ikony (7.4) na organicznych plamach (`IconBlob`: dwie nakładające się, łagodnie falujące plamy w kolorze obszaru); ikona apki: domek z iskrą.
- Każde pomieszczenie ma jeden z siedmiu kolorów, każda grupa własny odcień: etykiety, plamy, delikatna poświata tła w kolorze obszaru, karta przejścia.
- Ruch: przeciąganie kart z pieczątkami odpowiedzi i przechyłem, karty za kartą w stosie, sprężyste animacje, wibracja przy przekroczeniu progu (Android). Nagrody pełnoekranowe: konfetti, fala, syntezowany dźwięk, wibracja.

**Kolory** (wartości z Cleanerr 1.4):

| Rola | Jasny | Ciemny |
|---|---|---|
| Marka (primary / kontener) | #0E7C76 / #B8EDE6 | #7DD6CD / #00504C |
| Tło | #FBF8F3 | #0F1617 |
| Karta | #FFFFFF | #0A1011 |
| TAK (kolor / kontener) | #1C9A72 / #CFF5E5 | #6FDCB1 / #123F31 |
| NIE | #DB7130 / #FFE2CF | #FFB68B / #4A2410 |
| NIE MAM | #6E6A9E / #E7E4F7 | #C4C0FF / #2C2A4A |
| NIE TERAZ | #5F7279 / #E3EAEC | #B4C5CB / #26333A |
| Lawenda porządków (nagrody, gradient) | #9B7FE0 → #4B3C9A, przycisk #5B45B0 | jak w jasnym |

Kolory obszarów z odcienia H i nasycenia S (HSL):
- jasny: kolor hsl(H, 0,9·S, 36%), kontener hsl(H, S, 90%), tekst na kolorze biały;
- ciemny: kolor hsl(H, min(S+0,1; 1), 76%), kontener hsl(H, 0,5·S, 22%);
- wypełnienie karty przejścia i kółek koloru (gradient z góry na dół, pod białym tekstem), z jasnością F: jasny hsl(H, S, F) → hsl(H, S, F−12%), ciemny hsl(H, 0,75·S, F−8%) → hsl(H, 0,7·S, F−18%).

| Kolor pomieszczenia (kolejność przydziału) | H | S | F |
|---|---|---|---|
| 1. niebieski | 210 | 0,62 | 50% |
| 2. koralowy | 4 | 0,62 | 54% |
| 3. zielony | 142 | 0,42 | 40% |
| 4. bursztynowy | 34 | 0,78 | 46% |
| 5. fioletowy | 266 | 0,46 | 56% |
| 6. morski | 180 | 0,55 | 36% |
| 7. różowy | 326 | 0,50 | 52% |

| Grupa | H | S |
|---|---|---|
| Pranie | 210 | 0,60 |
| Komputer i drobna elektronika | 235 | 0,50 |
| Sprzęt do sprzątania | 170 | 0,55 |
| Klimatyzacja i powietrze | 185 | 0,60 |
| Samochód | 5 | 0,65 |
| Dziecko | 46 | 0,85 |
| Zwierzęta | 25 | 0,50 |

Grupy dzielą odcienie z kolorami pomieszczeń (np. Pranie i niebieski); przy 7 + 7 kolorach nie da się tego uniknąć, a nazwa i ikona na karcie przejścia je rozróżniają.

### 13.2. Architektura

- **`src/core`** — czysty JavaScript (moduły ES, działające i w przeglądarce, i w Node do testów): bez DOM, bez API przeglądarki i bez tekstów. Cała logika decyzyjna, przeniesiona z `:core` Cleanerr razem z testami: katalog (pytania, zestawy, rodzaje, grupy, przełączniki, etapy), mieszkanie (pomieszczenia ze stałym id, rodzajem, numerem, nazwą i kolorem; obszar = pomieszczenie po id albo grupa), harmonogram (pula, wagi, interwały, sezony, rozłożony start, kalibracja czasu), pętla (czysta maszyna stanów serii, zadania ze stoperem i generalnych porządków), Obchód z cofaniem, plan porządków, ostatnie sprzątanie (5.1). Czas przez interfejs zegara, losowość przez generator z ziarnem: nigdy `Date.now()` ani `Math.random()` bezpośrednio w `core`.
  - Różnice względem Cleanerr: bez slotów, powiadomień, pochodzenia serii (powiadomienie / apka), limitu pytań w powiadomieniu, ustawień slotów i modułu położenia. Porzuconą serię, porządki i zapomniane zadanie zamyka zdarzenie "otwarcie apki" (4.3), a nie slot.
- **`src/data`** — IndexedDB: magazyny z 13.3, zapis tylko zmian. Bieżąca aktywność i Obchód w toku jako JSON z dyskryminatorem `kind`. Obszar zapisany jako tekst `room#3` / `group#LAUNDRY`.
- **`src/engine`** — jedyne miejsce, które zmienia stan: wczytaj, wywołaj `core`, zapisz wynik. Wywołania po kolei, także między kartami przeglądarki (Web Locks, `navigator.locks`), potem sygnał dla innych kart (`BroadcastChannel`).
- **`src/ui`** — ekrany i komponenty, motyw, teksty z plików tłumaczeń. Cienka warstwa wywołująca silnik, bez własnej logiki decyzyjnej (o tym, co jest w puli, co dalej i co się zmienia, decyduje `core`).
- **`tools/`** — generator katalogu (7.7).

Zasada: cała logika decyzyjna jest w `core` i jest pokryta testami jednostkowymi. Wśród testów jest symulacja kilkudziesięciu dni używania na pełnym katalogu, sprawdzająca, czy pula pozostaje pod kontrolą. Profile dopasowane do Cleaneh: otwiera apkę codziennie na jedną serię, co kilka dni na dłużej, robi porządki raz w tygodniu, znika na dwa tygodnie i wraca.

### 13.3. Dane

- **Pomieszczenia**: identyfikator (stały, nigdy ponownie użyty, daje też kolejność dodania), rodzaj, numer w obrębie rodzaju (do nazwy domyślnej), nazwa wpisana (opcjonalnie), kolor (0–6), flaga usunięcia.
- **Przełączniki**: grupy, sprzęty i cechy, które są włączone.
- **Stan instancji pytania** (klucz: identyfikator pytania + obszar): interwał, data ostatniego TAK lub ZROBIONE (także sztuczna z rozłożonego startu), pierwsze E z NIE w cyklu (8.3), wyłączenie (NIE MAM), początek sezonu, wyuczony czas zadania, data ostatniego prawdziwego TAK lub ZROBIONE (do porządków, 4.4).
- **Historia**: odpowiedzi (z rzeczywistym czasem zadań przy ZROBIONE), serie, Obchody.
- **Bieżąca aktywność**: pytanie, propozycja zadania albo zadanie ze stoperem (godzina startu i szacowanego końca, ten drugi tylko do progu zapomnianego zadania, 4.3), z serią i postępem porządków; Obchód w toku z odpowiedziami do cofania.
- **Ustawienia**: język, dźwięk i wibracja, krok onboardingu, czy zachęta do instalacji była już pokazana.
- **Wersja schematu** z migracjami. Brakująca migracja ma się wywrócić z błędem, nigdy po cichu kasować danych. Każda migracja ma test (stara baza z przykładowymi danymi otwierana jak w apce).

### 13.4. Tryb deweloperski

Tylko w wersji deweloperskiej; w prawdziwej apce go nie ma. Wersja deweloperska to serwer deweloperski (`localhost`, `127.0.0.1`) albo dowolny adres z `?dev` (GitHub Pages nie ma podglądów wdrożeń, więc na telefonie: wdrożona apka z `?dev`, w przeglądarce, nie z ikony). Na serwerze deweloperskim dane są osobne same z siebie, bo inny adres to osobne miejsce w przeglądarce; pod `?dev` apka używa osobnej bazy (`cleaneh-dev`, z własną kolejką i kanałem kart), więc prawdziwe dane zostają nietknięte.

Wejście: sekcja „Dla programistów” na końcu Ustawień, ekran `/settings/dev`, podgląd puli `/settings/dev/pool`. Pokrętła (miesiąc, motyw, ostatnie sprzątanie na niby) trzyma `localStorage` tej przeglądarki, poza danymi apki i bez migracji; inne karty idą za zmianą.

- **Przesunięcie czasu** (+12 h, +1 dzień, +1 tydzień): zegar zostaje prawdziwy, a stan pytań się starzeje (daty ostatniego sprzątania cofają się o tyle). Dla harmonogramu to to samo co upływ czasu, a stoper i podsumowanie dnia działają normalnie. Tylko gdy nic nie trwa (bez serii, zadania i Obchodu w toku); inaczej krótka informacja, że coś trwa. Historia odpowiedzi się nie zmienia.
- **Podmiana bieżącego miesiąca** (test sezonowości): sezony liczą się według wybranego miesiąca.
- **Szybkie przełączanie** języka (to samo ustawienie co w Ustawieniach, apka się przeładowuje) i motywu (systemowy, jasny, ciemny; od razu, bez przeładowania).
- **Podgląd puli**: aktywne pytania z interwałem, przeterminowaniem, wagą i szacowanym czasem; najpierw te w puli, według wagi.
- **Ostatnie sprzątanie na niby**: ustawienie czasu ostatniego ZROBIONE (godzina, 2 dni, 2 tygodnie temu, albo prawdziwe), żeby obejrzeć wszystkie warianty linijki z 5.1. Zastępuje prawdziwy czas tylko w tej linijce, historia się nie zmienia; ekran pokazuje, jak linijka brzmi. „Nigdy” i „przed chwilą” widać naturalnie (nowe mieszkanie, świeże ZROBIONE).

### 13.5. Cleanerr a Cleaneh

- Brak migracji danych (0).
- Logika i testy przenoszone z `:core` Cleanerr; wartości strojenia (wagi, mnożniki, progi 15 min / 2 h) te same. Zmiany zachowania względem Cleanerr najpierw w tej specyfikacji.

## 14. Środowisko i proces pracy

### 14.1. Środowisko

- Windows, Git Bash i PowerShell. Node (LTS) i npm tylko dla narzędzi deweloperskich (testy, Playwright, lint).
- Telefon testowy: Xiaomi Redmi Note 10 (Android 11, MIUI, Chrome).
- Wersja deweloperska na telefonie: najprościej wdrożona apka z `?dev` (HTTPS, osobna baza, 13.4). Serwer deweloperski w sieci lokalnej (też z `?dev`) działa, ale bez service workera, instalacji i trwałego miejsca, bo te wymagają HTTPS albo `localhost`.
- Testy i zrzuty ekranu bez telefonu: Playwright z emulacją telefonu.

### 14.2. Praca z Claude Code

- Projekt budowany w całości przez Claude Code. Ten dokument jest główną specyfikacją, `docs/cleaneh-questions.md` katalogiem pytań, a `CLAUDE.md` zawiera skrót zasad.
- Zmiana zachowania apki najpierw w specyfikacji, potem w kodzie. Rozbieżność między kodem a specyfikacją zgłaszać, nie rozstrzygać po cichu.
- Pętla: zmiana → testy (`node --test`) → lint → zrzuty Playwright → telefon na koniec.
- Zrzuty ekranu na stałych rozmiarach: 393×820 (jak Redmi), mały telefon 360×616, ten sam z czcionką 130%; wybrane ekrany także w ciemnym motywie i po angielsku. Przy zmianach układu najpierw zrzuty, telefon na koniec.
- W testach przeglądarkowych animacje ciągłe wyłączone (emulacja `prefers-reduced-motion`), żeby zrzuty były powtarzalne.
- Teksty od pierwszego ekranu w obu językach, z zachowaniem zasad z sekcji 12 (szczególnie 12.3).
- Małe kroki, commit po każdym działającym etapie. Push tylko na wyraźne polecenie.

### 14.3. Kolejność budowy

0. Przegląd tej specyfikacji i katalogu w nowym repozytorium; `CLAUDE.md` ze skrótem zasad.
1. Szkielet: `index.html`, moduły ES, CSS z motywem, manifest i service worker, pusty ekran działający offline; `node:test`, Playwright, ESLint i lokalny serwer plików. Pierwsze wdrożenie podglądu i otwarcie na telefonie.
2. `core` z testami: port logiki z Cleanerr (model, pomieszczenia z kolorami, grupy, pula, sezonowość, rozłożony start, losowanie, interwały, kalibracja, pętla, przypadki brzegowe z 4.3, Obchód z cofaniem, plan porządków, ostatnie sprzątanie, symulacja). Generator katalogu.
3. Dane i silnik: IndexedDB, zapis stanu, migracje, kolejka wywołań między kartami, testy.
4. Wygląd: motyw, kolory, krój, ikony, plamy, karty z gestami, przyciski odpowiedzi, i18n.
5. Obchód: karty, gesty, przyciski, postęp, cofanie, karta przejścia, podsumowanie.
6. Ekran główny: "Daj mi zadanie", seria, propozycja zadania, stoper, nagrody, podsumowanie dnia i ostatnie sprzątanie.
7. Onboarding, w tym zachęta do instalacji i trwałe miejsce na dane.
8. Ustawienia: pomieszczenia (z kolorami), przełączniki, wyłączone pytania, język, dźwięk i wibracja, instalacja, zacznij od nowa, Obchód jednego pomieszczenia.
9. Generalne porządki (4.4).
10. Tryb deweloperski.
11. Dopracowanie PWA: aktualizacje, offline, instalacja na Androidzie i iPhonie, sprawdzenie gestów i przycisku Wstecz na telefonie.

## 15. Zakres MVP

- Pełny katalog (ok. 245 pytań) w dwóch językach, z sezonowością
- Wszystkie rodzaje pomieszczeń, w tym wielokrotne z nazwami i kolorami, oraz grupy poza pomieszczeniami
- Ekran główny z "Daj mi zadanie", podsumowaniem dnia i ostatnim sprzątaniem
- Seria pytań z preferencją tego samego pomieszczenia i kartą przejścia
- Odpowiedzi TAK / NIE / NIE TERAZ / NIE MAM i X
- Stoper zadania liczący w górę, szacowany czas przed startem, nagrody
- Obchód: karty z gestami i przyciskami, cofanie, karta przejścia, podsumowanie; pierwszy Obchód (★) jako część onboardingu, kolejne z wyborem zakresu
- Generalne porządki (4.4)
- Losowanie ważone z limitem przeterminowania i rozłożonym startem
- Adaptacyjne interwały i kalibracja czasu zadań
- Wersje językowe: angielska i polska, z wyborem języka w apce
- Własne ikony i wygląd z 13.1
- PWA: instalacja, działanie offline, aktualizacje
- Tryb deweloperski

## 16. Później

- **Eksport i import kopii danych (JSON)** — pierwsze w kolejce, bo dane żyją tylko w przeglądarce (9.3)
- Przypomnienia, gdyby ich brak okazał się problemem (Web Push z małym serwerem wysyłającym "budzik"; pytanie wybierane na telefonie, dane zostają lokalnie)
- Propozycja Obchodu na ekranie głównym, gdy dawno go nie było
- Zapomniany stoper: przy otwarciu łagodne "Zrobione?" zamiast zamknięcia jak "Odpuszczam" (4.3)
- Historia i ranking zaniedbań
- Własne pytania
- Skróty klawiszowe na komputerze (strzałki jak gesty)
- Zdjęcia przed/po (opcjonalna ocena przez model wizyjny)
- Tryb sprintu na długość podcastu lub playlisty
- Gospodarstwa wieloosobowe (wymagałyby synchronizacji, czyli serwera)
- Kolejne języki

## 17. Ryzyka

- **Zapominanie o apce** (bez przypomnień) — zachęta do instalacji (ikona na ekranie głównym), linijka o ostatnim sprzątaniu, a w razie potrzeby przypomnienia później (16).
- **Utrata danych w przeglądarce** — prośba o trwałe miejsce, zachęta do instalacji, eksport i import jako pierwsza rzecz po MVP.
- **Kłamanie TAK** — łagodzone przez bezbolesne NIE i NIE TERAZ oraz przez to, że TAK nie kończy serii (do wyjścia służy X).
- **Przepełniona pula po przerwie** — limit przeterminowania, rozłożony start, symulacja z profilem "znika na dwa tygodnie".
- **"Ostatnie sprzątanie" jako wyrzut** — bez minut, bez tykania, bez liczby po tygodniu, ciepły ton (5.1).
- **Lista wstydu po Obchodzie** — podsumowanie pokazuje maksymalnie trzy rzeczy i skupia się na następnym kroku.
- **Zbyt długi pierwszy Obchód** — tylko pytania ★, grupowanie pomieszczeniami, przełączniki grup, możliwość przerwania.
- **Źle dobrane interwały startowe** — adaptacja, granice min/max, katalog przejrzany i zaakceptowany.
- **Lawina pytań sezonowych** — rozłożony start po wejściu w sezon.
- **Gesty kart kolidujące z przeglądarką** (przewijanie, odświeżanie przeciągnięciem, gest wstecz, zwłaszcza w Safari) — 9.5, sprawdzenie na prawdziwych telefonach.
- **Różnice między przeglądarkami** (wibracja, instalacja, dźwięk, trwałość danych na iPhonie) — funkcje opcjonalne degradują się po cichu, rdzeń działa wszędzie.
- **Dwie karty z apką** — kolejka wywołań między kartami, ponowne wczytanie stanu, ignorowanie nieaktualnych odpowiedzi (4.3).
- **Polskie teksty z formami męskimi** — zasada z 12.3 zapisana wprost w specyfikacji i w `CLAUDE.md`.
- **Odmiana nazw pomieszczeń** — nazwa pomieszczenia jest etykietą, nie częścią treści pytania.
- **Teksty nie mieszczące się w układzie** — elastyczny układ, zrzuty w obu językach i z dużą czcionką.
- **Błędy logiki niewidoczne bez przeglądu kodu** — logika w `core` pokryta testami.

## 18. Decyzje na MVP

- Bez powiadomień i przypomnień. Użytkownik otwiera apkę sam, ekran główny pokazuje ostatnie sprzątanie (5.1).
- Bez konta i serwera, dane tylko na urządzeniu. Bez migracji z Cleanerr.
- Po każdej odpowiedzi (TAK, NIE TERAZ, NIE MAM, ZROBIONE) pada kolejne pytanie. X kończy serię.
- NIE TERAZ — pytanie wraca w kolejnej serii.
- Szacowany czas pokazywany przed startem; zadanie ma stoper liczący w górę, bez porównania z szacunkiem.
- Każde pomieszczenie ma własny kolor; zmiana pomieszczenia między pytaniami pokazuje kartę przejścia.
- Interwały uczą się z uwzględnieniem rzeczywistego czasu od ostatniego sprzątania (8.3).
- Limit przeterminowania w wadze: 4.
- Pełny katalog w MVP.
- Pierwszy Obchód obejmuje tylko pytania ★; reszta wchodzi do puli z rozłożonym startem.
- Obchód na żądanie zawsze pomija pytania w okresie odpoczynku i poza sezonem.
- Angielska nazwa Obchodu: Sweep. Angielskie NIE MAM: N/A.
- Ton: ciepły, krótki, z lekkim humorem.
- Wygląd: własna identyfikacja wizualna (13.1).

## 19. Otwarte pytania

- Czy bez przypomnień apka nie pójdzie w zapomnienie? Ocena po kilku tygodniach używania; ewentualnie przypomnienia z 16.
- "Ostatnie sprzątanie": czy dokładność (dni i godziny, bez minut) i próg 7 dni dobrze się sprawdzają.
- Eksport i import: już w MVP czy zaraz po nim?
- Zapomniany stoper: zamknięcie jak "Odpuszczam" (jak w Cleanerr) czy pytanie "Zrobione?" przy otwarciu?
- Interwały bazowe z katalogu zakładają dla typowego mieszkania ok. 30 zadań i ponad 2 godziny sprzątania dziennie. Uczenie dopasowuje je do tego, jak szybko miejsca się brudzą, a nie do tego, ile czasu ktoś chce sprzątać. Czy dodać ogólne "tempo"? Warianty: bez tempa (ważenie dba o najważniejsze), mnożnik terminów niezależny od uczenia (rekomendowany, jeśli tempo okaże się potrzebne), dzienny budżet czasu. Decyzja po kilku tygodniach prawdziwego używania.
- Czy Obchód na żądanie powinien opcjonalnie obejmować pytania w okresie odpoczynku?
- Ostateczne angielskie nazewnictwo (Sweep, N/A, Big clean).
