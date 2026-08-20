/* ---- Sample adventures (original content, structured for the scripted DM) ---- */
// Each adventure supplies everything the scripted DM needs to run it: a
// premise, NPCs, locations, a quest with objectives, monsters for its
// encounter, loot, and DM notes — not "AI guidance" prose, actual structured
// rows that get written into npcs/lore_pages/quests/quest_objectives/monsters
// when loaded. All names and content are original homebrew (see D11/D12).
const SAMPLE_ADVENTURES = [
  {
    id: 'tutorial', type: 'tutorial', title: 'The Lantern Road',
    premise: 'A quiet night at a wayside inn turns tense when something breaks into the cellar. A gentle, low-stakes way to learn the table: talk to an NPC, investigate, roll a check, then fight a small, safe encounter.',
    npcs: [
      { name: 'Rosalind Vane', role: 'innkeeper', traits: 'Fiercely protective of her regulars, keeps a crossbow under the bar.' },
      { name: 'Corven Ashe', role: 'nervous traveler', traits: 'Flinches at loud noises, keeps glancing at the cellar door.' }
    ],
    locations: [{ title: 'The Lantern Road Inn', category: 'Location', body: 'A timber-framed wayside inn at a crossroads, its sign lantern always lit. Warm inside, but tonight the cellar door keeps rattling on its hinges.' }],
    quest: { title: 'Uninvited Guests', summary: 'Something is in the cellar, and Rosalind wants it gone before it scares off her paying guests.', objectives: ['Talk to Rosalind about the noises', 'Investigate the cellar', 'Deal with whatever is down there'] },
    monsters: [
      { name: 'Cellar Vermin', ac: 10, hpMax: 4, attackName: 'Bite', attackBonus: '+2', damageDice: '1d4', damageType: 'piercing' },
      { name: 'Startled Stray Hound', ac: 11, hpMax: 6, attackName: 'Snap', attackBonus: '+3', damageDice: '1d4+1', damageType: 'piercing' }
    ],
    loot: [{ name: 'a few coins swept into the corner', gold: 6 }],
    dmNotes: 'Keep this light — the "threat" should resolve in one or two rounds. The point is teaching the log/dice/initiative loop, not a hard fight. Corven is not the culprit; if pressed, he admits he is hiding from a debt collector and has nothing to do with the noises.'
  },
  {
    id: 'wilderness', type: 'wilderness', title: 'The Ashwake Reaches',
    premise: 'Rumor says a survivor is holed up in a ruined watchtower out on the windswept moor, and something has been shadowing travelers on the road there. A short trek-and-clear adventure.',
    npcs: [{ name: 'Perrin Cale', role: 'moor guide', traits: 'Talks to their pack mule more than to people, knows every safe path across the bog.' }],
    locations: [
      { title: 'The Ashwake Moor', category: 'Location', body: 'Wind-scoured heather and standing stones, with a road half-swallowed by peat. Visibility drops fast when the mist rolls in.' },
      { title: 'The Sundered Watchtower', category: 'Location', body: 'A collapsed garrison tower, one wall open to the sky. Something has clearly been denning in the lower level.' }
    ],
    quest: { title: 'Word from the Reaches', summary: 'Travelers report trouble near the old watchtower, and no word has come back from the last person sent to check.', objectives: ['Cross the Ashwake Moor', 'Reach the Sundered Watchtower', 'Find out what happened to the missing traveler'] },
    monsters: [
      { name: 'Ridgeback Jackal', ac: 13, hpMax: 11, attackName: 'Bite', attackBonus: '+4', damageDice: '1d6+2', damageType: 'piercing' },
      { name: 'Moor Stalker', ac: 14, hpMax: 16, attackName: 'Claw', attackBonus: '+5', damageDice: '1d8+2', damageType: 'slashing' }
    ],
    loot: [{ name: 'a weathered map fragment marking a hidden cache', gold: 0 }, { name: 'a small pouch of travel coin', gold: 20 }],
    dmNotes: 'The jackals hunt in a pack — if using Moderate+ automation, have them focus a single target rather than spreading damage. The "missing traveler" can be found alive but injured in the tower if you want a rescue beat instead of a body.'
  },
  {
    id: 'mystery', type: 'mystery', title: 'The Hollow Ledger',
    premise: "A merchant's ledger has gone missing from a dockside counting-house, and rumors of a smuggling ring won't stop circling. An urban investigation with a fight at the end, not the start.",
    npcs: [
      { name: 'Garrow Thistlewick', role: 'counting-house clerk', traits: 'Terrified of losing his job, knows more than he\'s saying.' },
      { name: 'Ysolde Farrow', role: 'dockside enforcer', traits: 'Collects debts for someone she won\'t name, surprisingly reasonable if paid respect.' }
    ],
    locations: [
      { title: "Thistlewick & Vane Counting House", category: 'Location', body: 'A cramped office stacked with ledgers, one conspicuously missing from its shelf. The lock shows no sign of forced entry.' },
      { title: 'Warehouse Row', category: 'Location', body: 'A row of dockside warehouses, most legitimate, one that keeps its shutters closed even at midday.' }
    ],
    quest: { title: 'The Missing Ledger', summary: 'The ledger holds records someone badly wants gone — find it before whoever took it destroys it, or uses it.', objectives: ['Question Garrow at the counting house', 'Investigate Warehouse Row', 'Recover the ledger'] },
    monsters: [
      { name: 'Warehouse Thug', ac: 12, hpMax: 13, attackName: 'Cudgel', attackBonus: '+4', damageDice: '1d6+2', damageType: 'bludgeoning' },
      { name: 'Warehouse Enforcer', ac: 14, hpMax: 18, attackName: 'Shortsword', attackBonus: '+5', damageDice: '1d6+3', damageType: 'piercing' }
    ],
    loot: [{ name: 'the missing ledger, water-stained but legible', gold: 0 }, { name: 'a strongbox of hush money', gold: 45 }],
    dmNotes: 'The lock showing no forced entry is the key clue — someone with a key took it. Garrow is the leak (out of fear, not malice) if the party pushes; Ysolde is muscle-for-hire, not the mastermind, and will talk if outmatched rather than fight to the death.'
  }
];

