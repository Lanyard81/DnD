/* ---- Backup core functions ---- */
// Mirrored 1:1 from src/backup-core.mjs (see tests/backup-core.test.mjs).
// If you change behavior here, mirror the change in src/backup-core.mjs too.
const COLLECTION_FK_MAP = {
  characters: { id: true, campaignId: 'campaign' },
  bots: { id: true, campaignId: 'campaign', characterId: 'characters' },
  npcs: { id: true, campaignId: 'campaign' },
  monsters: { id: true, campaignId: 'campaign' },
  items: { id: true, campaignId: 'campaign' },
  spells: { id: true, campaignId: 'campaign' },
  features: { id: true, campaignId: 'campaign' },
  effects: { id: true, campaignId: 'campaign' },
  conditions: { id: true, campaignId: 'campaign' },
  encounters: { id: true, campaignId: 'campaign' },
  maps: { id: true, campaignId: 'campaign' },
  tokens: { id: true, campaignId: 'campaign', mapId: 'maps' },
  fogOfWar: { id: true, mapId: 'maps' },
  quests: { id: true, campaignId: 'campaign' },
  questObjectives: { id: true, campaignId: 'campaign', questId: 'quests' },
  journalEntries: { id: true, campaignId: 'campaign' },
  handouts: { id: true, campaignId: 'campaign' },
  lorePages: { id: true, campaignId: 'campaign' },
  logEntries: { id: true, campaignId: 'campaign' },
  diceRolls: { id: true, campaignId: 'campaign' },
  combatLogs: { id: true, campaignId: 'campaign', encounterId: 'encounters' },
  eventLogs: { id: true, campaignId: 'campaign' },
  randomTables: { id: true, campaignId: 'campaign' },
  lootTables: { id: true, campaignId: 'campaign' },
  botMemory: { id: true, campaignId: 'campaign', botId: 'bots' },
  campaignMemory: { id: true, campaignId: 'campaign' }
};

function validateExportPayload(payload) {
  const errors = [];
  if (!payload || typeof payload !== 'object') return ['File is not a valid JSON object.'];
  if (!payload.campaign || typeof payload.campaign !== 'object') { errors.push('Missing campaign data.'); return errors; }
  if (!payload.campaign.name || !String(payload.campaign.name).trim()) errors.push('Campaign is missing a name.');
  if (!payload.campaign.id) errors.push('Campaign is missing an id.');
  for (const key of Object.keys(COLLECTION_FK_MAP)) {
    if (payload[key] !== undefined && !Array.isArray(payload[key])) errors.push(`"${key}" should be a list.`);
  }
  return errors;
}

function remapCampaignExportIds(payload, generateId) {
  const campaignIdMap = new Map();
  const collectionIdMaps = {};
  for (const key of Object.keys(COLLECTION_FK_MAP)) collectionIdMaps[key] = new Map();

  function mapped(map, oldId) {
    if (oldId === null || oldId === undefined) return oldId;
    if (!map.has(oldId)) map.set(oldId, generateId());
    return map.get(oldId);
  }

  const out = {};
  out.formatVersion = payload.formatVersion;
  out.exportedAt = payload.exportedAt;

  const oldCampaignId = payload.campaign.id;
  const newCampaignId = mapped(campaignIdMap, oldCampaignId);
  out.campaign = { ...payload.campaign, id: newCampaignId };

  for (const [key, fkSpec] of Object.entries(COLLECTION_FK_MAP)) {
    const rows = Array.isArray(payload[key]) ? payload[key] : [];
    out[key] = rows.map(row => {
      const newRow = { ...row };
      for (const [field, target] of Object.entries(fkSpec)) {
        if (target === true) {
          newRow[field] = mapped(collectionIdMaps[key], row[field]);
        } else if (target === 'campaign') {
          newRow[field] = row[field] === oldCampaignId ? newCampaignId : mapped(campaignIdMap, row[field]);
        } else if (collectionIdMaps[target]) {
          newRow[field] = mapped(collectionIdMaps[target], row[field]);
        }
      }
      return newRow;
    });
  }

  // campaignMemory.npcStanding is a free-form { npcId: value } map, not a flat
  // FK field, so it needs its own rekeying pass through the npcs id map.
  if (Array.isArray(out.campaignMemory)) {
    out.campaignMemory = out.campaignMemory.map(mem => {
      if (!mem.npcStanding) return mem;
      const rekeyed = {};
      for (const [oldNpcId, value] of Object.entries(mem.npcStanding)) {
        rekeyed[mapped(collectionIdMaps.npcs, oldNpcId)] = value;
      }
      return { ...mem, npcStanding: rekeyed };
    });
  }

  return out;
}
