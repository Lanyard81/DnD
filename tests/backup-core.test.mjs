import { describe, it, expect } from 'vitest';
import { validateExportPayload, remapCampaignExportIds } from '../src/backup-core.mjs';

function makeCounterId() {
  let n = 0;
  return () => `new-${++n}`;
}

describe('validateExportPayload', () => {
  it('rejects non-objects', () => {
    expect(validateExportPayload(null)).toEqual(['File is not a valid JSON object.']);
    expect(validateExportPayload('nope')).toEqual(['File is not a valid JSON object.']);
  });
  it('requires a campaign with a name and id', () => {
    expect(validateExportPayload({})).toContain('Missing campaign data.');
    expect(validateExportPayload({ campaign: {} })).toEqual(
      expect.arrayContaining(['Campaign is missing a name.', 'Campaign is missing an id.'])
    );
  });
  it('accepts a minimal valid payload', () => {
    expect(validateExportPayload({ campaign: { id: 'c1', name: 'Test' } })).toEqual([]);
  });
  it('rejects a collection that is not a list', () => {
    const errs = validateExportPayload({ campaign: { id: 'c1', name: 'Test' }, characters: 'nope' });
    expect(errs).toContain('"characters" should be a list.');
  });
});

describe('remapCampaignExportIds', () => {
  const basePayload = {
    formatVersion: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    campaign: { id: 'camp-1', name: 'Old Campaign' },
    characters: [{ id: 'char-1', campaignId: 'camp-1', name: 'Kessa' }],
    bots: [{ id: 'bot-1', campaignId: 'camp-1', characterId: 'char-1', temperament: 'gruff' }],
    quests: [{ id: 'quest-1', campaignId: 'camp-1', title: 'Find the artifact' }],
    questObjectives: [{ id: 'obj-1', campaignId: 'camp-1', questId: 'quest-1', text: 'Recover it' }],
    maps: [{ id: 'map-1', campaignId: 'camp-1', name: 'Crypt' }],
    tokens: [{ id: 'tok-1', campaignId: 'camp-1', mapId: 'map-1', name: 'Marker' }],
    fogOfWar: [{ id: 'fog-1', mapId: 'map-1', revealedCells: ['1,1'] }]
  };

  it('gives the campaign a fresh id', () => {
    const result = remapCampaignExportIds(basePayload, makeCounterId());
    expect(result.campaign.id).not.toBe('camp-1');
    expect(result.campaign.name).toBe('Old Campaign');
  });

  it('remaps a character\'s own id and its campaignId consistently', () => {
    const result = remapCampaignExportIds(basePayload, makeCounterId());
    const char = result.characters[0];
    expect(char.id).not.toBe('char-1');
    expect(char.campaignId).toBe(result.campaign.id);
  });

  it('remaps cross-references between collections (bot -> character)', () => {
    const result = remapCampaignExportIds(basePayload, makeCounterId());
    expect(result.bots[0].characterId).toBe(result.characters[0].id);
    expect(result.bots[0].characterId).not.toBe('char-1');
  });

  it('remaps quest -> questObjective references', () => {
    const result = remapCampaignExportIds(basePayload, makeCounterId());
    expect(result.questObjectives[0].questId).toBe(result.quests[0].id);
  });

  it('remaps map -> token and map -> fogOfWar references (fogOfWar has no campaignId field)', () => {
    const result = remapCampaignExportIds(basePayload, makeCounterId());
    expect(result.tokens[0].mapId).toBe(result.maps[0].id);
    expect(result.fogOfWar[0].mapId).toBe(result.maps[0].id);
    expect(result.fogOfWar[0]).not.toHaveProperty('campaignId');
  });

  it('produces no id collisions with the original payload', () => {
    const result = remapCampaignExportIds(basePayload, makeCounterId());
    const oldIds = new Set(['camp-1', 'char-1', 'bot-1', 'quest-1', 'obj-1', 'map-1', 'tok-1', 'fog-1']);
    const newIds = [result.campaign.id, result.characters[0].id, result.bots[0].id, result.quests[0].id, result.questObjectives[0].id, result.maps[0].id, result.tokens[0].id, result.fogOfWar[0].id];
    newIds.forEach(id => expect(oldIds.has(id)).toBe(false));
  });

  it('leaves missing collections as empty arrays rather than throwing', () => {
    const result = remapCampaignExportIds({ campaign: { id: 'c1', name: 'X' } }, makeCounterId());
    expect(result.npcs).toEqual([]);
    expect(result.logEntries).toEqual([]);
  });

  it('rekeys campaignMemory.npcStanding (a free-form {npcId: value} map, not a flat FK field)', () => {
    const withMemory = {
      ...basePayload,
      npcs: [{ id: 'npc-1', campaignId: 'camp-1', name: 'Old Marrick' }],
      campaignMemory: [{ id: 'mem-1', campaignId: 'camp-1', npcStanding: { 'npc-1': 25 }, partyBonds: [], taggedFacts: [], recentEventsRingBuffer: [] }]
    };
    const result = remapCampaignExportIds(withMemory, makeCounterId());
    const newNpcId = result.npcs[0].id;
    expect(Object.keys(result.campaignMemory[0].npcStanding)).toEqual([newNpcId]);
    expect(result.campaignMemory[0].npcStanding[newNpcId]).toBe(25);
  });

  it('is idempotent-safe: importing the same payload twice yields two non-colliding campaigns', () => {
    const gen = makeCounterId();
    const first = remapCampaignExportIds(basePayload, gen);
    const second = remapCampaignExportIds(basePayload, gen);
    expect(first.campaign.id).not.toBe(second.campaign.id);
    expect(first.characters[0].id).not.toBe(second.characters[0].id);
  });
});
