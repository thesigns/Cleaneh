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

  'error.title': 'Cleaneh cannot open its data',
  'error.newer': 'The data was saved by a newer version of Cleaneh. Reload the page to get it.',
  'error.storage': 'This browser does not let Cleaneh keep data here. A private window may be the reason.',
  'error.reload': 'Reload',

  'home.sweep': 'Sweep',
  'home.continueSweep': 'Continue the Sweep',
  'home.continueFirstSweep': 'Continue the first Sweep',

  'scope.title': 'What shall we check?',
  'scope.home': 'The whole home',
  'scope.due': { one: '{count} due', other: '{count} due' },
  'scope.none': 'Nothing due',
  'scope.close': 'Close',

  'summary.title': 'Sweep done!',
  'summary.allGood': "Everything looks good. I'll ask when it's time.",
  'summary.nothingDue': 'Nothing is due right now. Lovely!',
  'summary.spots': 'These spots could use a moment:',
  'summary.remaining': { one: "{count} more thing will wait its turn. I'll ask about it.", other: "{count} more things will wait their turn. I'll ask about them." },
  'summary.start': 'Start with the first one',
  'summary.later': 'Later',
  'summary.done': 'Done',
};
