// English interface texts. Every key also exists in pl.js, with the same parameters (a test checks).
// Plurals are objects keyed by Intl.PluralRules categories ('one', 'other').

export default {
  'app.name': 'Cleaneh',

  'answer.yes': 'YES',
  'answer.no': 'NO',
  'answer.notNow': 'NOT NOW',
  'answer.na': 'N/A',
  'answer.done': 'DONE',

  'card.minutes': '~{minutes} min',

  'move.to': 'Head to',
  'move.next': 'Next',
  'move.questions': { one: '{count} question', other: '{count} questions' },
  'move.minutes': 'up to {minutes} min',

  'area.numbered': '{name} {number}',

  'group.LAUNDRY': 'Laundry',
  'group.ELECTRONICS': 'Computer & devices',
  'group.CLEANING_GEAR': 'Cleaning gear',
  'group.AIR': 'Air & climate',
  'group.CAR': 'Car',
  'group.CHILD': 'Kids',
  'group.PETS': 'Pets',

  'series.stop': 'Stop',

  'sweep.title': 'Sweep',
  'sweep.progress': '{area} · {position}/{total}',
  'sweep.undo': 'Undo',
  'sweep.close': 'Stop the Sweep',
  'sweep.hint': 'Swipe right for YES, left for NO, up for N/A',
};
