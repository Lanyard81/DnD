/* ---------- 2. DB LAYER ---------- */
const DB_NAME = 'fabletable_db';
const DB_VERSION = 1;

// Store definitions across the whole app lifetime (DATA_MODEL.md). Created now
// so later phases never need a version-bump migration for stores already planned.
const STORE_DEFS = [
  { name: 'campaigns', indexes: [] },
  { name: 'characters', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'bots', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'npcs', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'monsters', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'items', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'spells', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'features', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'effects', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'conditions', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'quests', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'quest_objectives', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }, { name: 'questId', keyPath: 'questId' }] },
  { name: 'journal_entries', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'handouts', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'lore_pages', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'maps', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'tokens', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }, { name: 'mapId', keyPath: 'mapId' }] },
  { name: 'fog_of_war_state', indexes: [{ name: 'mapId', keyPath: 'mapId' }] },
  { name: 'encounters', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'initiative_entries', indexes: [{ name: 'encounterId', keyPath: 'encounterId' }] },
  { name: 'log_entries', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }, { name: 'createdAt', keyPath: 'createdAt' }] },
  { name: 'dice_rolls', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }, { name: 'createdAt', keyPath: 'createdAt' }] },
  { name: 'combat_logs', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'event_logs', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'random_tables', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'loot_tables', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'bot_memory', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }, { name: 'botId', keyPath: 'botId' }] },
  { name: 'campaign_memory', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'ai_settings', indexes: [{ name: 'campaignId', keyPath: 'campaignId' }] },
  { name: 'app_settings', indexes: [] },
  { name: 'content_packs', indexes: [] }
];

const DB = (() => {
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = req.result;
        for (const def of STORE_DEFS) {
          if (!db.objectStoreNames.contains(def.name)) {
            const store = db.createObjectStore(def.name, { keyPath: 'id' });
            for (const idx of def.indexes) store.createIndex(idx.name, idx.keyPath, { unique: false });
          }
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function tx(storeName, mode) {
    const db = await open();
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  return {
    async put(storeName, obj) {
      const store = await tx(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const r = store.put(obj);
        r.onsuccess = () => resolve(obj);
        r.onerror = () => reject(r.error);
      });
    },
    async get(storeName, id) {
      const store = await tx(storeName, 'readonly');
      return new Promise((resolve, reject) => {
        const r = store.get(id);
        r.onsuccess = () => resolve(r.result || null);
        r.onerror = () => reject(r.error);
      });
    },
    async delete(storeName, id) {
      const store = await tx(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const r = store.delete(id);
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
      });
    },
    async getAll(storeName) {
      const store = await tx(storeName, 'readonly');
      return new Promise((resolve, reject) => {
        const r = store.getAll();
        r.onsuccess = () => resolve(r.result || []);
        r.onerror = () => reject(r.error);
      });
    },
    async getAllByIndex(storeName, indexName, value) {
      const store = await tx(storeName, 'readonly');
      return new Promise((resolve, reject) => {
        const idx = store.index(indexName);
        const r = idx.getAll(value);
        r.onsuccess = () => resolve(r.result || []);
        r.onerror = () => reject(r.error);
      });
    },
    async clearStore(storeName) {
      const store = await tx(storeName, 'readwrite');
      return new Promise((resolve, reject) => {
        const r = store.clear();
        r.onsuccess = () => resolve();
        r.onerror = () => reject(r.error);
      });
    }
  };
})();
