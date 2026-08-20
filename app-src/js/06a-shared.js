/* ---------- 6. SCREENS ---------- */

async function ScreenLanding(root) {
  const campaigns = await DB.getAll('campaigns');
  const recent = campaigns.sort((a, b) => (b.lastPlayedAt || '').localeCompare(a.lastPlayedAt || '')).slice(0, 3);
  root.innerHTML = `
    <div class="landing-hero">
      <h1>FableTable Solo</h1>
      <p class="tag">Solo tabletop adventures. Offline. On your terms.</p>
    </div>
    <button class="btn primary block" id="newCampaignBtn">+ New Campaign</button>
    <button class="btn block" id="demoCampaignBtn" style="margin-top:.5rem">🎲 Try the Demo Campaign</button>
    ${recent.length ? `
      <div class="section-title">Continue playing</div>
      ${recent.map(c => campaignCardHtml(c)).join('')}
    ` : `
      <div class="section-title">Get started</div>
      ${emptyState('🗺️', 'No campaigns yet', 'Create your first campaign to begin a solo adventure, or try the fully-seeded demo above.')}
    `}
    ${disclaimerFooter()}
  `;
  root.querySelector('#newCampaignBtn').onclick = () => openCampaignWizard();
  root.querySelector('#demoCampaignBtn').onclick = async () => {
    const campaign = await createDemoCampaign();
    toast('Demo campaign ready — a player character, a 3-bot party, and the tutorial adventure are all loaded.', 'success');
    Router.go('#/campaigns/' + campaign.id);
  };
  root.querySelectorAll('[data-campaign-id]').forEach(el => {
    el.onclick = () => Router.go('#/campaigns/' + el.getAttribute('data-campaign-id'));
  });
}

function campaignCardHtml(c) {
  const modeLabel = (PLAY_MODES.find(p => p.id === c.playMode) || {}).label || c.playMode;
  return `
    <div class="card tap" data-campaign-id="${c.id}">
      <div class="row between">
        <h3 style="margin:0">${escapeHtml(c.name)}</h3>
        <span class="badge accent">${c.automationLevel}</span>
      </div>
      <p style="margin:.35rem 0 0">${escapeHtml(c.description || 'No description yet.')}</p>
      <div class="row wrap" style="margin-top:.5rem">
        <span class="badge">${c.rulesProfile === 'legacy' ? 'Legacy rules' : 'Modern rules'}</span>
        <span class="badge">${c.aiDmEnabled ? 'AI DM on' : 'AI DM off'}</span>
        <span class="badge">${escapeHtml(modeLabel)}</span>
      </div>
    </div>
  `;
}

async function ScreenCampaignList(root) {
  const campaigns = await DB.getAll('campaigns');
  campaigns.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  root.innerHTML = `
    <button class="btn primary block" id="newCampaignBtn">+ New Campaign</button>
    <div class="section-title">All campaigns (${campaigns.length})</div>
    ${campaigns.length ? campaigns.map(c => campaignCardHtml(c)).join('') : emptyState('🗺️', 'No campaigns yet', 'Tap "+ New Campaign" to start your first solo adventure.')}
  `;
  root.querySelector('#newCampaignBtn').onclick = () => openCampaignWizard();
  root.querySelectorAll('[data-campaign-id]').forEach(el => {
    el.onclick = () => Router.go('#/campaigns/' + el.getAttribute('data-campaign-id'));
  });
}

