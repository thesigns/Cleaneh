# Cleaneh - Questions

Status: zaakceptowany. Przejęty bez zmian merytorycznych z katalogu Cleanerr (zaakceptowany 2026-10-10; zestawy, rodzaje pomieszczeń i grupa Klimatyzacja i powietrze 2026-10-11). "Design" w odwołaniach to `docs/cleaneh-design.md`; numeracja sekcji jest ta sama co w Cleanerr.

## Konwencje

- **TAK = czysto.** Każde pytanie pyta o stan, nie o działanie użytkownika. Dzięki temu teksty są neutralne płciowo (patrz design 12.3).
- **Treść nie zawiera nazwy pomieszczenia.** Nazwa jest etykietą nad pytaniem na karcie i nazwą na karcie przejścia (design 4.5), np. etykieta „Sypialnia”, treść „Czy podłoga jest odkurzona?”. Dzięki temu nazwy nadane przez użytkownika nie wymagają odmiany.
- **Zestaw** — pytania w pomieszczeniach są pogrupowane w zestawy (kolumna „Zestaw”). Rodzaj pomieszczenia to lista zestawów (tabela na końcu, design 7.5). Pytanie jest powielane dla każdego pomieszczenia, którego rodzaj zawiera jego zestaw; każda kopia ma osobny stan.
- **Sezon** (Balkon, Garaż, Ogródek oraz filtry klimatyzacji) — miesiące, w których pytanie trafia do puli, np. IV–X. „—” oznacza cały rok.
- **Poza pomieszczeniami** — pytania pojedyncze, niezależne od pomieszczenia (jedna pralka, jeden kot, nawet przy trzech pokojach), w grupach włączanych przełącznikiem. Etykietą jest nazwa grupy.
- **Zadanie PL / EN** — polecenie w trybie rozkazującym („Wynieś śmieci”), pokazywane przy zadaniu: propozycja, ekran stopera, nagroda, podsumowanie Obchodu. Tryb rozkazujący jest neutralny płciowo.
- **Min** — szacowany czas zadania (2–15 min).
- **Dni** — interwał bazowy.
- **Prio** — H = higieniczny (×3 w losowaniu), Z = zwykły.
- **Wymaga** — sprzęt lub cecha włączana przełącznikiem w kroku „Sprzęty i domownicy” i w ustawieniach (lista na końcu). Pojedyncze sprzęty (mikrofalówka, wanna, toster…) nie mają przełącznika — wystarczy NIE MAM na samym pytaniu.
- **Etap** — kolejność w generalnych porządkach (design 4.4): start (pracuje w tle), bałagan, kurz, powierzchnie, podłoga sucho, podłoga mokro, koniec (wynoszenie, świeże ręczniki).
- **★** — pytanie w pierwszym Obchodzie (design 6.6). Pozostałe wchodzą do puli z rozłożonym startem (design 8.1). MVP używa całego katalogu.

## Przedpokój

Zestawy: wejście (buty, kurtki, drzwi wejściowe) i korytarz (podłoga, kurz, lustro). Przedpokój ma oba, Korytarz tylko korytarz.

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ | Zestaw |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hall_shoes_tidy | Czy buty są poukładane? | Are the shoes put away? | Poukładaj buty | Put the shoes away | 3 | 3 | Z | — | bałagan | ★ | wejście |
| hall_coats_hung | Czy kurtki wiszą na swoich miejscach? | Are the coats hung up? | Powieś kurtki na miejsce | Hang up the coats | 3 | 4 | Z | — | bałagan |  | wejście |
| hall_bags_away | Czy torby i plecaki są odłożone na miejsce? | Are bags and backpacks put away? | Odłóż torby i plecaki | Put bags and backpacks away | 2 | 4 | Z | — | bałagan |  | wejście |
| hall_shelf_clear | Czy półka przy wejściu jest wolna od zbędnych rzeczy? | Is the entryway shelf clutter-free? | Uprzątnij półkę przy wejściu | Clear the entryway shelf | 5 | 5 | Z | — | bałagan | ★ | wejście |
| hall_mail_sorted | Czy poczta i ulotki są przejrzane? | Is the mail sorted? | Przejrzyj pocztę i ulotki | Sort the mail | 3 | 7 | Z | — | bałagan |  | wejście |
| hall_floor_vacuumed | Czy podłoga jest odkurzona? | Is the floor vacuumed? | Odkurz podłogę | Vacuum the floor | 5 | 4 | Z | — | podłoga sucho | ★ | korytarz |
| hall_floor_mopped | Czy podłoga jest umyta? | Is the floor mopped? | Umyj podłogę | Mop the floor | 8 | 7 | Z | — | podłoga mokro | ★ | korytarz |
| hall_doormat_clean | Czy wycieraczka jest wytrzepana? | Is the doormat shaken out? | Wytrzep wycieraczkę | Shake out the doormat | 3 | 7 | Z | — | podłoga sucho |  | wejście |
| hall_shoes_clean | Czy buty są wyczyszczone? | Are the shoes cleaned? | Wyczyść buty | Clean the shoes | 10 | 14 | Z | — | powierzchnie |  | wejście |
| hall_furniture_dust | Czy meble są wolne od kurzu? | Is the furniture dust-free? | Zetrzyj kurz z mebli | Dust the furniture | 5 | 10 | Z | — | kurz |  | korytarz |
| hall_mirror_clean | Czy lustro jest bez smug? | Is the mirror streak-free? | Wyczyść lustro | Clean the mirror | 3 | 14 | Z | — | powierzchnie |  | korytarz |
| hall_door_handle | Czy drzwi wejściowe i klamka są przetarte? | Are the front door and handle wiped? | Przetrzyj drzwi wejściowe i klamkę | Wipe the front door and handle | 3 | 14 | H | — | powierzchnie |  | wejście |
| hall_switches_clean | Czy włączniki światła są czyste? | Are the light switches clean? | Przetrzyj włączniki światła | Wipe the light switches | 2 | 21 | Z | — | powierzchnie |  | korytarz |
| hall_shoe_cabinet | Czy szafka na buty jest czysta w środku? | Is the shoe cabinet clean inside? | Wyczyść szafkę na buty w środku | Clean inside the shoe cabinet | 10 | 30 | Z | — | powierzchnie |  | wejście |
| hall_closet_tidy | Czy szafa w przedpokoju jest poukładana? | Is the hallway closet tidy? | Poukładaj szafę w przedpokoju | Tidy the hallway closet | 15 | 30 | Z | — | bałagan |  | wejście |
| hall_baseboards | Czy listwy przypodłogowe są czyste? | Are the baseboards clean? | Przetrzyj listwy przypodłogowe | Wipe the baseboards | 10 | 30 | Z | — | kurz |  | korytarz |
| hall_seasonal_away | Czy rzeczy nie z tego sezonu są schowane? | Are off-season things stored away? | Schowaj rzeczy nie z tego sezonu | Store away off-season things | 10 | 60 | Z | — | bałagan |  | wejście |

## Kuchnia

