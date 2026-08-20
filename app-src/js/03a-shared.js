/* ---------- 3. DATA MODEL: CONSTRUCTORS & VALIDATORS ---------- */
const RULES_PROFILES = ['legacy', 'modern'];
const AUTOMATION_LEVELS = ['light', 'medium', 'heavy'];
const PLAY_MODES = [
  { id: 'solo_party', label: 'I play one character, bots fill the party' },
  { id: 'solo_party_dm', label: 'I play one character, bots + scripted DM run everything else' },
  { id: 'human_dm_party', label: 'I DM, bots play the party' },
  { id: 'multi_character', label: 'I play multiple characters, scripted DM runs the table' }
];
const THEMES = [
  { id: 'dark_fantasy', label: 'Dark Fantasy', swatches: ['#17121c', '#b3893f', '#251e30'] },
  { id: 'clean_modern', label: 'Clean Modern', swatches: ['#f4f5f7', '#3661d6', '#ffffff'] },
  { id: 'parchment', label: 'Parchment', swatches: ['#ece0c4', '#8a2f22', '#f7f0dc'] },
  { id: 'minimal', label: 'Minimal Utility', swatches: ['#ffffff', '#18181b', '#fafafa'] }
];

function makeCampaign({ name, description, rulesProfile, automationLevel, aiDmEnabled, theme, playMode }) {
  const id = uid();
  const ts = nowIso();
  return {
    id,
    name: (name || 'Untitled Campaign').trim(),
    description: description || '',
    rulesProfile: RULES_PROFILES.includes(rulesProfile) ? rulesProfile : 'legacy',
    automationLevel: AUTOMATION_LEVELS.includes(automationLevel) ? automationLevel : 'medium',
    aiDmEnabled: !!aiDmEnabled,
    theme: THEMES.some(t => t.id === theme) ? theme : 'dark_fantasy',
    playMode: PLAY_MODES.some(p => p.id === playMode) ? playMode : 'solo_party',
    createdAt: ts,
    updatedAt: ts,
    lastPlayedAt: ts,
    activeSceneId: null,
    currentEncounterId: null,
    seed: makeSeed()
  };
}

function validateCampaign(c) {
  const errs = [];
  if (!c || typeof c !== 'object') return ['Campaign is not an object'];
  if (!c.name || !String(c.name).trim()) errs.push('Name is required');
  if (!RULES_PROFILES.includes(c.rulesProfile)) errs.push('Invalid rules profile');
  if (!AUTOMATION_LEVELS.includes(c.automationLevel)) errs.push('Invalid automation level');
  return errs;
}

const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
const ABILITY_LABELS = { str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma' };
const SKILLS = [
  { id: 'acrobatics', label: 'Acrobatics', ability: 'dex' },
  { id: 'animal_handling', label: 'Animal Handling', ability: 'wis' },
  { id: 'arcana', label: 'Arcana', ability: 'int' },
  { id: 'athletics', label: 'Athletics', ability: 'str' },
  { id: 'deception', label: 'Deception', ability: 'cha' },
  { id: 'history', label: 'History', ability: 'int' },
  { id: 'insight', label: 'Insight', ability: 'wis' },
  { id: 'intimidation', label: 'Intimidation', ability: 'cha' },
  { id: 'investigation', label: 'Investigation', ability: 'int' },
  { id: 'medicine', label: 'Medicine', ability: 'wis' },
  { id: 'nature', label: 'Nature', ability: 'int' },
  { id: 'perception', label: 'Perception', ability: 'wis' },
  { id: 'performance', label: 'Performance', ability: 'cha' },
  { id: 'persuasion', label: 'Persuasion', ability: 'cha' },
  { id: 'religion', label: 'Religion', ability: 'int' },
  { id: 'sleight_of_hand', label: 'Sleight of Hand', ability: 'dex' },
  { id: 'stealth', label: 'Stealth', ability: 'dex' },
  { id: 'survival', label: 'Survival', ability: 'wis' }
];

// Original suggested species/classes/backgrounds — homebrew names only, no
// copyrighted terms. Free-text fields, these are just <datalist> suggestions.
const SUGGESTED_SPECIES = ['Human', 'Stoneborn', 'Sylvan Kin', 'Emberkin', 'Smallfolk', 'Duskkin', 'Wildtouched'];
const SUGGESTED_CLASSES = ['Bladeward', 'Emberweaver', 'Stonesworn', 'Shadowstep', 'Wildkin Warden', 'Runesmith', 'Songbinder', 'Ironclad'];
const SUGGESTED_BACKGROUNDS = ['Wandering Peddler', 'Guild Artisan', 'Frontier Scout', 'Temple Ward', 'Disgraced Noble', 'Dockside Runner'];

function makeCharacter({ campaignId, controlledBy }) {
  const id = uid();
  const ts = nowIso();
  const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const skills = {};
  for (const s of SKILLS) skills[s.id] = { proficient: false, expertise: false, modifierOverride: null };
  const savingThrows = {};
  for (const a of ABILITIES) savingThrows[a] = { proficient: false };
  return {
    id,
    campaignId,
    controlledBy: controlledBy || 'player',
    botProfileId: null,
    name: '',
    species: '',
    class: '',
    subclass: '',
    level: 1,
    xp: 0,
    abilities,
    proficiencyBonus: profBonusForLevel(1),
    hp: { current: 10, max: 10, temp: 0 },
    ac: 10,
    initiativeBonus: 0,
    speed: 30,
    skills,
    savingThrows,
    attacks: [],
    spellSlots: {},
    spellsKnown: [],
    inventory: [],
    currency: { gp: 0, sp: 0, cp: 0 },
    background: '',
    personalityTraits: '',
    features: [],
    conditions: [],
    notes: '',
    tokenImage: null,
    portraitImage: null,
    createdAt: ts,
    updatedAt: ts
  };
}

function validateCharacter(c) {
  const errs = [];
  if (!c || typeof c !== 'object') return ['Character is not an object'];
  if (!c.name || !String(c.name).trim()) errs.push('Name is required');
  if (!c.campaignId) errs.push('Character must belong to a campaign');
  return errs;
}

// Rules-profile / automation-level metadata used for display and to gate
// which shortcuts appear (e.g. quick skill/save roll buttons at Medium+).
// Legacy vs Modern mechanical differences beyond labeling are a later-phase
// concern (see PLAN.md) — Phase 2 establishes the selectable structure.
const RULES_PROFILE_INFO = {
  legacy: { label: 'Legacy 5E-compatible', blurb: 'Classic-style baseline rules.' },
  modern: { label: 'Modern 5E-compatible', blurb: 'Updated-style baseline rules.' }
};
const AUTOMATION_INFO = {
  light: { label: 'Light', blurb: 'Dice, HP, and notes only — you make the rulings.', quickRolls: false },
  medium: { label: 'Medium', blurb: 'Checks, attacks, and saves can auto-resolve with one tap.', quickRolls: true },
  heavy: { label: 'Heavy', blurb: 'Adds spell effects, AoE, and movement enforcement (structure only for now).', quickRolls: true }
};
