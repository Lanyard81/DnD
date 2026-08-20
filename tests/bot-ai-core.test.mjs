import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../src/rules-core.mjs';
import {
  parseCommand, filterBankByTemperament, fillTemplate, pickDialogueLine, chooseBotAction
} from '../src/bot-ai-core.mjs';

describe('parseCommand', () => {
  it('recognizes focus with a target', () => {
    expect(parseCommand('focus the caster')).toEqual({ type: 'focus', target: 'the caster' });
    expect(parseCommand('Focus on Grendel')).toEqual({ type: 'focus', target: 'grendel' });
  });
  it('recognizes hold position variants', () => {
    expect(parseCommand('hold position').type).toBe('hold');
    expect(parseCommand('hold').type).toBe('hold');
    expect(parseCommand('wait').type).toBe('hold');
    expect(parseCommand('stay').type).toBe('hold');
  });
  it('recognizes flee variants', () => {
    expect(parseCommand('flee').type).toBe('flee');
    expect(parseCommand('retreat').type).toBe('flee');
    expect(parseCommand('fall back').type).toBe('flee');
  });
  it('recognizes use item', () => {
    expect(parseCommand('use healing potion')).toEqual({ type: 'use_item', target: 'healing potion' });
  });
  it('returns null type for free narration text', () => {
    expect(parseCommand('The party enters the tavern.').type).toBeNull();
    expect(parseCommand('').type).toBeNull();
  });
});

describe('filterBankByTemperament', () => {
  const bank = [
    { text: 'A generic line.' },
    { text: 'A gruff line.', temperaments: ['gruff'] },
    { text: 'Another gruff line.', temperaments: ['gruff', 'stoic'] },
    { text: 'A cheerful line.', temperaments: ['cheerful'] }
  ];
  it('prefers temperament-matching entries', () => {
    const result = filterBankByTemperament(bank, 'gruff');
    expect(result).toHaveLength(2);
    expect(result.every(e => e.temperaments.includes('gruff'))).toBe(true);
  });
  it('falls back to generic entries when no temperament match', () => {
    const result = filterBankByTemperament(bank, 'mysterious');
    expect(result).toEqual([{ text: 'A generic line.' }]);
  });
  it('falls back to the whole bank if nothing is untagged and nothing matches', () => {
    const allTagged = bank.slice(1);
    const result = filterBankByTemperament(allTagged, 'mysterious');
    expect(result).toEqual(allTagged);
  });
  it('handles empty banks', () => {
    expect(filterBankByTemperament([], 'gruff')).toEqual([]);
    expect(filterBankByTemperament(null, 'gruff')).toEqual([]);
  });
});

describe('fillTemplate', () => {
  it('replaces known slots', () => {
    expect(fillTemplate('{name} eyes {target} warily.', { name: 'Kessa', target: 'the door' }))
      .toBe('Kessa eyes the door warily.');
  });
  it('leaves unmatched placeholders intact', () => {
    expect(fillTemplate('{name} says hi to {missing}.', { name: 'Orin' }))
      .toBe('Orin says hi to {missing}.');
  });
});

describe('pickDialogueLine', () => {
  const bank = [
    { text: '{name} nods.', temperaments: ['stoic'] },
    { text: '{name} grins widely.', temperaments: ['cheerful'] },
    { text: '{name} shrugs.' }
  ];
  it('is deterministic with a seeded rng', () => {
    const rngA = mulberry32(5);
    const rngB = mulberry32(5);
    const a = pickDialogueLine(bank, 'stoic', { name: 'Tamsin' }, rngA);
    const b = pickDialogueLine(bank, 'stoic', { name: 'Tamsin' }, rngB);
    expect(a).toBe(b);
  });
  it('fills the name slot in the chosen line', () => {
    const line = pickDialogueLine(bank, 'stoic', { name: 'Tamsin' }, () => 0);
    expect(line).toBe('Tamsin nods.');
  });
  it('returns null for an empty bank', () => {
    expect(pickDialogueLine([], 'stoic', {}, () => 0)).toBeNull();
  });
});

