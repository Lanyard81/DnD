// hex-core.mjs
//
// Pure, dependency-free pointy-top hex grid math (axial coordinates {q, r}),
// implementing the same interface shape as grid-core.mjs's square-grid
// functions (distance/radius/line/cone/line-of-sight) so Map View can branch
// on map.gridType without duplicating call sites. This is the HexGrid
// implementation anticipated behind FEATURE_FLAGS.hexGrid — see DECISIONS.md
// D7 (feature-flagged from day one) and D19 (what actually shipped here).
//
// Mirrored inline into index.html (see "HEX CORE" section) — see D10.
// If you change behavior here, mirror the change in index.html too.

const HEX_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

export function hexDistance(a, b) {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function hexNeighbors(cell) {
  return HEX_DIRECTIONS.map(d => ({ q: cell.q + d.q, r: cell.r + d.r }));
}

// All hexes (excluding the origin) within `radius` hex-steps of `origin`.
export function cellsInHexRadius(origin, radius) {
  const cells = [];
  for (let dq = -radius; dq <= radius; dq++) {
    const rMin = Math.max(-radius, -dq - radius);
    const rMax = Math.min(radius, -dq + radius);
    for (let dr = rMin; dr <= rMax; dr++) {
      if (dq === 0 && dr === 0) continue;
      cells.push({ q: origin.q + dq, r: origin.r + dr });
    }
  }
  return cells;
}

// Pointy-top axial -> pixel center, given a hex "size" (center to corner).
export function hexToPixel(cell, size) {
  return { x: size * Math.sqrt(3) * (cell.q + cell.r / 2), y: size * 1.5 * cell.r };
}

// The 6 corner points of a pointy-top hex centered at `center` (pixel space).
export function hexCorners(center, size) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({ x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) });
  }
  return corners;
}

function cubeRound(x, y, z) {
  let rx = Math.round(x), ry = Math.round(y), rz = Math.round(z);
  const dx = Math.abs(rx - x), dy = Math.abs(ry - y), dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx, r: rz };
}

// A hex-distance-long, one-hex-wide line from `origin` to `target`, inclusive
// of both endpoints (mirrors bresenhamLine's inclusive-endpoints contract).
export function hexLine(origin, target) {
  const n = hexDistance(origin, target);
  if (n === 0) return [{ ...origin }];
  const results = [];
  const ax = origin.q, az = origin.r, ay = -ax - az;
  const bx = target.q, bz = target.r, by = -bx - bz;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
    const rounded = cubeRound(x, y, z);
    results.push(rounded);
  }
  return results;
}

// A `length`-hex-long AoE line template from `origin` toward `target`
// (excluding the origin), matching cellsInLine's contract.
export function cellsInHexLine(origin, target, length) {
  const dist = hexDistance(origin, target);
  if (dist === 0) return [];
  // Walk `length` steps toward target using fractional cube lerp past the target if needed.
  const ax = origin.q, az = origin.r, ay = -ax - az;
  const bx = target.q, bz = target.r, by = -bx - bz;
  const cells = [];
  for (let i = 1; i <= length; i++) {
    const t = i / dist;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
    cells.push(cubeRound(x, y, z));
  }
  return cells;
}

// A cone from `origin` toward `target`, `length` hexes long: every hex within
// range whose *pixel-space* direction from the origin is within ~45 degrees
// of the aim direction — pixel space is used (not axial deltas) so the cone
// looks visually correct on a hex grid rather than skewed by the axial basis.
export function cellsInHexCone(origin, target, length, size) {
  const originPx = hexToPixel(origin, size || 1);
  const targetPx = hexToPixel(target, size || 1);
  const dirX = targetPx.x - originPx.x, dirY = targetPx.y - originPx.y;
  const dirMag = Math.sqrt(dirX * dirX + dirY * dirY);
  if (dirMag === 0) return [];
  return cellsInHexRadius(origin, length).filter(cell => {
    const px = hexToPixel(cell, size || 1);
    const dx = px.x - originPx.x, dy = px.y - originPx.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag === 0) return false;
    const dot = (dx * dirX + dy * dirY) / (mag * dirMag);
    return dot >= Math.SQRT1_2 - 0.001;
  });
}

export function hasHexLineOfSight(a, b, blockedCells) {
  const line = hexLine(a, b);
  for (let i = 1; i < line.length - 1; i++) {
    if (blockedCells.has(`${line[i].q},${line[i].r}`)) return false;
  }
  return true;
}
