// bot-ai-core.mjs
//
// Pure, dependency-free bot logic for FableTable Solo: command parsing,
// templated dialogue selection, and combat target selection. No LLM, no
// network — deterministic decision trees and weighted template selection.
//
// Mirrored inline into index.html (see "BOT AI CORE" section) for the same
// reason as rules-core.mjs — see DECISIONS.md D10. Keep both in sync.

// Recognizes a small fixed command grammar so the player can direct bots
// without free-text parsing. Returns { type, target } or { type: null }.
export function parseCommand(text) {
  if (typeof text !== 'string') return { type: null };
  const t = text.trim().toLowerCase();
  if (!t) return { type: null };

  let m;
  if ((m = t.match(/^focus\s+(?:on\s+)?(.+)$/))) return { type: 'focus', target: m[1].trim() };
  if (/^(hold( position)?|stay|wait)$/.test(t)) return { type: 'hold', target: null };
  if (/^(flee|retreat|fall back|run)$/.test(t)) return { type: 'flee', target: null };
  if ((m = t.match(/^use\s+(.+)$/))) return { type: 'use_item', target: m[1].trim() };
  return { type: null, target: null };
}

// Filters a dialogue bank (array of { text, temperaments? }) down to entries
// matching the bot's temperament, falling back to temperament-agnostic ("generic")
// entries if there's no match, and finally to the whole bank if nothing is tagged.
export function filterBankByTemperament(bank, temperament) {
  if (!Array.isArray(bank) || bank.length === 0) return [];
  const tagged = bank.filter(e => Array.isArray(e.temperaments) && e.temperaments.includes(temperament));
  if (tagged.length) return tagged;
  const generic = bank.filter(e => !e.temperaments || e.temperaments.length === 0);
  return generic.length ? generic : bank;
}

// Replaces {slotName} placeholders in a template string with values from `slots`.
// Unmatched placeholders are left as-is rather than throwing, so a missing slot
// degrades gracefully instead of breaking the whole line.
export function fillTemplate(template, slots) {
  if (typeof template !== 'string') return '';
  return template.replace(/\{(\w+)\}/g, (whole, key) => (slots && key in slots ? String(slots[key]) : whole));
}

// Picks one dialogue line for a bot from a bank, filtered by temperament and
// filled with the given slots. `rng` defaults to Math.random but accepts a
// seeded generator for deterministic tests/reproducible output.
export function pickDialogueLine(bank, temperament, slots, rng) {
  const pool = filterBankByTemperament(bank, temperament);
  if (!pool.length) return null;
  const r = rng || Math.random;
  const entry = pool[Math.floor(r() * pool.length)];
  return fillTemplate(entry.text, slots || {});
}

// Chooses a combat action for a bot given the current situation.
// situation: {
//   self: { hp, hpMax, isHealer, spell? },  // spell: { type: 'damage'|'heal', formula }
//   allies: [{ id, name, hp, hpMax }],
//   enemies: [{ id, name, hp, hpMax, role }]  // role e.g. 'caster' | 'priority'
// }
// combatStyle: 'simple' | 'moderate' | 'advanced'
// Returns { type: 'hold' } | { type: 'attack'|'cast'|'heal', targetId }
// A bot with a known 'heal' spell can heal a critical ally even without the
// isHealer flag (isHealer models class-granted healing; a known heal spell
// is its own, independent reason to be able to heal). A bot with a 'damage'
// spell prefers casting it over a weapon attack only at Advanced tier — the
// same tier that already reasons about target priority — leaving Simple/
// Moderate weapon-focused, matching their existing "keep it straightforward"
// character.
export function chooseBotAction(combatStyle, situation) {
  const livingEnemies = (situation.enemies || []).filter(e => e.hp > 0);
  if (!livingEnemies.length) return { type: 'hold' };

  const self = situation.self || {};
  const canHeal = (combatStyle === 'moderate' || combatStyle === 'advanced') && (self.isHealer || (self.spell && self.spell.type === 'heal'));
  if (canHeal) {
    const criticalAlly = (situation.allies || [])
      .filter(a => a.hp > 0 && a.hp / a.hpMax <= 0.5)
      .sort((a, b) => (a.hp / a.hpMax) - (b.hp / b.hpMax))[0];
    if (criticalAlly) return { type: 'heal', targetId: criticalAlly.id };
  }

  let pool = livingEnemies;
  if (combatStyle === 'advanced') {
    const priority = livingEnemies.filter(e => e.role === 'caster' || e.role === 'priority');
    if (priority.length) pool = priority;
  }
  const target = pool.reduce((best, e) => (e.hp < best.hp ? e : best), pool[0]);
  if (combatStyle === 'advanced' && self.spell && self.spell.type === 'damage') return { type: 'cast', targetId: target.id };
  return { type: 'attack', targetId: target.id };
}
