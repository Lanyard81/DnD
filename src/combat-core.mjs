// combat-core.mjs
//
// Pure, dependency-free turn-progression logic for FableTable Solo combat.
// Initiative *ordering* lives in rules-core.mjs (sortInitiative); this file
// covers what happens turn-to-turn once an order is fixed: advancing past
// defeated combatants, detecting round rollover, and detecting a wipe.
//
// Mirrored inline into index.html (see "COMBAT CORE" section) — see D10.
// If you change behavior here, mirror the change in index.html too.

export function isCombatantDown(hp) {
  return hp === undefined || hp === null || hp <= 0;
}

// order: array of combatant ids in initiative sequence (fixed for the encounter).
// activeIndex: index into `order` of whoever just finished their turn.
// hpLookup: { [combatantId]: currentHp }
// Returns { activeIndex, roundDelta } — roundDelta is how many times the
// sequence wrapped past index 0 while skipping defeated combatants (normally
// 0 or 1; only >1 in the degenerate case of a single-combatant order).
export function advanceTurn(order, activeIndex, hpLookup) {
  if (!order || order.length === 0) return { activeIndex: 0, roundDelta: 0 };
  let idx = activeIndex;
  let roundDelta = 0;
  let steps = 0;
  const maxSteps = order.length + 1;
  do {
    idx = (idx + 1) % order.length;
    if (idx === 0) roundDelta++;
    steps++;
  } while (isCombatantDown(hpLookup[order[idx]]) && steps <= maxSteps);
  return { activeIndex: idx, roundDelta };
}

// sideOf: { [combatantId]: sideName }. Returns true if every combatant on
// `side` has hp <= 0 (or the side has no members at all, trivially "wiped").
export function isSideDefeated(order, hpLookup, sideOf, side) {
  const members = order.filter(id => sideOf[id] === side);
  if (members.length === 0) return true;
  return members.every(id => isCombatantDown(hpLookup[id]));
}