Zestawy: kuchnia i stół jadalny (stół i krzesła). Kuchnia ma oba, Jadalnia stół jadalny.

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ | Zestaw |
|---|---|---|---|---|---|---|---|---|---|---|---|
| kitchen_trash_out | Czy śmieci są wyniesione? | Is the trash taken out? | Wynieś śmieci | Take out the trash | 3 | 2 | H | — | koniec | ★ | kuchnia |
| kitchen_food_waste_out | Czy bioodpady są wyniesione? | Is the food waste taken out? | Wynieś bioodpady | Take out the food waste | 3 | 2 | H | — | koniec |  | kuchnia |
| kitchen_recycling_out | Czy odpady do segregacji są wyniesione? | Is the recycling taken out? | Wynieś odpady do segregacji | Take out the recycling | 5 | 5 | Z | — | koniec | ★ | kuchnia |
| kitchen_bin_clean | Czy kosz na śmieci jest czysty w środku? | Is the bin clean inside? | Umyj kosz na śmieci | Wash the bin | 5 | 14 | H | — | powierzchnie |  | kuchnia |
| kitchen_no_food_leftovers | Czy kuchnia jest wolna od resztek jedzenia? | Is the kitchen free of food scraps? | Uprzątnij resztki jedzenia | Clear away food scraps | 3 | 1 | H | — | bałagan | ★ | kuchnia |
| kitchen_no_packaging | Czy kuchnia jest wolna od opakowań? | Is the kitchen free of empty packaging? | Wyrzuć puste opakowania | Throw out empty packaging | 3 | 2 | Z | — | bałagan | ★ | kuchnia |
| kitchen_produce_fresh | Czy owoce i warzywa na wierzchu są świeże? | Is the fruit and veg on display fresh? | Przejrzyj owoce i warzywa | Check the fruit and veg | 2 | 3 | H | — | bałagan |  | kuchnia |
| kitchen_bread_box | Czy pojemnik na pieczywo jest bez okruchów i pleśni? | Is the bread box free of crumbs and mould? | Wyczyść pojemnik na pieczywo | Clean the bread box | 3 | 14 | H | — | powierzchnie |  | kuchnia |
| kitchen_sink_empty | Czy zlew jest wolny od naczyń? | Is the sink free of dishes? | Pozmywaj naczynia ze zlewu | Wash the dishes in the sink | 10 | 1 | H | — | bałagan | ★ | kuchnia |
| kitchen_dish_rack_empty | Czy suszarka na naczynia jest opróżniona? | Is the dish rack emptied? | Opróżnij suszarkę na naczynia | Empty the dish rack | 3 | 2 | Z | — | bałagan |  | kuchnia |
| kitchen_sink_scrubbed | Czy zlew jest wyszorowany? | Is the sink scrubbed? | Wyszoruj zlew | Scrub the sink | 5 | 5 | H | — | powierzchnie | ★ | kuchnia |
| kitchen_drain_fresh | Czy odpływ zlewu jest czysty i nie pachnie? | Is the sink drain clean and odour-free? | Wyczyść odpływ zlewu | Clean the sink drain | 5 | 14 | H | — | powierzchnie |  | kuchnia |
| kitchen_faucet | Czy kran jest bez kamienia? | Is the tap free of limescale? | Odkamień kran | Descale the tap | 3 | 14 | Z | — | powierzchnie |  | kuchnia |
| kitchen_sponge_fresh | Czy gąbka do naczyń jest świeża? | Is the dish sponge fresh? | Wymień gąbkę do naczyń | Replace the dish sponge | 2 | 10 | H | — | koniec |  | kuchnia |
| kitchen_towels_fresh | Czy ściereczki i ręczniki kuchenne są świeże? | Are the dish cloths and kitchen towels fresh? | Wymień ściereczki i ręczniki | Swap the dish cloths and towels | 2 | 4 | H | — | koniec | ★ | kuchnia |
| kitchen_counter_clean | Czy blat jest czysty? | Is the counter clean? | Przetrzyj blat | Wipe the counter | 5 | 2 | H | — | powierzchnie | ★ | kuchnia |
| kitchen_counter_clear | Czy blat jest wolny od zbędnych rzeczy? | Is the counter clutter-free? | Uprzątnij blat | Clear the counter | 5 | 3 | Z | — | bałagan | ★ | kuchnia |
| kitchen_table_wiped | Czy stół jest przetarty? | Is the table wiped? | Przetrzyj stół | Wipe the table | 3 | 2 | Z | — | powierzchnie |  | stół jadalny |
| kitchen_table_clear | Czy stół jest wolny od zbędnych rzeczy? | Is the table clutter-free? | Uprzątnij stół | Clear the table | 3 | 3 | Z | — | bałagan |  | stół jadalny |
| kitchen_chairs_wiped | Czy krzesła są przetarte? | Are the chairs wiped? | Przetrzyj krzesła | Wipe the chairs | 5 | 21 | Z | — | powierzchnie |  | stół jadalny |
| kitchen_stovetop_clean | Czy płyta kuchenna jest czysta? | Is the stovetop clean? | Wyczyść płytę kuchenną | Clean the stovetop | 5 | 4 | Z | — | powierzchnie | ★ | kuchnia |
| kitchen_backsplash | Czy ściana nad blatem i kuchenką jest czysta? | Is the backsplash clean? | Przetrzyj ścianę nad blatem | Wipe the backsplash | 5 | 14 | Z | — | powierzchnie |  | kuchnia |
| kitchen_hood_clean | Czy okap jest odtłuszczony? | Is the range hood degreased? | Odtłuść okap | Degrease the range hood | 10 | 30 | Z | — | powierzchnie |  | kuchnia |
| kitchen_hood_filter | Czy filtr okapu jest umyty? | Is the range hood filter washed? | Umyj filtr okapu | Wash the hood filter | 10 | 60 | Z | — | powierzchnie |  | kuchnia |
| kitchen_oven_glass | Czy szyba piekarnika jest czysta? | Is the oven door glass clean? | Umyj szybę piekarnika | Clean the oven glass | 5 | 21 | Z | — | powierzchnie |  | kuchnia |
| kitchen_oven_inside | Czy piekarnik jest czysty w środku? | Is the oven clean inside? | Wyczyść piekarnik w środku | Clean inside the oven | 15 | 45 | Z | — | powierzchnie |  | kuchnia |
| kitchen_microwave | Czy mikrofalówka jest czysta w środku? | Is the microwave clean inside? | Wyczyść mikrofalówkę | Clean the microwave | 5 | 10 | Z | — | powierzchnie |  | kuchnia |
| kitchen_kettle_descaled | Czy czajnik jest odkamieniony? | Is the kettle descaled? | Odkamień czajnik | Descale the kettle | 5 | 30 | Z | — | powierzchnie |  | kuchnia |
| kitchen_coffee_machine | Czy ekspres do kawy jest wyczyszczony (fusy, tacka)? | Is the coffee machine cleaned (grounds, drip tray)? | Wyczyść ekspres do kawy | Clean the coffee machine | 5 | 4 | H | — | powierzchnie |  | kuchnia |
| kitchen_toaster_crumbs | Czy toster jest bez okruchów? | Is the toaster free of crumbs? | Wysyp okruchy z tostera | Empty the toaster crumbs | 3 | 30 | Z | — | powierzchnie |  | kuchnia |
| kitchen_small_appliances | Czy drobne AGD na blacie są przetarte? | Are the countertop appliances wiped? | Przetrzyj drobne AGD | Wipe the small appliances | 5 | 14 | Z | — | powierzchnie |  | kuchnia |
| kitchen_fridge_expired | Czy lodówka jest wolna od przeterminowanego jedzenia? | Is the fridge free of expired food? | Wyrzuć przeterminowane jedzenie z lodówki | Clear expired food from the fridge | 5 | 5 | H | — | bałagan | ★ | kuchnia |
| kitchen_fridge_shelves | Czy półki w lodówce są czyste? | Are the fridge shelves clean? | Umyj półki w lodówce | Wash the fridge shelves | 15 | 30 | H | — | powierzchnie |  | kuchnia |
| kitchen_fridge_outside | Czy drzwi i uchwyt lodówki są przetarte? | Are the fridge door and handle wiped? | Przetrzyj drzwi i uchwyt lodówki | Wipe the fridge door and handle | 3 | 14 | Z | — | powierzchnie |  | kuchnia |
| kitchen_freezer_tidy | Czy zamrażarka jest uporządkowana? | Is the freezer organised? | Uporządkuj zamrażarkę | Organise the freezer | 10 | 60 | Z | — | bałagan |  | kuchnia |
| kitchen_dishwasher_unloaded | Czy zmywarka jest rozładowana? | Is the dishwasher unloaded? | Rozładuj zmywarkę | Unload the dishwasher | 5 | 2 | Z | zmywarka | start | ★ | kuchnia |
| kitchen_dishwasher_filter | Czy filtr zmywarki jest wyczyszczony? | Is the dishwasher filter cleaned? | Wyczyść filtr zmywarki | Clean the dishwasher filter | 5 | 30 | H | zmywarka | powierzchnie |  | kuchnia |
| kitchen_dishwasher_seal | Czy uszczelka zmywarki jest czysta? | Is the dishwasher door seal clean? | Przetrzyj uszczelkę zmywarki | Wipe the dishwasher seal | 5 | 45 | Z | zmywarka | powierzchnie |  | kuchnia |
| kitchen_cabinet_fronts | Czy fronty szafek są bez tłustych plam? | Are the cabinet fronts free of grease? | Odtłuść fronty szafek | Degrease the cabinet fronts | 10 | 21 | Z | — | powierzchnie |  | kuchnia |
| kitchen_handles | Czy uchwyty szafek są przetarte? | Are the cabinet handles wiped? | Przetrzyj uchwyty szafek | Wipe the cabinet handles | 3 | 14 | H | — | powierzchnie |  | kuchnia |
| kitchen_pantry_tidy | Czy szafka z zapasami jest uporządkowana? | Is the pantry cupboard organised? | Uporządkuj szafkę z zapasami | Organise the pantry | 15 | 45 | Z | — | bałagan |  | kuchnia |
| kitchen_floor_swept | Czy podłoga jest zamieciona? | Is the floor swept? | Zamieć podłogę | Sweep the floor | 5 | 3 | Z | — | podłoga sucho | ★ | kuchnia |
| kitchen_floor_mopped | Czy podłoga jest umyta? | Is the floor mopped? | Umyj podłogę | Mop the floor | 10 | 7 | Z | — | podłoga mokro | ★ | kuchnia |
| kitchen_windowsill | Czy parapet jest przetarty? | Is the windowsill wiped? | Przetrzyj parapet | Wipe the windowsill | 3 | 14 | Z | — | powierzchnie |  | kuchnia |
| kitchen_window | Czy okno jest umyte? | Is the window clean? | Umyj okno | Clean the window | 15 | 60 | Z | — | powierzchnie |  | kuchnia |

