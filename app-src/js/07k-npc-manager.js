/* ---- NPC manager ---- */
async function ScreenNpcManager(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }
  let search = '';

  async function render() {
    const allNpcs = await DB.getAllByIndex('npcs', 'campaignId', campaignId);
    const q = search.trim().toLowerCase();
    const npcs = q ? allNpcs.filter(n => n.name.toLowerCase().includes(q) || (n.role || '').toLowerCase().includes(q)) : allNpcs;
    const mem = await getOrCreateCampaignMemory(campaignId);
    root.innerHTML = `
      ${allNpcs.length > 4 ? `<input type="search" id="npcSearch" placeholder="Search NPCs…" value="${escapeHtml(search)}" style="margin-bottom:.7rem">` : ''}
      ${!npcs.length && q ? emptyState('🔍', 'No matches', `Nothing matches "${search}".`) : ''}
      ${npcs.map(n => {
        const standing = mem.npcStanding[n.id] || 0;
        return `
        <div class="card">
          <div class="row between">
            <strong>${escapeHtml(n.name)}</strong>
            <button class="icon-btn" data-npc-delete="${n.id}" style="width:32px;height:32px;font-size:1rem">✕</button>
          </div>
          <p style="margin:.3rem 0 0">${escapeHtml(n.role || 'No role set')}${n.traits ? ` · ${escapeHtml(n.traits)}` : ''}</p>
          <div class="row between" style="margin-top:.5rem;align-items:center">
            <label class="hint" style="margin:0">Standing: ${standing}</label>
            <div class="row" style="gap:.3rem">
              <button class="btn sm" data-npc-standing="${n.id}|-10">−</button>
              <button class="btn sm" data-npc-standing="${n.id}|10">+</button>
              <button class="btn sm" data-npc-hidden="${n.id}">${n.isHidden ? '🙈 Hidden' : '👁 Visible'}</button>
            </div>
          </div>
        </div>
      `; }).join('')}
      ${!allNpcs.length ? emptyState('🎭', 'No NPCs yet', 'Introduce one from the scripted DM panel, or add one manually.') : ''}
      <button class="btn primary block" id="newNpcBtn">+ New NPC</button>
    `;
    const searchInput = root.querySelector('#npcSearch');
    if (searchInput) searchInput.oninput = async (e) => {
      search = e.target.value;
      const caret = e.target.selectionStart;
      await render();
      const el = root.querySelector('#npcSearch');
      if (el) { el.focus(); el.setSelectionRange(caret, caret); }
    };
    root.querySelectorAll('[data-npc-delete]').forEach(el => el.onclick = async () => {
      const ok = await confirmDialog('Delete this NPC?', { okLabel: 'Delete', danger: true });
      if (!ok) return;
      await DB.delete('npcs', el.getAttribute('data-npc-delete'));
      render();
    });
    root.querySelectorAll('[data-npc-standing]').forEach(el => el.onclick = async () => {
      const [id, delta] = el.getAttribute('data-npc-standing').split('|');
      await setNpcStanding(campaignId, id, parseInt(delta));
      render();
    });
    root.querySelectorAll('[data-npc-hidden]').forEach(el => el.onclick = async () => {
      const npc = await DB.get('npcs', el.getAttribute('data-npc-hidden'));
      npc.isHidden = !npc.isHidden;
      await DB.put('npcs', npc);
      render();
    });
    root.querySelector('#newNpcBtn').onclick = () => openNpcForm(null);
  }

  function openNpcForm(existing) {
    const data = existing ? { ...existing } : { id: uid(), campaignId, name: '', role: '', traits: '', speakingStyle: '', disposition: 0, locationId: null, statBlockId: null, dialogueBankId: null, isHidden: false, notes: '' };
    openModal(`
      <h2>${existing ? 'Edit' : 'New'} NPC</h2>
      <div class="field"><label>Name</label><input type="text" id="npcName" value="${escapeHtml(data.name)}"></div>
      <div class="field"><label>Role</label><input type="text" id="npcRole" value="${escapeHtml(data.role)}"></div>
      <div class="field"><label>Traits / quirk</label><input type="text" id="npcTraits" value="${escapeHtml(data.traits)}"></div>
      <div class="field"><label>Notes</label><textarea id="npcNotes">${escapeHtml(data.notes)}</textarea></div>
      <div class="row" style="margin-top:1rem">
        <button class="btn block" id="npcCancel">Cancel</button>
        <button class="btn primary block" id="npcSave">Save</button>
      </div>
    `, (rootEl) => {
      rootEl.querySelector('#npcCancel').onclick = closeModal;
      rootEl.querySelector('#npcSave').onclick = async () => {
        data.name = rootEl.querySelector('#npcName').value.trim();
        if (!data.name) { toast('Give the NPC a name.', 'danger'); return; }
        data.role = rootEl.querySelector('#npcRole').value.trim();
        data.traits = rootEl.querySelector('#npcTraits').value.trim();
        data.notes = rootEl.querySelector('#npcNotes').value;
        await DB.put('npcs', data);
        closeModal();
        render();
      };
    });
  }

  render();
}
