// grid-core.mjs
//
// Pure, dependency-free square-grid math for FableTable Solo's map/board view:
// distance, AoE template cell sets (circle/cube/cone/line), and a simple
// Bresenham-based line-of-sight check against a set of blocked cells.
//
// Deliberately built behind a small interface (distance/cellsInRadius/etc.)
// so a HexGrid implementation can be added later (see DECISIONS.md D7) without
// callers changing — feature-flagged off for now, no hex math exists yet.
//
// Mirrored inline into index.html (see "GRID CORE" section) — see D10.
// If you change behavior here, mirror the change in index.html too.

// "D&D-style" 5-ft-square distance: diagonal move costs the same as
// orthogonal (Chebyshev distance), which is what movement-range/most AoE
// reasoning in this app uses.
export function gridDistance(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

// All cells (excluding the origin) within `radiusCells` of `origin`, using
// true Euclidean distance so the shape reads as a circle rather than a
// diamond/square on the grid.
export function cellsInCircle(origin, radiusCells) {
  const cells = [];
  const r = Math.ceil(radiusCells);
  for (let dx = -r; dx <= r; dx++) {
    for (let dy = -r; dy <= r; dy++) {
      if (dx === 0 && dy === 0) continue;
      if (Math.sqrt(dx * dx + dy * dy) <= radiusCells + 0.001) {
        cells.push({ x: origin.x + dx, y: origin.y + dy });
      }
    }
  }
  return cells;
}

// A square/cube template: all cells (excluding origin) within Chebyshev
// distance `halfSize` of `origin`.
export function cellsInSquare(origin, halfSize) {
  const cells = [];
  for (let dx = -halfSize; dx <= halfSize; dx++) {
    for (let dy = -halfSize; dy <= halfSize; dy++) {
      if (dx === 0 && dy === 0) continue;
      cells.push({ x: origin.x + dx, y: origin.y + dy });
    }
  }
  return cells;
}

// Bresenham line from `a` to `b`, inclusive of both endpoints.
export function bresenhamLine(a, b) {
  const points = [];
  let x0 = a.x, y0 = a.y;
  const x1 = b.x, y1 = b.y;
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  while (true) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
  return points;
}

// A `length`-cell-long, one-cell-wide line template from `origin` toward
// `target` (excluding the origin cell itself).
export function cellsInLine(origin, target, length) {
  if (origin.x === target.x && origin.y === target.y) return [];
  const dx = target.x - origin.x, dy = target.y - origin.y;
  const mag = Math.sqrt(dx * dx + dy * dy);
  const farPoint = { x: Math.round(origin.x + (dx / mag) * length), y: Math.round(origin.y + (dy / mag) * length) };
  return bresenhamLine(origin, farPoint).filter(p => !(p.x === origin.x && p.y === origin.y));
}

// A roughly-90-degree cone template from `origin` toward `target`, `length`
// cells long: every cell within range whose angle from the origin-to-target
// direction is within +/-45 degrees.
export function cellsInCone(origin, target, length) {
  const dirX = target.x - origin.x, dirY = target.y - origin.y;
  const dirMag = Math.sqrt(dirX * dirX + dirY * dirY);
  if (dirMag === 0) return [];
  const cells = [];
  for (let dx = -length; dx <= length; dx++) {
    for (let dy = -length; dy <= length; dy++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > length + 0.001) continue;
      const dot = (dx * dirX + dy * dirY) / (dist * dirMag);
      if (dot >= Math.SQRT1_2 - 0.001) { // within ~45 degrees of the aim direction
        cells.push({ x: origin.x + dx, y: origin.y + dy });
      }
    }
  }
  return cells;
}

// True if nothing in `blockedCells` (a Set of "x,y" strings) sits strictly
// between `a` and `b` on the grid line connecting them.
export function hasLineOfSight(a, b, blockedCells) {
  const line = bresenhamLine(a, b);
  for (let i = 1; i < line.length - 1; i++) {
    const key = `${line[i].x},${line[i].y}`;
    if (blockedCells.has(key)) return false;
  }
  return true;
}

export function cellKey(cell) { return `${cell.x},${cell.y}`; }