## Łazienka

Zestaw łazienka.

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ | Zestaw |
|---|---|---|---|---|---|---|---|---|---|---|---|
| bath_toilet_bowl | Czy muszla klozetowa jest czysta? | Is the toilet bowl clean? | Wyczyść muszlę klozetową | Clean the toilet bowl | 5 | 4 | H | — | powierzchnie | ★ | łazienka |
| bath_toilet_seat | Czy deska i przycisk spłuczki są przetarte? | Are the toilet seat and flush button wiped? | Przetrzyj deskę i spłuczkę | Wipe the seat and flush button | 3 | 4 | H | — | powierzchnie | ★ | łazienka |
| bath_toilet_outside | Czy toaleta jest czysta z zewnątrz i przy podłodze? | Is the outside and base of the toilet clean? | Umyj toaletę z zewnątrz | Clean the outside of the toilet | 5 | 10 | H | — | powierzchnie |  | łazienka |
| bath_toilet_brush | Czy szczotka do WC i jej pojemnik są czyste? | Are the toilet brush and holder clean? | Umyj szczotkę do WC i pojemnik | Clean the toilet brush and holder | 5 | 30 | H | — | powierzchnie |  | łazienka |
| bath_toilet_paper | Czy jest zapas papieru toaletowego? | Is there spare toilet paper? | Uzupełnij papier toaletowy | Restock the toilet paper | 2 | 7 | Z | — | bałagan |  | łazienka |
| bath_sink_clean | Czy umywalka jest czysta? | Is the sink clean? | Umyj umywalkę | Clean the sink | 3 | 4 | H | — | powierzchnie | ★ | łazienka |
| bath_faucets | Czy baterie są bez kamienia i zacieków? | Are the taps free of limescale and water spots? | Odkamień baterie | Descale the taps | 5 | 10 | Z | — | powierzchnie |  | łazienka |
| bath_mirror | Czy lustro jest bez zacieków? | Is the mirror free of splashes? | Wyczyść lustro | Clean the mirror | 3 | 7 | Z | — | powierzchnie | ★ | łazienka |
| bath_sink_area_tidy | Czy półka przy umywalce jest uporządkowana? | Is the shelf by the sink tidy? | Uporządkuj półkę przy umywalce | Tidy the shelf by the sink | 5 | 5 | Z | — | bałagan |  | łazienka |
| bath_toothbrush_cup | Czy kubek na szczoteczki i mydelniczka są czyste? | Are the toothbrush cup and soap dish clean? | Umyj kubek i mydelniczkę | Wash the cup and soap dish | 3 | 14 | H | — | powierzchnie |  | łazienka |
| bath_soap_refilled | Czy mydło jest uzupełnione? | Is the soap refilled? | Uzupełnij mydło | Refill the soap | 2 | 14 | Z | — | bałagan |  | łazienka |
| bath_tub | Czy wanna jest umyta? | Is the bathtub clean? | Umyj wannę | Clean the bathtub | 10 | 7 | H | — | powierzchnie | ★ | łazienka |
| bath_shower | Czy brodzik lub kabina prysznicowa są umyte? | Is the shower clean? | Umyj prysznic | Clean the shower | 10 | 7 | H | — | powierzchnie | ★ | łazienka |
| bath_shower_glass | Czy szyby kabiny są bez osadu? | Is the shower glass free of residue? | Umyj szyby kabiny | Clean the shower glass | 10 | 14 | Z | — | powierzchnie |  | łazienka |
| bath_shower_head | Czy słuchawka prysznica jest odkamieniona? | Is the shower head descaled? | Odkamień słuchawkę prysznica | Descale the shower head | 10 | 60 | Z | — | powierzchnie |  | łazienka |
| bath_shower_curtain | Czy zasłona prysznicowa jest bez pleśni? | Is the shower curtain mould-free? | Zdejmij zasłonę prysznicową do prania | Put the shower curtain in the wash | 5 | 30 | H | — | powierzchnie |  | łazienka |
| bath_drain_hair | Czy odpływ jest wolny od włosów? | Is the drain free of hair? | Usuń włosy z odpływu | Clear hair from the drain | 3 | 7 | H | — | powierzchnie | ★ | łazienka |
| bath_tiles | Czy płytki przy wannie lub prysznicu są czyste? | Are the tiles around the bath or shower clean? | Umyj płytki przy wannie lub prysznicu | Clean the tiles by the bath or shower | 10 | 21 | Z | — | powierzchnie |  | łazienka |
| bath_grout_mould | Czy fugi i silikon są bez pleśni? | Are the grout and sealant mould-free? | Usuń pleśń z fug i silikonu | Remove mould from the grout and sealant | 15 | 30 | H | — | powierzchnie |  | łazienka |
| bath_towels_fresh | Czy ręczniki są świeże? | Are the towels fresh? | Wymień ręczniki | Swap the towels | 2 | 4 | H | — | koniec | ★ | łazienka |
| bath_mat_fresh | Czy dywanik łazienkowy jest świeży? | Is the bath mat fresh? | Wypierz dywanik łazienkowy | Wash the bath mat | 3 | 14 | H | — | koniec |  | łazienka |
| bath_trash_out | Czy kosz jest opróżniony? | Is the bin emptied? | Opróżnij kosz | Empty the bin | 2 | 4 | H | — | bałagan | ★ | łazienka |
| bath_floor | Czy podłoga jest umyta? | Is the floor mopped? | Umyj podłogę | Mop the floor | 5 | 7 | H | — | podłoga mokro | ★ | łazienka |
| bath_handles_switches | Czy klamki i włączniki są przetarte? | Are the handles and switches wiped? | Przetrzyj klamki i włączniki | Wipe the handles and switches | 3 | 14 | H | — | powierzchnie |  | łazienka |
| bath_towel_radiator | Czy grzejnik na ręczniki jest odkurzony? | Is the towel radiator dust-free? | Odkurz grzejnik na ręczniki | Dust the towel radiator | 3 | 30 | Z | — | kurz |  | łazienka |
| bath_vent | Czy kratka wentylacyjna jest odkurzona? | Is the air vent dust-free? | Odkurz kratkę wentylacyjną | Dust the air vent | 5 | 60 | Z | — | kurz |  | łazienka |
| bath_cabinet_tidy | Czy szafka łazienkowa jest uporządkowana? | Is the bathroom cabinet tidy? | Uporządkuj szafkę łazienkową | Tidy the bathroom cabinet | 10 | 45 | Z | — | bałagan |  | łazienka |
| bath_cosmetics_expired | Czy łazienka jest wolna od pustych i przeterminowanych kosmetyków? | Is the bathroom free of empty and expired products? | Wyrzuć puste i przeterminowane kosmetyki | Throw out empty and expired products | 5 | 60 | Z | — | bałagan |  | łazienka |

## Toaleta

