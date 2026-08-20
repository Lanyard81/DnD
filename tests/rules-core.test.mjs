import { describe, it, expect } from 'vitest';
import {
  mulberry32, abilityMod, profBonusForLevel, fmtMod, clamp,
  parseDiceFormula, rollDie, rollFormula, rollD20, sortInitiative
} from '../src/rules-core.mjs';

describe('abilityMod', () => {
  it('computes standard 5e-style modifiers', () => {
    expect(abilityMod(10)).toBe(0);
    expect(abilityMod(11)).toBe(0);
    expect(abilityMod(8)).toBe(-1);
    expect(abilityMod(20)).toBe(5);
    expect(abilityMod(1)).toBe(-5);
    expect(abilityMod(30)).toBe(10);
  });
  it('defaults missing score to 10', () => {
    expect(abilityMod(undefined)).toBe(0);
  });
});

describe('profBonusForLevel', () => {
  it('starts at +2 for levels 1-4', () => {
    expect(profBonusForLevel(1)).toBe(2);
    expect(profBonusForLevel(4)).toBe(2);
  });
  it('increases every 4 levels', () => {
    expect(profBonusForLevel(5)).toBe(3);
    expect(profBonusForLevel(8)).toBe(3);
    expect(profBonusForLevel(9)).toBe(4);
    expect(profBonusForLevel(13)).toBe(5);
    expect(profBonusForLevel(17)).toBe(6);
    expect(profBonusForLevel(20)).toBe(6);
  });
  it('clamps below level 1', () => {
    expect(profBonusForLevel(0)).toBe(2);
    expect(profBonusForLevel(-5)).toBe(2);
  });
});

describe('fmtMod', () => {
  it('adds a plus sign for zero and positive', () => {
    expect(fmtMod(0)).toBe('+0');
    expect(fmtMod(5)).toBe('+5');
  });
  it('keeps the minus sign for negatives', () => {
    expect(fmtMod(-3)).toBe('-3');
  });
});

describe('clamp', () => {
  it('clamps into range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(50, 0, 10)).toBe(10);
  });
});

describe('parseDiceFormula', () => {
  it('parses basic formulas', () => {
    expect(parseDiceFormula('2d6+3')).toEqual({ count: 2, sides: 6, modifier: 3 });
    expect(parseDiceFormula('1d20-1')).toEqual({ count: 1, sides: 20, modifier: -1 });
    expect(parseDiceFormula('d20')).toEqual({ count: 1, sides: 20, modifier: 0 });
    expect(parseDiceFormula('4d8')).toEqual({ count: 4, sides: 8, modifier: 0 });
    expect(parseDiceFormula('d100')).toEqual({ count: 1, sides: 100, modifier: 0 });
  });
  it('tolerates whitespace', () => {
    expect(parseDiceFormula('  3d8 + 2  ')).toEqual({ count: 3, sides: 8, modifier: 2 });
  });
  it('rejects garbage input', () => {
    expect(parseDiceFormula('not a formula')).toBeNull();
    expect(parseDiceFormula('2d')).toBeNull();
    expect(parseDiceFormula('')).toBeNull();
    expect(parseDiceFormula(null)).toBeNull();
  });
  it('rejects out-of-range dice', () => {
    expect(parseDiceFormula('0d6')).toBeNull();
    expect(parseDiceFormula('101d6')).toBeNull();
    expect(parseDiceFormula('1d1')).toBeNull();
  });
});

describe('rollDie / rollFormula determinism with seeded RNG', () => {
  it('produces the same sequence for the same seed', () => {
    const rngA = mulberry32(42);
    const rngB = mulberry32(42);
    const seqA = [1, 2, 3].map(() => rollDie(20, rngA));
    const seqB = [1, 2, 3].map(() => rollDie(20, rngB));
    expect(seqA).toEqual(seqB);
  });
  it('rolls dice within [1, sides]', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const r = rollDie(6, rng);
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
  });
  it('rollFormula sums dice plus modifier correctly', () => {
    const rng = mulberry32(1);
    const result = rollFormula('3d6+2', rng);
    expect(result.dice).toHaveLength(3);
    result.dice.forEach(d => { expect(d).toBeGreaterThanOrEqual(1); expect(d).toBeLessThanOrEqual(6); });
    expect(result.total).toBe(result.dice.reduce((a, b) => a + b, 0) + 2);
  });
  it('rollFormula throws on invalid formula', () => {
    expect(() => rollFormula('garbage')).toThrow();
  });
});

describe('rollD20 advantage/disadvantage', () => {
  it('none mode rolls a single die', () => {
    const rng = mulberry32(99);
    const r = rollD20(5, 'none', rng);
    expect(r.rolls).toHaveLength(1);
    expect(r.total).toBe(r.chosen + 5);
  });
  it('advantage picks the higher of two rolls', () => {
    const rng = mulberry32(123);
    const r = rollD20(0, 'advantage', rng);
    expect(r.rolls).toHaveLength(2);
    expect(r.chosen).toBe(Math.max(...r.rolls));
  });
  it('disadvantage picks the lower of two rolls', () => {
    const rng = mulberry32(123);
    const r = rollD20(0, 'disadvantage', rng);
    expect(r.rolls).toHaveLength(2);
    expect(r.chosen).toBe(Math.min(...r.rolls));
  });
});

describe('sortInitiative', () => {
  it('sorts descending by roll', () => {
    const entries = [
      { id: 'a', roll: 10 },
      { id: 'b', roll: 18 },
      { id: 'c', roll: 5 }
    ];
    const sorted = sortInitiative(entries);
    expect(sorted.map(e => e.id)).toEqual(['b', 'a', 'c']);
  });
  it('breaks ties by higher dexMod', () => {
    const entries = [
      { id: 'a', roll: 12, dexMod: 1 },
      { id: 'b', roll: 12, dexMod: 3 },
      { id: 'c', roll: 12, dexMod: -1 }
    ];
    const sorted = sortInitiative(entries);
    expect(sorted.map(e => e.id)).toEqual(['b', 'a', 'c']);
  });
  it('falls back to original order on full ties', () => {
    const entries = [
      { id: 'first', roll: 10, dexMod: 0 },
      { id: 'second', roll: 10, dexMod: 0 },
      { id: 'third', roll: 10, dexMod: 0 }
    ];
    const sorted = sortInitiative(entries);
    expect(sorted.map(e => e.id)).toEqual(['first', 'second', 'third']);
  });
});
