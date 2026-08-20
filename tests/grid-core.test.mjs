import { describe, it, expect } from 'vitest';
import {
  gridDistance, cellsInCircle, cellsInSquare, bresenhamLine, cellsInLine, cellsInCone, hasLineOfSight, cellKey
} from '../src/grid-core.mjs';

describe('gridDistance', () => {
  it('uses Chebyshev distance (diagonal = orthogonal cost)', () => {
    expect(gridDistance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
    expect(gridDistance({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(3);
    expect(gridDistance({ x: 0, y: 0 }, { x: 2, y: 5 })).toBe(5);
  });
});

describe('cellsInCircle', () => {
  it('excludes the origin', () => {
    const cells = cellsInCircle({ x: 0, y: 0 }, 2);
    expect(cells.some(c => c.x === 0 && c.y === 0)).toBe(false);
  });
  it('includes orthogonally-adjacent cells within radius', () => {
    const cells = cellsInCircle({ x: 0, y: 0 }, 1);
    expect(cells).toContainEqual({ x: 1, y: 0 });
    expect(cells).toContainEqual({ x: -1, y: 0 });
    expect(cells).toContainEqual({ x: 0, y: 1 });
  });
  it('excludes far corner cells outside the radius', () => {
    const cells = cellsInCircle({ x: 0, y: 0 }, 1);
    // diagonal distance sqrt(2) ~1.41 > radius 1, should be excluded
    expect(cells).not.toContainEqual({ x: 1, y: 1 });
  });
});

describe('cellsInSquare', () => {
  it('produces a (2*halfSize+1)^2 - 1 cell square excluding origin', () => {
    const cells = cellsInSquare({ x: 5, y: 5 }, 1);
    expect(cells).toHaveLength(8); // 3x3 minus origin
    expect(cells).toContainEqual({ x: 6, y: 6 }); // corners included (square, not circle)
  });
});

describe('bresenhamLine', () => {
  it('includes both endpoints', () => {
    const line = bresenhamLine({ x: 0, y: 0 }, { x: 3, y: 0 });
    expect(line[0]).toEqual({ x: 0, y: 0 });
    expect(line[line.length - 1]).toEqual({ x: 3, y: 0 });
  });
  it('produces a straight horizontal line', () => {
    const line = bresenhamLine({ x: 0, y: 0 }, { x: 3, y: 0 });
    expect(line).toEqual([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }]);
  });
});

describe('cellsInLine', () => {
  it('excludes the origin and extends toward the target', () => {
    const cells = cellsInLine({ x: 0, y: 0 }, { x: 10, y: 0 }, 3);
    expect(cells.some(c => c.x === 0 && c.y === 0)).toBe(false);
    expect(cells).toContainEqual({ x: 1, y: 0 });
    expect(cells).toContainEqual({ x: 3, y: 0 });
    expect(cells).not.toContainEqual({ x: 4, y: 0 });
  });
});

describe('cellsInCone', () => {
  it('includes cells directly along the aim direction', () => {
    const cells = cellsInCone({ x: 0, y: 0 }, { x: 1, y: 0 }, 3);
    expect(cells).toContainEqual({ x: 2, y: 0 });
  });
  it('excludes cells directly behind the origin', () => {
    const cells = cellsInCone({ x: 0, y: 0 }, { x: 1, y: 0 }, 3);
    expect(cells).not.toContainEqual({ x: -2, y: 0 });
  });
  it('excludes cells beyond the cone length', () => {
    const cells = cellsInCone({ x: 0, y: 0 }, { x: 1, y: 0 }, 2);
    expect(cells).not.toContainEqual({ x: 5, y: 0 });
  });
});

describe('hasLineOfSight', () => {
  it('is true with nothing blocking', () => {
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 4, y: 0 }, new Set())).toBe(true);
  });
  it('is false when a cell strictly between the endpoints is blocked', () => {
    const blocked = new Set([cellKey({ x: 2, y: 0 })]);
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 4, y: 0 }, blocked)).toBe(false);
  });
  it('ignores blockers at the endpoints themselves', () => {
    const blocked = new Set([cellKey({ x: 0, y: 0 }), cellKey({ x: 4, y: 0 })]);
    expect(hasLineOfSight({ x: 0, y: 0 }, { x: 4, y: 0 }, blocked)).toBe(true);
  });
});