Osobna toaleta, bez wanny i prysznica. Zestaw toaleta.

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ | Zestaw |
|---|---|---|---|---|---|---|---|---|---|---|---|
| wc_toilet_bowl | Czy muszla klozetowa jest czysta? | Is the toilet bowl clean? | Wyczyść muszlę klozetową | Clean the toilet bowl | 5 | 4 | H | — | powierzchnie | ★ | toaleta |
| wc_toilet_seat | Czy deska i przycisk spłuczki są przetarte? | Are the toilet seat and flush button wiped? | Przetrzyj deskę i spłuczkę | Wipe the seat and flush button | 3 | 4 | H | — | powierzchnie | ★ | toaleta |
| wc_toilet_outside | Czy toaleta jest czysta z zewnątrz i przy podłodze? | Is the outside and base of the toilet clean? | Umyj toaletę z zewnątrz | Clean the outside of the toilet | 5 | 10 | H | — | powierzchnie |  | toaleta |
| wc_toilet_brush | Czy szczotka do WC i jej pojemnik są czyste? | Are the toilet brush and holder clean? | Umyj szczotkę do WC i pojemnik | Clean the toilet brush and holder | 5 | 30 | H | — | powierzchnie |  | toaleta |
| wc_toilet_paper | Czy jest zapas papieru toaletowego? | Is there spare toilet paper? | Uzupełnij papier toaletowy | Restock the toilet paper | 2 | 7 | Z | — | bałagan |  | toaleta |
| wc_sink | Czy umywalka jest czysta? | Is the sink clean? | Umyj umywalkę | Clean the sink | 3 | 4 | H | — | powierzchnie |  | toaleta |
| wc_hand_towel | Czy ręcznik do rąk jest świeży? | Is the hand towel fresh? | Wymień ręcznik do rąk | Swap the hand towel | 2 | 4 | H | — | koniec |  | toaleta |
| wc_soap | Czy mydło jest uzupełnione? | Is the soap refilled? | Uzupełnij mydło | Refill the soap | 2 | 14 | Z | — | bałagan |  | toaleta |
| wc_trash | Czy kosz jest opróżniony? | Is the bin emptied? | Opróżnij kosz | Empty the bin | 2 | 5 | H | — | bałagan |  | toaleta |
| wc_floor | Czy podłoga jest umyta? | Is the floor mopped? | Umyj podłogę | Mop the floor | 5 | 7 | H | — | podłoga mokro | ★ | toaleta |
| wc_handles_switches | Czy klamka i włącznik są przetarte? | Are the handle and switch wiped? | Przetrzyj klamkę i włącznik | Wipe the handle and switch | 3 | 14 | H | — | powierzchnie |  | toaleta |
| wc_vent | Czy kratka wentylacyjna jest odkurzona? | Is the air vent dust-free? | Odkurz kratkę wentylacyjną | Dust the air vent | 5 | 60 | Z | — | kurz |  | toaleta |

## Pokój

Zestawy pokojowe: podstawa pokoju, łóżko, biurko, kanapa (z niskim stolikiem), regał, szafa. Pokój ma wszystkie, Sypialnia, Salon, Gabinet i inne część (tabela rodzajów na końcu). Pytanie, które nie pasuje do konkretnego pomieszczenia, wyłącza NIE MAM.

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ | Zestaw |
|---|---|---|---|---|---|---|---|---|---|---|---|
| room_floor_clear | Czy podłoga jest wolna od porozrzucanych rzeczy? | Is the floor clear of clutter? | Pozbieraj rzeczy z podłogi | Pick things up off the floor | 5 | 2 | Z | — | bałagan | ★ | podstawa pokoju |
| room_clothes_away | Czy ubrania są odłożone na miejsce? | Are the clothes put away? | Odłóż ubrania na miejsce | Put the clothes away | 5 | 2 | Z | — | bałagan | ★ | podstawa pokoju |
| room_no_dishes | Czy pokój jest wolny od brudnych naczyń i kubków? | Is the room free of dirty dishes and mugs? | Zanieś naczynia i kubki do kuchni | Take dishes and mugs to the kitchen | 2 | 1 | H | — | bałagan | ★ | podstawa pokoju |
| room_no_food | Czy pokój jest wolny od resztek jedzenia i opakowań? | Is the room free of food scraps and wrappers? | Wyrzuć resztki jedzenia i opakowania | Clear away food scraps and wrappers | 2 | 2 | H | — | bałagan | ★ | podstawa pokoju |
| room_bin | Czy kosz jest opróżniony? | Is the bin emptied? | Opróżnij kosz | Empty the bin | 2 | 5 | Z | — | bałagan |  | podstawa pokoju |
| room_aired | Czy pokój jest przewietrzony? | Is the room aired out? | Przewietrz pokój | Air out the room | 2 | 2 | Z | — | start |  | podstawa pokoju |
| room_bed_made | Czy łóżko jest pościelone? | Is the bed made? | Pościel łóżko | Make the bed | 2 | 1 | Z | — | bałagan | ★ | łóżko |
| room_bedding_fresh | Czy pościel jest świeża? | Is the bedding fresh? | Zmień pościel | Change the bedding | 10 | 14 | H | — | bałagan | ★ | łóżko |
| room_under_bed | Czy pod łóżkiem jest odkurzone? | Is it vacuumed under the bed? | Odkurz pod łóżkiem | Vacuum under the bed | 10 | 30 | Z | — | podłoga sucho |  | łóżko |
| room_mattress | Czy materac jest odkurzony? | Is the mattress vacuumed? | Odkurz materac | Vacuum the mattress | 10 | 90 | Z | — | podłoga sucho |  | łóżko |
| room_nightstand | Czy szafka nocna jest uporządkowana? | Is the nightstand tidy? | Uporządkuj szafkę nocną | Tidy the nightstand | 3 | 5 | Z | — | bałagan |  | łóżko |
| room_desk_clear | Czy biurko jest uporządkowane? | Is the desk tidy? | Uporządkuj biurko | Tidy the desk | 5 | 3 | Z | — | bałagan | ★ | biurko |
| room_table_clear | Czy stolik jest wolny od zbędnych rzeczy? | Is the coffee table clutter-free? | Uprzątnij stolik | Clear the coffee table | 3 | 2 | Z | — | bałagan |  | kanapa |
| room_sofa | Czy kanapa i fotele są bez okruchów i sierści? | Are the sofa and armchairs free of crumbs and hair? | Odkurz kanapę i fotele | Vacuum the sofa and armchairs | 5 | 7 | Z | — | podłoga sucho |  | kanapa |
| room_cushions | Czy poduszki i koce są poukładane? | Are the cushions and throws tidy? | Poukładaj poduszki i koce | Tidy the cushions and throws | 2 | 2 | Z | — | bałagan |  | kanapa |
| room_papers | Czy dokumenty i papiery są przejrzane? | Are the documents and papers sorted? | Przejrzyj dokumenty i papiery | Sort the documents and papers | 10 | 14 | Z | — | bałagan |  | biurko |
| room_floor_vacuumed | Czy podłoga jest odkurzona? | Is the floor vacuumed? | Odkurz podłogę | Vacuum the floor | 10 | 5 | Z | — | podłoga sucho | ★ | podstawa pokoju |
| room_floor_mopped | Czy podłoga jest umyta? | Is the floor mopped? | Umyj podłogę | Mop the floor | 10 | 10 | Z | — | podłoga mokro |  | podstawa pokoju |
| room_surfaces_dust | Czy półki i blaty są wolne od kurzu? | Are the shelves and surfaces dust-free? | Zetrzyj kurz z półek i blatów | Dust the shelves and surfaces | 5 | 7 | Z | — | kurz | ★ | podstawa pokoju |
| room_electronics_dust | Czy sprzęty elektroniczne są bez kurzu? | Are the electronics dust-free? | Zetrzyj kurz ze sprzętów | Dust the electronics | 5 | 14 | Z | — | kurz |  | podstawa pokoju |
| room_bookshelf | Czy regał z książkami jest odkurzony? | Is the bookshelf dust-free? | Odkurz regał z książkami | Dust the bookshelf | 10 | 45 | Z | — | kurz |  | regał |
| room_lamps | Czy lampy i abażury są bez kurzu? | Are the lamps and shades dust-free? | Zetrzyj kurz z lamp | Dust the lamps | 5 | 30 | Z | — | kurz |  | podstawa pokoju |
| room_plants_dust | Czy liście roślin są bez kurzu? | Are the plant leaves dust-free? | Przetrzyj liście roślin | Wipe the plant leaves | 5 | 30 | Z | — | kurz |  | podstawa pokoju |
| room_windowsill | Czy parapet jest przetarty i uporządkowany? | Is the windowsill wiped and tidy? | Przetrzyj i uporządkuj parapet | Wipe and tidy the windowsill | 5 | 14 | Z | — | powierzchnie |  | podstawa pokoju |
| room_window | Czy okno jest umyte? | Is the window clean? | Umyj okno | Clean the window | 15 | 60 | Z | — | powierzchnie |  | podstawa pokoju |
| room_curtains | Czy firanki i zasłony są świeże? | Are the curtains fresh? | Zdejmij firanki i zasłony do prania | Put the curtains in the wash | 10 | 90 | Z | — | powierzchnie |  | podstawa pokoju |
| room_radiator | Czy kaloryfer jest odkurzony? | Is the radiator dust-free? | Odkurz kaloryfer | Dust the radiator | 5 | 30 | Z | — | kurz |  | podstawa pokoju |
| room_baseboards | Czy listwy przypodłogowe są odkurzone? | Are the baseboards dust-free? | Odkurz listwy przypodłogowe | Dust the baseboards | 10 | 30 | Z | — | kurz |  | podstawa pokoju |
| room_cobwebs | Czy kąty pod sufitem są wolne od pajęczyn? | Are the ceiling corners free of cobwebs? | Usuń pajęczyny z kątów | Clear cobwebs from the corners | 5 | 30 | Z | — | kurz |  | podstawa pokoju |
| room_handles_switches | Czy klamki i włączniki są przetarte? | Are the handles and switches wiped? | Przetrzyj klamki i włączniki | Wipe the handles and switches | 3 | 14 | H | — | powierzchnie |  | podstawa pokoju |
| room_mirror | Czy lustro jest czyste? | Is the mirror clean? | Wyczyść lustro | Clean the mirror | 3 | 14 | Z | — | powierzchnie |  | podstawa pokoju |
| room_wardrobe_tidy | Czy szafa jest poukładana? | Is the wardrobe tidy? | Poukładaj szafę | Tidy the wardrobe | 15 | 30 | Z | — | bałagan |  | szafa |
| room_drawers_tidy | Czy szuflady są uporządkowane? | Are the drawers tidy? | Uporządkuj szuflady | Tidy the drawers | 15 | 45 | Z | — | bałagan |  | szafa |

