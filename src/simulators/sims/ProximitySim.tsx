import { useMemo, useState } from 'react';
import { bn } from '@/shared/lib/bn';
import { mulberry32 } from '@/simulators/traffic';
import { SimFrame, Slider, Toggle, useLatched, type Metric } from '../frame/SimFrame';
import { useClock } from '../knob/anim';
import { tr } from '@/shared/lib/i18n';

const MAP_KM = 20;
const CELLS: Record<number, number> = { 4: 2, 5: 4, 6: 8, 7: 16 };
const SHOPS = (() => {
  const r = mulberry32(16);
  return Array.from({ length: 500 }, () => ({ x: r() * MAP_KM, y: r() * MAP_KM }));
})();

/** Level 16 · geohash cells: precision, search radius, and why neighbours matter. */
export function ProximitySim({ onFinish }: { onFinish: (done: number) => void }) {
  const [precision, setPrecision] = useState(5);
  const [radius, setRadius] = useState(2);
  const [neighbors, setNeighbors] = useState(false);
  const [me, setMe] = useState({ x: 9.7, y: 10.2 });

  const t = useClock(30);
  const n = CELLS[precision]!;
  const size = MAP_KM / n;
  const cell = (p: { x: number; y: number }) => ({ cx: Math.min(n - 1, Math.floor(p.x / size)), cy: Math.min(n - 1, Math.floor(p.y / size)) });
  const mine = cell(me);
  const r = useMemo(() => {
    const inSearch = (p: { x: number; y: number }) => { const c = cell(p); return neighbors ? Math.abs(c.cx - mine.cx) <= 1 && Math.abs(c.cy - mine.cy) <= 1 : c.cx === mine.cx && c.cy === mine.cy; };
    const near = (p: { x: number; y: number }) => Math.hypot(p.x - me.x, p.y - me.y) <= radius;
    let checked = 0, found = 0, missed = 0;
    const kind = SHOPS.map((s) => {
      const c = inSearch(s), nr = near(s);
      if (c) checked++;
      if (c && nr) { found++; return 'found'; }
      if (nr) { missed++; return 'missed'; }
      return c ? 'checked' : 'none';
    });
    return { checked, found, missed, kind };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precision, radius, neighbors, me.x, me.y]);

  const done = useLatched([
    !neighbors && r.missed > 0,
    neighbors && r.missed === 0 && r.found >= 3,
    neighbors && r.missed === 0 && r.found >= 1 && r.checked <= 40,
  ]);
  const metrics: Metric[] = [
    { label: tr('পাওয়া দোকান', 'Shops found'), value: bn(r.found), tone: r.found ? 'good' : 'neutral' },
    { label: tr('কাছে থেকেও বাদ', 'Missed though nearby'), value: bn(r.missed), tone: r.missed ? 'bad' : 'good' },
    { label: tr('যাচাই করা দোকান', 'Shops checked'), value: `${bn(r.checked)}/${bn(SHOPS.length)}`, tone: r.checked > 40 ? 'bad' : 'good' },
    { label: tr('Cell-এর পাশ', 'Cell width'), value: `${bn(size.toFixed(2), { grouping: false })} km` },
  ];
  const sc = 100 / MAP_KM;
  const color: Record<string, string> = { found: '#0B8A7A', missed: '#E0483E', checked: '#2F6FDE', none: '#AAB3A8' };

  return (
    <SimFrame
      title={tr('কাছের pickup point', 'Nearest pickup point')}
      intro={tr(`${bn(MAP_KM)} km × ${bn(MAP_KM)} km শহরে ${bn(SHOPS.length)}টা pickup point। Map-এ click করে ক্রেতাকে সরান।`, `${MAP_KM} km × ${MAP_KM} km city with ${SHOPS.length} pickup points. Click the map to move the customer.`)}
      onFinish={onFinish}
      controls={<>
        <Slider label="Geohash precision" value={precision} min={4} max={7} onChange={setPrecision} />
        <Slider label={tr('খোঁজার ব্যাসার্ধ', 'Search radius')} value={radius} min={0.5} max={5} step={0.5} onChange={setRadius} format={(v) => `${bn(v, { grouping: false })} km`} />
        <Toggle label={tr('পাশের ৮টা cell-ও খুঁজুন', 'Also search the 8 neighbouring cells')} on={neighbors} onChange={setNeighbors} />
      </>}
      stage={
        <svg
          viewBox="0 0 100 100"
          className="mx-auto block h-full max-h-[420px] w-full cursor-crosshair"
          role="img"
          aria-label={tr(`ক্রেতার কাছে ${bn(r.found)}টা পাওয়া গেল, ${bn(r.missed)}টা বাদ পড়ল`, `${r.found} found near the customer, ${r.missed} missed`)}
          onClick={(e) => { const b = (e.currentTarget as SVGSVGElement).getBoundingClientRect(); const s = Math.min(b.width, b.height); const ox = (b.width - s) / 2, oy = (b.height - s) / 2; setMe({ x: Math.max(0, Math.min(MAP_KM, ((e.clientX - b.left - ox) / s) * MAP_KM)), y: Math.max(0, Math.min(MAP_KM, ((e.clientY - b.top - oy) / s) * MAP_KM)) }); }}
        >
          <rect x="0" y="0" width="100" height="100" fill="#EEF1E8" />
          {[-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => {
            const cx = mine.cx + dx, cy = mine.cy + dy;
            if (cx < 0 || cy < 0 || cx >= n || cy >= n) return null;
            const on = (dx === 0 && dy === 0) || neighbors;
            return on ? <rect key={`${dx}${dy}`} x={cx * size * sc} y={cy * size * sc} width={size * sc} height={size * sc} fill="#FFC02E" opacity={dx === 0 && dy === 0 ? 0.45 : 0.25} /> : null;
          }))}
          {Array.from({ length: n + 1 }, (_, i) => <g key={i}><line x1={i * size * sc} y1="0" x2={i * size * sc} y2="100" stroke="#16252D" strokeOpacity="0.25" strokeWidth="0.25" /><line x1="0" y1={i * size * sc} x2="100" y2={i * size * sc} stroke="#16252D" strokeOpacity="0.25" strokeWidth="0.25" /></g>)}
          {SHOPS.map((s, i) => <circle key={i} cx={s.x * sc} cy={s.y * sc} r={r.kind[i] === 'none' ? 0.55 : 0.9} fill={color[r.kind[i]!]} />)}
          <circle cx={me.x * sc} cy={me.y * sc} r={radius * sc} fill="none" stroke="#16252D" strokeWidth="0.5" strokeDasharray="1.5 1" />
          <circle cx={me.x * sc} cy={me.y * sc} r={((t * 0.7) % 1) * radius * sc} fill="#E0483E" fillOpacity={0.12 * (1 - ((t * 0.7) % 1))} stroke="#E0483E" strokeOpacity={0.6 * (1 - ((t * 0.7) % 1))} strokeWidth="0.4" />
          <circle cx={me.x * sc} cy={me.y * sc} r="1.8" fill="#E0483E" stroke="#16252D" strokeWidth="0.5" />
        </svg>
      }
      metrics={metrics}
      missions={[
        { text: tr('শুধু নিজের cell খুঁজে এমন জায়গা খুঁজুন যেখানে কাছের দোকান বাদ পড়ে', 'Searching only your own cell, find a spot where a nearby shop is missed'), done: done[0]!, hint: tr('ক্রেতাকে cell-এর কিনারায় নিয়ে যান।', 'Move the customer to the edge of a cell.') },
        { text: tr('একটাও কাছের দোকান বাদ না দিয়ে ৩+ দোকান খুঁজুন', 'Find 3+ shops without missing any nearby one'), done: done[1]! },
        { text: tr('কিছুই বাদ না দিয়ে ৪০টার কম দোকান যাচাই করুন', 'Check fewer than 40 shops without missing any'), done: done[2]!, hint: tr('ছোট cell, কিন্তু ব্যাসার্ধ যেন cell-এর চেয়ে বড় না হয়।', 'Small cells, but the radius must not exceed the cell.') },
      ]}
    />
  );
}
