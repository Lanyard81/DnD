/* ---- Campaign memory (plain structured facts/events — no embeddings) ---- */
async function getOrCreateCampaignMemory(campaignId) {
  const rows = await DB.getAllByIndex('campaign_memory', 'campaignId', campaignId);
  if (rows.length) return rows[0];
  const fresh = { id: uid(), campaignId, npcStanding: {}, partyBonds: [], taggedFacts: [], recentEventsRingBuffer: [] };
  await DB.put('campaign_memory', fresh);
  return fresh;
}
async function addCampaignFact(campaignId, key, value, tags) {
  const mem = await getOrCreateCampaignMemory(campaignId);
  const idx = mem.taggedFacts.findIndex(f => f.key === key);
  const fact = { key, value, tags: tags || [], createdAt: nowIso() };
  if (idx >= 0) mem.taggedFacts[idx] = fact; else mem.taggedFacts.push(fact);
  await DB.put('campaign_memory', mem);
  return mem;
}
async function addCampaignRecentEvent(campaignId, text) {
  const mem = await getOrCreateCampaignMemory(campaignId);
  mem.recentEventsRingBuffer.push({ text, createdAt: nowIso() });
  if (mem.recentEventsRingBuffer.length > BOT_MEMORY_RING_LIMIT) mem.recentEventsRingBuffer = mem.recentEventsRingBuffer.slice(-BOT_MEMORY_RING_LIMIT);
  await DB.put('campaign_memory', mem);
  return mem;
}
async function setNpcStanding(campaignId, npcId, delta) {
  const mem = await getOrCreateCampaignMemory(campaignId);
  mem.npcStanding[npcId] = clamp((mem.npcStanding[npcId] || 0) + delta, -100, 100);
  await DB.put('campaign_memory', mem);
  return mem.npcStanding[npcId];
}
