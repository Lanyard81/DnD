/* ---- Bot party: trait banks, personality generation, dialogue ---- */
const COMBAT_STYLES = ['simple', 'moderate', 'advanced'];
const COMBAT_STYLE_INFO = {
  simple: { label: 'Simple', blurb: 'Attacks the nearest/weakest enemy, uses basic abilities.' },
  moderate: { label: 'Moderate', blurb: 'Uses class abilities, heals allies, focuses targets, protects the party.' },
  advanced: { label: 'Advanced', blurb: 'Tactical positioning, target priority, reactions.' }
};
const BOT_NAME_POOL = ['Brannok Stormwake', 'Sella Duskwhisper', 'Pip Cogsworth', 'Thessaly Vane', 'Marrow Quickblade', 'Aldric Fenwood', 'Nyra Emberfall', 'Corwin Ashvale', 'Wrenna Hollowmere', 'Dax Ferrowind'];
const TEMPERAMENTS = ['gruff', 'cheerful', 'stoic', 'anxious', 'sarcastic', 'idealistic'];
const SPEAKING_STYLES = ['Clipped and blunt', 'Warm and talkative', 'Formal and precise', 'Dry and sarcastic', 'Soft-spoken', 'Boisterous and loud'];
const BOT_QUIRKS = ['Hums old work songs while walking', 'Collects small shiny trinkets', 'Names every weapon they carry', 'Never sits with their back to a door', 'Counts steps under their breath', 'Talks to animals as if they understand'];
const BOT_GOALS = ['Find their missing sibling', 'Pay off a debt to a dangerous guild', 'Earn enough coin to retire to the coast', 'Prove themselves after a battlefield failure', 'Track down the person who wronged their mentor', 'See every corner of the map before settling down'];
const BOT_FEARS = ['Drowning', 'Being forgotten', 'Open flame', 'Losing control in battle', 'Enclosed spaces', 'Betraying the party'];
const BOT_BONDS = ['Owes their life to a party member', 'Sworn to protect the group\'s youngest-looking member', 'Trusts no one fully, but trusts this party more than most', 'Considers the party the only family they have left'];
// Class -> role mapping used for bot combat heuristics (chooseBotAction) — not persisted,
// derived on demand so changing a bot's class doesn't require a data migration.
const CLASS_ROLE_MAP = { 'Bladeward': 'tank', 'Ironclad': 'tank', 'Emberweaver': 'caster', 'Runesmith': 'caster', 'Shadowstep': 'skirmisher', 'Stonesworn': 'support', 'Songbinder': 'support', 'Wildkin Warden': 'skirmisher' };
function roleForClass(className) { return CLASS_ROLE_MAP[className] || 'skirmisher'; }
function isHealerClass(className) { return roleForClass(className) === 'support'; }

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateBotPersonality() {
  return {
    temperament: pick(TEMPERAMENTS),
    speakingStyle: pick(SPEAKING_STYLES),
    quirks: [pick(BOT_QUIRKS)],
    goals: [pick(BOT_GOALS)],
    fears: [pick(BOT_FEARS)],
    bonds: [pick(BOT_BONDS)],
    combatStyle: (() => { const r = Math.random(); return r < 0.25 ? 'simple' : r < 0.75 ? 'moderate' : 'advanced'; })()
  };
}

function makeBotProfile({ campaignId, characterId, personality }) {
  return {
    id: uid(),
    campaignId,
    characterId,
    temperament: personality.temperament,
    bonds: personality.bonds,
    fears: personality.fears,
    goals: personality.goals,
    quirks: personality.quirks,
    speakingStyle: personality.speakingStyle,
    combatStyle: personality.combatStyle,
    phraseBankOverrides: null
  };
}

// Creates one bot: a `characters` row (controlledBy:'bot') + linked `bots` row.
// Random but reasonable stats (standard-array-ish spread) so a fresh bot is
// immediately playable without manual tuning.
async function createBot(campaignId, nameOverride) {
  const usedNames = (await DB.getAllByIndex('characters', 'campaignId', campaignId)).map(c => c.name);
  const availableNames = BOT_NAME_POOL.filter(n => !usedNames.includes(n));
  const name = nameOverride || pick(availableNames.length ? availableNames : BOT_NAME_POOL);
  const species = pick(SUGGESTED_SPECIES);
  const klass = pick(SUGGESTED_CLASSES);
  const array = [15, 14, 13, 12, 10, 8].sort(() => Math.random() - 0.5);

  const char = makeCharacter({ campaignId, controlledBy: 'bot' });
  char.name = name;
  char.species = species;
  char.class = klass;
  char.abilities = { str: array[0], dex: array[1], con: array[2], int: array[3], wis: array[4], cha: array[5] };
  char.proficiencyBonus = profBonusForLevel(1);
  char.initiativeBonus = abilityMod(char.abilities.dex);
  char.ac = 10 + abilityMod(char.abilities.dex) + (roleForClass(klass) === 'tank' ? 4 : 1);
  const hp = 8 + abilityMod(char.abilities.con) + (roleForClass(klass) === 'tank' ? 3 : 0);
  char.hp = { current: Math.max(4, hp), max: Math.max(4, hp), temp: 0 };
  char.background = pick(SUGGESTED_BACKGROUNDS);
  await DB.put('characters', char);

  const personality = generateBotPersonality();
  const bot = makeBotProfile({ campaignId, characterId: char.id, personality });
  await DB.put('bots', bot);
  return { character: char, bot };
}

async function fillBotParty(campaignId, count) {
  const created = [];
  for (let i = 0; i < count; i++) created.push(await createBot(campaignId));
  return created;
}
