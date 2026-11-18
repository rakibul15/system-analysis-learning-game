/*
 * The city map's road, as numbers: a smooth curve through points (Catmull–Rom turned into cubic
 * Bézier segments), with arc lengths worked out once in plain JavaScript. The map used to ask the
 * browser for hundreds of points along the drawn path for every stop (getPointAtLength), which held
 * up a tap on a chapter tab for seconds on a slow phone.
 */

export interface P { x: number; y: number }
/** One cubic segment: from, two control points, to. */
type Seg = [P, P, P, P];

/** Samples per segment for the arc-length table: plenty for a road a van drives along. */
const STEPS = 48;

const round1 = (n: number) => Math.round(n * 10) / 10;

function segments(points: P[]): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!, p1 = points[i]!, p2 = points[i + 1]!, p3 = points[i + 2] ?? p2;
    // rounded like the path string, so the numbers and the drawing are the same curve
    const c1 = { x: round1(p1.x + (p2.x - p0.x) / 6), y: round1(p1.y + (p2.y - p0.y) / 6) };
    const c2 = { x: round1(p2.x - (p3.x - p1.x) / 6), y: round1(p2.y - (p3.y - p1.y) / 6) };
    out.push([p1, c1, c2, p2]);
  }
  return out;
}

function bezier([a, b, c, d]: Seg, t: number): P {
  const u = 1 - t;
  const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
  return { x: w0 * a.x + w1 * b.x + w2 * c.x + w3 * d.x, y: w0 * a.y + w1 * b.y + w2 * c.y + w3 * d.y };
}

export interface Road {
  /** The SVG path. */
  d: string;
  /** Length of the whole road. */
  total: number;
  /** Length along the road at each point it was built through. */
  at: number[];
  /** The point at a length along the road. */
  pointAt(len: number): P;
}

export function makeRoad(points: P[]): Road {
  const segs = segments(points);
  const d = `M${points[0]!.x} ${points[0]!.y}` + segs.map(([, b, c, e]) => ` C${b.x.toFixed(1)} ${b.y.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)} ${e.x} ${e.y}`).join('');
  // per segment: cumulative length at each sample, for turning a length back into a point
  const tables = segs.map((s) => {
    const lens = [0];
    let prev = s[0];
    for (let i = 1; i <= STEPS; i++) {
      const p = bezier(s, i / STEPS);
      lens.push(lens[i - 1]! + Math.hypot(p.x - prev.x, p.y - prev.y));
      prev = p;
    }
    return lens;
  });
  const starts = [0];
  for (const t of tables) starts.push(starts[starts.length - 1]! + t[STEPS]!);
  const total = starts[starts.length - 1]!;

  const pointAt = (len: number): P => {
    const l = Math.max(0, Math.min(total, len));
    let k = 0;
    while (k < segs.length - 1 && starts[k + 1]! < l) k++;
    const local = l - starts[k]!, t = tables[k]!;
    let i = 1;
    while (i < STEPS && t[i]! < local) i++;
    const span = t[i]! - t[i - 1]!;
    const f = span > 0 ? (local - t[i - 1]!) / span : 0;
    return bezier(segs[k]!, (i - 1 + f) / STEPS);
  };

  return { d, total, at: starts, pointAt };
}
