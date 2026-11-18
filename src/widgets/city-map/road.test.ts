import { describe, expect, it } from 'vitest';
import { makeRoad } from './road';

const pts = [{ x: -80, y: 720 }, { x: 200, y: 680 }, { x: 580, y: 410 }, { x: 960, y: 680 }, { x: 1340, y: 410 }, { x: 1700, y: 350 }];

describe('the map road', () => {
  const road = makeRoad(pts);

  it('draws the same path string the map always drew', () => {
    expect(road.d.startsWith('M-80 720 C')).toBe(true);
    expect(road.d.split(' C')).toHaveLength(pts.length);
    expect(road.d.endsWith(' 1700 350')).toBe(true);
  });

  it('knows the length at every point it passes through, and lands on that point', () => {
    expect(road.at).toHaveLength(pts.length);
    expect(road.at[0]).toBe(0);
    for (let i = 1; i < pts.length; i++) expect(road.at[i]!).toBeGreaterThan(road.at[i - 1]!);
    pts.forEach((p, i) => {
      const q = road.pointAt(road.at[i]!);
      expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeLessThan(0.5);
    });
  });

  it('is at least as long as the straight lines between its points, and not far longer', () => {
    const straight = pts.slice(1).reduce((s, p, i) => s + Math.hypot(p.x - pts[i]!.x, p.y - pts[i]!.y), 0);
    expect(road.total).toBeGreaterThanOrEqual(straight);
    expect(road.total).toBeLessThan(straight * 1.3);
  });

  it('clamps lengths off either end', () => {
    expect(road.pointAt(-50)).toEqual(road.pointAt(0));
    const end = road.pointAt(road.total + 99);
    expect(Math.hypot(end.x - 1700, end.y - 350)).toBeLessThan(0.5);
  });
});
