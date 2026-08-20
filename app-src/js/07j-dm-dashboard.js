/* ---- DM dashboard (hub) ---- */
async function ScreenDmDashboard(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }
  const tools = [
    { icon: '🎭', label: 'NPC Manager', hash: `#/campaigns/${campaignId}/npcs` },
    { icon: '📜', label: 'Quest Tracker', hash: `#/campaigns/${campaignId}/quests` },
    { icon: '📖', label: 'Journal & Lore', hash: `#/campaigns/${campaignId}/journal` },
    { icon: '🖼', label: 'Handouts', hash: `#/campaigns/${campaignId}/handouts` },
    { icon: '⭐', label: 'XP & Loot', hash: `#/campaigns/${campaignId}/xp` },
    { icon: '🕰', label: 'Timeline', hash: `#/campaigns/${campaignId}/timeline` },
    { icon: '📚', label: 'Homebrew Library', hash: `#/campaigns/${campaignId}/library` },
    { icon: '⚔', label: 'Encounter Builder', hash: `#/campaigns/${campaignId}/encounters/new` },
    { icon: '🗺', label: 'Maps', hash: `#/campaigns/${campaignId}/maps` },
    { icon: '🤖', label: 'Bot Settings', hash: `#/campaigns/${campaignId}/bots` }
  ];
  root.innerHTML = `
    <p class="hint">Everything here works whether you're DMing yourself or letting the scripted DM run the table from the Table screen.</p>
    <button class="btn block" id="loadAdventureBtn" style="margin-bottom:.8rem">📥 Load a Sample Adventure</button>
    ${tools.map(t => `<div class="card tap" data-go="${t.hash}"><div class="row between"><span>${t.icon} ${escapeHtml(t.label)}</span><span>›</span></div></div>`).join('')}
  `;
  root.querySelectorAll('[data-go]').forEach(el => el.onclick = () => Router.go(el.getAttribute('data-go')));
  root.querySelector('#loadAdventureBtn').onclick = () => {
    openModal(`
      <h2>Load a Sample Adventure</h2>
      <p class="hint">Adds NPCs, locations, a quest, and monsters for that adventure's encounter into this campaign. Safe to load more than one.</p>
      <div class="col">
        ${SAMPLE_ADVENTURES.map(a => `
          <div class="card tap" data-adventure="${a.id}">
            <div class="row between"><strong>${escapeHtml(a.title)}</strong><span class="badge">${a.type}</span></div>
            <p style="margin:.3rem 0 0">${escapeHtml(a.premise)}</p>
          </div>
        `).join('')}
      </div>
      <button class="btn block" id="advCancel" style="margin-top:.6rem">Cancel</button>
    `, (rootEl) => {
      rootEl.querySelector('#advCancel').onclick = closeModal;
      rootEl.querySelectorAll('[data-adventure]').forEach(el => el.onclick = async () => {
        const summary = await loadSampleAdventure(campaignId, el.getAttribute('data-adventure'));
        closeModal();
        toast(`Loaded "${summary.questTitle}" — ${summary.npcCount} NPCs, ${summary.locationCount} locations, ${summary.monsterCount} monsters added.`, 'success');
      });
    });
  };
}