## Schody

Zestaw schody.

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ | Zestaw |
|---|---|---|---|---|---|---|---|---|---|---|---|
| stairs_clear | Czy schody są wolne od odłożonych rzeczy? | Are the stairs free of things left on them? | Zabierz rzeczy ze schodów | Clear things off the stairs | 3 | 3 | Z | — | bałagan | ★ | schody |
| stairs_vacuumed | Czy schody są odkurzone? | Are the stairs vacuumed? | Odkurz schody | Vacuum the stairs | 10 | 7 | Z | — | podłoga sucho | ★ | schody |
| stairs_mopped | Czy schody są umyte? | Are the stairs mopped? | Umyj schody | Mop the stairs | 15 | 14 | Z | — | podłoga mokro |  | schody |
| stairs_handrail | Czy poręcz jest przetarta? | Is the handrail wiped? | Przetrzyj poręcz | Wipe the handrail | 3 | 14 | H | — | powierzchnie |  | schody |
| stairs_balusters | Czy balustrada jest bez kurzu? | Is the balustrade dust-free? | Zetrzyj kurz z balustrady | Dust the balustrade | 10 | 30 | Z | — | kurz |  | schody |
| stairs_wall_marks | Czy ściana przy schodach jest bez śladów rąk? | Is the stairway wall free of handprints? | Usuń ślady rąk ze ściany | Wipe handprints off the wall | 5 | 30 | Z | — | powierzchnie |  | schody |
| stairs_cobwebs | Czy kąty nad schodami są wolne od pajęczyn? | Are the corners above the stairs free of cobwebs? | Usuń pajęczyny nad schodami | Clear cobwebs above the stairs | 5 | 30 | Z | — | kurz |  | schody |

## Schowek

Zestaw schowek: Schowek, Piwnica, Strych, Spiżarnia, Pralnia. Rzadkie zadania, długie interwały.

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ | Zestaw |
|---|---|---|---|---|---|---|---|---|---|---|---|
| storage_walkway_clear | Czy przejście jest wolne od gratów? | Is the walkway clear of clutter? | Udrożnij przejście | Clear the walkway | 10 | 30 | Z | — | bałagan | ★ | schowek |
| storage_floor_swept | Czy podłoga jest zamieciona? | Is the floor swept? | Zamieć podłogę | Sweep the floor | 10 | 30 | Z | — | podłoga sucho | ★ | schowek |
| storage_declutter | Czy jest wolne od rzeczy do wyrzucenia lub oddania? | Is it free of things to throw out or give away? | Wybierz rzeczy do wyrzucenia lub oddania | Pick things to throw out or give away | 15 | 60 | Z | — | bałagan |  | schowek |
| storage_shelves_tidy | Czy regały są uporządkowane? | Are the shelves organised? | Uporządkuj regały | Organise the shelves | 15 | 60 | Z | — | bałagan |  | schowek |
| storage_boxes_labelled | Czy pudła są opisane? | Are the boxes labelled? | Opisz pudła | Label the boxes | 10 | 90 | Z | — | bałagan |  | schowek |
| storage_supplies_in_date | Czy przetwory i zapasy są w terminie? | Are the preserves and supplies in date? | Przejrzyj przetwory i zapasy | Check the preserves and supplies | 10 | 60 | H | — | bałagan |  | schowek |
| storage_damp | Czy pomieszczenie jest wolne od wilgoci i pleśni? | Is it free of damp and mould? | Sprawdź wilgoć i usuń pleśń | Check for damp and remove mould | 5 | 30 | H | — | powierzchnie |  | schowek |
| storage_pests | Czy pomieszczenie jest wolne od śladów szkodników? | Is it free of signs of pests? | Poszukaj śladów szkodników | Check for signs of pests | 5 | 30 | H | — | powierzchnie |  | schowek |
| storage_aired | Czy pomieszczenie jest przewietrzone? | Is it aired out? | Przewietrz pomieszczenie | Air out the room | 5 | 14 | Z | — | start |  | schowek |
| storage_cobwebs | Czy kąty są wolne od pajęczyn? | Are the corners free of cobwebs? | Usuń pajęczyny z kątów | Clear cobwebs from the corners | 5 | 30 | Z | — | kurz |  | schowek |

## Balkon

Zestaw balkon: Balkon i Taras.

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Sezon | Wymaga | Etap | ★ | Zestaw |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| balcony_floor_swept | Czy podłoga jest zamieciona? | Is the floor swept? | Zamieć podłogę | Sweep the floor | 5 | 7 | Z | — | — | podłoga sucho | ★ | balkon |
| balcony_floor_washed | Czy podłoga jest umyta? | Is the floor washed? | Umyj podłogę | Wash the floor | 10 | 30 | Z | IV–X | — | podłoga mokro |  | balkon |
| balcony_clutter | Czy balkon jest wolny od gratów? | Is the balcony free of junk? | Uprzątnij graty z balkonu | Clear junk off the balcony | 10 | 30 | Z | — | — | bałagan | ★ | balkon |
| balcony_bird_droppings | Czy balkon jest wolny od ptasich odchodów? | Is the balcony free of bird droppings? | Usuń ptasie odchody | Clean off bird droppings | 5 | 7 | H | — | — | powierzchnie |  | balkon |
| balcony_railing | Czy balustrada jest przetarta? | Is the railing wiped? | Przetrzyj balustradę | Wipe the railing | 5 | 30 | Z | IV–X | — | powierzchnie |  | balkon |
| balcony_furniture | Czy meble balkonowe są czyste? | Is the balcony furniture clean? | Umyj meble balkonowe | Clean the balcony furniture | 5 | 14 | Z | IV–IX | — | powierzchnie |  | balkon |
| balcony_planters | Czy donice są wolne od zwiędłych roślin? | Are the planters free of dead plants? | Usuń zwiędłe rośliny z donic | Clear dead plants from the planters | 5 | 14 | Z | — | — | bałagan |  | balkon |
| balcony_door_glass | Czy szyba drzwi balkonowych jest czysta? | Is the balcony door glass clean? | Umyj szybę drzwi balkonowych | Clean the balcony door glass | 10 | 30 | Z | — | — | powierzchnie |  | balkon |
| balcony_drain | Czy odpływ balkonu jest drożny? | Is the balcony drain clear? | Udrożnij odpływ balkonu | Clear the balcony drain | 3 | 60 | Z | — | — | powierzchnie |  | balkon |
| balcony_cobwebs | Czy kąty są wolne od pajęczyn? | Are the corners free of cobwebs? | Usuń pajęczyny z kątów | Clear cobwebs from the corners | 3 | 30 | Z | IV–X | — | kurz |  | balkon |
| balcony_ashtray | Czy popielniczka jest opróżniona? | Is the ashtray emptied? | Opróżnij popielniczkę | Empty the ashtray | 2 | 2 | H | — | — | bałagan |  | balkon |
| balcony_snow | Czy balkon jest wolny od śniegu? | Is the balcony free of snow? | Odśnież balkon | Clear the snow off the balcony | 5 | 3 | Z | XII–III | — | podłoga sucho |  | balkon |

