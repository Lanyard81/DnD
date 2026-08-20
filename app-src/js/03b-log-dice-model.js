/* ---- Log entries & dice rolls (unified session log, DATA_MODEL.md) ---- */
const LOG_TYPES = ['narration', 'dialogue', 'ooc', 'emote', 'system', 'override'];
function makeLogEntry({ campaignId, type, speakerType, speakerId, text, visibility }) {
  return {
    id: uid(),
    campaignId,
    sceneId: null,
    type: LOG_TYPES.includes(type) ? type : 'narration',
    speakerType: speakerType || 'player',
    speakerId: speakerId || null,
    text: text || '',
    visibility: visibility || 'all',
    createdAt: nowIso()
  };
}
function makeDiceRoll({ campaignId, actorType, actorId, formula, dice, modifier, total, purpose, advantage }) {
  return {
    id: uid(),
    campaignId,
    encounterId: null,
    actorType: actorType || 'player',
    actorId: actorId || null,
    formula: formula || '',
    dice: dice || [],
    modifier: modifier || 0,
    total,
    purpose: purpose || 'roll',
    advantage: advantage || 'none',
    overridden: false,
    overrideValue: null,
    createdAt: nowIso()
  };
}

// Pregenerated sample characters (Phase 2 seed content). Entirely original
// homebrew names — see DECISIONS.md D11/D12. Selectable from the character
// creation wizard as a quick-start starting point, not a rigid template.
const PREGEN_CHARACTERS = [
  {
    name: 'Kessa Ironvale', species: 'Stoneborn', class: 'Bladeward', subclass: 'Oath of the Rampart', level: 1,
    abilities: { str: 16, dex: 12, con: 15, int: 8, wis: 10, cha: 13 }, hp: 12, ac: 16, speed: 25,
    background: 'Frontier Scout', personalityTraits: 'Blunt, protective of the party, distrusts wizards on principle.',
    savingProfs: ['str', 'con'], skillProfs: ['athletics', 'intimidation', 'perception'],
    attacks: [{ name: 'Longsword', attackBonus: '+5', damageDice: '1d8+3', damageType: 'slashing' }]
  },
  {
    name: 'Orin Vasker', species: 'Sylvan Kin', class: 'Emberweaver', subclass: 'Cinderborn Tradition', level: 1,
    abilities: { str: 8, dex: 14, con: 12, int: 16, wis: 11, cha: 10 }, hp: 8, ac: 12, speed: 30,
    background: 'Guild Artisan', personalityTraits: 'Curious to a fault, narrates their own spellcasting theatrically.',
    savingProfs: ['int', 'wis'], skillProfs: ['arcana', 'history', 'investigation'],
    attacks: [{ name: 'Ember Bolt', attackBonus: '+5', damageDice: '1d10', damageType: 'fire' }]
  },
  {
    name: 'Tamsin Reyet', species: 'Duskkin', class: 'Shadowstep', subclass: 'Alleyway Adept', level: 1,
    abilities: { str: 10, dex: 17, con: 13, int: 12, wis: 10, cha: 14 }, hp: 9, ac: 14, speed: 30,
    background: 'Dockside Runner', personalityTraits: 'Sarcastic, quietly generous, keeps a running tally of favors owed.',
    savingProfs: ['dex', 'int'], skillProfs: ['stealth', 'sleight_of_hand', 'deception'],
    attacks: [{ name: 'Twin Daggers', attackBonus: '+5', damageDice: '1d4+3', damageType: 'piercing' }]
  },
  {
    name: 'Brother Halden', species: 'Human', class: 'Stonesworn', subclass: 'Ward of the Hearth', level: 1,
    abilities: { str: 13, dex: 10, con: 14, int: 10, wis: 16, cha: 12 }, hp: 11, ac: 15, speed: 30,
    background: 'Temple Ward', personalityTraits: 'Calm, patient, believes every fight has a peaceful option first.',
    savingProfs: ['wis', 'cha'], skillProfs: ['medicine', 'religion', 'insight'],
    attacks: [{ name: 'Warhammer', attackBonus: '+3', damageDice: '1d8+1', damageType: 'bludgeoning' }]
  }
];
function buildCharacterFromPregen(pregen, campaignId, controlledBy) {
  const c = makeCharacter({ campaignId, controlledBy: controlledBy || 'player' });
  c.name = pregen.name;
  c.species = pregen.species;
  c.class = pregen.class;
  c.subclass = pregen.subclass;
  c.level = pregen.level;
  c.abilities = { ...pregen.abilities };
  c.hp = { current: pregen.hp, max: pregen.hp, temp: 0 };
  c.ac = pregen.ac;
  c.speed = pregen.speed;
  c.background = pregen.background;
  c.personalityTraits = pregen.personalityTraits;
  c.proficiencyBonus = profBonusForLevel(c.level);
  c.initiativeBonus = abilityMod(c.abilities.dex);
  (pregen.savingProfs || []).forEach(a => { if (c.savingThrows[a]) c.savingThrows[a].proficient = true; });
  (pregen.skillProfs || []).forEach(s => { if (c.skills[s]) c.skills[s].proficient = true; });
  c.attacks = (pregen.attacks || []).map(a => ({ id: uid(), notes: '', ...a }));
  return c;
}
