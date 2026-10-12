// Polskie teksty interfejsu. Każdy klucz jest też w en.js, z tymi samymi parametrami (sprawdza to test).
// Liczebniki to obiekty z kategoriami Intl.PluralRules ('one', 'few', 'many', 'other' dla ułamków).
// Bez form osobowych czasu przeszłego (specyfikacja 12.3).

export default {
  'app.name': 'Cleaneh',

  'answer.yes': 'TAK',
  'answer.no': 'NIE',
  'answer.notNow': 'NIE TERAZ',
  'answer.na': 'NIE MAM',
  'answer.done': 'ZROBIONE',

  'card.minutes': '~{minutes} min',

  'move.to': 'Przejdź do',
  'move.next': 'Dalej',
  'move.questions': { one: '{count} pytanie', few: '{count} pytania', many: '{count} pytań', other: '{count} pytania' },
  'move.minutes': 'do {minutes} min',

  'area.numbered': '{name} {number}',

  'group.LAUNDRY': 'Pranie',
  'group.ELECTRONICS': 'Komputer i elektronika',
  'group.CLEANING_GEAR': 'Sprzęt do sprzątania',
  'group.AIR': 'Klimatyzacja i powietrze',
  'group.CAR': 'Samochód',
  'group.CHILD': 'Dziecko',
  'group.PETS': 'Zwierzęta',

  'series.stop': 'Zakończ',

  'sweep.title': 'Obchód',
  'sweep.progress': '{area} · {position}/{total}',
  'sweep.undo': 'Cofnij',
  'sweep.close': 'Przerwij Obchód',
  'sweep.hint': 'W prawo: TAK, w lewo: NIE, w górę: NIE MAM',

  'error.title': 'Cleaneh nie może otworzyć swoich danych',
  'error.newer': 'Dane zapisała nowsza wersja Cleaneh. Odśwież stronę, żeby ją pobrać.',
  'error.storage': 'Ta przeglądarka nie pozwala Cleaneh trzymać tu danych. Może to okno prywatne?',
  'error.reload': 'Odśwież',

  'home.sweep': 'Obchód',
  'home.continueSweep': 'Dokończ Obchód',
  'home.continueFirstSweep': 'Dokończ pierwszy Obchód',

  'scope.title': 'Co obchodzimy?',
  'scope.home': 'Całe mieszkanie',
  'scope.due': { one: '{count} do sprawdzenia', few: '{count} do sprawdzenia', many: '{count} do sprawdzenia', other: '{count} do sprawdzenia' },
  'scope.none': 'Nic nie czeka',
  'scope.close': 'Zamknij',

  'summary.title': 'Obchód zaliczony!',
  'summary.allGood': 'Wszystko wygląda dobrze. Zapytam, gdy przyjdzie pora.',
  'summary.nothingDue': 'Teraz nic nie czeka. Pięknie!',
  'summary.spots': 'Te miejsca czekają na chwilę uwagi:',
  'summary.remaining': {
    one: 'Jeszcze {count} rzecz poczeka w kolejce. Będę o nią pytać.',
    few: 'Jeszcze {count} rzeczy poczekają w kolejce. Będę o nie pytać.',
    many: 'Jeszcze {count} rzeczy poczeka w kolejce. Będę o nie pytać.',
    other: 'Jeszcze {count} rzeczy poczeka w kolejce. Będę o nie pytać.',
  },
  'summary.start': 'Zacznij od pierwszego',
  'summary.later': 'Później',
  'summary.done': 'Gotowe',
};
