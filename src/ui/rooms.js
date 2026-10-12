// The user's rooms (specification 7.5): "New room" and the list, each room
// opening the same full-screen editor to change its name, color or kind, or
// remove it. Used in the setup (10) and in Settings (5.2).

import { ROOM_KINDS } from '../core/catalog.js';
import { activeRooms, addRoom, canRemove, changeKind, nextColor, nextNumber, recolorRoom, removeRoom, renameRoom, roomArea } from '../core/home.js';
import { ROOM_HUES, areaSeed, kindIcon, paintArea } from './areas.js';
import { iconBlob } from './blob.js';
import { button, iconButton } from './components.js';
import { choose } from './dialog.js';
import { h, replaceChildren } from './dom.js';
import { icon } from './icons.js';
import { historyLayer } from './layer.js';

/** Kinds as offered: the general room first, the others alphabetically in the app's language (7.5). */
function orderedKinds(i18n) {
  const others = ROOM_KINDS.map((k) => k.id).filter((id) => id !== 'ROOM');
  return ['ROOM', ...others.sort((a, b) => i18n.collator.compare(i18n.kindName(a), i18n.kindName(b)))];
}

/**
 * The list of rooms with "New room". Every change is saved at once through the engine; `onChange(home)` is
 * called after it.
 */
export function roomsEditor(ctx, home, { onChange = () => {} } = {}) {
  const { engine, i18n } = ctx;
  const t = i18n.t;
  const list = h('div', { class: 'room-list' });
  let current = home;

  async function apply(change) {
    current = await engine.updateHome(change);
    render();
    onChange(current);
  }

  async function edit(room) {
    const result = await roomEditor(ctx, current, room);
    if (!result) return;
    if (result === 'remove') return apply((h0) => removeRoom(h0, room.id));
    const { kind, name, color } = result;
    if (!room) return apply((h0) => addRoom(h0, kind, { name, color }));
    return apply((h0) => recolorRoom(renameRoom(changeKind(h0, room.id, kind), room.id, name), room.id, color));
  }

  function render() {
    const rooms = activeRooms(current);
    replaceChildren(
      list,
      rooms.map((room) =>
        paintArea(
          h(
            'button',
            { type: 'button', class: 'room-row area', onclick: () => edit(room), dataset: { room: room.id } },
            iconBlob(kindIcon(room.kind), { size: '2.75rem', seed: areaSeed(roomArea(room.id)), animated: false }),
            h(
              'span',
              { class: 'room-row__text' },
              h('span', { class: 't-title-m' }, i18n.roomName(room)),
              // A room with its own name also shows what it is.
              room.name ? h('span', { class: 'room-row__kind t-body-m' }, i18n.kindName(room.kind)) : null,
            ),
            icon('ui_settings', { className: 'room-row__edit' }),
          ),
          ROOM_HUES[room.color],
        ),
      ),
    );
    list.hidden = rooms.length === 0;
  }

  render();
  const element = h('div', { class: 'rooms' }, button(t('rooms.add'), () => edit(null), { variant: 'tonal', iconName: 'ui_plus' }), list);
  return { element, get home() { return current; } };
}

/**
 * Adding (`room` null) or changing a room: an optional name, its color (a new room starts with the suggested
 * one) and its kind; removing (not the last room). Full screen, so the kinds fit on a small phone and the
 * keyboard has room. Resolves { kind, name, color }, 'remove' or null (cancelled).
 */
