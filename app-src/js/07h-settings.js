/* ---- Settings ---- */
function getActiveTheme() {
  return localStorage.getItem('ft_theme') || 'dark_fantasy';
}
function applyTheme(themeId) {
  document.documentElement.setAttribute('data-theme', themeId);
  localStorage.setItem('ft_theme', themeId);
}

async function ScreenSettings(root) {
  const current = getActiveTheme();
  root.innerHTML = `
    <div class="section-title">Theme</div>
    <div class="theme-swatch-row">
      ${THEMES.map(t => `
        <div class="theme-swatch ${current === t.id ? 'selected' : ''}" data-theme-pick="${t.id}">
          <div class="sw-preview">${t.swatches.map(c => `<span style="background:${c}"></span>`).join('')}</div>
          ${t.label}
        </div>
      `).join('')}
    </div>
    <div class="section-title">Backup</div>
    <p class="hint">Your data lives only on this device. Export regularly — clearing browser data or reinstalling will erase everything not backed up. Full campaign export includes characters, bots, npcs, encounters, maps, tokens, fog of war, quests, journal, handouts, lore, logs, dice history, and homebrew content.</p>
    <button class="btn block" id="exportAllBtn">Export All Campaigns (full backup)</button>
    <button class="btn primary block" id="importCampaignBtn" style="margin-top:.5rem">⇧ Import Campaign (JSON)</button>
    <input type="file" id="importCampaignFile" accept="application/json" style="display:none">
    <p class="hint">Importing creates a new campaign on this device — it never overwrites existing data, even if you import the same file twice. Only import files you trust.</p>
    <div class="section-title">About</div>
    <p>FableTable Solo — a deterministic, offline, solo tabletop RPG companion. No accounts, no network calls, no language model. All bot and DM behavior is scripted.</p>
    ${disclaimerFooter()}
  `;
  root.querySelectorAll('[data-theme-pick]').forEach(el => {
    el.onclick = () => { applyTheme(el.getAttribute('data-theme-pick')); ScreenSettings(root); };
  });
  root.querySelector('#exportAllBtn').onclick = async () => {
    const campaigns = await DB.getAll('campaigns');
    if (!campaigns.length) { toast('No campaigns to export yet.', 'danger'); return; }
    const payloads = await Promise.all(campaigns.map(c => gatherCampaignExportPayload(c.id)));
    downloadJson({ formatVersion: 1, exportedAt: nowIso(), campaigns: payloads }, 'fabletable-full-backup.json');
    toast(`Exported ${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'}.`, 'success');
  };
  root.querySelector('#importCampaignBtn').onclick = () => root.querySelector('#importCampaignFile').click();
  root.querySelector('#importCampaignFile').onchange = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const ok = await showCopyrightWarning();
    if (!ok) return;
    let payload;
    try { payload = JSON.parse(await file.text()); } catch (err) { toast('Import failed: file is not valid JSON.', 'danger'); return; }
    // Support both a single-campaign export and a multi-campaign "Export All" bundle.
    const bundles = Array.isArray(payload.campaigns) && !payload.campaign ? payload.campaigns : [payload];
    let imported = 0;
    for (const bundle of bundles) {
      const errs = validateExportPayload(bundle);
      if (errs.length) { toast(`Skipped one campaign: ${errs.join(' ')}`, 'danger'); continue; }
      const remapped = remapCampaignExportIds(bundle, uid);
      await DB.put('campaigns', remapped.campaign);
      for (const [payloadKey, storeName] of Object.entries(PAYLOAD_TO_STORE)) {
        for (const row of (remapped[payloadKey] || [])) await DB.put(storeName, row);
      }
      imported++;
    }
    if (imported) toast(`Imported ${imported} campaign${imported === 1 ? '' : 's'}.`, 'success');
    Router.go('#/campaigns');
  };
}