function openCampaignWizard() {
  const state = { name: '', description: '', rulesProfile: 'legacy', automationLevel: 'medium', aiDmEnabled: false, theme: getActiveTheme(), playMode: 'solo_party' };
  let step = 0;
  const steps = ['Basics', 'Rules', 'Automation', 'Play mode'];

  function render() {
    openModal(`
      <div class="stepper">${steps.map((_, i) => `<div class="dot ${i < step ? 'done' : i === step ? 'active' : ''}"></div>`).join('')}</div>
      <h2>${steps[step]}</h2>
      <div id="wizBody"></div>
      <div class="row" style="margin-top:1rem">
        ${step > 0 ? `<button class="btn block" id="wizBack">Back</button>` : `<button class="btn block" id="wizCancel">Cancel</button>`}
        <button class="btn primary block" id="wizNext">${step === steps.length - 1 ? 'Create Campaign' : 'Next'}</button>
      </div>
    `, (rootEl) => {
      const body = rootEl.querySelector('#wizBody');
      body.innerHTML = wizardStepHtml();
      wireWizardStep(body);
      const backBtn = rootEl.querySelector('#wizBack');
      if (backBtn) backBtn.onclick = () => { step--; render(); };
      const cancelBtn = rootEl.querySelector('#wizCancel');
      if (cancelBtn) cancelBtn.onclick = () => closeModal();
      rootEl.querySelector('#wizNext').onclick = async () => {
        if (step === 0 && !state.name.trim()) { toast('Give your campaign a name first.', 'danger'); return; }
        if (step < steps.length - 1) { step++; render(); return; }
        const campaign = makeCampaign(state);
        const errs = validateCampaign(campaign);
        if (errs.length) { toast(errs.join(' '), 'danger'); return; }
        await DB.put('campaigns', campaign);
        closeModal();
        toast('Campaign created.', 'success');
        Router.go('#/campaigns/' + campaign.id);
      };
    });
  }

  function wizardStepHtml() {
    if (step === 0) return `
      <div class="field"><label for="wfName">Campaign name</label><input type="text" id="wfName" value="${escapeHtml(state.name)}" placeholder="The Ashwake Reaches"></div>
      <div class="field"><label for="wfDesc">Description</label><textarea id="wfDesc" placeholder="A one or two line pitch for this campaign.">${escapeHtml(state.description)}</textarea></div>
    `;
    if (step === 1) return `
      <div class="field">
        <label>Rules profile</label>
        <div class="col">
          ${radioCard('rulesProfile', 'legacy', 'Legacy 5E-compatible', 'Classic-style rules baseline.', state.rulesProfile === 'legacy')}
          ${radioCard('rulesProfile', 'modern', 'Modern 5E-compatible', 'Updated-style rules baseline.', state.rulesProfile === 'modern')}
        </div>
      </div>
    `;
    if (step === 2) return `
      <div class="field">
        <label>Automation level</label>
        <div class="col">
          ${radioCard('automationLevel', 'light', 'Light', 'Dice, HP, notes — you make most rulings.', state.automationLevel === 'light')}
          ${radioCard('automationLevel', 'medium', 'Medium', 'Checks, attacks, saves, conditions auto-resolve.', state.automationLevel === 'medium')}
          ${radioCard('automationLevel', 'heavy', 'Heavy', 'Adds spell effects, AoE, movement enforcement.', state.automationLevel === 'heavy')}
        </div>
      </div>
      <div class="field row between" style="align-items:center">
        <label style="margin:0">Scripted AI DM</label>
        <button class="btn sm ${state.aiDmEnabled ? 'primary' : ''}" id="wfAiDm">${state.aiDmEnabled ? 'Enabled' : 'Disabled'}</button>
      </div>
    `;
    if (step === 3) return `
      <div class="field">
        <label>Play mode</label>
        <div class="col">
          ${PLAY_MODES.map(p => radioCard('playMode', p.id, p.label, '', state.playMode === p.id)).join('')}
        </div>
      </div>
    `;
    return '';
  }

  function radioCard(name, value, title, desc, checked) {
    return `
      <label class="card tap" style="margin-bottom:.5rem; ${checked ? 'border-color:var(--accent)' : ''}" data-radio="${name}" data-value="${value}">
        <div class="row between"><strong>${escapeHtml(title)}</strong>${checked ? '<span>✓</span>' : ''}</div>
        ${desc ? `<p style="margin:.2rem 0 0">${escapeHtml(desc)}</p>` : ''}
      </label>
    `;
  }

  function wireWizardStep(body) {
    if (step === 0) {
      body.querySelector('#wfName').oninput = (e) => { state.name = e.target.value; };
      body.querySelector('#wfDesc').oninput = (e) => { state.description = e.target.value; };
    }
    body.querySelectorAll('[data-radio]').forEach(el => {
      el.onclick = () => {
        const field = el.getAttribute('data-radio');
        state[field] = el.getAttribute('data-value');
        body.innerHTML = wizardStepHtml();
        wireWizardStep(body);
      };
    });
    const aiDmBtn = body.querySelector('#wfAiDm');
    if (aiDmBtn) aiDmBtn.onclick = () => { state.aiDmEnabled = !state.aiDmEnabled; body.innerHTML = wizardStepHtml(); wireWizardStep(body); };
  }

  render();
}

