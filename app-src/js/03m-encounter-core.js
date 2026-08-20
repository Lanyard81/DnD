/* ---- Encounter core: rest mechanics, condition reminders, difficulty heuristic ---- */
// Mirrored 1:1 from src/encounter-core.mjs (see tests/encounter-core.test.mjs).
// If you change behavior here, mirror the change in src/encounter-core.mjs too.
function longRestChanges(char) {
  const spellSlots = {};
  for (const [lvl, slot] of Object.entries(char.spellSlots || {})) spellSlots[lvl] = { max: slot.max, current: slot.max };
  return { hp: { current: char.hp.max, max: char.hp.max, temp: 0 }, spellSlots, conditions: [] };
}
function shortRestChanges(char, healAmount) {
  const current = Math.min(char.hp.max, char.hp.current + Math.max(0, healAmount));
  return { hp: { current, max: char.hp.max, temp: char.hp.temp } };
}
function hasSpellSlot(char, level) {
  const slot = char && char.spellSlots && char.spellSlots[level];
  return !!(slot && slot.current > 0);
}
function consumeSpellSlot(char, level) {
  if (!hasSpellSlot(char, level)) return false;
  char.spellSlots[level].current -= 1;
  return true;
}
const CONDITION_LIBRARY = {
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
function getConditionReminder(name) {
  if (!name) return null;
  return CONDITION_LIBRARY[String(name).trim().toLowerCase()] || null;
}
function threatScore(monster) {
  const bonus = parseInt(String(monster.attackBonus ?? '+0').replace(/[^\d-]/g, '')) || 0;
  return (monster.hpMax || monster.hp || 0) * (1 + Math.max(0, bonus) / 10);
}
function partyBudget(levels) {
  return levels.reduce((sum, lvl) => sum + Math.max(1, lvl) * 15, 0);
}
function assessEncounterDifficulty(levels, monsters) {
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
