// backup-core.mjs
//
// Pure, dependency-free logic for validating and remapping a full campaign
// export/import payload (DATA_MODEL.md's "Export/import shape"). No DOM, no
// IndexedDB — index.html handles reading the DB into a payload and writing a
// remapped payload back; this module only handles the plain-object transform
// in between, which is what actually needs to be correct and is worth testing
// in isolation.
//
// Mirrored inline into index.html (see "BACKUP CORE" section) — see D10.
// If you change behavior here, mirror the change in index.html too.

// Every exportable collection, and how each row's fields reference other ids.
// 'campaign' means "remap through the campaign id map". A store name means
// "remap through that store's own id map". `true` on the row's own key means
// "this field IS the row's primary id — always remap it".
export const COLLECTION_FK_MAP = {
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

export function validateExportPayload(payload) {
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

// Remaps every id in the payload (campaign + every listed collection) through
// fresh ids from `generateId()`, rewriting cross-references along the way, so
// importing the same export twice — or importing it back into a store that
// already has data — never collides with or overwrites existing rows.
export function remapCampaignExportIds(payload, generateId) {
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
  // FK field, so it needs its own rekeying pass through the npcs id map —
  // otherwise standing survives an import but points at ids that no longer exist.
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
