import { TRAVEL, type World } from '../engine';

/*
 * The moving parts of the board, drawn on a canvas each frame: the roads, every request on its way,
 * and a red cross where one is lost. Places are fractions of the board, shared with the nodes laid
 * out in the DOM over the canvas (Board.tsx), so the dots meet the boxes.
 */

export const GATE = { x: 0.47, y: 0.5 };
export const CUSTOMERS = { x: 0.15, y: 0.4 };
export const BOTS = { x: 0.15, y: 0.84 };
/** Where server slot i of n sits. */
export const serverAt = (i: number, n: number) => ({ x: 0.83, y: n === 1 ? 0.5 : 0.17 + (i * 0.66) / (n - 1) });

const INK = '#16252D', PARCEL = '#FFC02E', BOT = '#E0483E', ROAD = '#C9D0C3';

/** Where a request starts: customers spread a little up and down their side, bots from below. */
function sourceOf(client: number, bot: boolean) {
  if (bot) return { x: BOTS.x + 0.03, y: BOTS.y };
  const k = client % 9;
  return { x: CUSTOMERS.x + 0.03, y: CUSTOMERS.y - 0.16 + (k / 8) * 0.32 };
}

export function drawBoard(canvas: HTMLCanvasElement | null, w: World) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  // sharp enough at 2x; a 3x phone would paint more than twice the pixels every frame for nothing visible
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  const X = (f: number) => f * cw, Y = (f: number) => f * ch;
  const slots = w.sc.maxServers;
  const wave = w.sc.waves[w.wave];

  // roads: customers (and bots) to the gateway, the gateway to every server slot
  ctx.lineCap = 'round';
  const road = (a: { x: number; y: number }, b: { x: number; y: number }, built: boolean) => {
    ctx.strokeStyle = built ? ROAD : '#E3E6DF';
    ctx.lineWidth = built ? 10 : 6;
    ctx.setLineDash(built ? [] : [6, 8]);
    ctx.beginPath(); ctx.moveTo(X(a.x), Y(a.y)); ctx.lineTo(X(b.x), Y(b.y)); ctx.stroke();
  };
  road(CUSTOMERS, GATE, true);
  if (wave?.bots) road(BOTS, GATE, true);
  for (let i = 0; i < slots; i++) {
    const built = i < w.servers.length;
    // without a load balancer only the first server is reachable
    road(GATE, serverAt(i, slots), built && (w.lb || i === 0));
  }
  ctx.setLineDash([]);

  // requests on their way, and losses; between waves the board rests empty (a broken wave keeps its last
  // moment on screen, so the pile-up the learner is asked about stays visible)
  if (w.phase !== 'run' && w.phase !== 'broken') return;
  // one path per colour: a bot flood puts a hundred and more dots on the board, and one fill and one
  // stroke for all of them costs a phone far less than a fill and a stroke each
  const r = Math.max(3.5, Math.min(6, cw / 110));
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = INK;
  for (const bot of [false, true]) {
    ctx.beginPath();
    for (const q of w.flying) {
      if (q.bot !== bot) continue;
      const p = Math.min(1, (w.t - q.t0) / TRAVEL);
      const a = q.leg === 'in' ? sourceOf(q.client, q.bot) : GATE;
      const b = q.leg === 'in' ? GATE : serverAt(q.server, slots);
      const x = X(a.x + (b.x - a.x) * p), y = Y(a.y + (b.y - a.y) * p);
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = bot ? BOT : PARCEL;
    ctx.fill();
    ctx.stroke();
  }

  // lost requests: a red cross that fades out where it happened
  ctx.lineWidth = 3;
  for (const f of w.flashes) {
    const age = (w.t - f.t) / 0.5;
    const at = f.at === 'gate' ? GATE : serverAt(f.at, slots);
    const jitter = ((f.t * 977) % 1) - 0.5;
    const x = X(at.x) + jitter * 30 - (f.at === 'gate' ? 0 : 34), y = Y(at.y) + jitter * 24 - 18 * age;
    ctx.globalAlpha = Math.max(0, 1 - age);
    ctx.strokeStyle = f.bot ? '#9E2A22' : BOT;
    ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
