import { describe, it, expect } from 'vitest';
import {
  hexDistance, hexNeighbors, cellsInHexRadius, hexToPixel, hexCorners,
  hexLine, cellsInHexLine, cellsInHexCone, hasHexLineOfSight
} from '../src/hex-core.mjs';

describe('hexDistance', () => {
  it('is 0 for the same cell', () => {
    expect(hexDistance({ q: 2, r: -1 }, { q: 2, r: -1 })).toBe(0);
  });
  it('is 1 for adjacent cells', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(1);
    expect(hexDistance({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(1);
  });
  it('matches known axial distances', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -3 })).toBe(3);
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: 2 })).toBe(4);
  });
});

describe('hexNeighbors', () => {
  it('returns exactly 6 neighbors, all at distance 1', () => {
    const origin = { q: 5, r: -2 };
    const neighbors = hexNeighbors(origin);
    expect(neighbors).toHaveLength(6);
    neighbors.forEach(n => expect(hexDistance(origin, n)).toBe(1));
  });
});

describe('cellsInHexRadius', () => {
  it('excludes the origin', () => {
    const cells = cellsInHexRadius({ q: 0, r: 0 }, 2);
    expect(cells.some(c => c.q === 0 && c.r === 0)).toBe(false);
  });
  it('produces the correct ring count (6*radius for radius>0, cumulative for a filled disk)', () => {
    // A filled hex disk of radius N has 3N(N+1) cells excluding the origin.
    const cells = cellsInHexRadius({ q: 0, r: 0 }, 2);
    expect(cells).toHaveLength(3 * 2 * 3); // 18
  });
  it('every cell is within the requested radius', () => {
    const origin = { q: 0, r: 0 };
    const cells = cellsInHexRadius(origin, 3);
    cells.forEach(c => expect(hexDistance(origin, c)).toBeLessThanOrEqual(3));
  });
});

describe('hexToPixel / hexCorners', () => {
  it('places the origin hex at pixel (0,0)', () => {
    expect(hexToPixel({ q: 0, r: 0 }, 10)).toEqual({ x: 0, y: 0 });
  });
  it('produces 6 corners around the center', () => {
    const corners = hexCorners({ x: 0, y: 0 }, 10);
    expect(corners).toHaveLength(6);
    corners.forEach(c => {
      const dist = Math.sqrt(c.x * c.x + c.y * c.y);
      expect(dist).toBeCloseTo(10, 5);
    });
  });
});

describe('hexLine', () => {
  it('includes both endpoints', () => {
    const line = hexLine({ q: 0, r: 0 }, { q: 3, r: 0 });
    expect(line[0]).toEqual({ q: 0, r: 0 });
    expect(line[line.length - 1]).toEqual({ q: 3, r: 0 });
  });
  it('has hexDistance+1 cells for a straight line', () => {
    const a = { q: 0, r: 0 }, b = { q: 4, r: -2 };
    const line = hexLine(a, b);
    expect(line).toHaveLength(hexDistance(a, b) + 1);
  });
  it('handles a zero-length line (same cell)', () => {
    expect(hexLine({ q: 1, r: 1 }, { q: 1, r: 1 })).toEqual([{ q: 1, r: 1 }]);
  });
});

describe('cellsInHexLine', () => {
  it('excludes the origin and extends toward the target', () => {
    const cells = cellsInHexLine({ q: 0, r: 0 }, { q: 10, r: 0 }, 3);
    expect(cells.some(c => c.q === 0 && c.r === 0)).toBe(false);
    expect(cells).toHaveLength(3);
  });
});

describe('cellsInHexCone', () => {
  it('includes cells roughly along the aim direction', () => {
    const cells = cellsInHexCone({ q: 0, r: 0 }, { q: 1, r: 0 }, 3, 1);
    expect(cells).toContainEqual({ q: 2, r: 0 });
  });
  it('excludes cells behind the origin', () => {
    const cells = cellsInHexCone({ q: 0, r: 0 }, { q: 1, r: 0 }, 3, 1);
    expect(cells).not.toContainEqual({ q: -2, r: 0 });
  });
});

describe('hasHexLineOfSight', () => {
  it('is true with nothing blocking', () => {
    expect(hasHexLineOfSight({ q: 0, r: 0 }, { q: 4, r: 0 }, new Set())).toBe(true);
  });
  it('is false when a cell strictly between the endpoints is blocked', () => {
    const line = hexLine({ q: 0, r: 0 }, { q: 4, r: 0 });
    const blocked = new Set([`${line[2].q},${line[2].r}`]);
    expect(hasHexLineOfSight({ q: 0, r: 0 }, { q: 4, r: 0 }, blocked)).toBe(false);
  });
});