async function ScreenCampaignDetail(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }
  campaign.lastPlayedAt = nowIso();
  await DB.put('campaigns', campaign);

  const characters = await DB.getAllByIndex('characters', 'campaignId', campaignId);
  const playerChars = characters.filter(c => c.controlledBy === 'player');
  const botChars = characters.filter(c => c.controlledBy === 'bot');
  const bots = await DB.getAllByIndex('bots', 'campaignId', campaignId);
  const encounters = await DB.getAllByIndex('encounters', 'campaignId', campaignId);
  const activeEncounter = encounters.find(e => e.status === 'active');
  const currentMap = campaign.currentMapId ? await DB.get('maps', campaign.currentMapId) : null;
  const currentMapName = currentMap ? currentMap.name : null;

  root.innerHTML = `
    <div class="card">
      <div class="row between">
        <h2 style="margin:0">${escapeHtml(campaign.name)}</h2>
        <button class="icon-btn" id="editCampaignBtn">✎</button>
      </div>
      <p>${escapeHtml(campaign.description || 'No description yet.')}</p>
      <div class="row wrap">
        <span class="badge">${campaign.rulesProfile === 'legacy' ? 'Legacy rules' : 'Modern rules'}</span>
        <span class="badge accent">${campaign.automationLevel} automation</span>
        <span class="badge">${campaign.aiDmEnabled ? 'AI DM on' : 'AI DM off'}</span>
        ${currentMapName ? `<span class="badge">📍 ${escapeHtml(currentMapName)}</span>` : ''}
      </div>
    </div>

    <button class="btn primary block" id="enterTableBtn">▶ Enter Table</button>
    ${activeEncounter
      ? `<button class="btn danger block" id="resumeEncounterBtn">⚔ Resume Encounter: ${escapeHtml(activeEncounter.name)}</button>`
      : `<button class="btn block" id="startEncounterBtn">⚔ Start Encounter</button>`}
    <div class="row wrap" style="margin-top:.5rem">
      <button class="btn" id="mapsBtn">🗺 Maps</button>
      <button class="btn" id="dmDashboardBtn">🛡 DM Dashboard</button>
    </div>

    <div class="section-title">Your character${playerChars.length === 1 ? '' : 's'}</div>
    ${playerChars.length ? playerChars.map(c => characterCardHtml(c, campaignId)).join('') : emptyState('🧙', 'No player character yet')}
    <div class="row wrap">
      <button class="btn" id="newCharBtn">+ New Character</button>
      <button class="btn" id="importCharBtn">⇧ Import Character</button>
    </div>
    <input type="file" id="importCharFile" accept="application/json" style="display:none">

    <div class="section-title row between" style="align-items:center">
      <span>Bot party (${botChars.length})</span>
      ${botChars.length ? `<button class="icon-btn" id="botSettingsBtn" title="Bot Settings">⚙</button>` : ''}
    </div>
    ${botChars.length ? botChars.map(c => characterCardHtml(c, campaignId, bots.find(b => b.characterId === c.id))).join('') : emptyState('🤖', 'No bots yet', 'Generate a party to fill out your table.')}
    <div class="row wrap">
      <button class="btn" id="fillPartyBtn">⚡ Fill Party with Bots</button>
      <button class="btn" id="addOneBotBtn">+ Add One Bot</button>
    </div>

    <div class="section-title">Danger zone</div>
    <div class="row wrap">
      <button class="btn" id="exportCampaignBtn">Export JSON</button>
      <button class="btn danger" id="deleteCampaignBtn">Delete Campaign</button>
    </div>
    ${disclaimerFooter()}
  `;

  root.querySelector('#newCharBtn').onclick = () => Router.go(`#/campaigns/${campaignId}/characters/new`);
  root.querySelector('#enterTableBtn').onclick = () => Router.go(`#/campaigns/${campaignId}/table`);
  const startEncBtn = root.querySelector('#startEncounterBtn');
  if (startEncBtn) startEncBtn.onclick = () => Router.go(`#/campaigns/${campaignId}/encounters/new`);
  const resumeEncBtn = root.querySelector('#resumeEncounterBtn');
  if (resumeEncBtn) resumeEncBtn.onclick = () => Router.go(`#/campaigns/${campaignId}/encounters/${activeEncounter.id}`);
  root.querySelector('#mapsBtn').onclick = () => Router.go(`#/campaigns/${campaignId}/maps`);
  root.querySelector('#dmDashboardBtn').onclick = () => Router.go(`#/campaigns/${campaignId}/dm`);
  root.querySelectorAll('[data-character-id]').forEach(el => {
    el.onclick = () => Router.go(`#/campaigns/${campaignId}/characters/${el.getAttribute('data-character-id')}`);
  });
  root.querySelector('#editCampaignBtn').onclick = () => openCampaignEditModal(campaign);
  root.querySelector('#exportCampaignBtn').onclick = () => exportCampaignJson(campaignId);
  const botSettingsBtn = root.querySelector('#botSettingsBtn');
  if (botSettingsBtn) botSettingsBtn.onclick = () => Router.go(`#/campaigns/${campaignId}/bots`);
  root.querySelector('#fillPartyBtn').onclick = async () => {
    const target = clamp(4 - botChars.length, 1, 4);
    await fillBotParty(campaignId, target);
    toast(`Added ${target} bot${target === 1 ? '' : 's'} to the party.`, 'success');
    Router.render();
  };
  root.querySelector('#addOneBotBtn').onclick = async () => {
    await createBot(campaignId);
    toast('Bot added.', 'success');
    Router.render();
  };
  root.querySelector('#importCharBtn').onclick = () => root.querySelector('#importCharFile').click();
  root.querySelector('#importCharFile').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const imported = { ...parsed, id: uid(), campaignId, createdAt: nowIso(), updatedAt: nowIso() };
      const errs = validateCharacter(imported);
      if (errs.length) { toast('Import failed: ' + errs.join(' '), 'danger'); return; }
      await DB.put('characters', imported);
      toast(`Imported "${imported.name}".`, 'success');
      Router.render();
    } catch (err) {
      toast('Import failed: file is not valid character JSON.', 'danger');
    }
    e.target.value = '';
  };
  root.querySelector('#deleteCampaignBtn').onclick = async () => {
    const doExport = await confirmDialog(`Export a backup of "${campaign.name}" before deleting?`, { okLabel: 'Export first' });
    if (doExport) await exportCampaignJson(campaignId);
    const reallyDelete = await confirmDialog(`Permanently delete "${campaign.name}" and all its data?`, { okLabel: 'Delete', danger: true });
    if (!reallyDelete) return;
    for (const c of characters) await DB.delete('characters', c.id);
    await DB.delete('campaigns', campaignId);
    toast('Campaign deleted.', 'success');
    Router.go('#/campaigns');
  };
}

