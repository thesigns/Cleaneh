// Switches for gear and household (specification 7.6): a list with icons, all
// off at the start. A child shows only when its parent is on; turning the
// parent off keeps the child's own state. Used in the setup (10) and in Settings.

import { FEATURES, GROUPS } from '../core/catalog.js';
import { isEnabled, withFeature } from '../core/home.js';
import { GROUP_HUES, ROOM_HUES, paintArea } from './areas.js';
import { iconBlob } from './blob.js';
import { h, replaceChildren } from './dom.js';

const GROUP_ICON = {
  LAUNDRY: 'area_laundry',
  ELECTRONICS: 'area_electronics',
  CLEANING_GEAR: 'area_cleaning',
  AIR: 'area_air',
  CAR: 'area_car',
  CHILD: 'area_child',
  PET: 'area_pets',
};

const FEATURE_ICON = {
  DISHWASHER: 'feature_dishwasher',
  WASHING_MACHINE: 'area_laundry',
  COMPUTER: 'area_electronics',
  ROBOT_VACUUM: 'feature_robot',
  AIR_CONDITIONER: 'feature_air_conditioner',
  HUMIDIFIER: 'feature_humidifier',
  AIR_PURIFIER: 'feature_air_purifier',
  CAT: 'feature_cat',
  DOG: 'feature_dog',
  CAGE: 'feature_cage',
  AQUARIUM: 'feature_aquarium',
  BABY: 'feature_baby',
};

/** The group a switch belongs to (its own, or its parent's), for its color. */
function groupOf(feature) {
  const own = GROUPS.find((g) => g.switch === feature.id);
  if (own) return own.id;
  return feature.parent ? groupOf(FEATURES.find((f) => f.id === feature.parent)) : null;
}

export function featureIcon(id) {
  return FEATURE_ICON[id] ?? GROUP_ICON[id];
}

/** The list of switches; every change is saved at once through the engine. */
export function featuresEditor(ctx, home) {
  const { engine, i18n } = ctx;
  const list = h('div', { class: 'feature-list' });
  let current = home;

  async function toggle(id, on) {
    current = await engine.updateHome((h0) => withFeature(h0, id, on));
    render();
  }

  function render() {
    replaceChildren(
      list,
      FEATURES.filter((f) => f.parent === null || isEnabled(current, f.parent)).map((feature) => {
        const group = groupOf(feature);
        const on = isEnabled(current, feature.id);
        const id = `feature-${feature.id}`;
        return paintArea(
          h(
            'label',
            { class: `feature-row area${feature.parent ? ' feature-row--child' : ''}`, for: id },
            iconBlob(featureIcon(feature.id), { size: '2.75rem', animated: false }),
            h('span', { class: 'feature-row__name t-title-m' }, i18n.featureName(feature.id)),
            h('input', { class: 'switch', type: 'checkbox', role: 'switch', id, checked: on, dataset: { feature: feature.id }, onchange: (event) => toggle(feature.id, event.target.checked) }),
          ),
          group ? GROUP_HUES[group] : ROOM_HUES[3],
        );
      }),
    );
  }

  render();
  return { element: list, get home() { return current; } };
}