// Writes one adventure's NPCs/locations/quest/monsters into a campaign.
// Returns a summary object for a toast message. Idempotent-ish: calling it
// twice just creates duplicate rows (same as any other manual content add),
// no special guard — matches how every other "add content" action in the app works.
async function loadSampleAdventure(campaignId, adventureId) {
  const adventure = SAMPLE_ADVENTURES.find(a => a.id === adventureId);
  if (!adventure) return null;

  for (const loc of adventure.locations) {
    await DB.put('lore_pages', { id: uid(), campaignId, title: loc.title, category: loc.category, body: loc.body, createdAt: nowIso(), updatedAt: nowIso() });
  }
  for (const npc of adventure.npcs) {
    await DB.put('npcs', { id: uid(), campaignId, name: npc.name, role: npc.role, disposition: 0, locationId: null, traits: npc.traits, speakingStyle: '', statBlockId: null, dialogueBankId: null, isHidden: false, notes: '' });
  }
  const ts = nowIso();
  const quest = { id: uid(), campaignId, title: adventure.quest.title, summary: adventure.quest.summary, status: 'active', giverNpcId: null, rewardLootTableId: null, createdAt: ts, updatedAt: ts };
  await DB.put('quests', quest);
  for (let i = 0; i < adventure.quest.objectives.length; i++) {
    await DB.put('quest_objectives', { id: uid(), questId: quest.id, campaignId, text: adventure.quest.objectives[i], status: 'pending', order: i });
  }
  for (const m of adventure.monsters) {
    await DB.put('monsters', makeMonster({ campaignId, name: m.name, ac: m.ac, hpMax: m.hpMax, attackName: m.attackName, attackBonus: m.attackBonus, damageDice: m.damageDice, damageType: m.damageType }));
  }
  await DB.put('journal_entries', { id: uid(), campaignId, title: `DM Notes: ${adventure.title}`, body: adventure.dmNotes, tags: ['adventure', adventure.id], isPrivateDM: true, createdAt: nowIso() });
  await DB.put('log_entries', makeLogEntry({ campaignId, type: 'narration', speakerType: 'dm_scripted', text: adventure.premise }));
  await addCampaignRecentEvent(campaignId, `Began the adventure "${adventure.title}".`);

  return { npcCount: adventure.npcs.length, locationCount: adventure.locations.length, monsterCount: adventure.monsters.length, questTitle: quest.title };
}
