# DATA_MODEL.md — FableTable Solo

IndexedDB database name: `fabletable_db`. All object stores keyed by `id` (uuid v4 string, via `crypto.randomUUID()`). Most stores index `campaignId` for scoped queries. Timestamps are ISO strings.

## Object stores

### `campaigns`
```
{ id, name, description, rulesProfile: 'legacy'|'modern', automationLevel: 'light'|'medium'|'heavy',
  aiDmEnabled: bool, theme: 'dark_fantasy'|'clean_modern'|'parchment'|'minimal',
  playMode: 'solo_party'|'solo_party_dm'|'human_dm_party'|'multi_character',
  createdAt, updatedAt, lastPlayedAt, activeSceneId, currentEncounterId|null, seed (rng seed) }
```

### `characters`
Player character(s) and bot party members share this shape; `controlledBy: 'player'|'bot'|'npc'` distinguishes.
```
{ id, campaignId, controlledBy, botProfileId|null,
  name, species, class, subclass, level, xp,
  abilities: {str,dex,con,int,wis,cha}, // scores
  proficiencyBonus, hp:{current,max,temp}, ac, initiativeBonus, speed,
  skills: {skillId: {proficient, expertise, modifierOverride|null}},
  savingThrows: {abilityId: {proficient}},
  attacks: [{id,name,attackBonus,damageDice,damageType,notes}],
  spellSlots: {level: {max,current}},
  spellsKnown: [spellId],
  inventory: [{itemId, qty, equipped}],
  currency: {gp,sp,cp},
  background, personalityTraits, features: [featureId],
  conditions: [{conditionId, source, roundsRemaining|null}],
  notes, tokenImage|null, portraitImage|null,
  createdAt, updatedAt }
```

### `bots`
Bot-specific personality/behavior layer, 1:1 with a `characters` row where `controlledBy==='bot'`.
```
{ id, campaignId, characterId,
  temperament, bonds: [text], fears: [text], goals: [text], quirks: [text],
  speakingStyle, combatStyle: 'simple'|'moderate'|'advanced',
  phraseBankOverrides: {triggerKey: [templateStrings]}|null }
```

### `npcs`
```
{ id, campaignId, name, role, disposition (-100..100), locationId|null,
  traits, speakingStyle, statBlockId|null, dialogueBankId|null, isHidden (fog/DM-only), notes }
```

### `monsters`
Stat-block library (campaign-scoped + a global seed set with `campaignId: null`).
```
{ id, campaignId|null, name, size, type, ac, hp:{formula,max}, speed,
  abilities:{str,dex,con,int,wis,cha}, savingThrows, skills, resistances, immunities, vulnerabilities,
  senses, languages, challengeRating, traits: [{name,text}], actions: [{name,attackBonus,damageDice,damageType,attackCount,effectIds}],
  legendaryActions: [...] | null, tokenImage|null }
```
- `savingThrows: {ability: totalBonus}` — a flat *total* per-ability bonus (e.g. `{dex: 4}`), matching how printed stat blocks list saves. This is a different shape from `characters.savingThrows` (`{ability: {proficient}}`, combined with ability mod + proficiency bonus at use time) — see `saveBonusFor()` in `combat-core.mjs`, which handles both shapes. Set via the homebrew Monster Library form's "Saving throw bonuses" field (`dex:4, wis:2` text, parsed to this object); empty/unset means "just use the ability mod."
- `resistances`/`immunities`/`vulnerabilities: string[]` of lowercase damage-type tags (e.g. `"fire"`), matched case-insensitively against an attack/effect's damage type. Set via the homebrew Monster Library form; applied in `combatAttack` and the map view's AoE "Apply Effect" handler via `resistanceMultiplier()`/`applyDamageWithResistance()`. D20.
- `actions[].attackCount` — how many times this action's attack resolves per turn (multiattack). Defaults to `1`; both `resolveBotTurn` and the manual "Roll Attack" flow loop `combatAttack` this many times against the current target, stopping early if the target drops. D20.

### `items`
```
{ id, campaignId|null, name, type: 'weapon'|'armor'|'gear'|'consumable'|'wondrous',
  rarity, weight, cost, description, effectIds: [effectId], attunement: bool }
```

### `spells`
```
{ id, campaignId|null, name, level, school, castingTime, range, components, duration,
  description, effectIds: [effectId] }
```

### `features`
Class/race/background features and feats.
```
{ id, campaignId|null, name, source: 'class'|'species'|'background'|'feat', description, effectIds: [effectId]|null }
```

### `effects` (the Effect DSL library)
```
{ id, campaignId|null, trigger: 'on_hit'|'on_cast'|'start_of_turn'|'end_of_turn'|'on_enter_area'|'manual',
  targetSelector: 'self'|'single_target'|{type:'area', shape:'circle'|'cube'|'cone'|'line', size},
  operations: [{op:'damage'|'heal'|'apply_condition'|'remove_condition'|'modify_stat'|'move'|'grant_temp_hp', params:{...}}] }
```

### `conditions` (definitions, not instances — instances live inline on `characters.conditions`)
```
{ id, campaignId|null, name, description, mechanicalReminder }
```

### `quests`
```
{ id, campaignId, title, summary, status: 'not_started'|'active'|'completed'|'failed',
  giverNpcId|null, rewardLootTableId|null, createdAt, updatedAt }
```

