/* ---- Table / session view ---- */
async function ScreenTable(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }
  const bots = await DB.getAllByIndex('bots', 'campaignId', campaignId);
  const characters = await DB.getAllByIndex('characters', 'campaignId', campaignId);
  const charById = Object.fromEntries(characters.map(c => [c.id, c]));
  const botChars = characters.filter(c => c.controlledBy === 'bot');
  const diceState = { mode: 'none' };
  let composerType = 'narration';
  let dmLocation = '';
  let showVerbPrompt = false;
  let pendingRoll = null; // { purpose, dc }

  async function renderDmPanel() {
    const card = root.querySelector('#dmPanelCard');
    if (!card) return;
    const mem = await getOrCreateCampaignMemory(campaignId);
    const recent = mem.recentEventsRingBuffer.slice(-5).reverse();
    card.innerHTML = `
      <div class="section-title">Scripted DM</div>
      <div class="field"><label for="dmLocationInput">Current location</label><input type="text" id="dmLocationInput" value="${escapeHtml(dmLocation)}" placeholder="the ruined watchtower"></div>
      <div class="row wrap">
        <button class="btn sm" id="dmNarrateBtn">📖 Narrate Scene</button>
        <button class="btn sm" id="dmNpcBtn">🎭 Introduce NPC</button>
        <button class="btn sm" id="dmAskBtn">❓ What Do You Do?</button>
        <button class="btn sm" id="dmRollBtn">🎲 Call for a Roll</button>
        <button class="btn sm" id="dmLootBtn">🎁 Generate Loot</button>
        <button class="btn sm" id="dmQuestBtn">📜 Generate Quest</button>
      </div>
      ${showVerbPrompt ? `
        <div class="dm-verb-row">
          ${DM_VERBS.map(v => `<button class="btn sm" data-verb-pick="${v}">${v}</button>`).join('')}
        </div>
        <div class="list-add-row"><input type="text" id="dmFreeTextInput" placeholder="Or type freely…"><button class="btn sm" id="dmFreeTextGo">Go</button></div>
      ` : ''}
      ${pendingRoll ? `
        <div class="card" style="margin-top:.6rem">
          <p style="margin:0">DC ${pendingRoll.dc} ${escapeHtml(pendingRoll.purpose)} — roll from the dice tray above, then resolve:</p>
          <div class="row" style="margin-top:.4rem">
            <button class="btn sm block" id="dmResolveFail">Resolve as Failure</button>
            <button class="btn sm block primary" id="dmResolveSuccess">Resolve as Success</button>
          </div>
        </div>
      ` : ''}
      ${recent.length ? `
        <div class="section-title">Recent events (memory)</div>
        <div class="chip-list">${recent.map(e => `<span class="chip">${escapeHtml(e.text)}</span>`).join('')}</div>
      ` : ''}
    `;
    card.querySelector('#dmLocationInput').oninput = e => { dmLocation = e.target.value; };
    card.querySelector('#dmNarrateBtn').onclick = async () => {
      await applyDmAction(campaignId, { type: 'narration', text: generateSceneNarration(dmLocation) });
      await addCampaignFact(campaignId, 'currentLocation', dmLocation || 'unspecified', ['scene']);
      await addCampaignRecentEvent(campaignId, `Arrived at ${dmLocation || 'a new location'}.`);
      refreshLogFeed(); renderDmPanel();
    };
    card.querySelector('#dmNpcBtn').onclick = async () => {
      await applyDmAction(campaignId, { type: 'add_npc', npc: generateNpc() });
      refreshLogFeed(); renderDmPanel();
    };
    card.querySelector('#dmAskBtn').onclick = () => { showVerbPrompt = !showVerbPrompt; renderDmPanel(); };
    card.querySelectorAll('[data-verb-pick]').forEach(b => b.onclick = async () => {
      await applyDmAction(campaignId, { type: 'ask_player_choice', text: `You decide to ${b.getAttribute('data-verb-pick')}.` });
      showVerbPrompt = false;
      refreshLogFeed(); renderDmPanel();
    });
    const freeGo = card.querySelector('#dmFreeTextGo');
    if (freeGo) freeGo.onclick = async () => {
      const val = card.querySelector('#dmFreeTextInput').value.trim();
      if (!val) return;
      const verb = matchDmVerb(val) || 'act';
      await applyDmAction(campaignId, { type: 'ask_player_choice', text: `You decide to ${verb}: "${val}"` });
      showVerbPrompt = false;
      refreshLogFeed(); renderDmPanel();
    };
    card.querySelector('#dmRollBtn').onclick = () => {
      openModal(`
        <h2>Call for a Roll</h2>
        <div class="field"><label for="rollPurpose">What's being rolled</label><input type="text" id="rollPurpose" placeholder="Perception check" value="Perception check"></div>
        <div class="field"><label for="rollDc">DC</label><input type="number" id="rollDc" value="12" min="1" max="30"></div>
        <div class="row" style="margin-top:1rem">
          <button class="btn block" id="rollCancel">Cancel</button>
          <button class="btn primary block" id="rollGo">Call For It</button>
        </div>
      `, (rootEl) => {
        rootEl.querySelector('#rollCancel').onclick = closeModal;
        rootEl.querySelector('#rollGo').onclick = async () => {
          const purpose = rootEl.querySelector('#rollPurpose').value.trim() || 'a check';
          const dc = parseInt(rootEl.querySelector('#rollDc').value) || 10;
          closeModal();
          await applyDmAction(campaignId, { type: 'request_roll', purpose, dc });
          pendingRoll = { purpose, dc };
          refreshLogFeed(); renderDmPanel();
        };
      });
    };
    const resolveSuccess = card.querySelector('#dmResolveSuccess');
    if (resolveSuccess) resolveSuccess.onclick = async () => {
      await applyDmAction(campaignId, { type: 'narration', text: generateOutcome(true) });
      pendingRoll = null;
      refreshLogFeed(); renderDmPanel();
    };
    const resolveFail = card.querySelector('#dmResolveFail');
    if (resolveFail) resolveFail.onclick = async () => {
      await applyDmAction(campaignId, { type: 'narration', text: generateOutcome(false) });
      pendingRoll = null;
      refreshLogFeed(); renderDmPanel();
    };
    card.querySelector('#dmLootBtn').onclick = async () => {
      await applyDmAction(campaignId, { type: 'give_loot', loot: generateLoot() });
      refreshLogFeed(); renderDmPanel();
    };
    card.querySelector('#dmQuestBtn').onclick = async () => {
      const mem2 = await getOrCreateCampaignMemory(campaignId);
      const npcFact = mem2.taggedFacts.find(f => f.key === 'currentLocation');
      await applyDmAction(campaignId, { type: 'update_quest', quest: generateQuest(null, npcFact ? npcFact.value : dmLocation) });
      refreshLogFeed(); renderDmPanel();
    };
  }

  async function loadEntries() {
    const all = await DB.getAllByIndex('log_entries', 'campaignId', campaignId);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 60);
  }

  async function refreshLogFeed() {
    const entries = await loadEntries();
    const feed = root.querySelector('.log-feed');
    if (!feed) return;
    feed.innerHTML = entries.length ? entries.map(logEntryHtml).join('') : emptyState('📖', 'The log is empty', 'Post a narration entry or roll some dice to get started.');
  }

  async function render() {
    const entries = await loadEntries();
    root.innerHTML = `
      ${campaign.aiDmEnabled ? `<div class="card dm-panel" id="dmPanelCard"></div>` : ''}
      <div class="section-title">Dice Tray</div>
      <div class="card" id="diceTrayCard">${diceTrayHtml(diceState)}</div>
      <button class="btn block" id="rollHistoryBtn">📜 Roll History</button>

      <div class="row wrap" style="margin-bottom:.6rem">
        ${botChars.length ? `<button class="btn" id="promptPartyBtn">🗣 Prompt the Party</button>` : ''}
        <button class="btn" id="partyShortRestBtn">🏕 Party Short Rest</button>
        <button class="btn primary" id="partyLongRestBtn">🌙 Party Long Rest</button>
      </div>
      <div class="section-title">Session Log</div>
      <p class="hint">Recognized party commands: "focus &lt;target&gt;", "hold position", "flee", "use &lt;item&gt;" — post one below and the party will react.</p>
      <div class="log-composer">
        <div class="log-type-row">
          <button data-log-type="narration" class="${composerType === 'narration' ? 'active' : ''}">Narration</button>
          <button data-log-type="ooc" class="${composerType === 'ooc' ? 'active' : ''}">OOC</button>
          <button data-log-type="emote" class="${composerType === 'emote' ? 'active' : ''}">Emote</button>
        </div>
        <textarea id="logInput" placeholder="${composerType === 'emote' ? 'waves at the tavern keeper' : 'What happens next? (or a party command)'}" style="min-height:3em"></textarea>
        <button class="btn primary block" id="logPostBtn">Post to Log</button>
      </div>
      <button class="btn block" id="exportLogBtn" style="margin-bottom:.8rem">Export Log (Markdown)</button>
      <div class="log-feed">
        ${entries.length ? entries.map(logEntryHtml).join('') : emptyState('📖', 'The log is empty', 'Post a narration entry or roll some dice to get started.')}
      </div>
    `;
    // Rolls only refresh the log feed (not the whole screen) so the animated
    // result banner in the dice tray stays visible after the roll settles.
    wireDiceTray(document.getElementById('diceTrayCard'), campaignId, diceState, refreshLogFeed);
    root.querySelector('#rollHistoryBtn').onclick = () => openRollHistoryModal(campaignId);
    if (campaign.aiDmEnabled) await renderDmPanel();
    root.querySelector('#partyLongRestBtn').onclick = async () => {
      const ok = await confirmDialog('Long rest the whole party? Restores full HP and spell slots, clears conditions for everyone.', { okLabel: 'Rest' });
      if (!ok) return;
      for (const c of characters) { Object.assign(c, longRestChanges(c)); await DB.put('characters', c); }
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: 'system', text: 'The party takes a long rest. Everyone is fully healed and rested.' }));
      refreshLogFeed();
      toast('Party fully rested.', 'success');
    };
    root.querySelector('#partyShortRestBtn').onclick = async () => {
      for (const c of characters) {
        const conMod = abilityMod(c.abilities.con);
        const result = rollFormula(`1d8${conMod >= 0 ? '+' : ''}${conMod}`);
        Object.assign(c.hp, shortRestChanges(c, result.total).hp);
        await DB.put('characters', c);
      }
      await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: 'system', text: 'The party takes a short rest and patches up their wounds.' }));
      refreshLogFeed();
      toast('Party takes a short rest.', 'success');
    };
    root.querySelectorAll('[data-log-type]').forEach(b => b.onclick = () => { composerType = b.getAttribute('data-log-type'); render(); });
    const promptBtn = root.querySelector('#promptPartyBtn');
    if (promptBtn) promptBtn.onclick = async () => {
      for (const bot of bots) {
        const char = charById[bot.characterId];
        if (!char) continue;
        await postBotDialogue(campaignId, bot, char, 'scene_enter');
        await addBotRecentEvent(campaignId, bot.id, 'Was prompted at the table.');
      }
      refreshLogFeed();
    };
    root.querySelector('#logPostBtn').onclick = async () => {
      const input = root.querySelector('#logInput');
      const text = input.value.trim();
      if (!text) return;

      const command = parseCommand(text);
      if (command.type && botChars.length) {
        const cmdEntry = makeLogEntry({ campaignId, type: 'ooc', speakerType: 'player', text: `You order the party: "${text}"` });
        await DB.put('log_entries', cmdEntry);
        const triggerByCommand = { focus: 'command_focus', hold: 'command_hold', flee: 'command_flee', use_item: 'command_use_item' };
        const trigger = triggerByCommand[command.type];
        for (const bot of bots) {
          const char = charById[bot.characterId];
          if (!char) continue;
          await postBotDialogue(campaignId, bot, char, trigger, { target: command.target || 'the target' });
          await addBotFact(campaignId, bot.id, 'lastCommand', command.type, ['command']);
          await addBotRecentEvent(campaignId, bot.id, `Player commanded: ${text}`);
        }
      } else {
        const entry = makeLogEntry({ campaignId, type: composerType, speakerType: 'player', text });
        await DB.put('log_entries', entry);
      }
      input.value = '';
      refreshLogFeed();
    };
    root.querySelector('#exportLogBtn').onclick = async () => {
      const all = await DB.getAllByIndex('log_entries', 'campaignId', campaignId);
      all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const md = logToMarkdown(campaign.name, all);
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `fabletable-${(campaign.name || 'campaign').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}-log.md`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast('Log exported as Markdown.', 'success');
    };
  }

  await render();
}

async function openRollHistoryModal(campaignId) {
  const rolls = await DB.getAllByIndex('dice_rolls', 'campaignId', campaignId);
  rolls.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recent = rolls.slice(0, 40);
  openModal(`
    <h2>Roll History</h2>
    ${recent.length ? `
      <table class="data-table">
        <thead><tr><th>When</th><th>Purpose</th><th>Result</th></tr></thead>
        <tbody>
          ${recent.map(r => `<tr>
            <td>${new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
            <td>${escapeHtml(r.purpose || r.formula)}</td>
            <td>[${r.dice.join(', ')}]${r.modifier ? ' ' + fmtMod(r.modifier) : ''} = <strong>${r.total}</strong></td>
          </tr>`).join('')}
        </tbody>
      </table>
    ` : emptyState('🎲', 'No rolls yet')}
    <button class="btn block" id="rhClose" style="margin-top:1rem">Close</button>
  `, (rootEl) => { rootEl.querySelector('#rhClose').onclick = closeModal; });
}
