/* ---- Combat: monsters, encounters, combatants ---- */
// NOTE on schema: DATA_MODEL.md's `encounters.combatants` was specified as
// lightweight refs ({tokenId|characterId|monsterId, side}). Phase 4 has no
// map/token layer yet (that's Phase 5) and needs independent HP/conditions
// per combatant instance (two goblins from the same template need separate
// HP tracks), so combatants here are snapshot objects carrying their own
// hp/ac/conditions/attacks alongside refType/refId for traceability. This is
// an intentional, documented extension of the schema, not a drift — see
// DECISIONS.md D13.
function makeMonster({ campaignId, name, ac, hpMax, attackName, attackBonus, damageDice, damageType, attackCount, resistances, immunities, vulnerabilities, savingThrows }) {
  return {
    id: uid(), campaignId: campaignId || null, name, size: 'medium', type: 'monstrosity',
    ac: ac || 10, hp: { formula: '', max: hpMax || 10 }, speed: 30,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrows: savingThrows || {}, skills: {},
    resistances: resistances || [], immunities: immunities || [], vulnerabilities: vulnerabilities || [],
    senses: '', languages: '', challengeRating: 0,
    traits: [],
    actions: [{ name: attackName || 'Strike', attackBonus: attackBonus || '+3', damageDice: damageDice || '1d6+1', damageType: damageType || 'bludgeoning', attackCount: Math.max(1, attackCount || 1) }],
    legendaryActions: null, tokenImage: null
  };
}

function getPrimaryAttack(combatant) {
  if (combatant.attacks && combatant.attacks.length) return combatant.attacks[0];
  const mod = combatant.primaryAbilityMod ?? 2;
  return { name: 'Improvised Attack', attackBonus: fmtMod(2 + mod), damageDice: '1d6' + (mod ? fmtMod(mod) : ''), damageType: 'bludgeoning' };
}

// Async because it looks up the character's first combat-usable known spell
// (one with a damageDice or healFormula set in the homebrew Spells library)
// to give bots something to `cast` in resolveBotTurn/chooseBotAction.
async function combatantFromCharacter(char, bot) {
  let spell = null;
  for (const spellId of (char.spellsKnown || [])) {
    const s = await DB.get('spells', spellId);
    if (s && s.damageDice) { spell = { type: 'damage', formula: s.damageDice, name: s.name, level: s.level || 1 }; break; }
    if (s && s.healFormula) { spell = { type: 'heal', formula: s.healFormula, name: s.name, level: s.level || 1 }; break; }
  }
  return {
    id: uid(), refType: 'character', refId: char.id,
    name: char.name, side: 'party',
    hp: { current: char.hp.current, max: char.hp.max, temp: char.hp.temp || 0 },
    ac: char.ac, initiativeBonus: char.initiativeBonus || 0,
    primaryAbilityMod: Math.max(abilityMod(char.abilities.str), abilityMod(char.abilities.dex)),
    abilities: char.abilities, savingThrows: char.savingThrows || {}, level: char.level || 1,
    resistances: char.resistances || [], immunities: char.immunities || [], vulnerabilities: char.vulnerabilities || [],
    conditions: [], attacks: char.attacks || [], spell,
    isBot: char.controlledBy === 'bot',
    combatStyle: bot ? bot.combatStyle : 'moderate',
    isHealer: isHealerClass(char.class),
    role: roleForClass(char.class),
    botId: bot ? bot.id : null,
    initiativeRoll: 0, hasActed: false
  };
}
function combatantFromMonster(monster, index, total) {
  const action = monster.actions[0] || {};
  return {
    id: uid(), refType: 'monster', refId: monster.id,
    name: total > 1 ? `${monster.name} ${index + 1}` : monster.name, side: 'enemy',
    hp: { current: monster.hp.max, max: monster.hp.max, temp: 0 },
    ac: monster.ac, initiativeBonus: 0,
    abilities: monster.abilities || {}, savingThrows: monster.savingThrows || {},
    resistances: monster.resistances || [], immunities: monster.immunities || [], vulnerabilities: monster.vulnerabilities || [],
    conditions: [], attacks: [{ id: uid(), name: action.name, attackBonus: action.attackBonus, damageDice: action.damageDice, damageType: action.damageType, attackCount: Math.max(1, action.attackCount || 1), notes: '' }],
    isBot: true, combatStyle: 'simple', isHealer: false, role: 'minion', botId: null,
    initiativeRoll: 0, hasActed: false
  };
}

function makeEncounter({ campaignId, name, combatants, initiativeOrder }) {
  return {
    id: uid(), campaignId, name: name || 'Encounter', mapId: null, status: 'active',
    combatants, initiativeOrder, roundNumber: 1, activeIndex: 0,
    createdAt: nowIso()
  };
}

function findCombatant(encounter, id) { return encounter.combatants.find(c => c.id === id); }
function encounterHpLookup(encounter) {
  const map = {};
  encounter.combatants.forEach(c => { map[c.id] = c.hp.current; });
  return map;
}
function encounterSideLookup(encounter) {
  const map = {};
  encounter.combatants.forEach(c => { map[c.id] = c.side; });
  return map;
}

