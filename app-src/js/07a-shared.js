/* ---------- 7. DICE TRAY + UNIFIED LOG HELPERS ---------- */

// Persists a dice roll and mirrors it into the unified session log in one step,
// so every roll — whether from the dice tray or a character sheet quick-roll —
// shows up consistently in both dice_rolls history and the log feed.
async function rollAndLog(campaignId, { actorType, actorId, actorName, formula, modifier, mode, purpose }) {
  let dice, total, formulaStr, appliedModifier, advantage = mode || 'none';
  if (formula) {
    const parsed = parseDiceFormula(formula);
    if (!parsed) { toast('Invalid dice formula. Try something like 2d6+3.', 'danger'); return null; }
    const result = rollFormula(parsed);
    dice = result.dice;
    total = result.total;
    formulaStr = formula;
    appliedModifier = parsed.modifier;
  } else {
    const result = rollD20(modifier || 0, advantage);
    dice = result.rolls;
    total = result.total;
    formulaStr = `1d20${modifier >= 0 ? '+' : ''}${modifier || 0}`;
    appliedModifier = modifier || 0;
  }
  const roll = makeDiceRoll({ campaignId, actorType, actorId, formula: formulaStr, dice, modifier: appliedModifier, total, purpose, advantage });
  await DB.put('dice_rolls', roll);
  const advText = advantage !== 'none' ? ` (${advantage})` : '';
  const text = `${actorName || 'Someone'} rolls ${purpose || formulaStr}${advText}: [${dice.join(', ')}]${appliedModifier ? ' ' + fmtMod(appliedModifier) : ''} = ${total}`;
  const entry = makeLogEntry({ campaignId, type: 'system', speakerType: actorType || 'player', speakerId: actorId, text });
  await DB.put('log_entries', entry);
  return roll;
}

function diceTrayHtml(state) {
  const dieSizes = [4, 6, 8, 10, 12, 20, 100];
  return `
    <div class="dice-grid">
      ${dieSizes.map(sides => `<button class="die-btn" data-quick-die="${sides}"><span>d${sides}</span><span class="die-label">tap to roll</span></button>`).join('')}
      <button class="die-btn" data-open-custom="1"><span>⚙</span><span class="die-label">custom</span></button>
    </div>
    <div class="adv-toggle-row">
      <button data-adv="none" class="${state.mode === 'none' ? 'active' : ''}">Normal</button>
      <button data-adv="advantage" class="${state.mode === 'advantage' ? 'active' : ''}">Advantage</button>
      <button data-adv="disadvantage" class="${state.mode === 'disadvantage' ? 'active' : ''}">Disadvantage</button>
    </div>
    <p class="hint" style="text-align:center;margin-top:.4rem">Advantage/Disadvantage applies to the next d20 roll only.</p>
    <div id="rollResultSlot"></div>
  `;
}

function wireDiceTray(root, campaignId, state, onRoll) {
  root.querySelectorAll('[data-adv]').forEach(b => b.onclick = () => {
    state.mode = b.getAttribute('data-adv');
    root.querySelectorAll('[data-adv]').forEach(x => x.classList.toggle('active', x === b));
  });
  root.querySelectorAll('[data-quick-die]').forEach(b => b.onclick = async () => {
    const sides = parseInt(b.getAttribute('data-quick-die'));
    if (sides === 20 && state.mode !== 'none') {
      await animateAndRoll(root, campaignId, { modifier: 0, mode: state.mode, purpose: `d20 (${state.mode})` }, onRoll);
    } else {
      await animateAndRoll(root, campaignId, { formula: `1d${sides}`, purpose: `d${sides}` }, onRoll);
    }
  });
  const customBtn = root.querySelector('[data-open-custom]');
  if (customBtn) customBtn.onclick = () => openCustomRollModal(campaignId, state, onRoll);
}

