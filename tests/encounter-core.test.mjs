import { describe, it, expect } from 'vitest';
import {
  longRestChanges, shortRestChanges, getConditionReminder, CONDITION_LIBRARY,
  threatScore, partyBudget, assessEncounterDifficulty, hasSpellSlot, consumeSpellSlot
} from '../src/encounter-core.mjs';

describe('hasSpellSlot / consumeSpellSlot', () => {
  it('reports a slot available when current > 0', () => {
    const char = { spellSlots: { 1: { max: 4, current: 2 } } };
    expect(hasSpellSlot(char, 1)).toBe(true);
  });
  it('reports unavailable when current is 0, or the level/spellSlots is missing entirely', () => {
    expect(hasSpellSlot({ spellSlots: { 1: { max: 4, current: 0 } } }, 1)).toBe(false);
    expect(hasSpellSlot({ spellSlots: {} }, 1)).toBe(false);
    expect(hasSpellSlot({}, 1)).toBe(false);
  });
  it('consumes a slot and returns true when one is available', () => {
    const char = { spellSlots: { 1: { max: 4, current: 2 } } };
    expect(consumeSpellSlot(char, 1)).toBe(true);
    expect(char.spellSlots[1].current).toBe(1);
  });
  it('returns false and leaves state unchanged when no slot is available', () => {
    const char = { spellSlots: { 1: { max: 4, current: 0 } } };
    expect(consumeSpellSlot(char, 1)).toBe(false);
    expect(char.spellSlots[1].current).toBe(0);
  });
});

describe('longRestChanges', () => {
  it('fully heals HP, clears temp HP, and clears conditions', () => {
    const char = { hp: { current: 3, max: 20, temp: 5 }, spellSlots: {}, conditions: [{ conditionId: 'Prone' }] };
    const result = longRestChanges(char);
    expect(result.hp).toEqual({ current: 20, max: 20, temp: 0 });
    expect(result.conditions).toEqual([]);
  });
  it('restores all spell slots to max', () => {
    const char = { hp: { current: 10, max: 10, temp: 0 }, spellSlots: { 1: { max: 4, current: 0 }, 2: { max: 2, current: 1 } }, conditions: [] };
    const result = longRestChanges(char);
    expect(result.spellSlots).toEqual({ 1: { max: 4, current: 4 }, 2: { max: 2, current: 2 } });
  });
});

describe('shortRestChanges', () => {
  it('heals up to max and preserves temp HP', () => {
    const char = { hp: { current: 5, max: 20, temp: 2 } };
    expect(shortRestChanges(char, 8).hp).toEqual({ current: 13, max: 20, temp: 2 });
  });
  it('caps healing at max HP', () => {
    const char = { hp: { current: 18, max: 20, temp: 0 } };
    expect(shortRestChanges(char, 100).hp.current).toBe(20);
  });
  it('treats negative heal amounts as zero', () => {
    const char = { hp: { current: 5, max: 20, temp: 0 } };
    expect(shortRestChanges(char, -3).hp.current).toBe(5);
  });
});

describe('getConditionReminder', () => {
  it('matches known conditions case-insensitively', () => {
    expect(getConditionReminder('Prone')).toBe(CONDITION_LIBRARY.prone);
    expect(getConditionReminder('PRONE')).toBe(CONDITION_LIBRARY.prone);
    expect(getConditionReminder('  prone  ')).toBe(CONDITION_LIBRARY.prone);
  });
  it('returns null for unknown conditions', () => {
    expect(getConditionReminder('Confused')).toBeNull();
    expect(getConditionReminder('')).toBeNull();
    expect(getConditionReminder(null)).toBeNull();
  });
});

describe('threatScore', () => {
  it('scales HP up by attack bonus', () => {
    expect(threatScore({ hpMax: 10, attackBonus: '+0' })).toBe(10);
    expect(threatScore({ hpMax: 10, attackBonus: '+5' })).toBe(15);
  });
  it('ignores negative attack bonuses (never scales down)', () => {
    expect(threatScore({ hpMax: 10, attackBonus: '-2' })).toBe(10);
  });
  it('falls back to hp field if hpMax is absent', () => {
    expect(threatScore({ hp: 8, attackBonus: '+0' })).toBe(8);
  });
});

describe('partyBudget', () => {
  it('sums level * 15 across the party', () => {
    expect(partyBudget([1, 1, 1])).toBe(45);
    expect(partyBudget([5])).toBe(75);
  });
});

describe('assessEncounterDifficulty', () => {
  it('labels a lopsided-favorable fight Easy', () => {
    const result = assessEncounterDifficulty([5, 5, 5, 5], [{ hpMax: 10, attackBonus: '+2' }]);
    expect(result.label).toBe('Easy');
  });
  it('labels an overwhelming fight Deadly', () => {
    const result = assessEncounterDifficulty([1, 1], [{ hpMax: 100, attackBonus: '+10' }, { hpMax: 100, attackBonus: '+10' }]);
    expect(result.label).toBe('Deadly');
  });
  it('handles an empty party without dividing by zero', () => {
    const result = assessEncounterDifficulty([], [{ hpMax: 10, attackBonus: '+0' }]);
    expect(result.label).toBe('Deadly');
    expect(Number.isFinite(result.ratio)).toBe(false);
  });
});
