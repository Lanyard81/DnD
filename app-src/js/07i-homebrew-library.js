/* ---- Homebrew library (generic schema-driven list/form for all content types) ---- */
async function ScreenHomebrewLibrary(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }
  const types = Object.keys(HOMEBREW_SCHEMAS);
  let activeType = types[0];

  async function render() {
    const schema = HOMEBREW_SCHEMAS[activeType];
    const rows = (await DB.getAllByIndex(schema.store, 'campaignId', campaignId));
    root.innerHTML = `
      <p class="hint">Homebrew content you create here is original to your campaign and can be used in character creation, encounters, and loot — no official content included.</p>
      <div class="row wrap" style="margin-bottom:.8rem">
        <button class="btn sm" id="exportPackBtn">⇩ Export Content Pack</button>
        <button class="btn sm" id="importPackBtn">⇧ Import Content Pack</button>
      </div>
      <input type="file" id="importPackFile" accept="application/json" style="display:none">
      <div class="tabbar">${types.map(t => `<button data-type="${t}" class="${t === activeType ? 'active' : ''}">${HOMEBREW_SCHEMAS[t].icon} ${HOMEBREW_SCHEMAS[t].label}</button>`).join('')}</div>
      ${rows.length ? rows.map(r => `
        <div class="card tap" data-entity-id="${r.id}">
          <div class="row between">
            <strong>${escapeHtml(r.name || 'Untitled')}</strong>
            <button class="icon-btn" data-entity-delete="${r.id}" style="width:32px;height:32px;font-size:1rem">✕</button>
          </div>
          ${r.description ? `<p style="margin:.3rem 0 0">${escapeHtml((r.description || '').slice(0, 120))}${(r.description || '').length > 120 ? '…' : ''}</p>` : ''}
        </div>
      `).join('') : emptyState(schema.icon, `No ${schema.label.toLowerCase()} yet`, 'Create one below.')}
      <button class="btn primary block" id="newEntityBtn">+ New ${escapeHtml(schema.label.replace(/s$/, ''))}</button>
    `;
    root.querySelectorAll('[data-type]').forEach(b => b.onclick = () => { activeType = b.getAttribute('data-type'); render(); });
    root.querySelectorAll('[data-entity-id]').forEach(el => el.onclick = async (e) => {
      if (e.target.closest('[data-entity-delete]')) return;
      const row = await DB.get(schema.store, el.getAttribute('data-entity-id'));
      openEntityForm(schema, row);
    });
    root.querySelectorAll('[data-entity-delete]').forEach(el => el.onclick = async (e) => {
      e.stopPropagation();
      const ok = await confirmDialog('Delete this entry?', { okLabel: 'Delete', danger: true });
      if (!ok) return;
      await DB.delete(schema.store, el.getAttribute('data-entity-delete'));
      render();
    });
    root.querySelector('#newEntityBtn').onclick = () => openEntityForm(schema, null);
    root.querySelector('#exportPackBtn').onclick = () => exportContentPack(campaignId);
    root.querySelector('#importPackBtn').onclick = () => root.querySelector('#importPackFile').click();
    root.querySelector('#importPackFile').onchange = async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      await importContentPackFile(campaignId, file);
      render();
    };
  }

  function openEntityForm(schema, existing) {
    let data = existing ? { ...existing } : schema.blank();
    if (existing && schema.onLoad) data = schema.onLoad(existing);
    data.campaignId = campaignId;

    openModal(`
      <h2>${existing ? 'Edit' : 'New'} ${escapeHtml(schema.label.replace(/s$/, ''))}</h2>
      <div id="entityFormBody"></div>
      <div class="row" style="margin-top:1rem">
        <button class="btn block" id="efCancel">Cancel</button>
        <button class="btn primary block" id="efSave">Save</button>
      </div>
    `, (rootEl) => {
      const body = rootEl.querySelector('#entityFormBody');
      body.innerHTML = schema.fields.map(f => fieldHtml(f, data[f.key])).join('');
      schema.fields.forEach(f => {
        const el = body.querySelector(`[data-field="${f.key}"]`);
        el.oninput = () => { data[f.key] = f.type === 'number' ? (parseFloat(el.value) || 0) : el.value; };
      });
      rootEl.querySelector('#efCancel').onclick = closeModal;
      rootEl.querySelector('#efSave').onclick = async () => {
        const errs = validateSchemaEntity(schema, data);
        if (errs.length) { toast(errs.join(' '), 'danger'); return; }
        let toSave = schema.onSave ? schema.onSave(data) : data;
        toSave.id = existing ? existing.id : (toSave.id || uid());
        toSave.campaignId = campaignId;
        await DB.put(schema.store, toSave);
        closeModal();
        toast('Saved.', 'success');
        render();
      };
    });
  }

  function fieldHtml(f, value) {
    if (f.type === 'select') return `
      <div class="field"><label>${escapeHtml(f.label)}</label>
        <select data-field="${f.key}">${f.options.map(o => `<option value="${o}" ${value === o ? 'selected' : ''}>${o}</option>`).join('')}</select>
      </div>`;
    if (f.type === 'textarea') return `
      <div class="field"><label>${escapeHtml(f.label)}</label><textarea data-field="${f.key}">${escapeHtml(value || '')}</textarea></div>`;
    return `
      <div class="field"><label>${escapeHtml(f.label)}${f.required ? ' *' : ''}</label>
        <input type="${f.type === 'number' ? 'number' : 'text'}" data-field="${f.key}" value="${escapeHtml(value ?? '')}">
      </div>`;
  }

  render();
}
