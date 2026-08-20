/* ---- Hex grid core functions ---- */
// Mirrored 1:1 from src/hex-core.mjs (see tests/hex-core.test.mjs).
// FEATURE_FLAGS.hexGrid gates whether map creation offers hex as an option —
// see D7 (flagged from day one) / D19 (what shipped). If you change behavior
// here, mirror the change in src/hex-core.mjs too.
const HEX_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];
function hexDistance(a, b) {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}
function hexNeighbors(cell) {
  return HEX_DIRECTIONS.map(d => ({ q: cell.q + d.q, r: cell.r + d.r }));
}
function cellsInHexRadius(origin, radius) {
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
function hexToPixel(cell, size) {
  return { x: size * Math.sqrt(3) * (cell.q + cell.r / 2), y: size * 1.5 * cell.r };
}
function hexCorners(center, size) {
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
function hexLine(origin, target) {
  const n = hexDistance(origin, target);
  if (n === 0) return [{ ...origin }];
  const results = [];
  const ax = origin.q, az = origin.r, ay = -ax - az;
  const bx = target.q, bz = target.r, by = -bx - bz;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t, z = az + (bz - az) * t;
    results.push(cubeRound(x, y, z));
  }
  return results;
}
function cellsInHexLine(origin, target, length) {
  const dist = hexDistance(origin, target);
  if (dist === 0) return [];
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
function cellsInHexCone(origin, target, length, size) {
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
function hasHexLineOfSight(a, b, blockedCells) {
  const line = hexLine(a, b);
  for (let i = 1; i < line.length - 1; i++) {
    if (blockedCells.has(`${line[i].q},${line[i].r}`)) return false;
  }
  return true;
}