async function startEncounter(campaignId, name, partyCombatants, monsterDrafts) {
  const combatants = [...partyCombatants];
  for (const draft of monsterDrafts) {
    // A draft picked from the homebrew Monster Library carries its source
    // row's id — reuse that row instead of minting a new `monsters` entry,
    // so repeated encounters with the same library monster don't pile up
    // duplicate rows (see DECISIONS.md D20).
    let monster = draft.libraryMonsterId ? await DB.get('monsters', draft.libraryMonsterId) : null;
    if (!monster) monster = makeMonster({ campaignId, name: draft.name, ac: draft.ac, hpMax: draft.hp, attackBonus: draft.attackBonus, damageDice: draft.damageDice, damageType: draft.damageType });
    if (!draft.libraryMonsterId) await DB.put('monsters', monster);
    for (let i = 0; i < draft.qty; i++) combatants.push(combatantFromMonster(monster, i, draft.qty));
  }
  combatants.forEach(c => { c.initiativeRoll = rollD20(c.initiativeBonus, 'none').total; });
  const sorted = sortInitiative(combatants.map(c => ({ id: c.id, roll: c.initiativeRoll, dexMod: c.initiativeBonus })));
  const initiativeOrder = sorted.map(s => s.id);

  const encounter = makeEncounter({ campaignId, name, combatants, initiativeOrder });
  await DB.put('encounters', encounter);

  const campaign = await DB.get('campaigns', campaignId);
  campaign.currentEncounterId = encounter.id;
  await DB.put('campaigns', campaign);

  const orderText = initiativeOrder.map(id => { const c = findCombatant(encounter, id); return `${c.name} (${c.initiativeRoll})`; }).join(', ');
  await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: 'system', text: `⚔ Combat begins! Initiative order: ${orderText}` }));
  return encounter;
}

async function combatAttack(encounter, attacker, target) {
  const atk = getPrimaryAttack(attacker);
  const bonus = parseInt(String(atk.attackBonus).replace(/[^\d-]/g, '')) || 0;
  const roll = rollD20(bonus, 'none');
  const hit = roll.total >= target.ac;
  const diceRoll = makeDiceRoll({ campaignId: encounter.campaignId, actorType: attacker.isBot ? 'bot' : 'player', actorId: attacker.refId, formula: `1d20${bonus >= 0 ? '+' : ''}${bonus}`, dice: roll.rolls, modifier: bonus, total: roll.total, purpose: `${atk.name} attack vs ${target.name}` });
  await DB.put('dice_rolls', diceRoll);
  let resultSummary;
  if (hit) {
    const dmgParsed = parseDiceFormula(atk.damageDice) || { count: 1, sides: 6, modifier: 0 };
    const dmgResult = rollFormula(dmgParsed);
    const dmgRoll = makeDiceRoll({ campaignId: encounter.campaignId, actorType: attacker.isBot ? 'bot' : 'player', actorId: attacker.refId, formula: atk.damageDice, dice: dmgResult.dice, modifier: dmgResult.modifier, total: dmgResult.total, purpose: `${atk.name} damage` });
    await DB.put('dice_rolls', dmgRoll);
    const applied = applyDamageWithResistance(dmgResult.total, atk.damageType, target);
    let remaining = applied;
    if (target.hp.temp > 0) { const absorbed = Math.min(target.hp.temp, remaining); target.hp.temp -= absorbed; remaining -= absorbed; }
    target.hp.current = clamp(target.hp.current - remaining, 0, target.hp.max);
    const resistNote = applied !== dmgResult.total ? ` (${applied === 0 ? 'immune' : applied < dmgResult.total ? 'resisted' : 'vulnerable'}, ${applied} taken)` : '';
    resultSummary = `${attacker.name} hits ${target.name} with ${atk.name} for ${dmgResult.total} (${atk.damageType || 'damage'})${resistNote}. ${target.name} at ${target.hp.current}/${target.hp.max} HP.`;
  } else {
    resultSummary = `${attacker.name} attacks ${target.name} with ${atk.name} and misses (rolled ${roll.total} vs AC ${target.ac}).`;
  }
  await DB.put('log_entries', makeLogEntry({ campaignId: encounter.campaignId, type: 'system', speakerType: attacker.isBot ? 'bot' : 'player', speakerId: attacker.refId, text: resultSummary }));
  await DB.put('combat_logs', { id: uid(), campaignId: encounter.campaignId, encounterId: encounter.id, roundNumber: encounter.roundNumber, actorId: attacker.id, actionType: 'attack', targetId: target.id, resultSummary, createdAt: nowIso() });
  return { hit, resultSummary };
}

