import { describe, it, expect } from 'vitest';
import { isCombatantDown, advanceTurn, isSideDefeated } from '../src/combat-core.mjs';

describe('isCombatantDown', () => {
  it('treats 0 or negative hp as down', () => {
    expect(isCombatantDown(0)).toBe(true);
    expect(isCombatantDown(-3)).toBe(true);
  });
  it('treats positive hp as up', () => {
    expect(isCombatantDown(1)).toBe(false);
    expect(isCombatantDown(10)).toBe(false);
  });
  it('treats missing hp as down (safe default)', () => {
    expect(isCombatantDown(undefined)).toBe(true);
    expect(isCombatantDown(null)).toBe(true);
  });
});

describe('advanceTurn', () => {
  const order = ['a', 'b', 'c', 'd'];

  it('steps to the next combatant with no round rollover', () => {
    const hp = { a: 10, b: 10, c: 10, d: 10 };
    const result = advanceTurn(order, 0, hp);
    expect(result).toEqual({ activeIndex: 1, roundDelta: 0 });
  });

  it('rolls over to a new round when wrapping past index 0', () => {
    const hp = { a: 10, b: 10, c: 10, d: 10 };
    const result = advanceTurn(order, 3, hp);
    expect(result).toEqual({ activeIndex: 0, roundDelta: 1 });
  });

  it('skips defeated combatants', () => {
    const hp = { a: 10, b: 0, c: 10, d: 10 };
    const result = advanceTurn(order, 0, hp);
    expect(result.activeIndex).toBe(2); // skips b
    expect(result.roundDelta).toBe(0);
  });

  it('skips multiple consecutive defeated combatants and still rolls the round', () => {
    const hp = { a: 10, b: 0, c: 0, d: 10 };
    const result = advanceTurn(order, 3, hp); // d just went, wrap to a
    expect(result.activeIndex).toBe(0);
    expect(result.roundDelta).toBe(1);
  });

  it('finds the sole survivor even after a full wrap', () => {
    const hp = { a: 0, b: 0, c: 10, d: 0 };
    const result = advanceTurn(order, 2, hp); // c just went
    expect(result.activeIndex).toBe(2); // wraps all the way back to c
  });

  it('handles an empty order without throwing', () => {
    expect(advanceTurn([], 0, {})).toEqual({ activeIndex: 0, roundDelta: 0 });
  });
});

describe('isSideDefeated', () => {
  const order = ['p1', 'p2', 'e1', 'e2'];
  const sideOf = { p1: 'party', p2: 'party', e1: 'enemy', e2: 'enemy' };

  it('is false while at least one member of the side is alive', () => {
    const hp = { p1: 5, p2: 0, e1: 10, e2: 10 };
    expect(isSideDefeated(order, hp, sideOf, 'party')).toBe(false);
  });

  it('is true when every member of the side is down', () => {
    const hp = { p1: 0, p2: 0, e1: 10, e2: 10 };
    expect(isSideDefeated(order, hp, sideOf, 'party')).toBe(true);
  });

  it('is true (trivially) for a side with no members', () => {
    const hp = { p1: 5, p2: 5 };
    expect(isSideDefeated(order, hp, sideOf, 'neutral')).toBe(true);
  });
});
