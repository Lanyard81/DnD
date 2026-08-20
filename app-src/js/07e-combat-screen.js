/* ---- Combat screen (initiative tracker) ---- */
async function ScreenCombat(root, campaignId, encounterId) {
  let encounter = await DB.get('encounters', encounterId);
  if (!encounter) { root.innerHTML = emptyState('❓', 'Encounter not found'); return; }
  const campaign = await DB.get('campaigns', campaignId);

  async function persist() { await DB.put('encounters', encounter); }

  async function checkCombatEnd() {
    const hpLookup = encounterHpLookup(encounter);
    const sideOf = encounterSideLookup(encounter);
    const partyDown = isSideDefeated(encounter.initiativeOrder, hpLookup, sideOf, 'party');
    const enemyDown = isSideDefeated(encounter.initiativeOrder, hpLookup, sideOf, 'enemy');
    if (partyDown || enemyDown) {
      encounter.status = 'completed';
      const text = enemyDown ? `🏆 Victory! The party has defeated all enemies.` : `💀 The party has fallen.`;
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: 'system', text }));
      const camp = await DB.get('campaigns', campaignId);
      camp.currentEncounterId = null;
      await DB.put('campaigns', camp);
      await persist();
      return true;
    }
    return false;
  }

  async function advance() {
    const hpLookup = encounterHpLookup(encounter);
    const { activeIndex, roundDelta } = advanceTurn(encounter.initiativeOrder, encounter.activeIndex, hpLookup);
    encounter.activeIndex = activeIndex;
    encounter.roundNumber += roundDelta;
    await persist();
    render();
  }

  async function render() {
    encounter = await DB.get('encounters', encounterId);
    const combatOver = encounter.status === 'completed';
    const activeId = encounter.initiativeOrder[encounter.activeIndex];
    const active = findCombatant(encounter, activeId);

    root.innerHTML = `
      ${combatOver ? `<div class="combat-over-banner"><h2 style="margin:0 0 .3rem">Combat Complete</h2><p style="margin:0">Review the log below, then return whenever you're ready.</p><button class="btn primary block" id="returnBtn" style="margin-top:.6rem">Return to Campaign</button></div>` : ''}
      <div class="round-banner">Round ${encounter.roundNumber}${!combatOver ? ` — ${escapeHtml(active.name)}'s turn` : ''}</div>
      <div class="turn-order-strip">
        ${encounter.initiativeOrder.map(id => {
          const c = findCombatant(encounter, id);
          const down = isCombatantDown(c.hp.current);
          return `<span class="tos-chip ${id === activeId && !combatOver ? 'active' : ''} ${down ? 'down' : ''}">${escapeHtml(c.name)} (${c.initiativeRoll})</span>`;
        }).join('')}
      </div>

      ${!combatOver ? `
        <div class="card">
          ${active.side === 'party' && !active.isBot ? `
            <div class="row wrap">
              <button class="btn primary" id="attackBtn">⚔ Attack</button>
              <button class="btn" id="endTurnBtn">End Turn ▶</button>
            </div>
          ` : `
            <div class="row wrap">
              <button class="btn primary" id="runBotTurnBtn">▶ Run Turn (${COMBAT_STYLE_INFO[active.combatStyle] ? COMBAT_STYLE_INFO[active.combatStyle].label : active.combatStyle} AI)</button>
              <button class="btn" id="endTurnBtn">End Turn ▶</button>
            </div>
          `}
        </div>
      ` : ''}

      <div class="section-title">Combatants</div>
      ${encounter.combatants.map(c => combatantCardHtml(c, c.id === activeId)).join('')}

      <button class="btn danger block" id="endCombatBtn" style="margin-top:1rem">🏳 End Combat</button>
    `;

    const returnBtn = root.querySelector('#returnBtn');
    if (returnBtn) returnBtn.onclick = () => Router.go(`#/campaigns/${campaignId}`);

    const attackBtn = root.querySelector('#attackBtn');
    if (attackBtn) attackBtn.onclick = () => openAttackModal(active);

    const runBotBtn = root.querySelector('#runBotTurnBtn');
    if (runBotBtn) runBotBtn.onclick = async () => {
      runBotBtn.disabled = true;
      await resolveBotTurn(encounter, active);
      await persist();
      if (await checkCombatEnd()) { render(); return; }
      await advance();
    };

    const endTurnBtn = root.querySelector('#endTurnBtn');
    if (endTurnBtn) endTurnBtn.onclick = () => advance();

    root.querySelector('#endCombatBtn').onclick = async () => {
      const ok = await confirmDialog('End this combat now?', { okLabel: 'End Combat', danger: true });
      if (!ok) return;
      encounter.status = 'completed';
      const camp = await DB.get('campaigns', campaignId);
      camp.currentEncounterId = null;
      await DB.put('campaigns', camp);
      await persist();
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: 'system', text: '🏳 Combat ended manually.' }));
      render();
    };

    // Per-combatant inline overrides: HP, AC, initiative roll, conditions, "set active".
    root.querySelectorAll('[data-hp-cur]').forEach(el => el.onchange = async () => {
      const c = findCombatant(encounter, el.getAttribute('data-hp-cur'));
      c.hp.current = clamp(parseInt(el.value) || 0, 0, 999);
      await persist();
      if (await checkCombatEnd()) render();
    });
    root.querySelectorAll('[data-hp-max]').forEach(el => el.onchange = async () => {
      const c = findCombatant(encounter, el.getAttribute('data-hp-max'));
      c.hp.max = Math.max(1, parseInt(el.value) || 1);
      await persist();
    });
    root.querySelectorAll('[data-ac-val]').forEach(el => el.onchange = async () => {
      const c = findCombatant(encounter, el.getAttribute('data-ac-val'));
      c.ac = parseInt(el.value) || 10;
      await persist();
    });
    root.querySelectorAll('[data-init-val]').forEach(el => el.onchange = async () => {
      const c = findCombatant(encounter, el.getAttribute('data-init-val'));
      c.initiativeRoll = parseInt(el.value) || 0;
      const sorted = sortInitiative(encounter.combatants.map(cc => ({ id: cc.id, roll: cc.initiativeRoll, dexMod: cc.initiativeBonus })));
      encounter.initiativeOrder = sorted.map(s => s.id);
      await persist();
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'override', speakerType: 'player', text: `Initiative overridden: ${c.name} now at ${c.initiativeRoll}.` }));
      render();
    });
    root.querySelectorAll('[data-set-active]').forEach(el => el.onclick = async () => {
      const id = el.getAttribute('data-set-active');
      encounter.activeIndex = encounter.initiativeOrder.indexOf(id);
      await persist();
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'override', speakerType: 'player', text: `Turn order overridden: it is now ${findCombatant(encounter, id).name}'s turn.` }));
      render();
    });
    root.querySelectorAll('[data-cond-add]').forEach(el => el.onclick = async () => {
      const cId = el.getAttribute('data-cond-add');
      const input = root.querySelector(`[data-cond-input="${cId}"]`);
      if (!input.value.trim()) return;
      findCombatant(encounter, cId).conditions.push({ conditionId: input.value.trim(), source: 'manual', roundsRemaining: null });
      await persist();
      render();
    });
    root.querySelectorAll('[data-cond-remove]').forEach(el => el.onclick = async () => {
      const [cId, idx] = el.getAttribute('data-cond-remove').split('|');
      findCombatant(encounter, cId).conditions.splice(parseInt(idx), 1);
      await persist();
      render();
    });
  }

  function openAttackModal(attacker) {
    const targets = encounter.combatants.filter(c => c.side !== attacker.side && !isCombatantDown(c.hp.current));
    if (!targets.length) { toast('No living targets.', 'danger'); return; }
    const attackOptions = attacker.attacks && attacker.attacks.length ? attacker.attacks : [getPrimaryAttack(attacker)];
    openModal(`
      <h2>${escapeHtml(attacker.name)} attacks</h2>
      <div class="field">
        <label>Attack</label>
        <select id="atkSelect">${attackOptions.map((a, i) => `<option value="${i}">${escapeHtml(a.name)} (${escapeHtml(a.attackBonus)}, ${escapeHtml(a.damageDice)})</option>`).join('')}</select>
      </div>
      <div class="field">
        <label>Target</label>
        <select id="tgtSelect">${targets.map(t => `<option value="${t.id}">${escapeHtml(t.name)} (AC ${t.ac}, ${t.hp.current}/${t.hp.max} HP)</option>`).join('')}</select>
      </div>
      <div class="row" style="margin-top:1rem">
        <button class="btn block" id="atkCancel">Cancel</button>
        <button class="btn primary block" id="atkGo">Roll Attack</button>
      </div>
    `, (rootEl) => {
      rootEl.querySelector('#atkCancel').onclick = closeModal;
      rootEl.querySelector('#atkGo').onclick = async () => {
        const atkIdx = parseInt(rootEl.querySelector('#atkSelect').value);
        const targetId = rootEl.querySelector('#tgtSelect').value;
        const target = findCombatant(encounter, targetId);
        const chosenAttacker = { ...attacker, attacks: [attackOptions[atkIdx]] };
        closeModal();
        await combatAttack(encounter, chosenAttacker, target);
        await persist();
        if (await checkCombatEnd()) { render(); return; }
        render();
      };
    });
  }

  render();
}