async function combatHeal(encounter, healer, target) {
  const dmgResult = rollFormula('1d8+2');
  const roll = makeDiceRoll({ campaignId: encounter.campaignId, actorType: 'bot', actorId: healer.refId, formula: '1d8+2', dice: dmgResult.dice, modifier: dmgResult.modifier, total: dmgResult.total, purpose: 'healing' });
  await DB.put('dice_rolls', roll);
  target.hp.current = clamp(target.hp.current + dmgResult.total, 0, target.hp.max);
  const resultSummary = `${healer.name} channels healing into ${target.name} for ${dmgResult.total}. ${target.name} at ${target.hp.current}/${target.hp.max} HP.`;
  await DB.put('log_entries', makeLogEntry({ campaignId: encounter.campaignId, type: 'system', speakerType: 'bot', speakerId: healer.refId, text: resultSummary }));
  await DB.put('combat_logs', { id: uid(), campaignId: encounter.campaignId, encounterId: encounter.id, roundNumber: encounter.roundNumber, actorId: healer.id, actionType: 'heal', targetId: target.id, resultSummary, createdAt: nowIso() });
  return { resultSummary };
}

// A spellcast auto-hits (no AC roll) — unlike combatAttack — since we don't
// model spell save DCs; it's the same simplification combatHeal already makes.
async function combatCast(encounter, caster, target, spell) {
  const dmgResult = rollFormula(spell.formula);
  const roll = makeDiceRoll({ campaignId: encounter.campaignId, actorType: 'bot', actorId: caster.refId, formula: spell.formula, dice: dmgResult.dice, modifier: dmgResult.modifier, total: dmgResult.total, purpose: `${spell.name || 'spell'} damage` });
  await DB.put('dice_rolls', roll);
  let remaining = dmgResult.total;
  if (target.hp.temp > 0) { const absorbed = Math.min(target.hp.temp, remaining); target.hp.temp -= absorbed; remaining -= absorbed; }
  target.hp.current = clamp(target.hp.current - remaining, 0, target.hp.max);
  const resultSummary = `${caster.name} casts ${spell.name || 'a spell'} at ${target.name} for ${dmgResult.total}. ${target.name} at ${target.hp.current}/${target.hp.max} HP.`;
  await DB.put('log_entries', makeLogEntry({ campaignId: encounter.campaignId, type: 'system', speakerType: 'bot', speakerId: caster.refId, text: resultSummary }));
  await DB.put('combat_logs', { id: uid(), campaignId: encounter.campaignId, encounterId: encounter.id, roundNumber: encounter.roundNumber, actorId: caster.id, actionType: 'cast', targetId: target.id, resultSummary, createdAt: nowIso() });
  return { resultSummary };
}

async function resolveBotTurn(encounter, combatant) {
  const allies = encounter.combatants.filter(c => c.side === combatant.side && c.id !== combatant.id).map(c => ({ id: c.id, name: c.name, hp: c.hp.current, hpMax: c.hp.max }));
  const enemies = encounter.combatants.filter(c => c.side !== combatant.side).map(c => ({ id: c.id, name: c.name, hp: c.hp.current, hpMax: c.hp.max, role: c.role || 'minion' }));
  const situation = { self: { hp: combatant.hp.current, hpMax: combatant.hp.max, isHealer: combatant.isHealer, spell: combatant.spell }, allies, enemies };
  const action = chooseBotAction(combatant.combatStyle, situation);
  if (action.type === 'attack') {
    const target = findCombatant(encounter, action.targetId);
    if (target) {
      const atk = getPrimaryAttack(combatant);
      const swings = Math.max(1, atk.attackCount || 1);
      let last = null;
      for (let i = 0; i < swings; i++) {
        const liveTarget = findCombatant(encounter, target.id);
        if (!liveTarget || isCombatantDown(liveTarget.hp.current)) break;
        last = await combatAttack(encounter, combatant, liveTarget);
      }
      return last;
    }
  } else if (action.type === 'cast') {
    const target = findCombatant(encounter, action.targetId);
    if (target) {
      // Spell casting draws down a real spell slot on the underlying
      // character (combatants are per-encounter snapshots — see D13 — so the
      // slot lives on the DB row, not this object). No slot left, or this
      // isn't a slot-tracked caster: fall back to a mundane attack instead
      // of casting for free (closes D19's original "no slot consumption" gap).
      const level = (combatant.spell && combatant.spell.level) || 1;
      const char = combatant.refType === 'character' ? await DB.get('characters', combatant.refId) : null;
      if (char && consumeSpellSlot(char, level)) {
        await DB.put('characters', char);
        return await combatCast(encounter, combatant, target, combatant.spell);
      }
      return await combatAttack(encounter, combatant, target);
    }
  } else if (action.type === 'heal') {
    const target = findCombatant(encounter, action.targetId);
    if (target) return await combatHeal(encounter, combatant, target);
  }
  await DB.put('log_entries', makeLogEntry({ campaignId: encounter.campaignId, type: 'system', speakerType: 'bot', speakerId: combatant.refId, text: `${combatant.name} holds position.` }));
  return { resultSummary: `${combatant.name} holds.` };
}