## Garaż

Zestaw garaż.

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Sezon | Wymaga | Etap | ★ | Zestaw |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| garage_floor_swept | Czy podłoga jest zamieciona? | Is the floor swept? | Zamieć podłogę | Sweep the floor | 10 | 14 | Z | — | — | podłoga sucho | ★ | garaż |
| garage_walkway_clear | Czy przejście jest wolne od gratów? | Is the walkway clear of clutter? | Udrożnij przejście | Clear the walkway | 10 | 14 | Z | — | — | bałagan | ★ | garaż |
| garage_tools_away | Czy narzędzia są odłożone na miejsce? | Are the tools put away? | Odłóż narzędzia na miejsce | Put the tools away | 5 | 7 | Z | — | — | bałagan | ★ | garaż |
| garage_workbench | Czy stół warsztatowy jest uprzątnięty? | Is the workbench clear? | Uprzątnij stół warsztatowy | Clear the workbench | 5 | 14 | Z | — | — | bałagan |  | garaż |
| garage_bikes | Czy rowery i sprzęt sportowy są na swoich miejscach? | Are the bikes and sports gear in their places? | Odstaw rowery i sprzęt sportowy | Put the bikes and sports gear away | 5 | 14 | Z | — | — | bałagan |  | garaż |
| garage_recyclables | Czy kartony i surowce wtórne są wyniesione? | Are the boxes and recyclables taken out? | Wynieś kartony i surowce wtórne | Take out the boxes and recyclables | 10 | 14 | Z | — | — | koniec |  | garaż |
| garage_hazardous | Czy zużyte baterie, farby i chemia są zebrane w jednym miejscu? | Are used batteries, paints and chemicals gathered in one place? | Zbierz baterie, farby i chemię w jednym miejscu | Gather batteries, paints and chemicals in one place | 5 | 60 | Z | — | — | bałagan |  | garaż |
| garage_shelves_tidy | Czy regały są uporządkowane? | Are the shelves organised? | Uporządkuj regały | Organise the shelves | 15 | 45 | Z | — | — | bałagan |  | garaż |
| garage_seasonal_gear | Czy sprzęt nie z tego sezonu jest schowany? | Is the off-season gear stored away? | Schowaj sprzęt nie z tego sezonu | Store away off-season gear | 15 | 90 | Z | — | — | bałagan |  | garaż |
| garage_oil_stains | Czy podłoga jest bez plam oleju? | Is the floor free of oil stains? | Usuń plamy oleju z podłogi | Clean oil stains off the floor | 10 | 60 | Z | — | — | powierzchnie |  | garaż |
| garage_cobwebs | Czy kąty są wolne od pajęczyn? | Are the corners free of cobwebs? | Usuń pajęczyny z kątów | Clear cobwebs from the corners | 5 | 30 | Z | — | — | kurz |  | garaż |
| garage_window | Czy okno jest umyte? | Is the window clean? | Umyj okno | Clean the window | 10 | 90 | Z | IV–X | — | powierzchnie |  | garaż |

## Ogródek

Zestaw ogródek.

Część prac ogrodowych (koszenie większego trawnika, grabienie) może przekraczać 15 minut. Szacowany czas to wtedy porcja pracy. Jeśli praca nie jest skończona, „Odpuszczam” zostawia pytanie w puli i wróci w kolejnej serii (design 7.3).

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Sezon | Wymaga | Etap | ★ | Zestaw |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| garden_paths_swept | Czy ścieżki i taras są zamiecione? | Are the paths and patio swept? | Zamieć ścieżki i taras | Sweep the paths and patio | 10 | 7 | Z | III–XI | — | podłoga sucho | ★ | ogródek |
| garden_lawn_mowed | Czy trawnik jest skoszony? | Is the lawn mowed? | Skoś trawnik | Mow the lawn | 15 | 7 | Z | V–IX | — | podłoga sucho | ★ | ogródek |
| garden_leaves_raked | Czy liście są zgrabione? | Are the leaves raked? | Zgrab liście | Rake the leaves | 15 | 7 | Z | IX–XI | — | podłoga sucho | ★ | ogródek |
| garden_lawn_clear | Czy trawnik jest wolny od zabawek i sprzętu? | Is the lawn clear of toys and gear? | Uprzątnij zabawki i sprzęt z trawnika | Clear toys and gear off the lawn | 5 | 3 | Z | IV–IX | — | bałagan |  | ogródek |
| garden_dog_mess | Czy trawnik jest wolny od psich kup? | Is the lawn free of dog mess? | Posprzątaj po psie na trawniku | Pick up after the dog | 5 | 2 | H | — | pies | bałagan |  | ogródek |
| garden_weeds | Czy rabaty są wolne od chwastów? | Are the flower beds weed-free? | Wypiel chwasty z rabat | Weed the flower beds | 15 | 10 | Z | IV–IX | — | bałagan |  | ogródek |
| garden_spent_flowers | Czy przekwitłe kwiaty są usunięte? | Are the spent flowers removed? | Usuń przekwitłe kwiaty | Remove spent flowers | 10 | 14 | Z | V–IX | — | bałagan |  | ogródek |
| garden_tools_away | Czy narzędzia ogrodowe są odłożone? | Are the garden tools put away? | Odłóż narzędzia ogrodowe | Put the garden tools away | 5 | 7 | Z | III–X | — | bałagan |  | ogródek |
| garden_hose | Czy wąż ogrodowy jest zwinięty? | Is the garden hose coiled up? | Zwiń wąż ogrodowy | Coil up the garden hose | 2 | 7 | Z | IV–IX | — | bałagan |  | ogródek |
| garden_furniture | Czy meble ogrodowe są czyste? | Is the garden furniture clean? | Umyj meble ogrodowe | Clean the garden furniture | 10 | 14 | Z | IV–IX | — | powierzchnie |  | ogródek |
| garden_furniture_stored | Czy meble ogrodowe są schowane na zimę? | Is the garden furniture stored for winter? | Schowaj meble ogrodowe na zimę | Store the garden furniture for winter | 15 | 30 | Z | X–XI | — | bałagan |  | ogródek |
| garden_grill | Czy grill jest wyczyszczony? | Is the grill cleaned? | Wyczyść grill | Clean the grill | 10 | 14 | H | IV–IX | — | powierzchnie |  | ogródek |
| garden_pond | Czy oczko wodne lub basen są wolne od liści? | Is the pond or pool free of leaves? | Wyłów liście z oczka lub basenu | Skim leaves from the pond or pool | 10 | 7 | Z | V–IX | — | powierzchnie |  | ogródek |
| garden_waste_bins | Czy pojemniki na odpady są umyte? | Are the outdoor waste bins washed? | Umyj pojemniki na odpady | Wash the outdoor bins | 10 | 30 | H | IV–X | — | powierzchnie |  | ogródek |
| garden_bird_feeder | Czy karmnik jest czysty? | Is the bird feeder clean? | Wyczyść karmnik | Clean the bird feeder | 5 | 14 | H | XI–III | — | powierzchnie |  | ogródek |
| garden_snow | Czy ścieżki i wejście są odśnieżone? | Are the paths and entrance cleared of snow? | Odśnież ścieżki i wejście | Clear snow from the paths and entrance | 15 | 2 | Z | XII–III | — | podłoga sucho |  | ogródek |

