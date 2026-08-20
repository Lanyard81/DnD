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

// Damage-type resistance/immunity/vulnerability. `entity` carries
// resistances/immunities/vulnerabilities: string[] of lowercase damage-type
// tags (e.g. "fire"). No damageType or no match on any list is a straight
// 1x multiplier — this only ever narrows or widens an already-rolled amount,
// it never re-rolls anything.
export function resistanceMultiplier(damageType, entity) {
  if (!damageType || !entity) return 1;
  const type = String(damageType).trim().toLowerCase();
  if (!type) return 1;
  const has = (arr) => Array.isArray(arr) && arr.some(t => String(t).trim().toLowerCase() === type);
  if (has(entity.immunities)) return 0;
  if (has(entity.resistances)) return 0.5;
  if (has(entity.vulnerabilities)) return 2;
  return 1;
}
export function applyDamageWithResistance(amount, damageType, entity) {
  return Math.floor(Math.max(0, amount) * resistanceMultiplier(damageType, entity));
}

// Total saving-throw bonus for one ability against one target. `info.abilities`
// is the standard {str,dex,con,int,wis,cha} score object. Two supported
// shapes for info.savingThrows, matching how characters vs. monsters store
// it in this codebase: a character's {ability: {proficient}} (added to
// ability mod + a supplied proficiency bonus), or a monster's flat
// {ability: totalBonus} (already includes ability mod + whatever else the
// DM entered, used as-is — matches how printed stat blocks list saves).
export function saveBonusFor(info, ability, profBonus) {
  const abilities = (info && info.abilities) || {};
  const mod = Math.floor((Number(abilities[ability] ?? 10) - 10) / 2);
  const st = ((info && info.savingThrows) || {})[ability];
  if (typeof st === 'number') return st;
  const proficient = !!(st && st.proficient);
  return mod + (proficient ? Math.max(0, profBonus || 0) : 0);
}
