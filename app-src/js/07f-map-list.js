/* ---- Map list ---- */
async function ScreenMapList(root, campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  if (!campaign) { root.innerHTML = emptyState('❓', 'Campaign not found'); return; }
  const maps = await DB.getAllByIndex('maps', 'campaignId', campaignId);
  root.innerHTML = `
    ${maps.length > 1 ? `<p class="hint">Travel switches which map is "current" and logs the journey — handy when a campaign spans more than one place.</p>` : ''}
    ${maps.length ? maps.map(m => `
      <div class="card">
        <div class="row between">
          <h3 class="tap" data-map-open="${m.id}" style="margin:0;cursor:pointer">${escapeHtml(m.name)}</h3>
          <span class="badge">${m.cols}×${m.rows}</span>
        </div>
        <div class="row between" style="margin-top:.5rem;align-items:center">
          ${campaign.currentMapId === m.id ? `<span class="badge accent">📍 Currently here</span>` : `<button class="btn sm" data-travel-to="${m.id}">🧭 Travel Here</button>`}
        </div>
      </div>
    `).join('') : emptyState('🗺️', 'No maps yet', 'Create one to place tokens and run grid combat.')}
    <button class="btn primary block" id="newMapBtn">+ New Map</button>
  `;
  root.querySelectorAll('[data-map-open]').forEach(el => el.onclick = () => Router.go(`#/campaigns/${campaignId}/maps/${el.getAttribute('data-map-open')}`));
  root.querySelectorAll('[data-travel-to]').forEach(el => el.onclick = async () => {
    const mapId = el.getAttribute('data-travel-to');
    const map = maps.find(m => m.id === mapId);
    const ok = await confirmDialog(`Travel to "${map.name}"?`, { okLabel: 'Travel' });
    if (!ok) return;
    campaign.currentMapId = mapId;
    campaign.updatedAt = nowIso();
    await DB.put('campaigns', campaign);
    await DB.put('log_entries', makeLogEntry({ campaignId, type: 'narration', speakerType: 'system', text: `The party travels to ${map.name}.` }));
    await addCampaignRecentEvent(campaignId, `Traveled to ${map.name}.`);
    toast(`Now at ${map.name}.`, 'success');
    Router.go(`#/campaigns/${campaignId}/maps/${mapId}`);
  });
  root.querySelector('#newMapBtn').onclick = () => {
    openModal(`
      <h2>New Map</h2>
      <div class="field"><label for="nmName">Name</label><input type="text" id="nmName" placeholder="The Sunken Crypt"></div>
      <div class="grid2">
        <div class="field"><label for="nmCols">Columns</label><input type="number" id="nmCols" value="12" min="4" max="30"></div>
        <div class="field"><label for="nmRows">Rows</label><input type="number" id="nmRows" value="10" min="4" max="30"></div>
      </div>
      ${FEATURE_FLAGS.hexGrid ? `
        <div class="field">
          <label>Grid type</label>
          <select id="nmGridType">
            <option value="square">Square</option>
            <option value="hex">Hex</option>
          </select>
        </div>
      ` : ''}
      <div class="row" style="margin-top:1rem">
        <button class="btn block" id="nmCancel">Cancel</button>
        <button class="btn primary block" id="nmCreate">Create</button>
      </div>
    `, (rootEl) => {
      rootEl.querySelector('#nmCancel').onclick = closeModal;
      rootEl.querySelector('#nmCreate').onclick = async () => {
        const name = rootEl.querySelector('#nmName').value.trim() || 'Map';
        const cols = clamp(parseInt(rootEl.querySelector('#nmCols').value) || 12, 4, 30);
        const rows = clamp(parseInt(rootEl.querySelector('#nmRows').value) || 10, 4, 30);
        const gridTypeSel = rootEl.querySelector('#nmGridType');
        const gridType = gridTypeSel ? gridTypeSel.value : 'square';
        const map = makeMap({ campaignId, name, cols, rows, gridType });
        await DB.put('maps', map);
        closeModal();
        Router.go(`#/campaigns/${campaignId}/maps/${map.id}`);
      };
    });
  };
}
