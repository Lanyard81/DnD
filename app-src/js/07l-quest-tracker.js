/* ---- Quest tracker ---- */
async function ScreenQuestTracker(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }
  const QUEST_STATUSES = ['not_started', 'active', 'completed', 'failed'];
  let search = '';

  async function render() {
    const allQuests = await DB.getAllByIndex('quests', 'campaignId', campaignId);
    const objectives = await DB.getAllByIndex('quest_objectives', 'campaignId', campaignId);
    const q2 = search.trim().toLowerCase();
    const quests = q2 ? allQuests.filter(q => q.title.toLowerCase().includes(q2) || (q.summary || '').toLowerCase().includes(q2)) : allQuests;
    root.innerHTML = `
      ${allQuests.length > 4 ? `<input type="search" id="questSearch" placeholder="Search quests…" value="${escapeHtml(search)}" style="margin-bottom:.7rem">` : ''}
      ${!quests.length && q2 ? emptyState('🔍', 'No matches', `Nothing matches "${search}".`) : ''}
      ${quests.map(q => {
        const objs = objectives.filter(o => o.questId === q.id);
        return `
        <div class="card">
          <div class="row between">
            <strong>${escapeHtml(q.title)}</strong>
            <button class="icon-btn" data-quest-delete="${q.id}" style="width:32px;height:32px;font-size:1rem">✕</button>
          </div>
          <p style="margin:.3rem 0 0">${escapeHtml(q.summary || '')}</p>
          <div class="field" style="margin-top:.5rem">
            <select data-quest-status="${q.id}">
              ${QUEST_STATUSES.map(s => `<option value="${s}" ${q.status === s ? 'selected' : ''}>${s.replace('_', ' ')}</option>`).join('')}
            </select>
          </div>
          ${objs.length ? `
            <div class="chip-list">
              ${objs.map(o => `<span class="chip" data-obj-toggle="${o.id}" style="cursor:pointer;${o.status === 'complete' ? 'text-decoration:line-through;opacity:.6' : ''}">${escapeHtml(o.text)}</span>`).join('')}
            </div>
          ` : ''}
          <div class="list-add-row"><input type="text" data-obj-input="${q.id}" placeholder="Add objective"><button class="btn sm" data-obj-add="${q.id}">Add</button></div>
        </div>
      `; }).join('')}
      ${!allQuests.length ? emptyState('📜', 'No quests yet', 'Generate one from the scripted DM panel, or add one manually.') : ''}
      <button class="btn primary block" id="newQuestBtn">+ New Quest</button>
    `;
    const searchInput = root.querySelector('#questSearch');
    if (searchInput) searchInput.oninput = async (e) => {
      search = e.target.value;
      const caret = e.target.selectionStart;
      await render();
      const el = root.querySelector('#questSearch');
      if (el) { el.focus(); el.setSelectionRange(caret, caret); }
    };
    root.querySelectorAll('[data-quest-delete]').forEach(el => el.onclick = async () => {
      const ok = await confirmDialog('Delete this quest?', { okLabel: 'Delete', danger: true });
      if (!ok) return;
      await DB.delete('quests', el.getAttribute('data-quest-delete'));
      for (const o of objectives.filter(o => o.questId === el.getAttribute('data-quest-delete'))) await DB.delete('quest_objectives', o.id);
      render();
    });
    root.querySelectorAll('[data-quest-status]').forEach(el => el.onchange = async () => {
      const q = await DB.get('quests', el.getAttribute('data-quest-status'));
      q.status = el.value;
      q.updatedAt = nowIso();
      await DB.put('quests', q);
    });
    root.querySelectorAll('[data-obj-toggle]').forEach(el => el.onclick = async () => {
      const o = await DB.get('quest_objectives', el.getAttribute('data-obj-toggle'));
      o.status = o.status === 'complete' ? 'pending' : 'complete';
      await DB.put('quest_objectives', o);
      render();
    });
    root.querySelectorAll('[data-obj-add]').forEach(el => el.onclick = async () => {
      const questId = el.getAttribute('data-obj-add');
      const input = root.querySelector(`[data-obj-input="${questId}"]`);
      if (!input.value.trim()) return;
      await DB.put('quest_objectives', { id: uid(), questId, campaignId, text: input.value.trim(), status: 'pending', order: objectives.filter(o => o.questId === questId).length });
      render();
    });
    root.querySelector('#newQuestBtn').onclick = () => {
      openModal(`
        <h2>New Quest</h2>
        <div class="field"><label>Title</label><input type="text" id="qTitle"></div>
        <div class="field"><label>Summary</label><textarea id="qSummary"></textarea></div>
        <div class="row" style="margin-top:1rem">
          <button class="btn block" id="qCancel">Cancel</button>
          <button class="btn primary block" id="qSave">Save</button>
        </div>
      `, (rootEl) => {
        rootEl.querySelector('#qCancel').onclick = closeModal;
        rootEl.querySelector('#qSave').onclick = async () => {
          const title = rootEl.querySelector('#qTitle').value.trim();
          if (!title) { toast('Give the quest a title.', 'danger'); return; }
          const ts = nowIso();
          await DB.put('quests', { id: uid(), campaignId, title, summary: rootEl.querySelector('#qSummary').value, status: 'active', giverNpcId: null, rewardLootTableId: null, createdAt: ts, updatedAt: ts });
          closeModal();
          render();
        };
      });
    };
  }

  render();
}
