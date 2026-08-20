/* ---- Scripted DM: content-generation tables (weighted, original, no LLM) ---- */
const NPC_NAME_POOL = ['Old Marrick', 'Sister Yew', 'Captain Bellrose', 'Tobin Ashgate', 'Widow Corvane', 'Fenn the Ledger', 'Auntie Rooke', 'Garrow Thistlewick', 'Ysolde Farrow', 'Brindle the Carter'];
const NPC_ROLES = ['tavern keeper', 'town guard', 'traveling merchant', 'reclusive scholar', 'guild fixer', 'temple acolyte', 'retired adventurer', 'suspicious peddler', 'local healer', 'gate warden'];
const NPC_QUIRKS = ['speaks only in half-finished sentences', 'never makes eye contact', 'keeps a ledger of every favor owed', 'hums constantly, off-key', 'refuses to say a stranger\'s name aloud', 'collects buttons from travelers'];
const SCENE_TEMPLATES = [
  { text: 'You arrive at {location}. The air smells of {sensory}, and {detail}.' },
  { text: '{location} stretches before you — {detail}. Somewhere nearby, {sensory} lingers.' },
  { text: 'The path opens onto {location}. {detail} A faint hint of {sensory} drifts past.' }
];
const SCENE_SENSORY = ['woodsmoke', 'wet stone', 'old parchment', 'salt and tar', 'crushed herbs', 'rain on dust'];
const SCENE_DETAILS = ['a few locals watch you with open curiosity', 'the quiet feels deliberate, like something is listening', 'signs of recent disrepair are everywhere', 'a distant bell marks the hour', 'someone has clearly left in a hurry'];
const LOOT_TABLE = [
  { weight: 3, name: 'a handful of tarnished coins', gold: 8 },
  { weight: 3, name: 'a small pouch of mixed coin', gold: 15 },
  { weight: 2, name: 'a finely made dagger', gold: 0, item: true },
  { weight: 2, name: 'a vial of unlabeled tincture', gold: 0, item: true },
  { weight: 1, name: 'a signet ring of unclear origin', gold: 0, item: true },
  { weight: 1, name: 'a folded letter sealed in wax', gold: 0, item: true }
];
const QUEST_TEMPLATES = [
  { title: 'The {adj} Debt', summary: '{npc} needs something recovered before a deadline no one will explain.', objective: 'Recover the item and return it to {npc}.' },
  { title: 'Word from {location}', summary: 'Travelers report trouble near {location}, and no word has come back since.', objective: 'Investigate {location} and report what you find.' },
  { title: 'The {adj} Favor', summary: '{npc} asks for a favor that sounds simpler than it probably is.', objective: 'Complete the favor for {npc}.' }
];
const QUEST_ADJECTIVES = ['Quiet', 'Unpaid', 'Forgotten', 'Sudden', 'Small'];
const OUTCOME_SUCCESS_BANK = [
  { text: 'It works. {detail}' },
  { text: 'Cleanly done — {detail}' },
  { text: 'Better than expected: {detail}' }
];
const OUTCOME_FAILURE_BANK = [
  { text: 'It doesn\'t go as planned. {detail}' },
  { text: 'Close, but no — {detail}' },
  { text: 'It falls apart at the worst moment. {detail}' }
];
const OUTCOME_DETAILS_SUCCESS = ['no one seems to have noticed', 'exactly as intended', 'with room to spare', 'and it might even help later'];
const OUTCOME_DETAILS_FAILURE = ['and now there\'s a new problem', 'drawing exactly the attention you didn\'t want', 'costing more than expected', 'and the moment is gone'];
const DM_VERBS = ['move', 'attack', 'talk', 'use item', 'cast', 'rest', 'investigate'];

function generateNpc() {
  return { name: pick(NPC_NAME_POOL), role: pick(NPC_ROLES), quirk: pick(NPC_QUIRKS) };
}
function weightedPick(entries) {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of entries) { if (r < e.weight) return e; r -= e.weight; }
  return entries[entries.length - 1];
}
function generateLoot() { return weightedPick(LOOT_TABLE); }
function generateQuest(npcName, locationName) {
  const t = pick(QUEST_TEMPLATES);
  const slots = { npc: npcName || 'a local contact', location: locationName || 'the area', adj: pick(QUEST_ADJECTIVES) };
  return { title: fillTemplate(t.title, slots), summary: fillTemplate(t.summary, slots), objective: fillTemplate(t.objective, slots) };
}
function generateSceneNarration(locationName) {
  const bank = SCENE_TEMPLATES;
  const t = pick(bank);
  return fillTemplate(t.text, { location: locationName || 'the scene', sensory: pick(SCENE_SENSORY), detail: pick(SCENE_DETAILS) });
}
function generateOutcome(success) {
  const bank = success ? OUTCOME_SUCCESS_BANK : OUTCOME_FAILURE_BANK;
  const detail = success ? pick(OUTCOME_DETAILS_SUCCESS) : pick(OUTCOME_DETAILS_FAILURE);
  return fillTemplate(pick(bank).text, { detail });
}
function matchDmVerb(text) {
  const t = (text || '').toLowerCase();
  return DM_VERBS.find(v => t.includes(v)) || null;
}

// Structured DM action dispatcher — every scripted-DM button funnels through
// here (narration/add_npc/give_loot/update_quest/request_roll are all Action
// types from ARCHITECTURE.md) rather than writing to stores directly, so DM
// output stays consistent with how manual play already logs itself.
async function applyDmAction(campaignId, action) {
  switch (action.type) {
    case 'narration':
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'narration', speakerType: 'dm_scripted', text: action.text }));
      break;
    case 'add_npc': {
      const npc = { id: uid(), campaignId, name: action.npc.name, role: action.npc.role, disposition: 0, locationId: null, traits: action.npc.quirk, speakingStyle: '', statBlockId: null, dialogueBankId: null, isHidden: false, notes: '' };
      await DB.put('npcs', npc);
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'narration', speakerType: 'dm_scripted', text: `${npc.name}, ${npc.role}, steps into the scene — ${npc.traits}.` }));
      await addCampaignRecentEvent(campaignId, `Met ${npc.name} (${npc.role}).`);
      return npc;
    }
    case 'give_loot':
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: 'dm_scripted', text: `The party finds ${action.loot.name}${action.loot.gold ? ` (${action.loot.gold} gp)` : ''}.` }));
      await addCampaignRecentEvent(campaignId, `Found ${action.loot.name}.`);
      break;
    case 'update_quest': {
      const ts = nowIso();
      const quest = { id: uid(), campaignId, title: action.quest.title, summary: action.quest.summary, status: 'active', giverNpcId: null, rewardLootTableId: null, createdAt: ts, updatedAt: ts };
      await DB.put('quests', quest);
      await DB.put('quest_objectives', { id: uid(), questId: quest.id, campaignId, text: action.quest.objective, status: 'pending', order: 0 });
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'narration', speakerType: 'dm_scripted', text: `New quest: "${quest.title}" — ${quest.summary}` }));
      await addCampaignRecentEvent(campaignId, `Started quest: ${quest.title}.`);
      return quest;
    }
    case 'ask_player_choice':
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'narration', speakerType: 'dm_scripted', text: action.text || 'What do you do?' }));
      break;
    case 'request_roll':
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: 'dm_scripted', text: `The DM calls for a roll: ${action.purpose} (DC ${action.dc}).` }));
      break;
    default:
      break;
  }
}