## Poza pomieszczeniami

Pytania pojedyncze, niezależne od pomieszczenia. Poza podziałem na pomieszczenia, bo pralka, komputer, samochód czy kuweta są zwykle jedne na mieszkanie, a powielanie ich na każdy pokój lub łazienkę dawałoby fałszywe kopie.

### Pranie

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ |
|---|---|---|---|---|---|---|---|---|---|---|
| laundry_basket_empty | Czy kosz na pranie jest opróżniony? | Is the laundry basket emptied? | Nastaw pranie z kosza | Put a load in from the basket | 5 | 3 | Z | pralka | start | ★ |
| laundry_washer_unloaded | Czy wyprane rzeczy są wyjęte z pralki? | Is the washed laundry out of the machine? | Wyjmij pranie z pralki | Take the laundry out of the machine | 5 | 3 | H | pralka | start | ★ |
| laundry_dry_off_rack | Czy suche pranie jest zdjęte z suszarki? | Is the dry laundry off the rack? | Zdejmij suche pranie | Take the dry laundry off the rack | 5 | 3 | Z | — | bałagan |  |
| laundry_folded | Czy czyste pranie jest poskładane? | Is the clean laundry folded? | Poskładaj czyste pranie | Fold the clean laundry | 10 | 3 | Z | — | bałagan |  |
| laundry_washer_seal | Czy uszczelka pralki jest czysta i sucha? | Is the washing machine door seal clean and dry? | Wytrzyj i osusz uszczelkę pralki | Wipe and dry the washer seal | 5 | 30 | H | pralka | powierzchnie |  |
| laundry_washer_drawer | Czy szufladka na proszek jest czysta? | Is the detergent drawer clean? | Umyj szufladkę na proszek | Clean the detergent drawer | 5 | 45 | Z | pralka | powierzchnie |  |
| laundry_washer_filter | Czy filtr pralki jest wyczyszczony? | Is the washing machine filter cleaned? | Wyczyść filtr pralki | Clean the washer filter | 10 | 90 | Z | pralka | powierzchnie |  |
| laundry_dryer_lint | Czy filtr suszarki bębnowej jest wyczyszczony? | Is the tumble dryer lint filter clean? | Wyczyść filtr suszarki | Clean the dryer lint filter | 2 | 7 | Z | — | powierzchnie |  |

### Komputer i drobna elektronika

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ |
|---|---|---|---|---|---|---|---|---|---|---|
| pc_keyboard_mouse | Czy klawiatura i mysz są czyste? | Are the keyboard and mouse clean? | Wyczyść klawiaturę i mysz | Clean the keyboard and mouse | 5 | 14 | Z | komputer | powierzchnie | ★ |
| pc_screen | Czy monitor jest bez kurzu i smug? | Is the screen free of dust and smudges? | Przetrzyj monitor | Wipe the screen | 3 | 14 | Z | komputer | powierzchnie |  |
| pc_cables | Czy kable przy biurku są ogarnięte? | Are the desk cables tidy? | Ogarnij kable przy biurku | Tidy the desk cables | 10 | 60 | Z | komputer | bałagan |  |
| device_phone | Czy telefon i etui są przetarte? | Are the phone and case wiped? | Przetrzyj telefon i etui | Wipe your phone and case | 2 | 7 | H | — | powierzchnie |  |
| device_remotes | Czy piloty są przetarte? | Are the remotes wiped? | Przetrzyj piloty | Wipe the remotes | 2 | 21 | H | — | powierzchnie |  |

### Sprzęt do sprzątania

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ |
|---|---|---|---|---|---|---|---|---|---|---|
| tools_vacuum_bin | Czy pojemnik lub worek odkurzacza jest opróżniony? | Is the vacuum bin or bag emptied? | Opróżnij odkurzacz | Empty the vacuum | 3 | 14 | Z | — | koniec |  |
| tools_vacuum_filter | Czy filtr odkurzacza jest wyczyszczony? | Is the vacuum filter cleaned? | Wyczyść filtr odkurzacza | Clean the vacuum filter | 5 | 60 | Z | — | koniec |  |
| tools_robot_bin | Czy pojemnik robota sprzątającego jest opróżniony? | Is the robot vacuum bin emptied? | Opróżnij robota sprzątającego | Empty the robot vacuum | 2 | 3 | Z | robot | koniec |  |
| tools_robot_brushes | Czy szczotki robota są oczyszczone z włosów? | Are the robot vacuum brushes free of hair? | Oczyść szczotki robota z włosów | Clear hair from the robot's brushes | 5 | 14 | Z | robot | koniec |  |
| tools_mops_cloths | Czy mopy i ściereczki do sprzątania są uprane? | Are the mop heads and cleaning cloths washed? | Wypierz mopy i ściereczki | Wash the mop heads and cloths | 5 | 14 | H | — | koniec |  |

### Klimatyzacja i powietrze

Sam przełącznik grupy nie ma pytań; każde pytanie wymaga swojego sprzętu. Nawilżacz ma identyfikator `tools_humidifier` z czasów, gdy należał do grupy Sprzęt do sprzątania; identyfikatory są stabilne, więc zostaje bez zmian.

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Sezon | Wymaga | Etap | ★ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| air_conditioner_filters | Czy filtry klimatyzacji są wyczyszczone? | Are the air conditioner filters clean? | Wyczyść filtry klimatyzacji | Clean the AC filters | 10 | 30 | H | V–IX | klimatyzacja | powierzchnie |  |
| tools_humidifier | Czy zbiornik nawilżacza jest umyty? | Is the humidifier tank washed? | Umyj zbiornik nawilżacza | Wash the humidifier tank | 5 | 7 | H | — | nawilżacz | start |  |
| air_purifier_filter | Czy filtr oczyszczacza jest odkurzony? | Is the air purifier filter dust-free? | Odkurz filtr oczyszczacza | Vacuum the purifier filter | 5 | 30 | Z | — | oczyszczacz | powierzchnie |  |

### Samochód

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ |
|---|---|---|---|---|---|---|---|---|---|---|
| car_trash | Czy samochód jest wolny od śmieci? | Is the car free of rubbish? | Wyrzuć śmieci z samochodu | Clear rubbish out of the car | 5 | 7 | Z | samochód | bałagan | ★ |
| car_vacuumed | Czy wnętrze jest odkurzone? | Is the interior vacuumed? | Odkurz wnętrze samochodu | Vacuum the car interior | 15 | 30 | Z | samochód | podłoga sucho | ★ |
| car_mats | Czy dywaniki są wytrzepane? | Are the floor mats shaken out? | Wytrzep dywaniki | Shake out the floor mats | 5 | 14 | Z | samochód | podłoga sucho |  |
| car_steering_wheel | Czy kierownica i lewarek są przetarte? | Are the steering wheel and gear stick wiped? | Przetrzyj kierownicę i lewarek | Wipe the steering wheel and gear stick | 3 | 14 | H | samochód | powierzchnie |  |
| car_dashboard | Czy deska rozdzielcza jest przetarta? | Is the dashboard wiped? | Przetrzyj deskę rozdzielczą | Wipe the dashboard | 5 | 30 | Z | samochód | powierzchnie |  |
| car_cup_holders | Czy uchwyty na kubki i schowki są czyste? | Are the cup holders and compartments clean? | Wyczyść uchwyty na kubki i schowki | Clean the cup holders and compartments | 5 | 30 | Z | samochód | powierzchnie |  |
| car_windows_inside | Czy szyby od środka są czyste? | Are the windows clean on the inside? | Umyj szyby od środka | Clean the windows inside | 10 | 30 | Z | samochód | powierzchnie |  |
| car_boot_tidy | Czy bagażnik jest uporządkowany? | Is the boot tidy? | Uporządkuj bagażnik | Tidy the boot | 10 | 30 | Z | samochód | bałagan |  |
| car_washed | Czy samochód jest umyty z zewnątrz? | Is the car washed on the outside? | Umyj samochód | Wash the car | 15 | 21 | Z | samochód | powierzchnie |  |
| car_washer_fluid | Czy płyn do spryskiwaczy jest uzupełniony? | Is the washer fluid topped up? | Uzupełnij płyn do spryskiwaczy | Top up the washer fluid | 3 | 30 | Z | samochód | bałagan |  |