export function roomEditor(ctx, home, room) {
  const { i18n } = ctx;
  const t = i18n.t;
  let resolve;
  const result = new Promise((r) => (resolve = r));
  let answer = null;
  let kind = room?.kind ?? null;
  let color = room?.color ?? nextColor(home);

  const defaultName = () => {
    if (!kind) return '';
    const number = room && room.kind === kind ? room.number : nextNumber(home, kind);
    return i18n.roomName({ kind, number, name: null });
  };

  const input = h('input', { class: 'field__input', type: 'text', maxlength: 30, autocomplete: 'off', value: room?.name ?? '', id: 'room-name' });
  const hint = h('p', { class: 'field__hint t-body-m' });
  const swatches = ROOM_HUES.map((hue, index) =>
    paintArea(
      h('button', { type: 'button', class: 'swatch-button area', role: 'radio', 'aria-label': t('room.colorN', { number: index + 1 }), onclick: () => pickColor(index) }, icon('ui_check', { className: 'swatch-button__check' })),
      hue,
    ),
  );
  const kinds = orderedKinds(i18n);
  const tiles = new Map(
    kinds.map((id) => [
      id,
      h(
        'button',
        { type: 'button', class: `kind-tile${id === 'ROOM' ? ' kind-tile--wide' : ''}`, role: 'radio', onclick: () => pickKind(id), dataset: { kind: id } },
        iconBlob(kindIcon(id), { size: '2.5rem', seed: kinds.indexOf(id), animated: false }),
        h('span', { class: 'kind-tile__text' }, h('span', { class: 't-title-s' }, i18n.kindName(id)), id === 'ROOM' ? h('span', { class: 'kind-tile__hint t-body-m' }, t('room.kindRoomHint')) : null),
      ),
    ]),
  );
  const save = button(t(room ? 'room.save' : 'room.add'), () => finish({ kind, name: input.value, color }), { className: 'room-editor__save' });
  const removable = room && canRemove(home, room.id);
  const remove = room
    ? button(t('room.remove'), () => confirmRemove(), { variant: 'text', className: 'room-editor__remove' })
    : null;
  if (remove && !removable) remove.disabled = true;

  function update() {
    const suggested = defaultName();
    input.placeholder = suggested;
    hint.textContent = suggested ? t('room.defaultName', { name: suggested }) : '';
    swatches.forEach((swatch, index) => swatch.setAttribute('aria-checked', String(index === color)));
    for (const [id, tile] of tiles) {
      const selected = id === kind;
      tile.classList.toggle('kind-tile--selected', selected);
      tile.classList.toggle('area', selected);
      tile.setAttribute('aria-checked', String(selected));
      if (selected) paintArea(tile, ROOM_HUES[color]);
    }
    save.disabled = !kind;
  }

  function pickColor(index) {
    color = index;
    update();
  }

  function pickKind(id) {
    kind = id;
    update();
  }

  async function confirmRemove() {
    const choice = await choose({
      title: t('room.removeTitle', { name: i18n.roomName(room) }),
      body: [h('p', { class: 't-body-m' }, t('room.removeText'))],
      safeLabel: t('room.keep'),
      otherLabel: t('room.remove'),
      otherTone: 'tone-no',
    });
    if (choice === 'other') finish('remove');
  }

  const element = h(
    'div',
    { class: 'room-editor', role: 'dialog', 'aria-modal': 'true', 'aria-label': t(room ? 'room.edit' : 'rooms.add') },
    h('header', { class: 'room-editor__bar' }, iconButton('ui_close', t('room.cancel'), () => finish(null)), h('h2', { class: 't-title-l' }, t(room ? 'room.edit' : 'rooms.add'))),
    // The name stays above the scrolling part, so the keyboard never pushes it out of sight.
    h('div', { class: 'field room-editor__name' }, h('label', { class: 'field__label t-label-l', for: 'room-name' }, t('room.name')), input, hint),
    h(
      'div',
      { class: 'room-editor__scroll' },
      h('p', { class: 'room-editor__label t-label-l' }, t('room.color')),
      h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': t('room.color') }, swatches),
      h('p', { class: 'room-editor__label t-label-l' }, t('room.kind')),
      h('div', { class: 'kinds', role: 'radiogroup', 'aria-label': t('room.kind') }, [...tiles.values()]),
    ),
    h(
      'footer',
      { class: 'room-editor__actions' },
      remove,
      h('span', { class: 'room-editor__space' }),
      button(t('room.cancel'), () => finish(null), { variant: 'text' }),
      save,
    ),
    room && !removable ? h('p', { class: 'room-editor__note t-body-m' }, t('room.last')) : null,
  );

  const layer = historyLayer(() => {
    element.classList.add('room-editor--closing');
    setTimeout(() => element.remove(), 200);
    resolve(answer);
  });
  function finish(value) {
    answer = value;
    layer.close();
  }

  update();
  document.body.append(element);
  if (!room) element.querySelector('.kind-tile')?.focus({ preventScroll: true });
  return result;
}