function characterCardHtml(c, campaignId, bot) {
  return `
    <div class="card tap" data-character-id="${c.id}">
      <div class="row between">
        <h3 style="margin:0">${escapeHtml(c.name || 'Unnamed')}</h3>
        <span class="badge">Lv ${c.level}</span>
      </div>
      <p style="margin:.3rem 0 0">${escapeHtml([c.species, c.class].filter(Boolean).join(' · ') || 'Species / class not set')}</p>
      <div class="row wrap" style="margin-top:.4rem">
        <span class="badge">HP ${c.hp.current}/${c.hp.max}</span>
        <span class="badge">AC ${c.ac}</span>
        ${c.controlledBy === 'bot' ? `<span class="badge accent">Bot</span>` : ''}
        ${bot ? `<span class="badge">${escapeHtml(bot.temperament)}</span><span class="badge">${escapeHtml(COMBAT_STYLE_INFO[bot.combatStyle].label)} AI</span>` : ''}
      </div>
    </div>
  `;
}

function openCampaignEditModal(campaign) {
  openModal(`
    <h2>Edit Campaign</h2>
    <div class="field"><label for="ecName">Name</label><input type="text" id="ecName" value="${escapeHtml(campaign.name)}"></div>
    <div class="field"><label for="ecDesc">Description</label><textarea id="ecDesc">${escapeHtml(campaign.description || '')}</textarea></div>
    <div class="field">
      <label for="ecAuto">Automation level</label>
      <select id="ecAuto">
        ${AUTOMATION_LEVELS.map(a => `<option value="${a}" ${campaign.automationLevel === a ? 'selected' : ''}>${a}</option>`).join('')}
      </select>
    </div>
    <div class="field row between" style="align-items:center">
      <label style="margin:0">Scripted AI DM</label>
      <button class="btn sm ${campaign.aiDmEnabled ? 'primary' : ''}" id="ecAiDm">${campaign.aiDmEnabled ? 'Enabled' : 'Disabled'}</button>
    </div>
    <div class="row" style="margin-top:1rem">
      <button class="btn block" id="ecCancel">Cancel</button>
      <button class="btn primary block" id="ecSave">Save</button>
    </div>
  `, (rootEl) => {
    let aiDm = campaign.aiDmEnabled;
    rootEl.querySelector('#ecAiDm').onclick = (e) => { aiDm = !aiDm; e.target.textContent = aiDm ? 'Enabled' : 'Disabled'; e.target.classList.toggle('primary', aiDm); };
    rootEl.querySelector('#ecCancel').onclick = closeModal;
    rootEl.querySelector('#ecSave').onclick = async () => {
      campaign.name = rootEl.querySelector('#ecName').value.trim() || campaign.name;
      campaign.description = rootEl.querySelector('#ecDesc').value;
      campaign.automationLevel = rootEl.querySelector('#ecAuto').value;
      campaign.aiDmEnabled = aiDm;
      campaign.updatedAt = nowIso();
      await DB.put('campaigns', campaign);
      closeModal();
      Router.render();
      toast('Campaign updated.', 'success');
    };
  });
}

// exportCampaignJson (full backup) is now defined in 06d-backup.js.
