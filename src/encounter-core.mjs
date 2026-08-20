// encounter-core.mjs
//
// Pure, dependency-free helpers for rest mechanics, condition mechanical
// reminders, and a rough encounter-difficulty heuristic. No DOM, no
// IndexedDB. Mirrored inline into index.html (see "ENCOUNTER CORE" section)
// — see D10. If you change behavior here, mirror the change in index.html too.

// Returns the *changes* a long rest makes — full HP, full spell slots, temp
// HP and conditions cleared — as a partial object the caller merges onto a
// real character, rather than mutating anything itself.
export function longRestChanges(char) {
  const spellSlots = {};
  for (const [lvl, slot] of Object.entries(char.spellSlots || {})) spellSlots[lvl] = { max: slot.max, current: slot.max };
  return { hp: { current: char.hp.max, max: char.hp.max, temp: 0 }, spellSlots, conditions: [] };
}

// A short rest heals `healAmount` (already-rolled, e.g. 1 hit-die-equivalent
// roll + CON mod, computed by the caller via the dice system) without
// touching spell slots or conditions — matches the "some classes only
// recover slots on a long rest" spirit without modeling per-class rules.
export function shortRestChanges(char, healAmount) {
  const current = Math.min(char.hp.max, char.hp.current + Math.max(0, healAmount));
  return { hp: { current, max: char.hp.max, temp: char.hp.temp } };
}

// Original, non-SRD mechanical reminder text for common condition names —
// short flavor-neutral notes so a DM doesn't have to remember what a
// condition does, without reproducing any copyrighted rules text. Matching
// is case-insensitive; unknown condition names simply get no reminder.
export const CONDITION_LIBRARY = {
  prone: 'Attacks against them from nearby have the edge; their own attacks don\'t.',
  restrained: 'Can\'t move. Attacks against them have the edge; their own attacks don\'t.',
  stunned: 'Can\'t act or move. Attacks against them have the edge.',
  poisoned: 'Their attacks and checks are hindered.',
  frightened: 'Can\'t willingly move closer to what scares them; checks near it are hindered.',
  charmed: 'Can\'t target the charmer with harmful actions.',
  blinded: 'Can\'t see. Their attacks are hindered; attacks against them have the edge.',
  deafened: 'Can\'t hear.',
  grappled: 'Speed becomes 0.',
  incapacitated: 'Can\'t take actions or reactions.',
  exhausted: 'Rising penalty to rolls the more exhausted they get.',
  invisible: 'Can\'t be seen without special means. Their attacks have the edge; attacks against them are hindered.'
};
export function getConditionReminder(name) {
  if (!name) return null;
  return CONDITION_LIBRARY[String(name).trim().toLowerCase()] || null;
}

// A deliberately rough, original (non-SRD-derived) difficulty heuristic —
// not a substitute for DM judgment, just a ballpark "is this fair" signal.
// threatScore scales a monster's HP by its rough offensive punch (attack
// bonus); partyBudget scales each character's level by a flat constant.
export function threatScore(monster) {
  const bonus = parseInt(String(monster.attackBonus ?? '+0').replace(/[^\d-]/g, '')) || 0;
  return (monster.hpMax || monster.hp || 0) * (1 + Math.max(0, bonus) / 10);
}
export function partyBudget(levels) {
  return levels.reduce((sum, lvl) => sum + Math.max(1, lvl) * 15, 0);
}
export function assessEncounterDifficulty(levels, monsters) {
  const budget = partyBudget(levels);
  const threat = monsters.reduce((sum, m) => sum + threatScore(m), 0);
  const ratio = budget > 0 ? threat / budget : (threat > 0 ? Infinity : 0);
  let label;
  if (ratio < 0.5) label = 'Easy';
  else if (ratio < 1) label = 'Moderate';
  else if (ratio < 1.5) label = 'Hard';
  else label = 'Deadly';
  return { budget, threat, ratio, label };
}
