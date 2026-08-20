/* ---- Journal & lore (includes the hidden DM screen: private journal entries) ---- */
async function ScreenJournalLore(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }
  let tab = 'journal';
  let journalSearch = '';
  let loreSearch = '';

  async function render() {
    root.innerHTML = `
      <div class="tabbar">
        <button data-jl-tab="journal" class="${tab === 'journal' ? 'active' : ''}">📔 Journal</button>
        <button data-jl-tab="lore" class="${tab === 'lore' ? 'active' : ''}">🌍 Lore Pages</button>
      </div>
      <div id="jlBody"></div>
    `;
    root.querySelectorAll('[data-jl-tab]').forEach(b => b.onclick = () => { tab = b.getAttribute('data-jl-tab'); render(); });
    const body = root.querySelector('#jlBody');
    if (tab === 'journal') await renderJournal(body); else await renderLore(body);
  }

  async function renderJournal(body) {
    const allEntries = (await DB.getAllByIndex('journal_entries', 'campaignId', campaignId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const jq = journalSearch.trim().toLowerCase();
    const entries = jq ? allEntries.filter(e => e.title.toLowerCase().includes(jq) || (e.body || '').toLowerCase().includes(jq)) : allEntries;
    body.innerHTML = `
      <p class="hint">Entries marked "DM only" are your hidden DM screen — they never show in the player-facing log.</p>
      <input type="file" id="mdImportFile" accept=".md,text/markdown" style="display:none">
      <button class="btn block" id="mdImportBtn" style="margin-bottom:.8rem">⇧ Import Markdown as Entry</button>
      ${allEntries.length > 4 ? `<input type="search" id="journalSearch" placeholder="Search journal…" value="${escapeHtml(journalSearch)}" style="margin-bottom:.7rem">` : ''}
      ${!entries.length && jq ? emptyState('🔍', 'No matches', `Nothing matches "${journalSearch}".`) : ''}
      ${entries.map(e => `
        <div class="card">
          <div class="row between">
            <strong>${escapeHtml(e.title)}</strong>
            <div class="row" style="gap:.3rem">
              ${e.isPrivateDM ? `<span class="badge accent">DM only</span>` : ''}
              <button class="icon-btn" data-journal-delete="${e.id}" style="width:28px;height:28px;font-size:1rem">✕</button>
            </div>
          </div>
          <p style="margin:.3rem 0 0;white-space:pre-wrap">${escapeHtml((e.body || '').slice(0, 300))}${(e.body || '').length > 300 ? '…' : ''}</p>
        </div>
      `).join('')}
      ${!allEntries.length ? emptyState('📔', 'No journal entries yet') : ''}
      <button class="btn primary block" id="newJournalBtn">+ New Entry</button>
    `;
    const jSearchInput = body.querySelector('#journalSearch');
    if (jSearchInput) jSearchInput.oninput = async (e) => {
      journalSearch = e.target.value;
      const caret = e.target.selectionStart;
      await renderJournal(body);
      const el = body.querySelector('#journalSearch');
      if (el) { el.focus(); el.setSelectionRange(caret, caret); }
    };
    body.querySelector('#mdImportBtn').onclick = () => body.querySelector('#mdImportFile').click();
    body.querySelector('#mdImportFile').onchange = async (e) => {
      const file = e.target.files[0];
      if (file) await importMarkdownAsJournalEntry(campaignId, file);
      e.target.value = '';
      render();
    };
    body.querySelectorAll('[data-journal-delete]').forEach(el => el.onclick = async () => {
      const ok = await confirmDialog('Delete this entry?', { okLabel: 'Delete', danger: true });
      if (!ok) return;
      await DB.delete('journal_entries', el.getAttribute('data-journal-delete'));
      render();
    });
    body.querySelector('#newJournalBtn').onclick = () => openJournalForm(null);
  }

  function openJournalForm(existing) {
    const data = existing ? { ...existing } : { id: uid(), campaignId, title: '', body: '', tags: [], isPrivateDM: false, createdAt: nowIso() };
    openModal(`
      <h2>${existing ? 'Edit' : 'New'} Journal Entry</h2>
      <div class="field"><label>Title</label><input type="text" id="jTitle" value="${escapeHtml(data.title)}"></div>
      <div class="field"><label>Body (Markdown)</label><textarea id="jBody" style="min-height:8em">${escapeHtml(data.body)}</textarea></div>
      <div class="field row between" style="align-items:center">
        <label style="margin:0">DM only (hidden from players)</label>
        <button class="btn sm ${data.isPrivateDM ? 'primary' : ''}" id="jPrivate">${data.isPrivateDM ? 'Yes' : 'No'}</button>
      </div>
      <div class="row" style="margin-top:1rem">
        <button class="btn block" id="jCancel">Cancel</button>
        <button class="btn primary block" id="jSave">Save</button>
      </div>
    `, (rootEl) => {
      let priv = data.isPrivateDM;
      rootEl.querySelector('#jPrivate').onclick = (e) => { priv = !priv; e.target.textContent = priv ? 'Yes' : 'No'; e.target.classList.toggle('primary', priv); };
      rootEl.querySelector('#jCancel').onclick = closeModal;
      rootEl.querySelector('#jSave').onclick = async () => {
        data.title = rootEl.querySelector('#jTitle').value.trim() || 'Untitled';
        data.body = rootEl.querySelector('#jBody').value;
        data.isPrivateDM = priv;
        await DB.put('journal_entries', data);
        closeModal();
        render();
      };
    });
  }

  async function renderLore(body) {
    const allPages = (await DB.getAllByIndex('lore_pages', 'campaignId', campaignId)).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    const lq = loreSearch.trim().toLowerCase();
    const pages = lq ? allPages.filter(p => p.title.toLowerCase().includes(lq) || (p.category || '').toLowerCase().includes(lq) || (p.body || '').toLowerCase().includes(lq)) : allPages;
    body.innerHTML = `
      ${allPages.length > 4 ? `<input type="search" id="loreSearch" placeholder="Search lore…" value="${escapeHtml(loreSearch)}" style="margin-bottom:.7rem">` : ''}
      ${!pages.length && lq ? emptyState('🔍', 'No matches', `Nothing matches "${loreSearch}".`) : ''}
      ${pages.map(p => `
        <div class="card">
          <div class="row between">
            <strong>${escapeHtml(p.title)}</strong>
            <button class="icon-btn" data-lore-delete="${p.id}" style="width:28px;height:28px;font-size:1rem">✕</button>
          </div>
          <p class="hint" style="margin:.2rem 0 .3rem">${escapeHtml(p.category || 'Uncategorized')}</p>
          <p style="margin:0;white-space:pre-wrap">${escapeHtml((p.body || '').slice(0, 300))}${(p.body || '').length > 300 ? '…' : ''}</p>
        </div>
      `).join('')}
      ${!allPages.length ? emptyState('🌍', 'No lore pages yet', 'Use these for locations, factions, history — anything worth remembering.') : ''}
      <button class="btn primary block" id="newLoreBtn">+ New Lore Page</button>
    `;
    const lSearchInput = body.querySelector('#loreSearch');
    if (lSearchInput) lSearchInput.oninput = async (e) => {
      loreSearch = e.target.value;
      const caret = e.target.selectionStart;
      await renderLore(body);
      const el = body.querySelector('#loreSearch');
      if (el) { el.focus(); el.setSelectionRange(caret, caret); }
    };
    body.querySelectorAll('[data-lore-delete]').forEach(el => el.onclick = async () => {
      const ok = await confirmDialog('Delete this lore page?', { okLabel: 'Delete', danger: true });
      if (!ok) return;
      await DB.delete('lore_pages', el.getAttribute('data-lore-delete'));
      render();
    });
    body.querySelector('#newLoreBtn').onclick = () => {
      openModal(`
        <h2>New Lore Page</h2>
        <div class="field"><label>Title</label><input type="text" id="lTitle"></div>
        <div class="field"><label>Category</label><input type="text" id="lCategory" placeholder="Location, faction, history…"></div>
        <div class="field"><label>Body</label><textarea id="lBody" style="min-height:8em"></textarea></div>
        <div class="row" style="margin-top:1rem">
          <button class="btn block" id="lCancel">Cancel</button>
          <button class="btn primary block" id="lSave">Save</button>
        </div>
      `, (rootEl) => {
        rootEl.querySelector('#lCancel').onclick = closeModal;
        rootEl.querySelector('#lSave').onclick = async () => {
          const title = rootEl.querySelector('#lTitle').value.trim();
          if (!title) { toast('Give the page a title.', 'danger'); return; }
          const ts = nowIso();
          await DB.put('lore_pages', { id: uid(), campaignId, title, category: rootEl.querySelector('#lCategory').value.trim(), body: rootEl.querySelector('#lBody').value, createdAt: ts, updatedAt: ts });
          closeModal();
          render();
        };
      });
    };
  }

  render();
}
