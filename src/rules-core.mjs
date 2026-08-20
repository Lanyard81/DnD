// rules-core.mjs
//
// Pure, dependency-free rules-logic functions for FableTable Solo.
//
// IMPORTANT: This file exists ONLY so these functions can be unit-tested with
// Vitest during development (see DECISIONS.md D10). The shipped single-file
// artifact (index.html) does NOT import this file at runtime — the exact same
// function bodies are mirrored inline inside index.html's "RULES CORE" section
// so the app keeps working when opened as a standalone file with no server.
// If you change behavior here, mirror the change in index.html too.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function abilityMod(score) {
  return Math.floor((Number(score ?? 10) - 10) / 2);
}

export function profBonusForLevel(level) {
  return 2 + Math.floor((Math.max(1, Number(level || 1)) - 1) / 4);
}

export function fmtMod(n) {
  return n >= 0 ? '+' + n : String(n);
}

export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// Parses formulas like "2d6+3", "1d20-1", "d20", "4d6", "d100", "  3d8 + 2  ".
// Returns null if the formula doesn't match the expected shape.
export function parseDiceFormula(formula) {
  if (typeof formula !== 'string') return null;
  const m = formula.trim().match(/^(\d*)d(\d+)\s*([+-]\s*\d+)?$/i);
  if (!m) return null;
  const count = m[1] ? parseInt(m[1], 10) : 1;
  const sides = parseInt(m[2], 10);
  const modifier = m[3] ? parseInt(m[3].replace(/\s+/g, ''), 10) : 0;
  if (count < 1 || count > 100 || sides < 2 || sides > 1000) return null;
  return { count, sides, modifier };
}

export function rollDie(sides, rng) {
  const r = rng || Math.random;
  return Math.floor(r() * sides) + 1;
}

// Rolls a parsed formula (or formula string) using the given rng (defaults to Math.random).
// Returns { formula, dice:[...], modifier, total }.
export function rollFormula(formulaOrParsed, rng) {
  const parsed = typeof formulaOrParsed === 'string' ? parseDiceFormula(formulaOrParsed) : formulaOrParsed;
  if (!parsed) throw new Error('Invalid dice formula');
  const dice = [];
  for (let i = 0; i < parsed.count; i++) dice.push(rollDie(parsed.sides, rng));
  const total = dice.reduce((a, b) => a + b, 0) + parsed.modifier;
  return { dice, modifier: parsed.modifier, total, sides: parsed.sides, count: parsed.count };
}

// Rolls a single d20 with optional advantage/disadvantage, plus a flat modifier.
// mode: 'none' | 'advantage' | 'disadvantage'
export function rollD20(modifier, mode, rng) {
  const a = rollDie(20, rng);
  if (mode === 'advantage' || mode === 'disadvantage') {
    const b = rollDie(20, rng);
    const chosen = mode === 'advantage' ? Math.max(a, b) : Math.min(a, b);
    return { rolls: [a, b], chosen, modifier: modifier || 0, total: chosen + (modifier || 0), mode };
  }
  return { rolls: [a], chosen: a, modifier: modifier || 0, total: a + (modifier || 0), mode: 'none' };
}

// Sorts initiative entries descending by roll, tie-broken by higher dexMod,
// then by stable original insertion order (entries must carry an `order` field
// reflecting original array position for a fully deterministic stable sort).
export function sortInitiative(entries) {
  return entries
    .map((e, i) => ({ ...e, __i: i }))
    .sort((a, b) => {
      if (b.roll !== a.roll) return b.roll - a.roll;
      const bDex = b.dexMod ?? 0, aDex = a.dexMod ?? 0;
      if (bDex !== aDex) return bDex - aDex;
      return a.__i - b.__i;
    })
    .map(({ __i, ...rest }) => rest);
}