### `quest_objectives`
```
{ id, questId, campaignId, text, status: 'pending'|'complete'|'failed', order }
```

### `journal_entries`
```
{ id, campaignId, title, body (markdown), tags: [text], isPrivateDM (bool), createdAt }
```

### `handouts`
```
{ id, campaignId, title, imageData|null (base64/dataURL), body|null, revealedToPlayer (bool), createdAt }
```

### `lore_pages`
```
{ id, campaignId, title, body (markdown), category, createdAt, updatedAt }
```

### `maps`
```
{ id, campaignId, name, gridType: 'square'|'hex', cols, rows, cellSizePx,
  backgroundImage|null, sceneNotes, createdAt }
```

### `tokens`
```
{ id, campaignId, mapId, refType: 'character'|'npc'|'monster'|'generic', refId|null,
  x, y, imageData|null, color|null, sizeCells (1 for medium), isHiddenFromPlayer (bool) }
```

### `fog_of_war_state`
```
{ id, mapId, revealedCells: [[x,y], ...] } // one row per map, cells stored as revealed set
```

### `encounters`
```
{ id, campaignId, name, mapId|null, status: 'planned'|'active'|'completed',
  combatants: [{tokenId|characterId|monsterId, side:'party'|'enemy'|'neutral'}],
  roundNumber, activeInitiativeEntryId|null }
```

### `initiative_entries`
```
{ id, encounterId, combatantRefType, combatantRefId, initiativeRoll, order, hasActed (bool), conditionsSnapshot }
```

### `log_entries`
Unified session log — narration, IC dialogue, OOC notes, emotes, system messages.
```
{ id, campaignId, sceneId|null, type: 'narration'|'dialogue'|'ooc'|'emote'|'system'|'override',
  speakerType: 'player'|'bot'|'dm_scripted'|'npc'|'system', speakerId|null,
  text, visibility: 'all'|'dm_only', createdAt }
```

### `dice_rolls`
```
{ id, campaignId, encounterId|null, actorType, actorId|null, formula (e.g. "1d20+5"),
  dice: [{sides,result}], modifier, total, purpose (e.g. 'attack','save','check'),
  advantage: 'none'|'advantage'|'disadvantage', overridden (bool), overrideValue|null, createdAt }
```

### `combat_logs`
```
{ id, campaignId, encounterId, roundNumber, actorId, actionType, targetId|null, resultSummary, createdAt }
```

### `event_logs`
Structured events emitted by the Rules Engine (superset feeding Memory); distinct from `log_entries` (prose) — this is the machine-readable trail.
```
{ id, campaignId, eventType, payload (json), createdAt }
```

### `random_tables`
```
{ id, campaignId|null, name, category, entries: [{weight, text|refId}] }
```

### `loot_tables`
```
{ id, campaignId|null, name, entries: [{weight, itemId|goldFormula|nothing}] }
```

### `bot_memory`
```
{ id, campaignId, botId, facts: [{key, value, tags: [text], importance, createdAt}],
  recentEventsRingBuffer: [eventLogId] // capped length N }
```

### `campaign_memory`
```
{ id, campaignId, npcStanding: {npcId: value(-100..100)}, partyBonds: [{fromId,toId,note}],
  taggedFacts: [{key, value, tags, createdAt}], recentEventsRingBuffer: [eventLogId] }
```

### `ai_settings`
Despite the name, governs scripted-DM/bot behavior only — no external AI.
```
{ id, campaignId, dmNarrationVerbosity: 'terse'|'normal'|'verbose', matureContentEnabled: bool,
  defaultBotCombatStyle: 'simple'|'moderate'|'advanced', autoAdvanceBotTurns: bool }
```

### `app_settings` (singleton row, or localStorage — see below)
```
{ id: 'singleton', theme, lastOpenCampaignId, hexGridFeatureFlag: bool, installPromptDismissed: bool }
```
Note: trivial UI prefs (theme, last campaign) are mirrored to `localStorage` for synchronous read on boot (avoids a flash of default theme); IndexedDB row is the durable source of truth included in full export.

### `content_packs`
Imported/exported homebrew bundles, tracked so we know provenance and can re-export just a pack.
```
{ id, name, version, sourceType: 'builtin_seed'|'imported', importedAt|null,
  includes: {characters:[],items:[],spells:[],monsters:[],features:[],effects:[],randomTables:[],lootTables:[],maps:[]} }
```

## Indexes
Every campaign-scoped store gets a `campaignId` index. `characters`, `npcs`, `monsters` additionally index `name` for search. `log_entries` and `dice_rolls` index `createdAt` for chronological pagination/pruning.

## Export/import shape
Full campaign export is a single JSON document: `{ formatVersion, exportedAt, campaign, characters, bots, npcs, encounters, maps, tokens, fogOfWar, quests, questObjectives, journalEntries, handouts, lorePages, logEntries, diceRolls, combatLogs, eventLogs, randomTables, lootTables, botMemory, campaignMemory, aiSettings }` — i.e. every row across every store filtered by `campaignId`, plus the `campaigns` row itself. Individual character export is just one `characters` row (+ its `bots` row if applicable). Import re-validates every row against the same constructors used at creation time before writing anything (all-or-nothing transaction), and remaps ids on conflict rather than overwriting existing data unless the user explicitly chooses "replace."
