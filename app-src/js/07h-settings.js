/* ---- Settings / colour theming ---- */
// Standard hex<->HSL conversion, used only to derive a full 50/100/500/700
// tint ramp from the two hex values the user actually picks (primary/accent).
function hexToHsl(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
  if (!m) return { h: 243, s: 75, l: 59 };
  let r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}
function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (n) => Math.round(255 * f(n)).toString(16).padStart(2, '0');
  return `#${toHex(0)}${toHex(8)}${toHex(4)}`;
}

// Sets the --primary-*/--accent-* CSS variables every rule in styles.css
// reads through, and persists the two source hex values. This is the only
// thing a theme change ever has to do — no per-component restyling.
function applyColorTheme(primaryHex, accentHex) {
  const setRamp = (name, hex) => {
    const { h, s } = hexToHsl(hex);
    const root = document.documentElement.style;
    root.setProperty(`--${name}-50`, hslToHex(h, Math.min(s, 40), 96));
    root.setProperty(`--${name}-100`, hslToHex(h, Math.min(s, 55), 91));
    root.setProperty(`--${name}-200`, hslToHex(h, Math.min(s, 55), 83));
    root.setProperty(`--${name}-500`, hslToHex(h, s, 62));
    root.setProperty(`--${name}-600`, hex);
    root.setProperty(`--${name}-700`, hslToHex(h, s, 38));
  };
  setRamp('primary', primaryHex);
  setRamp('accent', accentHex);
  localStorage.setItem('ft_theme', JSON.stringify({ primaryHex, accentHex }));
}
function getActiveColors() {
  // Defensive: a pre-D21 install may still have a bare theme-id string (not
  // JSON) under this same localStorage key from the old aesthetic-theme
  // system — fall back to the default preset rather than throwing.
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('ft_theme') || 'null'); } catch (e) { saved = null; }
  return { primaryHex: (saved && saved.primaryHex) || THEMES[0].primary, accentHex: (saved && saved.accentHex) || THEMES[0].accent };
}
// campaign.theme is only ever a record of "what did the app look like when
// this campaign was created" — nothing re-reads it — so a preset name (or
// 'custom' for a hand-picked colour pair) is all it needs to hold.
function getActiveTheme() {
  const { primaryHex, accentHex } = getActiveColors();
  const preset = THEMES.find(t => t.primary === primaryHex && t.accent === accentHex);
  return preset ? preset.id : 'custom';
}

async function ScreenSettings(root) {
  const { primaryHex, accentHex } = getActiveColors();
  const activePresetId = getActiveTheme();
  root.innerHTML = `
    <div class="section-title">Theme</div>
    <div class="theme-swatch-row">
      ${THEMES.map(t => `
        <button class="theme-swatch press ${activePresetId === t.id ? 'selected' : ''}" data-theme-preset="${t.id}" type="button">
          <div class="sw-dot" style="background-image:linear-gradient(to bottom right, ${t.primary}, ${t.accent})"></div>
          <div class="sw-label">${escapeHtml(t.label)}</div>
        </button>
      `).join('')}
    </div>
    <div class="theme-color-row mt-3">
      <div class="field"><label for="themePrimary">Main colour</label><input type="color" id="themePrimary" value="${primaryHex}"></div>
      <div class="field"><label for="themeAccent">Complementary colour</label><input type="color" id="themeAccent" value="${accentHex}"></div>
    </div>
    <div class="theme-preview-card mt-2" id="themePreview">
      <div class="row between">
        <span class="badge accent">Preview</span>
        <button class="btn primary sm press">Action</button>
      </div>
    </div>
    <p class="hint"><a href="#" id="themeResetLink">Reset to default</a></p>
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
  root.querySelectorAll('[data-theme-preset]').forEach(el => {
    el.onclick = () => {
      const preset = THEMES.find(t => t.id === el.getAttribute('data-theme-preset'));
      if (preset) { applyColorTheme(preset.primary, preset.accent); ScreenSettings(root); }
    };
  });
  root.querySelector('#themePrimary').onchange = (e) => applyColorTheme(e.target.value, root.querySelector('#themeAccent').value);
  root.querySelector('#themeAccent').onchange = (e) => applyColorTheme(root.querySelector('#themePrimary').value, e.target.value);
  root.querySelector('#themeResetLink').onclick = (e) => {
    e.preventDefault();
    applyColorTheme(THEMES[0].primary, THEMES[0].accent);
    ScreenSettings(root);
  };
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