### Dziecko

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ |
|---|---|---|---|---|---|---|---|---|---|---|
| kid_toys_away | Czy zabawki są uprzątnięte? | Are the toys tidied away? | Uprzątnij zabawki | Tidy away the toys | 10 | 1 | Z | dziecko | bałagan | ★ |
| kid_high_chair | Czy krzesełko do karmienia jest czyste? | Is the high chair clean? | Wyczyść krzesełko do karmienia | Clean the high chair | 5 | 1 | H | dziecko | powierzchnie | ★ |
| kid_toys_washed | Czy zabawki są umyte? | Are the toys washed? | Umyj zabawki | Wash the toys | 15 | 30 | H | dziecko | powierzchnie |  |
| kid_cot_bedding | Czy pościel w łóżeczku jest świeża? | Is the cot bedding fresh? | Zmień pościel w łóżeczku | Change the cot bedding | 10 | 7 | H | dziecko | bałagan |  |
| kid_art_supplies | Czy kredki i przybory do rysowania są poukładane? | Are the crayons and art supplies tidy? | Poukładaj kredki i przybory | Tidy the crayons and art supplies | 5 | 7 | Z | dziecko | bałagan |  |
| kid_school_bag | Czy plecak szkolny jest wolny od resztek jedzenia? | Is the school bag free of food leftovers? | Opróżnij plecak z resztek jedzenia | Clear food out of the school bag | 3 | 7 | H | dziecko | powierzchnie |  |
| kid_stroller | Czy wózek jest wolny od okruchów i piasku? | Is the stroller free of crumbs and sand? | Wyczyść wózek z okruchów i piasku | Clean crumbs and sand out of the stroller | 5 | 14 | Z | dziecko | powierzchnie |  |
| kid_car_seat | Czy fotelik samochodowy jest czysty? | Is the car seat clean? | Wyczyść fotelik samochodowy | Clean the car seat | 10 | 30 | H | dziecko | powierzchnie |  |
| kid_outgrown_clothes | Czy szafa jest wolna od za małych ubrań? | Is the wardrobe free of outgrown clothes? | Odłóż za małe ubrania | Set aside outgrown clothes | 15 | 90 | Z | dziecko | bałagan |  |
| baby_bottles | Czy butelki i smoczki są wyparzone? | Are the bottles and dummies sterilised? | Wyparz butelki i smoczki | Sterilise the bottles and dummies | 10 | 1 | H | niemowlę | powierzchnie |  |
| baby_changing_table | Czy przewijak jest czysty? | Is the changing table clean? | Wyczyść przewijak | Clean the changing table | 3 | 2 | H | niemowlę | powierzchnie |  |
| baby_nappy_bin | Czy kosz na pieluchy jest opróżniony? | Is the nappy bin emptied? | Opróżnij kosz na pieluchy | Empty the nappy bin | 3 | 1 | H | niemowlę | koniec |  |

### Zwierzęta

| ID | PL | EN | Zadanie PL | Zadanie EN | Min | Dni | Prio | Wymaga | Etap | ★ |
|---|---|---|---|---|---|---|---|---|---|---|
| pet_bowls | Czy miski są umyte, a woda świeża? | Are the bowls clean and the water fresh? | Umyj miski i nalej świeżej wody | Wash the bowls and refresh the water | 3 | 1 | H | zwierzę | powierzchnie | ★ |
| pet_feeding_area | Czy miejsce karmienia jest czyste? | Is the feeding spot clean? | Posprzątaj miejsce karmienia | Clean the feeding spot | 3 | 3 | H | zwierzę | powierzchnie |  |
| pet_bed_shaken | Czy posłanie zwierzaka jest wytrzepane? | Is the pet bed shaken out? | Wytrzep posłanie zwierzaka | Shake out the pet bed | 5 | 7 | Z | zwierzę | bałagan |  |
| pet_bed_cover | Czy pokrowiec posłania jest świeży? | Is the pet bed cover fresh? | Wypierz pokrowiec posłania | Wash the pet bed cover | 5 | 30 | H | zwierzę | powierzchnie |  |
| pet_toys | Czy zabawki zwierzaka są czyste? | Are the pet toys clean? | Umyj zabawki zwierzaka | Wash the pet toys | 5 | 30 | Z | zwierzę | powierzchnie |  |
| cat_litter_scooped | Czy kuweta jest wybrana? | Is the litter box scooped? | Wybierz kuwetę | Scoop the litter box | 3 | 1 | H | kot | bałagan | ★ |
| cat_litter_area | Czy podłoga wokół kuwety jest czysta? | Is the floor around the litter box clean? | Posprzątaj wokół kuwety | Clean around the litter box | 3 | 3 | H | kot | powierzchnie |  |
| cat_litter_changed | Czy żwirek jest wymieniony w całości? | Is the litter fully refreshed? | Wymień cały żwirek | Change all the litter | 10 | 14 | H | kot | powierzchnie |  |
| cat_scratcher | Czy drapak jest bez sierści? | Is the cat tree free of fur? | Usuń sierść z drapaka | Clear fur off the cat tree | 5 | 14 | Z | kot | powierzchnie |  |
| dog_leash | Czy smycz i szelki są czyste? | Are the leash and harness clean? | Wyczyść smycz i szelki | Clean the leash and harness | 5 | 60 | Z | pies | powierzchnie |  |
| cage_clean | Czy klatka jest wysprzątana? | Is the cage cleaned? | Wysprzątaj klatkę | Clean the cage | 15 | 7 | H | klatka | powierzchnie |  |
| aquarium_glass | Czy szyby akwarium są czyste? | Is the aquarium glass clean? | Umyj szyby akwarium | Clean the aquarium glass | 10 | 14 | Z | akwarium | powierzchnie |  |

## Przełączniki (krok „Sprzęty i domownicy”)

Lista w kreatorze i w ustawieniach, na start wszystko wyłączone (design 7.6). Podrzędny przełącznik widać po włączeniu nadrzędnego. Pytanie z grupy jest aktywne, gdy włączona jest grupa i to, czego pytanie wymaga (kolumna „Wymaga”). Podrzędny przełącznik działa tylko przy włączonym nadrzędnym, także dla pytań w pomieszczeniach (np. `garden_dog_mess` wymaga „pies”, czyli też „zwierzę”).

| Przełącznik | PL | EN | Uwagi |
|---|---|---|---|
| zmywarka | Zmywarka | Dishwasher | pytania w Kuchni |
| pranie | Pranie | Laundry | grupa Pranie |
| pralka | Pralka | Washing machine | pod „pranie” |
| elektronika | Komputer i drobna elektronika | Computer & devices | grupa Komputer i drobna elektronika |
| komputer | Komputer | Computer | pod „elektronika” |
| sprzęt | Sprzęt do sprzątania | Cleaning gear | grupa Sprzęt do sprzątania |
| robot | Robot sprzątający | Robot vacuum | pod „sprzęt” |
| powietrze | Klimatyzacja i powietrze | Air & climate | grupa Klimatyzacja i powietrze |
| klimatyzacja | Klimatyzacja | Air conditioning | pod „powietrze” |
| nawilżacz | Nawilżacz powietrza | Humidifier | pod „powietrze” |
| oczyszczacz | Oczyszczacz powietrza | Air purifier | pod „powietrze” |
| samochód | Samochód | Car | grupa Samochód |
| dziecko | Dziecko | Kids | grupa Dziecko |
| niemowlę | Niemowlę | Baby | pod „dziecko” |
| zwierzę | Zwierzęta | Pets | grupa Zwierzęta |
| kot | Kot | Cat | pod „zwierzę” |
| pies | Pies | Dog | pod „zwierzę” |
| klatka | Zwierzę w klatce | Caged pet | pod „zwierzę” |
| akwarium | Akwarium | Aquarium | pod „zwierzę” |

## Rodzaje pomieszczeń

Kolejność tabeli to kolejność pomieszczeń w Obchodzie (design 7.5). Na liście wyboru Pokój jest pierwszy, reszta alfabetycznie według języka.

| Rodzaj | EN (roboczo) | Zestawy |
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
