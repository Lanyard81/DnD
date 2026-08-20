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
  },
  {
    id: 'heist', type: 'heist', title: 'The Sunken Vault',
    premise: "Beneath the tide-locked Drowned Quarter sits a counting-house vault that only opens at low tide — and inside it, a ledger naming every officer of the smuggling cartel that runs this stretch of coast. The tide gives the party a few hours. The cartel gives them none.",
    npcs: [
      { name: 'Vesper Coll', role: 'fence and informant', traits: 'Trades in favors more than coin, never gives a straight answer the first time you ask.' },
      { name: 'Bram Oduya', role: 'vault engineer, cartel turncoat', traits: 'Guilt-ridden and drowning in debt to the cartel he helped build the vault for; wants out.' },
      { name: 'Captain Ilsa Rook', role: 'cartel enforcer', traits: "Methodical and unhurried, never raises her voice — that's what makes her frightening." }
    ],
    locations: [
      { title: 'The Drowned Quarter', category: 'Location', body: 'A tide-locked district where the streets flood twice a day. Everything smells of brine and old rot, and half the doors are bricked up against the water.' },
      { title: "Coll's Curio Shop", category: 'Location', body: "A fence's front business, shelves stacked with \"found\" goods of dubious origin. A curtain in the back hides where the real deals happen." },
      { title: 'The Sunken Vault', category: 'Location', body: 'A counting-house strongroom beneath the Quarter, reachable only when the tide is low enough. Half-flooded, guarded, and colder than it should be.' }
    ],
    quest: { title: 'Debts Below the Tide', summary: 'The vault holds a ledger that could topple the cartel that runs this coast — but the tide only opens the way in for a few hours at a stretch, and Captain Rook knows someone is coming for it.', objectives: ["Meet Vesper Coll and learn the vault's tide schedule", "Convince Bram Oduya to hand over the vault's access codes", 'Slip into the Drowned Quarter before the tide seals it again', 'Break into the Sunken Vault and retrieve the ledger', 'Escape before Captain Rook seals the district'] },
    monsters: [
      { name: 'Cartel Cutthroat', ac: 13, hpMax: 15, attackName: 'Shortsword', attackBonus: '+4', damageDice: '1d6+2', damageType: 'piercing' },
      { name: 'Tide Lurker', ac: 12, hpMax: 20, attackName: 'Grasping Claws', attackBonus: '+5', damageDice: '1d8+3', damageType: 'bludgeoning', resistances: ['cold'] },
      { name: 'Captain Ilsa Rook', ac: 16, hpMax: 30, attackName: 'Twin Blades', attackBonus: '+6', damageDice: '1d8+3', damageType: 'slashing', attackCount: 2, savingThrows: { dex: 5 } }
    ],
    loot: [{ name: 'the cartel ledger, every officer named', gold: 0 }, { name: "a cartel signet ring", gold: 0 }, { name: 'a strongbox of seized coin', gold: 60 }],
    dmNotes: "Bram's help has a price: he wants the party to also destroy a second ledger — one that implicates only him. Refuse, and he may tip off Rook out of self-preservation. Rook is a professional, not a fanatic: below half HP, she'll offer to look the other way for a future cut rather than fight to the death, a live hook for a sequel. The Tide Lurker is opportunistic, not loyal to the cartel — it will go for whoever is loudest or bleeding."
  },
  {
    id: 'horror', type: 'horror', title: "The Widow's Orchard",
    premise: "A once-prosperous orchard has gone silent — no harvest, no smoke from the farmhouse chimney, and the trees have started bearing fruit that shouldn't exist this time of year. The last person sent to check never came back.",
    npcs: [
      { name: 'Maren Vosk', role: 'the orchard widow', traits: "Grief-driven and unwilling to accept her husband is gone. Not entirely human anymore, though she doesn't seem to know it." },
      { name: 'Tobin Reyes', role: "the miller's son", traits: 'Sent to check on the orchard, found hiding in the mill instead. Terrified, but alive and willing to talk.' },
      { name: 'The Orchard Keeper', role: 'a spirit bound to the land', traits: 'Speaks in overlapping voices, protective of the orchard\'s roots — not hostile unless the trees are attacked first.' }
    ],
    locations: [
      { title: 'The Vosk Farmhouse', category: 'Location', body: 'Shuttered windows and an overgrown path. A single candle burns in the upstairs window every night, though no one has been seen to light it.' },
      { title: 'The Blighted Orchard', category: 'Location', body: 'Rows of trees bearing fruit black as char. At night, the roots visibly pulse beneath the soil.' },
      { title: 'The Old Well', category: 'Location', body: 'Sealed with iron bands generations ago. The seal is cracked open now, and something in the dark below is patient.' }
    ],
    quest: { title: 'What the Orchard Remembers', summary: "Something in the Vosk orchard has been feeding on grief, and it's starting to spread past the tree line.", objectives: ['Find Tobin Reyes and learn what happened at the orchard', 'Search the Vosk farmhouse for answers', 'Investigate the Blighted Orchard after dark', "Uncover what's sealed beneath the Old Well", "Decide the orchard's fate"] },
    monsters: [
      { name: 'Rootbound Husk', ac: 13, hpMax: 18, attackName: 'Grasping Branch', attackBonus: '+4', damageDice: '1d8+2', damageType: 'bludgeoning', resistances: ['piercing', 'slashing'], vulnerabilities: ['fire'] },
      { name: 'Orchard Wisp', ac: 14, hpMax: 9, attackName: 'Chill Touch', attackBonus: '+5', damageDice: '1d6', damageType: 'cold', immunities: ['cold'] },
      { name: 'Maren, Grief-Warped', ac: 15, hpMax: 26, attackName: 'Grasping Sorrow', attackBonus: '+6', damageDice: '2d6+2', damageType: 'necrotic', attackCount: 2, savingThrows: { wis: 4 } }
    ],
    loot: [{ name: "Maren's wedding ring", gold: 0 }, { name: 'a jar of orchard honey that never spoils', gold: 0 }, { name: 'old coin buried near the well', gold: 30 }],
    dmNotes: "Maren isn't a monster to simply be slain — she's grief given shape. If the party listens to what she actually wants (closure, an apology, her husband's name spoken aloud over the well) she can be laid to rest without a fight at all. The Orchard Keeper is a separate, genuinely benevolent spirit and will help the party if they don't attack the trees indiscriminately — punish scorched-earth tactics narratively, not just mechanically."
  },
  {
    id: 'intrigue', type: 'intrigue', title: 'The Masked Court',
    premise: 'An invitation-only masquerade at a minor noble\'s estate is cover for a power grab — someone plans to kill the visiting envoy before midnight, and the party\'s only clue is a single word overheard through a mask: "Nightingale."',
    npcs: [
      { name: 'Lord Amaury Feyne', role: 'host of the masquerade', traits: 'Charming to a fault and deeply in debt — he may be more involved in tonight\'s plot than he lets on.' },
      { name: 'Envoy Sela Marchetti', role: 'the target', traits: "Sharp and already suspicious that something is wrong. Doesn't trust easily, and shouldn't be made to." },
      { name: '"Nightingale"', role: 'a hired assassin, identity hidden', traits: 'Unknown until the climax — could be revealed as almost anyone at the masquerade, DM\'s choice on the night.' }
    ],
    locations: [
      { title: 'The Feyne Estate Ballroom', category: 'Location', body: 'A hundred masked nobles, a string quartet, and just as many places to hide a knife.' },
      { title: 'The Estate Gardens', category: 'Location', body: 'Quieter and moonlit — where private conversations, and worse, tend to happen.' },
      { title: "Lord Feyne's Study", category: 'Location', body: 'Locked. His real ledgers — the ones that matter — are kept here, not in the ballroom.' }
    ],
    quest: { title: "The Nightingale's Cage", summary: 'Someone in a mask plans to kill the envoy before the night is through, and the party has only rumors and a few hours to stop it.', objectives: ["Mingle and gather rumors about \"Nightingale\"", 'Search the gardens for anything out of place', "Break into Lord Feyne's locked study", 'Identify the assassin before midnight', 'Stop the assassination attempt'] },
    monsters: [
      { name: 'Masked Duelist', ac: 15, hpMax: 14, attackName: 'Rapier', attackBonus: '+5', damageDice: '1d8+2', damageType: 'piercing' },
      { name: 'Estate Guard', ac: 14, hpMax: 16, attackName: 'Halberd', attackBonus: '+4', damageDice: '1d10+2', damageType: 'slashing' },
      { name: '"Nightingale"', ac: 16, hpMax: 22, attackName: 'Poisoned Stiletto', attackBonus: '+7', damageDice: '1d6+4', damageType: 'piercing', attackCount: 2, savingThrows: { dex: 6 } }
    ],
    loot: [{ name: 'a folded contract naming who hired Nightingale', gold: 0 }, { name: "Nightingale's stiletto", gold: 0 }, { name: 'scattered dropped coin purses', gold: 25 }],
    dmNotes: "Lord Feyne isn't the mastermind — he's being blackmailed by whoever hired Nightingale, and if confronted privately (not in front of guests) he'll confess and help rather than stonewall. The contract found on Nightingale's body or in the study names the real mastermind; leave them as an unseen hook for a future session, or reveal them as a rival envoy jockeying for position, DM's call."
  },
  {
    id: 'dungeon', type: 'dungeon', title: 'The Cinderfall Depths',
    premise: "A collapsed mining tunnel beneath Cinderfall Ridge has reopened after a tremor, and with it, rumors of the old miners' lost cache — and something that's been living in the dark since the collapse.",
    npcs: [
      { name: 'Foreman Petra Aldric', role: 'mine owner', traits: 'Practical and businesslike — cares more about reopening the mine than what might be living in it. Pays well for a clear report.' },
      { name: 'Digger Hollis', role: 'survivor of the original collapse', traits: "Half-mad from years alone in the tunnels, speaks mostly in warnings. Knows the dark better than anyone alive." }
    ],
    locations: [
      { title: 'The Cinderfall Shaft', category: 'Location', body: 'The mine entrance, timbers still scorched from the original collapse years ago. Still smells faintly of old smoke.' },
      { title: 'The Flooded Gallery', category: 'Location', body: 'A lower tunnel section, ankle-deep water and groaning, unstable support beams.' },
      { title: 'The Cache Vault', category: 'Location', body: "The miners' sealed cache, blocked behind a rockslide that's never fully cleared." }
    ],
    quest: { title: 'What the Collapse Woke', summary: "The mine is reopening whether the party clears it or not — the only question is what greets the first miners back inside.", objectives: ['Talk to Foreman Aldric about the collapse', 'Find Digger Hollis and learn what he\'s seen', 'Navigate the Flooded Gallery', 'Clear the way to the Cache Vault', 'Deal with whatever has been living in the dark'] },
    monsters: [
      { name: 'Tunnel Crawler', ac: 12, hpMax: 14, attackName: 'Bite', attackBonus: '+4', damageDice: '1d6+2', damageType: 'piercing', vulnerabilities: ['thunder'] },
      { name: 'Cave-In Wretch', ac: 11, hpMax: 12, attackName: 'Pick', attackBonus: '+3', damageDice: '1d6+1', damageType: 'piercing' },
      { name: 'The Deep Warden', ac: 15, hpMax: 32, attackName: 'Rend', attackBonus: '+6', damageDice: '2d6+3', damageType: 'slashing', attackCount: 2, resistances: ['bludgeoning'], savingThrows: { con: 5 } }
    ],
    loot: [{ name: "the miners' lost cache", gold: 80 }, { name: "an old foreman's journal", gold: 0 }, { name: 'a vein of raw ore worth selling', gold: 15 }],
    dmNotes: "Digger Hollis knows the Deep Warden by sound alone and can help the party avoid its ambush points — but only if treated kindly rather than dismissed as a lunatic. The Deep Warden is territorial, not evil: it settled into the collapsed section after the original cave-in and will let the party leave with the cache if they don't press further into its den. Tunnel Crawlers hunt blind, by vibration — loud combat draws more of them."
  },
  {
    id: 'nautical', type: 'nautical', title: "The Kraken's Toll",
    premise: "The trade ship the party is aboard is boarded mid-voyage by a rival crew flying no flag — and something far larger than either crew has been circling the ship since dusk.",
    npcs: [
      { name: 'Captain Odalys Thorne', role: "the party's ship captain", traits: 'Grizzled and fiercely loyal to her crew. Out of good options tonight.' },
      { name: 'Quartermaster Finch', role: 'rival boarding party leader', traits: 'Business-like about piracy — prefers cargo over bloodshed, and says so.' },
      { name: 'The Drowned Choir', role: 'stowaway cultists (unseen at first)', traits: "Revealed mid-adventure. They sabotaged the voyage on purpose, and they're not afraid of what's circling the ship." }
    ],
    locations: [
      { title: 'The Main Deck', category: 'Location', body: 'Chaos — boarding lines, cut rigging, and the fight already spreading stem to stern.' },
      { title: 'Below Decks', category: 'Location', body: 'The cargo hold and crew quarters, dark and cramped, where the real reason for the boarding is hiding.' },
      { title: "The Ship's Wheel", category: 'Location', body: 'Where control of the ship — and its fate tonight — will actually be decided.' }
    ],
    quest: { title: 'Toll of the Deep', summary: "A rival crew has boarded mid-voyage, but the real danger might be what's drawn to all the noise and blood in the water.", objectives: ['Repel the boarders on the main deck', "Search below decks for the rival crew's real intentions", 'Discover why the Drowned Choir wants the ship stopped', "Take back the ship's wheel", 'Survive whatever surfaces'] },
    monsters: [
      { name: 'Rival Boarder', ac: 13, hpMax: 13, attackName: 'Cutlass', attackBonus: '+4', damageDice: '1d6+2', damageType: 'slashing' },
      { name: 'Drowned Choir Zealot', ac: 12, hpMax: 15, attackName: 'Ritual Dagger', attackBonus: '+4', damageDice: '1d4+2', damageType: 'piercing', resistances: ['cold'] },
      { name: 'Something From Below', ac: 13, hpMax: 40, attackName: 'Crushing Tentacle', attackBonus: '+7', damageDice: '2d8+3', damageType: 'bludgeoning', attackCount: 2, immunities: ['poison'], vulnerabilities: ['fire'] }
    ],
    loot: [{ name: "Quartermaster Finch's manifest", gold: 0 }, { name: 'salvaged rival cargo', gold: 50 }, { name: 'a strange barnacle-crusted idol', gold: 0 }],
    dmNotes: "The Drowned Choir isn't the rival crew's leadership — they're stowaways who sabotaged the voyage to summon whatever's circling the ship. Quartermaster Finch will actually ally with the party against the Choir once it's clear the ship might sink under everyone. Something From Below's HP is deliberately high — treat it as a looming, escapable threat rather than a fight to the death; driving it off or fleeing is as valid an ending as killing it, and probably more survivable."
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
    await DB.put('monsters', makeMonster({
      campaignId, name: m.name, ac: m.ac, hpMax: m.hpMax, attackName: m.attackName, attackBonus: m.attackBonus, damageDice: m.damageDice, damageType: m.damageType,
      attackCount: m.attackCount, savingThrows: m.savingThrows, resistances: m.resistances, immunities: m.immunities, vulnerabilities: m.vulnerabilities
    }));
  }
  await DB.put('journal_entries', { id: uid(), campaignId, title: `DM Notes: ${adventure.title}`, body: adventure.dmNotes, tags: ['adventure', adventure.id], isPrivateDM: true, createdAt: nowIso() });
  await DB.put('log_entries', makeLogEntry({ campaignId, type: 'narration', speakerType: 'dm_scripted', text: adventure.premise }));
  await addCampaignRecentEvent(campaignId, `Began the adventure "${adventure.title}".`);

  return { npcCount: adventure.npcs.length, locationCount: adventure.locations.length, monsterCount: adventure.monsters.length, questTitle: quest.title };
}