function combatantCardHtml(c, isActive) {
  const down = isCombatantDown(c.hp.current);
  const pct = Math.max(0, Math.min(100, (c.hp.current / c.hp.max) * 100));
  return `
    <div class="card combatant-card side-${c.side} ${isActive ? 'is-active' : ''} ${down ? 'is-down' : ''}">
      <div class="row between">
        <strong>${escapeHtml(c.name)}</strong>
        <div class="row" style="gap:.3rem">
          <span class="badge ${c.side === 'party' ? '' : 'accent'}">${c.side}</span>
          ${!isActive ? `<button class="btn sm" data-set-active="${c.id}">Set Active</button>` : ''}
        </div>
      </div>
      <div class="cc-hpbar"><div class="cc-hpbar-fill ${pct <= 25 ? 'low' : ''}" style="width:${pct}%"></div></div>
      <div class="row wrap cc-inline-inputs" style="gap:.6rem">
        <label class="hint">HP <input type="number" data-hp-cur="${c.id}" value="${c.hp.current}"> / <input type="number" data-hp-max="${c.id}" value="${c.hp.max}"></label>
        <label class="hint">AC <input type="number" data-ac-val="${c.id}" value="${c.ac}"></label>
        <label class="hint">Init <input type="number" data-init-val="${c.id}" value="${c.initiativeRoll}"></label>
      </div>
      <div class="chip-list">
        ${c.conditions.map((cond, i) => `<span class="chip">${escapeHtml(cond.conditionId)}<button data-cond-remove="${c.id}|${i}">✕</button></span>`).join('') || '<span class="hint">No conditions.</span>'}
      </div>
      ${c.conditions.map(cond => getConditionReminder(cond.conditionId)).filter(Boolean).length ? `
        <p class="hint" style="margin-top:.3rem">${c.conditions.map(cond => { const r = getConditionReminder(cond.conditionId); return r ? `<strong>${escapeHtml(cond.conditionId)}:</strong> ${escapeHtml(r)}` : ''; }).filter(Boolean).join(' · ')}</p>
      ` : ''}
      <div class="list-add-row"><input type="text" data-cond-input="${c.id}" placeholder="Add condition"><button class="btn sm" data-cond-add="${c.id}">Add</button></div>
    </div>
  `;
}
