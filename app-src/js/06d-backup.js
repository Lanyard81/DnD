/* ---- Backup: full campaign export/import ---- */
// Payload key -> IndexedDB store name (payload uses DATA_MODEL.md's export
// shape, camelCased; stores use their snake_case names).
const PAYLOAD_TO_STORE = {
  characters: 'characters', bots: 'bots', npcs: 'npcs', monsters: 'monsters',
  items: 'items', spells: 'spells', features: 'features', effects: 'effects', conditions: 'conditions',
  encounters: 'encounters', maps: 'maps', tokens: 'tokens', fogOfWar: 'fog_of_war_state',
  quests: 'quests', questObjectives: 'quest_objectives', journalEntries: 'journal_entries',
  handouts: 'handouts', lorePages: 'lore_pages', logEntries: 'log_entries', diceRolls: 'dice_rolls',
  combatLogs: 'combat_logs', eventLogs: 'event_logs', randomTables: 'random_tables', lootTables: 'loot_tables',
  botMemory: 'bot_memory', campaignMemory: 'campaign_memory'
};

async function gatherCampaignExportPayload(campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  const maps = await DB.getAllByIndex('maps', 'campaignId', campaignId);
  const fogNested = await Promise.all(maps.map(m => DB.getAllByIndex('fog_of_war_state', 'mapId', m.id)));

  const payload = { formatVersion: 1, exportedAt: nowIso(), campaign, maps, fogOfWar: fogNested.flat() };
  for (const key of Object.keys(PAYLOAD_TO_STORE)) {
    if (key === 'maps' || key === 'fogOfWar') continue;
    payload[key] = await DB.getAllByIndex(PAYLOAD_TO_STORE[key], 'campaignId', campaignId);
  }
  return payload;
}

function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

async function exportCampaignJson(campaignId) {
  const payload = await gatherCampaignExportPayload(campaignId);
  downloadJson(payload, `fabletable-${(payload.campaign.name || 'campaign').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.json`);
  toast('Campaign exported (full backup).', 'success');
}

async function importCampaignJsonFile(file) {
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch (err) {
    toast('Import failed: file is not valid JSON.', 'danger');
    return null;
  }
  const errs = validateExportPayload(payload);
  if (errs.length) { toast('Import failed: ' + errs.join(' '), 'danger'); return null; }

  const remapped = remapCampaignExportIds(payload, uid);
  // Validated first, all-or-nothing from here: nothing above this line touched IndexedDB.
  await DB.put('campaigns', remapped.campaign);
  for (const [payloadKey, storeName] of Object.entries(PAYLOAD_TO_STORE)) {
    for (const row of (remapped[payloadKey] || [])) await DB.put(storeName, row);
  }
  toast(`Imported "${remapped.campaign.name}" as a new campaign.`, 'success');
  return remapped.campaign;
}

function showCopyrightWarning() {
  return confirmDialog('Only import content you have the right to use. FableTable Solo does not check imported files for copyrighted material — that responsibility is yours.', { okLabel: 'I understand, continue' });
}

async function importMarkdownAsJournalEntry(campaignId, file) {
  const ok = await showCopyrightWarning();
  if (!ok) return null;
  const text = await file.text();
  const title = file.name.replace(/\.md$/i, '') || 'Imported Entry';
  const entry = { id: uid(), campaignId, title, body: text, tags: ['imported'], isPrivateDM: false, createdAt: nowIso() };
  await DB.put('journal_entries', entry);
  toast(`Imported "${title}" as a journal entry.`, 'success');
  return entry;
}

/* ---- Content packs: homebrew-only export/import (lighter than a full campaign) ---- */
// Unlike a full campaign export, a content pack carries no `campaign` key and
// no cross-references between rows — each homebrew entry stands alone — so
// import is a simple "assign fresh id, attach to the target campaign" pass
// rather than needing the full FK-remapping machinery in backup-core.
async function gatherContentPack(campaignId) {
  const pack = { formatVersion: 1, exportedAt: nowIso(), contentPack: true };
  for (const [key, schema] of Object.entries(HOMEBREW_SCHEMAS)) {
    pack[key] = await DB.getAllByIndex(schema.store, 'campaignId', campaignId);
  }
  return pack;
}
async function exportContentPack(campaignId) {
  const campaign = await DB.get('campaigns', campaignId);
  const pack = await gatherContentPack(campaignId);
  downloadJson(pack, `fabletable-content-pack-${(campaign.name || 'campaign').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.json`);
  toast('Content pack exported.', 'success');
}
async function importContentPackFile(campaignId, file) {
  let payload;
  try { payload = JSON.parse(await file.text()); } catch (err) { toast('Import failed: file is not valid JSON.', 'danger'); return null; }
  const knownKeys = Object.keys(HOMEBREW_SCHEMAS).filter(k => Array.isArray(payload[k]));
  if (!knownKeys.length) { toast('Import failed: no recognized content in this file.', 'danger'); return null; }
  const ok = await showCopyrightWarning();
  if (!ok) return null;
  let count = 0;
  for (const key of knownKeys) {
    const schema = HOMEBREW_SCHEMAS[key];
    for (const row of payload[key]) {
      await DB.put(schema.store, { ...row, id: uid(), campaignId });
      count++;
    }
  }
  toast(`Imported ${count} homebrew ${count === 1 ? 'entry' : 'entries'}.`, 'success');
  return count;
}
