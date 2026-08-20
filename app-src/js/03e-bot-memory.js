/* ---- Bot memory (facts, recent events — plain structured data, no embeddings) ---- */
const BOT_MEMORY_RING_LIMIT = 20;
async function getOrCreateBotMemory(campaignId, botId) {
  const rows = await DB.getAllByIndex('bot_memory', 'botId', botId);
  const existing = rows.find(r => r.campaignId === campaignId);
  if (existing) return existing;
  const fresh = { id: uid(), campaignId, botId, facts: [], recentEventsRingBuffer: [] };
  await DB.put('bot_memory', fresh);
  return fresh;
}
async function addBotFact(campaignId, botId, key, value, tags) {
  const mem = await getOrCreateBotMemory(campaignId, botId);
  const existingIdx = mem.facts.findIndex(f => f.key === key);
  const fact = { key, value, tags: tags || [], importance: 1, createdAt: nowIso() };
  if (existingIdx >= 0) mem.facts[existingIdx] = fact; else mem.facts.push(fact);
  await DB.put('bot_memory', mem);
  return mem;
}
async function addBotRecentEvent(campaignId, botId, text) {
  const mem = await getOrCreateBotMemory(campaignId, botId);
  mem.recentEventsRingBuffer.push({ text, createdAt: nowIso() });
  if (mem.recentEventsRingBuffer.length > BOT_MEMORY_RING_LIMIT) {
    mem.recentEventsRingBuffer = mem.recentEventsRingBuffer.slice(-BOT_MEMORY_RING_LIMIT);
  }
  await DB.put('bot_memory', mem);
  return mem;
}
