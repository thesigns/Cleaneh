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
};