async function animateAndRoll(root, campaignId, { formula, modifier, mode, purpose }, onRoll) {
  const slot = root.querySelector('#rollResultSlot');
  if (!slot) { await doRoll(); return; }
  slot.innerHTML = `<div class="roll-result-banner"><div class="rr-total rolling">?</div><div class="rr-detail">Rolling ${escapeHtml(purpose || formula)}…</div></div>`;
  const totalEl = slot.querySelector('.rr-total');
  let ticks = 0;
  const iv = setInterval(() => { totalEl.textContent = String(Math.ceil(Math.random() * 20)); ticks++; }, 60);
  await new Promise(r => setTimeout(r, 380));
  clearInterval(iv);
  const roll = await doRoll();
  if (!roll) { slot.innerHTML = ''; return; }
  totalEl.classList.remove('rolling');
  totalEl.textContent = String(roll.total);
  slot.querySelector('.rr-detail').textContent = `${purpose || formula}: [${roll.dice.join(', ')}]${roll.modifier ? ' ' + fmtMod(roll.modifier) : ''}`;

  async function doRoll() {
    return rollAndLog(campaignId, { actorType: 'player', actorId: null, actorName: 'You', formula, modifier, mode, purpose });
  }
  if (onRoll) onRoll();
}

function openCustomRollModal(campaignId, state, onRoll) {
  openModal(`
    <h2>Custom Roll</h2>
    <div class="field"><label for="crFormula">Formula</label><input type="text" id="crFormula" placeholder="e.g. 2d6+3" value=""></div>
    <p class="hint">Advantage/Disadvantage (currently: ${state.mode}) applies automatically if this is a single d20 roll.</p>
    <div class="row" style="margin-top:1rem">
      <button class="btn block" id="crCancel">Cancel</button>
      <button class="btn primary block" id="crRoll">Roll</button>
    </div>
  `, (rootEl) => {
    rootEl.querySelector('#crCancel').onclick = closeModal;
    rootEl.querySelector('#crRoll').onclick = async () => {
      const formula = rootEl.querySelector('#crFormula').value.trim();
      if (!parseDiceFormula(formula)) { toast('Invalid formula. Try something like 2d6+3 or 1d20.', 'danger'); return; }
      const parsed = parseDiceFormula(formula);
      const useMode = (parsed.count === 1 && parsed.sides === 20) ? state.mode : 'none';
      closeModal();
      if (useMode !== 'none') {
        const result = rollD20(parsed.modifier, useMode);
        const roll = makeDiceRoll({ campaignId, actorType: 'player', actorId: null, formula, dice: result.rolls, modifier: parsed.modifier, total: result.total, purpose: formula, advantage: useMode });
        await DB.put('dice_rolls', roll);
        const entry = makeLogEntry({ campaignId, type: 'system', speakerType: 'player', text: `You roll ${formula} (${useMode}): [${result.rolls.join(', ')}]${parsed.modifier ? ' ' + fmtMod(parsed.modifier) : ''} = ${result.total}` });
        await DB.put('log_entries', entry);
      } else {
        await rollAndLog(campaignId, { actorType: 'player', actorId: null, actorName: 'You', formula, purpose: formula });
      }
      if (onRoll) onRoll();
      toast('Rolled ' + formula + '.', 'success');
    };
  });
}

function logEntryHtml(e) {
  const speakerLabel = e.speakerType === 'system' ? 'System' : (e.speakerType === 'player' ? 'You' : e.speakerType);
  const time = new Date(e.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `
    <div class="log-entry type-${e.type}">
      <div class="le-meta">${escapeHtml(speakerLabel)} · ${e.type} · ${time}</div>
      <div class="le-text">${escapeHtml(e.text)}</div>
    </div>
  `;
}

function logToMarkdown(campaignName, entries) {
  const lines = [`# ${campaignName} — Session Log`, ''];
  entries.slice().reverse().forEach(e => {
    const time = new Date(e.createdAt).toLocaleString();
    const speaker = e.speakerType === 'system' ? 'System' : (e.speakerType === 'player' ? 'You' : e.speakerType);
    if (e.type === 'emote') lines.push(`*${speaker} ${e.text}* — _${time}_`);
    else if (e.type === 'ooc') lines.push(`**(OOC)** ${speaker}: ${e.text} — _${time}_`);
    else lines.push(`**${speaker}:** ${e.text} — _${time}_`);
    lines.push('');
  });
  return lines.join('\n');
}
