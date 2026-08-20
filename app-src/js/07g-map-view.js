/* ---- Map view (grid board: tokens, fog of war, walls, AoE, line of sight) ---- */
async function ScreenMapView(root, campaignId, mapId) {
  let map = await DB.get('maps', mapId);
  if (!map) { root.innerHTML = emptyState('❓', 'Map not found'); return; }
  let tokens = await DB.getAllByIndex('tokens', 'mapId', mapId);
  let fogState = await getOrCreateFogState(mapId);
  const characters = await DB.getAllByIndex('characters', 'campaignId', campaignId);
  const charById = Object.fromEntries(characters.map(c => [c.id, c]));
  const activeEncounter = (await DB.getAllByIndex('encounters', 'campaignId', campaignId)).find(e => e.status === 'active');

  const CELL = map.cellSizePx;
  const isHex = map.gridType === 'hex';
  const hexSize = CELL / 1.8; // hex "radius" chosen so a hex map at the same cols/rows reads at a similar density to a square one
  let viewMode = 'dm';
  let tool = 'select';
  let aoeShape = 'circle';
  let aoeSize = 3;
  let aoeOrigin = null;
  let aoeCells = [];
  let losPoints = [];
  let selectedTokenId = null;
  let zoom = 1, panX = 20, panY = 20;
  let suppressNextClick = false;

  const blockedSet = new Set(map.blockedCells || []);
  const revealedSet = new Set(fogState.revealedCells || []);

  // Grid-type dispatch: the rest of the screen works in {x,y} cell coordinates
  // (x=q, y=r for hex maps — see DECISIONS.md D19) and calls these helpers
  // instead of the square/hex math directly, so almost nothing else in this
  // file needs to know which grid type it's drawing.
  function cellCenterPixel(cell) {
    if (isHex) return hexToPixel({ q: cell.x, r: cell.y }, hexSize);
    return { x: (cell.x + 0.5) * CELL, y: (cell.y + 0.5) * CELL };
  }
  function pixelToCell(px, py) {
    if (isHex) {
      const q = (px * Math.sqrt(3) / 3 - py / 3) / hexSize;
      const r = (py * 2 / 3) / hexSize;
      const rounded = cubeRound(q, -q - r, r);
      return { x: rounded.q, y: rounded.r };
    }
    return { x: Math.floor(px / CELL), y: Math.floor(py / CELL) };
  }
  function radiusCells(origin, radius) {
    if (isHex) return cellsInHexRadius({ q: origin.x, r: origin.y }, radius).map(c => ({ x: c.q, y: c.r }));
    return cellsInCircle(origin, radius);
  }
  // Hex has no distinct "square/cube" shape — a filled hex disk stands in for
  // it (documented simplification, D19), same as the circle shape above.
  function blockShapeCells(origin, size) {
    if (isHex) return radiusCells(origin, size);
    return cellsInSquare(origin, size);
  }
  function coneCells(origin, target, length) {
    if (isHex) return cellsInHexCone({ q: origin.x, r: origin.y }, { q: target.x, r: target.y }, length, hexSize).map(c => ({ x: c.q, y: c.r }));
    return cellsInCone(origin, target, length);
  }
  function lineCells(origin, target, length) {
    if (isHex) return cellsInHexLine({ q: origin.x, r: origin.y }, { q: target.x, r: target.y }, length).map(c => ({ x: c.q, y: c.r }));
    return cellsInLine(origin, target, length);
  }
  function checkLineOfSight(a, b) {
    if (isHex) return hasHexLineOfSight({ q: a.x, r: a.y }, { q: b.x, r: b.y }, blockedSet);
    return hasLineOfSight(a, b, blockedSet);
  }

  function cellFromClient(clientX, clientY, svgEl) {
    const rect = svgEl.getBoundingClientRect();
    const px = (clientX - rect.left - panX) / zoom;
    const py = (clientY - rect.top - panY) / zoom;
    return pixelToCell(px, py);
  }

  function movementRangeCells(token) {
    if (!token || token.refType !== 'character') return [];
    const char = charById[token.refId];
    if (!char) return [];
    const rangeInCells = Math.floor((char.speed || 30) / 5);
    return radiusCells({ x: token.x, y: token.y }, rangeInCells).concat([{ x: token.x, y: token.y }]);
  }

  function render() {
    const rangeCells = selectedTokenId ? new Set(movementRangeCells(tokens.find(t => t.id === selectedTokenId)).map(cellKey)) : new Set();
    const aoeSet = new Set(aoeCells.map(cellKey));
    const activeTokenRefId = activeEncounter ? findCombatant(activeEncounter, activeEncounter.initiativeOrder[activeEncounter.activeIndex]).refId : null;

    let cellsHtml = '';
    for (let y = 0; y < map.rows; y++) {
      for (let x = 0; x < map.cols; x++) {
        const key = `${x},${y}`;
        const isBlocked = blockedSet.has(key);
        const isRange = rangeCells.has(key);
        const isAoe = aoeSet.has(key);
        const isFogged = viewMode === 'player' && !revealedSet.has(key);
        let cls = 'map-cell';
        if (isBlocked) cls += ' blocked';
        if (isRange) cls += ' highlight-range';
        if (isAoe) cls += ' highlight-aoe';
        if (isHex) {
          const center = cellCenterPixel({ x, y });
          const points = hexCorners(center, hexSize).map(p => `${p.x},${p.y}`).join(' ');
          cellsHtml += `<polygon class="${cls}" data-cell-x="${x}" data-cell-y="${y}" points="${points}"></polygon>`;
          if (isFogged) cellsHtml += `<polygon class="map-cell fog" data-fog-cell="1" points="${points}"></polygon>`;
        } else {
          cellsHtml += `<rect class="${cls}" data-cell-x="${x}" data-cell-y="${y}" x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}"></rect>`;
          if (isFogged) cellsHtml += `<rect class="map-cell fog" data-fog-cell="1" x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}"></rect>`;
        }
      }
    }
    let tokensHtml = '';
    tokens.forEach(t => {
      const isActiveTurn = activeTokenRefId && t.refId === activeTokenRefId;
      const hiddenFromPlayer = viewMode === 'player' && t.isHiddenFromPlayer;
      if (hiddenFromPlayer) return;
      const initials = (t.name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
      const r = (isHex ? hexSize : CELL) * 0.4;
      const center = cellCenterPixel({ x: t.x, y: t.y });
      tokensHtml += `
        <g class="map-token ${isActiveTurn ? 'active-turn' : ''}" data-token-id="${t.id}" transform="translate(${center.x},${center.y})" style="cursor:pointer">
          ${t.imageData ? `
            <clipPath id="clip-${t.id}"><circle r="${r}"></circle></clipPath>
            <circle r="${r}" fill="${escapeHtml(t.color)}"></circle>
            <image href="${t.imageData}" x="${-r}" y="${-r}" width="${r * 2}" height="${r * 2}" clip-path="url(#clip-${t.id})" preserveAspectRatio="xMidYMid slice"></image>
          ` : `
            <circle r="${r}" fill="${escapeHtml(t.color)}"></circle>
            <text>${escapeHtml(initials)}</text>
          `}
        </g>
      `;
    });
    let losHtml = '';
    if (losPoints.length === 2) {
      const [a, b] = losPoints;
      const ok = checkLineOfSight(a, b);
      const pa = cellCenterPixel(a), pb = cellCenterPixel(b);
      losHtml = `<line class="map-los-line" x1="${pa.x}" y1="${pa.y}" x2="${pb.x}" y2="${pb.y}" stroke="${ok ? 'var(--success)' : 'var(--danger)'}"></line>`;
    }

    root.innerHTML = `
      <div class="map-toolbar">
        <button data-tool="select" class="${tool === 'select' ? 'active' : ''}">👆 Select/Move</button>
        <button data-tool="wall" class="${tool === 'wall' ? 'active' : ''}">🧱 Walls</button>
        <button data-tool="fog" class="${tool === 'fog' ? 'active' : ''}">🌫 Fog Reveal</button>
        <button data-tool="aoe" class="${tool === 'aoe' ? 'active' : ''}">💥 AoE</button>
        <button data-tool="los" class="${tool === 'los' ? 'active' : ''}">👁 Line of Sight</button>
      </div>
      ${tool === 'aoe' ? `
        <div class="row wrap" style="margin-bottom:.6rem">
          <select id="aoeShapeSelect">
            <option value="circle" ${aoeShape === 'circle' ? 'selected' : ''}>Circle</option>
            <option value="square" ${aoeShape === 'square' ? 'selected' : ''}>Square/Cube</option>
            <option value="cone" ${aoeShape === 'cone' ? 'selected' : ''}>Cone</option>
            <option value="line" ${aoeShape === 'line' ? 'selected' : ''}>Line</option>
          </select>
          <input type="number" id="aoeSizeInput" value="${aoeSize}" min="1" max="10" style="width:4.5em">
          <button class="btn sm" id="aoeClearBtn">Clear</button>
        </div>
        <p class="hint">Circle/Square: tap origin. Cone/Line: tap origin, then tap a second cell to aim.</p>
        ${aoeCells.length ? `<button class="btn sm block" id="applyAoeEffectBtn" style="margin-bottom:.6rem">⚡ Apply Effect to ${aoeCells.length} Highlighted Cells</button>` : ''}
      ` : ''}
      <div class="row between" style="margin-bottom:.5rem">
        <div class="row" style="gap:.3rem">
          <button class="btn sm ${viewMode === 'dm' ? 'primary' : ''}" id="dmViewBtn">DM View</button>
          <button class="btn sm ${viewMode === 'player' ? 'primary' : ''}" id="playerViewBtn">Player View</button>
        </div>
        <div class="row" style="gap:.3rem">
          <button class="btn sm" id="zoomOutBtn">－</button>
          <button class="btn sm" id="zoomInBtn">＋</button>
        </div>
      </div>
      <div class="map-viewport" id="mapViewport">
        <svg width="100%" height="100%">
          <g id="mapLayer" transform="translate(${panX},${panY}) scale(${zoom})">
            ${cellsHtml}
            ${losHtml}
            ${tokensHtml}
          </g>
        </svg>
      </div>
      <button class="btn block" id="addTokenBtn" style="margin-top:.6rem">+ Add Token</button>
      <p class="hint" style="text-align:center">Drag a token to move it. Pinch or use ＋/－ to zoom. Drag empty space to pan.</p>
    `;

    wireMapEvents();
  }

  function wireMapEvents() {
    root.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => { tool = b.getAttribute('data-tool'); aoeOrigin = null; aoeCells = []; losPoints = []; render(); });
    root.querySelector('#dmViewBtn').onclick = () => { viewMode = 'dm'; render(); };
    root.querySelector('#playerViewBtn').onclick = () => { viewMode = 'player'; render(); };
    root.querySelector('#zoomInBtn').onclick = () => { zoom = clamp(zoom + 0.15, 0.4, 2.5); render(); };
    root.querySelector('#zoomOutBtn').onclick = () => { zoom = clamp(zoom - 0.15, 0.4, 2.5); render(); };
    const aoeShapeSel = root.querySelector('#aoeShapeSelect');
    if (aoeShapeSel) aoeShapeSel.onchange = e => { aoeShape = e.target.value; aoeOrigin = null; aoeCells = []; render(); };
    const aoeSizeInput = root.querySelector('#aoeSizeInput');
    if (aoeSizeInput) aoeSizeInput.onchange = e => { aoeSize = parseInt(e.target.value) || 3; };
    const aoeClearBtn = root.querySelector('#aoeClearBtn');
    if (aoeClearBtn) aoeClearBtn.onclick = () => { aoeOrigin = null; aoeCells = []; render(); };
    const applyAoeBtn = root.querySelector('#applyAoeEffectBtn');
    if (applyAoeBtn) applyAoeBtn.onclick = () => openApplyEffectModal();

    root.querySelector('#addTokenBtn').onclick = () => openAddTokenModal();

    const viewport = root.querySelector('#mapViewport');
    const svgEl = root.querySelector('svg');

    // Background pan (single-pointer drag starting on empty space).
    let panStart = null;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.map-token') || e.target.hasAttribute('data-cell-x')) return;
      panStart = { x: e.clientX, y: e.clientY, panX, panY };
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!panStart) return;
      panX = panStart.panX + (e.clientX - panStart.x);
      panY = panStart.panY + (e.clientY - panStart.y);
      const g = root.querySelector('#mapLayer');
      if (g) g.setAttribute('transform', `translate(${panX},${panY}) scale(${zoom})`);
    });
    window.addEventListener('pointerup', () => { panStart = null; }, { once: false });

    // Pinch-to-zoom (two-touch).
    let pinchStartDist = null, pinchStartZoom = null;
    viewport.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const [t1, t2] = e.touches;
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (pinchStartDist === null) { pinchStartDist = dist; pinchStartZoom = zoom; return; }
      zoom = clamp(pinchStartZoom * (dist / pinchStartDist), 0.4, 2.5);
      const g = root.querySelector('#mapLayer');
      if (g) g.setAttribute('transform', `translate(${panX},${panY}) scale(${zoom})`);
    }, { passive: false });
    viewport.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinchStartDist = null; });

    // Cell taps: wall/fog/aoe/los tools.
    root.querySelectorAll('[data-cell-x]').forEach(cellEl => {
      cellEl.addEventListener('click', async () => {
        const x = parseInt(cellEl.getAttribute('data-cell-x')), y = parseInt(cellEl.getAttribute('data-cell-y'));
        await handleCellTap({ x, y });
      });
    });

    // Token drag / tap-to-select.
    root.querySelectorAll('.map-token').forEach(tokenEl => {
      const tokenId = tokenEl.getAttribute('data-token-id');
      const token = tokens.find(t => t.id === tokenId);
      tokenEl.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const startX = e.clientX, startY = e.clientY;
        let moved = false;
        function onMove(ev) {
          if (Math.abs(ev.clientX - startX) > 5 || Math.abs(ev.clientY - startY) > 5) moved = true;
          if (moved) {
            const cell = cellFromClient(ev.clientX, ev.clientY, svgEl);
            const center = cellCenterPixel(cell);
            tokenEl.setAttribute('transform', `translate(${center.x},${center.y})`);
          }
        }
        async function onUp(ev) {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          if (moved) {
            const cell = cellFromClient(ev.clientX, ev.clientY, svgEl);
            token.x = clamp(cell.x, 0, map.cols - 1);
            token.y = clamp(cell.y, 0, map.rows - 1);
            await DB.put('tokens', token);
            render();
          } else {
            selectedTokenId = selectedTokenId === tokenId ? null : tokenId;
            render();
          }
        }
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
      });
    });
  }

  async function handleCellTap(cell) {
    if (tool === 'wall') {
      const key = cellKey(cell);
      if (blockedSet.has(key)) blockedSet.delete(key); else blockedSet.add(key);
      map.blockedCells = Array.from(blockedSet);
      await DB.put('maps', map);
      render();
    } else if (tool === 'fog') {
      const key = cellKey(cell);
      if (revealedSet.has(key)) revealedSet.delete(key); else revealedSet.add(key);
      fogState.revealedCells = Array.from(revealedSet);
      await DB.put('fog_of_war_state', fogState);
      render();
    } else if (tool === 'aoe') {
      if (!aoeOrigin) {
        aoeOrigin = cell;
        if (aoeShape === 'circle') aoeCells = radiusCells(cell, aoeSize);
        else if (aoeShape === 'square') aoeCells = blockShapeCells(cell, aoeSize);
        else aoeCells = []; // cone/line need a second tap for direction
        render();
      } else {
        if (aoeShape === 'cone') aoeCells = coneCells(aoeOrigin, cell, aoeSize);
        else if (aoeShape === 'line') aoeCells = lineCells(aoeOrigin, cell, aoeSize);
        render();
      }
    } else if (tool === 'los') {
      losPoints = losPoints.length >= 2 ? [cell] : [...losPoints, cell];
      render();
    }
  }

  // Resolves each token standing in a highlighted cell to a live, damageable
  // target: an active encounter's combatant if one matches by ref, otherwise
  // the character itself (for out-of-combat effects). Monsters with no
  // matching combatant have no persistent HP to apply to and are skipped —
  // this is the map/combat "bridge" described in the Effect application feature.
  function resolveAoeTargets() {
    const cellSet = new Set(aoeCells.map(cellKey));
    const hitTokens = tokens.filter(t => cellSet.has(cellKey({ x: t.x, y: t.y })) && t.refType !== 'generic');
    return hitTokens.map(t => {
      const combatant = activeEncounter ? activeEncounter.combatants.find(c => c.refType === t.refType && c.refId === t.refId) : null;
      if (combatant) return { kind: 'combatant', token: t, combatant };
      if (t.refType === 'character') { const char = charById[t.refId]; if (char) return { kind: 'character', token: t, char }; }
      return null;
    }).filter(Boolean);
  }

  function openApplyEffectModal() {
    const targets = resolveAoeTargets();
    openModal(`
      <h2>Apply Effect</h2>
      ${targets.length ? `<p class="hint">Will affect: ${targets.map(t => escapeHtml(t.token.name)).join(', ')}</p>` : `<p class="hint">No damageable tokens are standing in the highlighted cells. Place tokens first, or this will just log a note.</p>`}
      <div class="field"><label>Damage formula (optional)</label><input type="text" id="aoeDamage" placeholder="e.g. 4d6"></div>
      <div class="field"><label>Heal formula (optional)</label><input type="text" id="aoeHeal" placeholder="e.g. 2d8"></div>
      <div class="field"><label>Condition to apply (optional)</label><input type="text" id="aoeCondition" placeholder="e.g. Prone" list="condSuggestListMap"></div>
      <datalist id="condSuggestListMap">${Object.keys(CONDITION_LIBRARY).map(c => `<option value="${c[0].toUpperCase() + c.slice(1)}">`).join('')}</datalist>
      <div class="row" style="margin-top:1rem">
        <button class="btn block" id="aoeEffectCancel">Cancel</button>
        <button class="btn primary block" id="aoeEffectGo">Apply</button>
      </div>
    `, (rootEl) => {
      rootEl.querySelector('#aoeEffectCancel').onclick = closeModal;
      rootEl.querySelector('#aoeEffectGo').onclick = async () => {
        const dmgFormula = rootEl.querySelector('#aoeDamage').value.trim();
        const healFormula = rootEl.querySelector('#aoeHeal').value.trim();
        const condition = rootEl.querySelector('#aoeCondition').value.trim();
        let dmgTotal = null, healTotal = null;
        if (dmgFormula && parseDiceFormula(dmgFormula)) {
          const r = rollFormula(dmgFormula);
          dmgTotal = r.total;
          await DB.put('dice_rolls', makeDiceRoll({ campaignId, formula: dmgFormula, dice: r.dice, modifier: r.modifier, total: r.total, purpose: 'AoE effect damage' }));
        }
        if (healFormula && parseDiceFormula(healFormula)) {
          const r = rollFormula(healFormula);
          healTotal = r.total;
        }
        const names = [];
        for (const t of targets) {
          const hp = t.kind === 'combatant' ? t.combatant.hp : t.char.hp;
          if (dmgTotal !== null) hp.current = clamp(hp.current - dmgTotal, 0, hp.max);
          if (healTotal !== null) hp.current = clamp(hp.current + healTotal, 0, hp.max);
          if (condition) {
            const conditions = t.kind === 'combatant' ? t.combatant.conditions : t.char.conditions;
            conditions.push({ conditionId: condition, source: 'aoe_effect', roundsRemaining: null });
          }
          if (t.kind === 'combatant') await DB.put('encounters', activeEncounter);
          else await DB.put('characters', t.char);
          names.push(t.token.name);
        }
        const parts = [];
        if (dmgTotal !== null) parts.push(`${dmgTotal} damage`);
        if (healTotal !== null) parts.push(`${healTotal} healing`);
        if (condition) parts.push(condition);
        const summary = names.length
          ? `An area effect (${parts.join(', ') || 'no change'}) hits ${names.join(', ')}.`
          : `An area effect was triggered but no tokens were in range.`;
        await DB.put('log_entries', makeLogEntry({ campaignId, type: 'system', speakerType: 'system', text: summary }));
        closeModal();
        toast(names.length ? `Applied to ${names.length} target${names.length === 1 ? '' : 's'}.` : 'No targets in range.', 'success');
      };
    });
  }

  function openAddTokenModal() {
    const options = characters.map(c => ({ label: `${c.name} (${c.controlledBy})`, refType: 'character', refId: c.id, color: c.controlledBy === 'bot' ? '#6a93c4' : '#b3893f' }));
    const enemyOptions = activeEncounter ? activeEncounter.combatants.filter(c => c.side === 'enemy').map(c => ({ label: c.name, refType: 'monster', refId: c.refId, color: '#c65454' })) : [];
    const all = [...options, ...enemyOptions];
    openModal(`
      <h2>Add Token</h2>
      <div class="field">
        <label>From</label>
        <select id="tokenSourceSelect">
          ${all.map((o, i) => `<option value="${i}">${escapeHtml(o.label)}</option>`).join('')}
          <option value="generic">Generic marker…</option>
        </select>
      </div>
      <div class="field" id="genericNameField" style="display:none"><label>Name</label><input type="text" id="genericNameInput" placeholder="Marker"></div>
      <div class="field"><label>Custom image (optional)</label><input type="file" id="tokenImageInput" accept="image/*"></div>
      <div class="row" style="margin-top:1rem">
        <button class="btn block" id="atCancel">Cancel</button>
        <button class="btn primary block" id="atAdd">Add</button>
      </div>
    `, (rootEl) => {
      const sel = rootEl.querySelector('#tokenSourceSelect');
      sel.onchange = () => { rootEl.querySelector('#genericNameField').style.display = sel.value === 'generic' ? '' : 'none'; };
      rootEl.querySelector('#atCancel').onclick = closeModal;
      rootEl.querySelector('#atAdd').onclick = async () => {
        let tokenData;
        if (sel.value === 'generic') {
          const name = rootEl.querySelector('#genericNameInput').value.trim() || 'Marker';
          tokenData = { refType: 'generic', refId: null, name, color: '#a598b3' };
        } else {
          const o = all[parseInt(sel.value)];
          tokenData = { refType: o.refType, refId: o.refId, name: o.label.split(' (')[0], color: o.color };
        }
        const imageFile = rootEl.querySelector('#tokenImageInput').files[0];
        let imageData = null;
        if (imageFile) imageData = await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(imageFile); });
        const token = makeToken({ campaignId, mapId, ...tokenData, x: 1, y: 1 });
        token.imageData = imageData;
        await DB.put('tokens', token);
        tokens.push(token);
        closeModal();
        render();
      };
    });
  }

  render();
}
