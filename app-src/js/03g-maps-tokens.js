/* ---- Maps & tokens ---- */
function makeMap({ campaignId, name, cols, rows, cellSizePx, gridType }) {
  return {
    id: uid(), campaignId, name: name || 'Map', gridType: (gridType === 'hex' && FEATURE_FLAGS.hexGrid) ? 'hex' : 'square',
    cols: cols || 12, rows: rows || 10, cellSizePx: cellSizePx || 48,
    backgroundImage: null, sceneNotes: '',
    // Extension beyond DATA_MODEL.md's minimal map shape: wall/obstacle cells
    // for the line-of-sight tool, stored inline since Phase 5 has no separate
    // "terrain layer" store — see DECISIONS.md D16.
    blockedCells: [],
    createdAt: nowIso()
  };
}
function makeToken({ campaignId, mapId, refType, refId, name, x, y, color, isHiddenFromPlayer }) {
  return {
    id: uid(), campaignId, mapId, refType: refType || 'generic', refId: refId || null,
    x: x || 0, y: y || 0, imageData: null, color: color || '#b3893f', sizeCells: 1,
    isHiddenFromPlayer: !!isHiddenFromPlayer, name: name || 'Token'
  };
}
async function getOrCreateFogState(mapId) {
  const rows = await DB.getAllByIndex('fog_of_war_state', 'mapId', mapId);
  if (rows.length) return rows[0];
  const fresh = { id: uid(), mapId, revealedCells: [] };
  await DB.put('fog_of_war_state', fresh);
  return fresh;
}