describe('chooseBotAction', () => {
  const enemies = [
    { id: 'e1', name: 'Grunt', hp: 10, hpMax: 10, role: 'minion' },
    { id: 'e2', name: 'Wounded Grunt', hp: 2, hpMax: 10, role: 'minion' },
    { id: 'e3', name: 'Hexcaller', hp: 8, hpMax: 8, role: 'caster' }
  ];

  it('holds when there are no living enemies', () => {
    const deadOnly = [{ id: 'e1', name: 'Grunt', hp: 0, hpMax: 10 }];
    expect(chooseBotAction('simple', { self: {}, allies: [], enemies: deadOnly })).toEqual({ type: 'hold' });
  });

  it('simple style attacks the lowest-HP living enemy regardless of role', () => {
    const action = chooseBotAction('simple', { self: {}, allies: [], enemies });
    expect(action).toEqual({ type: 'attack', targetId: 'e2' });
  });

  it('moderate style with a healer heals the most critical ally instead of attacking', () => {
    const allies = [
      { id: 'a1', name: 'Kessa', hp: 3, hpMax: 12 },
      { id: 'a2', name: 'Orin', hp: 6, hpMax: 8 }
    ];
    const action = chooseBotAction('moderate', { self: { isHealer: true }, allies, enemies });
    expect(action).toEqual({ type: 'heal', targetId: 'a1' });
  });

  it('moderate style without a critical ally attacks the lowest-HP enemy', () => {
    const allies = [{ id: 'a1', name: 'Kessa', hp: 11, hpMax: 12 }];
    const action = chooseBotAction('moderate', { self: { isHealer: true }, allies, enemies });
    expect(action).toEqual({ type: 'attack', targetId: 'e2' });
  });

  it('advanced style prioritizes caster/priority enemies over lower-HP non-priority ones', () => {
    const action = chooseBotAction('advanced', { self: {}, allies: [], enemies });
    expect(action).toEqual({ type: 'attack', targetId: 'e3' });
  });

  it('advanced style with a critical ally still heals before targeting priority enemies', () => {
    const allies = [{ id: 'a1', name: 'Kessa', hp: 2, hpMax: 12 }];
    const action = chooseBotAction('advanced', { self: { isHealer: true }, allies, enemies });
    expect(action).toEqual({ type: 'heal', targetId: 'a1' });
  });

  it('a bot with a known heal spell can heal without the isHealer flag', () => {
    const allies = [{ id: 'a1', name: 'Kessa', hp: 3, hpMax: 12 }];
    const action = chooseBotAction('moderate', { self: { spell: { type: 'heal', formula: '2d8' } }, allies, enemies });
    expect(action).toEqual({ type: 'heal', targetId: 'a1' });
  });

  it('simple/moderate style ignores a damage spell and still attacks with a weapon', () => {
    const action = chooseBotAction('moderate', { self: { spell: { type: 'damage', formula: '3d6' } }, allies: [], enemies });
    expect(action).toEqual({ type: 'attack', targetId: 'e2' });
  });

  it('advanced style casts a damage spell instead of attacking when one is known', () => {
    const action = chooseBotAction('advanced', { self: { spell: { type: 'damage', formula: '3d6' } }, allies: [], enemies });
    expect(action).toEqual({ type: 'cast', targetId: 'e3' }); // still respects priority targeting
  });

  it('a damage-spell bot with no heal capability still casts even with an injured ally nearby (no heal path applies)', () => {
    const allies = [{ id: 'a1', name: 'Kessa', hp: 2, hpMax: 12 }];
    const action = chooseBotAction('advanced', { self: { spell: { type: 'damage', formula: '3d6' } }, allies, enemies });
    expect(action).toEqual({ type: 'cast', targetId: 'e3' });
  });
});
