// What to start with after a Sweep (specification 6.4).

import { areaHue, areaIcon, paintArea } from '../areas.js';
import { iconBlob } from '../blob.js';
import { button, pill } from '../components.js';
import { h } from '../dom.js';

/**
 * What to start with after a Sweep (6.4): up to three things, the rest waits in the queue. `household` gives the
 * learned task times. Used after a Sweep and at the end of the setup.
 */
export function summaryContent(ctx, household, { toStart, remaining }, nothingDue, { onStart, onDone }) {
  const { scheduler, i18n } = ctx;
  const t = i18n.t;
  const home = household.home;
  const subtitle = nothingDue ? 'summary.nothingDue' : toStart.length === 0 ? 'summary.allGood' : 'summary.spots';
  return h(
    'div',
    { class: 'summary' },
    h(
      'div',
      { class: 'summary__scroll' },
      iconBlob('ui_sparkles', { size: 'min(10.75rem, 20vh)', className: 'blob--primary summary__hero' }),
      h('h1', { class: 'summary__title t-headline-m' }, t('summary.title')),
      h('p', { class: 'summary__text t-body-l' }, t(subtitle)),
      h(
        'ul',
        { class: 'spots' },
        toStart.map((key, index) => {
          const area = key.slice(key.indexOf('@') + 1);
          const minutes = Math.max(1, Math.round(scheduler.minutes(household, key)));
          return paintArea(
            h(
              'li',
              { class: 'spot area', style: { animationDelay: `${250 + 110 * index}ms` } },
              iconBlob(areaIcon(area, home), { size: '3.375rem', seed: index, animated: false }),
              h('div', { class: 'spot__text' }, h('p', { class: 'spot__area t-label-m' }, i18n.areaName(area, home)), h('p', { class: 'spot__task t-title-m' }, i18n.taskText(key))),
              pill(t('card.minutes', { minutes })),
            ),
            areaHue(area, home),
          );
        }),
      ),
      remaining > 0 ? h('p', { class: 'summary__remaining t-body-m' }, t('summary.remaining', { count: remaining })) : null,
    ),
    h(
      'div',
      { class: 'summary__actions' },
      toStart.length > 0 ? [button(t('summary.start'), onStart), button(t('summary.later'), onDone, { variant: 'text' })] : button(t('summary.done'), onDone),
    ),
  );
}
