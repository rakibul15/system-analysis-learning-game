import type { TrafficRules } from '@/simulators/traffic';
import { level } from '../../dsl';
import { refs } from '../../refs';

/* Chapter 1 · From zero to millions of customers — Vol 1, ch 1–4 (English) */

const scoring = { pointsPerParcel: 10, comboStep: 5, maxMultiplier: 3, happinessLossPerDrop: 12 };
const manual: TrafficRules = {
  durationSeconds: 30,
  spawnInterval: { start: 1.3, end: 0.9 },
  travelSeconds: { approach: 2.2, branch: 1.3 },
  hubs: [{ capacity: 6, serviceSeconds: 1.8 }, { capacity: 6, serviceSeconds: 1.8 }],
  outages: [{ hub: 1, downAt: 13, upAt: 20, warnBefore: 2 }],
  policy: 'manual',
  healthCheck: false,
  scoring,
};

export const l1 = level({
  id: 1, chapter: 1, minutes: 18,
  title: 'The first rush', concept: 'Load balancer · Replication',
  story: 'When the site falls, everything stops',
  briefing: 'ParcelGo, day one: the web app and the database share a single server. Orders surge before Eid, the server slows, then falls over. The whole shop is closed. Today you learn how to stop one broken part from halting the whole business.',
  ref: refs.p1,
  predict: ['With everything on one server, what is the biggest risk?', ['If it falls, the whole site is down', 'Deploying code takes much longer', 'The database cannot build any index', 'More users break the CSS files']],
  nodes: [
    ['u', 'Customer', 'user', 8, 50], ['one', 'One server', 'server', 50, 50],
    ['lb', 'Load balancer', 'lb', 30, 50], ['w1', 'Web 1', 'server', 55, 28], ['w2', 'Web 2', 'server', 55, 72],
    ['m', 'DB master', 'db', 84, 28], ['s', 'DB slave', 'db', 84, 72],
  ],
  steps: [
    { text: 'At the start everything is on one server: web and database together.', add: ['u', 'one'], flow: [['u', 'one']] },
    { text: 'The server falls and everything stops. That is a single point of failure (SPOF).', down: ['one'] },
    { text: 'A load balancer in front, two web servers behind it. Users only know the LB\'s address.', hide: ['one'], add: ['lb', 'w1', 'w2'], flow: [['u', 'lb'], ['lb', 'w1'], ['lb', 'w2']] },
    { text: 'Web 2 suddenly goes down.', down: ['w2'], ask: ['What happens when Web 2 goes down?', ['Traffic goes to Web 1, site stays up', 'The site is down until Web 2 is fixed', 'The LB goes down too, it depends on Web 2', 'Half of all users see errors for good']] },
    { text: 'The health check fails, so the LB sends traffic only to Web 1. The site stays up.', down: ['w2'], ok: ['w1'], flow: [['u', 'lb'], ['lb', 'w1']] },
    { text: 'A single database is also a SPOF. Writes go to the master, a slave keeps a copy (replication), reads come from the slave.', add: ['m', 's'], flow: [['w1', 'm'], ['m', 's'], ['w2', 's']] },
    { text: 'Now the master goes down.', down: ['m'], ask: ['What happens when the master goes down?', ['A slave is promoted; the last few writes may be lost', 'A slave is promoted; no data is ever lost', 'The slave stops too, it is only a copy', 'Reads stop as well until the master returns']] },
    { text: 'A slave is promoted to master (failover). Writes not yet replicated can be lost, so a recovery script is needed.', down: ['m'], ok: ['s'], badges: { s: 'new master' } },
  ],
  summary: [
    'Anything everything depends on, with no backup, is a SPOF',
    'Load balancer + several stateless web servers = horizontal scale and failover',
    'Master–slave replication: writes to master, reads from slaves; promote a slave if the master falls',
  ],
  play: {
    kind: 'traffic',
    intro: {
      kicker: 'Play · 30 seconds', heading: 'Rush hour!',
      body: 'You are the load balancer now. Tap a hub to swing the lever its way, and parcels head there.',
      rules: ['A hub holds at most 6 parcels at once; any more spill over', 'Parcels sent to a closed hub are lost', '5 deliveries in a row doubles your points, 10 triples them'],
    },
    rounds: {
      demo: { ...manual, durationSeconds: null, outages: [], policy: 'roundRobin', healthCheck: true, spawnInterval: { start: 1.3, end: 1.3 } },
      manual,
      auto: { ...manual, durationSeconds: 18, spawnInterval: { start: 0.95, end: 0.95 }, outages: [{ hub: 1, downAt: 6, upAt: 12, warnBefore: 2 }], policy: 'roundRobin', healthCheck: true },
    },
    concepts: [
      { id: 'round-robin', label: 'Round robin', litAt: 0 },
      { id: 'health-check', label: 'Health check', litAt: 6 },
      { id: 'failover', label: 'Failover + retry', litAt: 6 },
    ],
    captions: {
      idle: 'What runs in the background is an automatic load balancer. Try it by hand first, then you will see why it is needed.',
      manual: 'Tap a hub to swing the lever. Never let a hub hold more than 6.',
      manualHubDown: 'Hub 2 is down! Anything sent there now is lost. Watch how much Hub 1 can carry alone.',
      manualHubBack: 'Hub 2 is back. Share the load between both again.',
      autoStart: 'Round robin: the load balancer takes turns by itself, 1, 2, 1, 2… Watch the lever.',
      autoHubDown: 'The health check failed, so Hub 2 is out of the list (failover). Parcels already on the road reroute to Hub 1 (retry).',
      autoHubBack: 'The health check passes again and Hub 2 is back in the list on its own. Nobody had to do anything.',
      afterManual: 'What you just did by hand (taking turns, avoiding a closed hub) is exactly what a load balancer does. Now run the same rush on auto.',
      afterAuto: 'Same rush, same broken hub, but nobody held the lever. Taking turns, dropping an unhealthy hub, bringing it back when healthy: those three are the heart of a load balancer.',
    },
  },
  boss: [
    ['Three web servers behind an LB, one database. Which is the SPOF?', ['The database, and the LB too if single', 'Any one web server, since it takes requests', 'All three web servers, they share code', 'None of them, the LB handles everything'], 'Whatever has no backup is the SPOF. There are three web servers, so losing one is fine; there is only one database.', 'Which one has no copy?'],
    ['Why keep web servers stateless?', ['Any server can take any request', 'Sessions in server memory are faster', 'Stateless means no database is needed', 'Stateless code compiles more quickly'], 'Keep state such as sessions in a shared store (Redis/DB) and the LB can send any request anywhere; autoscaling becomes easy.'],
    ['What is the problem with vertical scaling?', ['One machine has a ceiling and no failover', 'It cannot run without a load balancer', 'The code has to be split up to scale', 'Data must be copied to several places'], 'There is a limit to how big a server you can buy, and if that one server falls everything stops.'],
    ['Many reads, few writes. Biggest win from replication?', ['Reads are spread over many slaves', 'Writes are spread over many masters', 'Total storage needed goes down', 'Queries no longer need indexes'], 'Writes to the master, reads across many slaves: the load spreads in a read-heavy system.'],
    ['What do you need to split users across two data centers?', ['GeoDNS plus data replicated to both', 'Two separate databases with no sync', 'All users in one, the other kept empty', 'A separate domain for each data center'], 'GeoDNS sends each user to the nearer one; if one falls all traffic moves to the other, so the data must live in both.'],
  ],
});

export const l2 = level({
  id: 2, chapter: 1, simulator: 'cache',
  title: 'The quick shelf', concept: 'Cache · CDN',
  story: 'Pages are slow, the DB is struggling',
  briefing: 'The same product page is opened a hundred thousand times a day, and every time it is read from the database. The DB is gasping and pages take 3 seconds. Time to keep the things people ask for most on a shelf within reach.',
  ref: refs.p1,
  predict: ['The same page is opened again and again, read from the DB each time. What helps most?', ['Keep it in a cache', 'Add more columns to the table', 'Restart the server every hour', 'Use fewer images on the page']],
  nodes: [
    ['u', 'Customer', 'user', 8, 55], ['cdn', 'CDN', 'cdn', 30, 18], ['web', 'Web server', 'server', 36, 60],
    ['cache', 'Cache', 'cache', 66, 34], ['db', 'Database', 'db', 86, 66],
  ],
  steps: [
    { text: 'Every request goes all the way to the database: the DB is loaded and pages are slow.', add: ['u', 'web', 'db'], flow: [['u', 'web'], ['web', 'db']] },
    { text: 'Check the cache first. If it is there (a hit), no trip to the DB at all.', add: ['cache'], flow: [['u', 'web'], ['web', 'cache']], ok: ['cache'], badges: { cache: 'hit' } },
    { text: 'If not (a miss), read from the DB and put it in the cache. This is cache-aside.', flow: [['web', 'cache'], ['web', 'db']], badges: { cache: 'miss' } },
    { text: 'This item\'s TTL has run out.', badges: { cache: 'TTL over' }, ask: ['Where does the next request go after the TTL ends?', ['Miss → DB → stored in cache again', 'The old value still comes from cache', 'Request rejected, client must retry', 'Straight to the CDN, not the DB']] },
    { text: 'An expired TTL means a miss: fetch the new value from the DB and store it again. A short TTL keeps data fresh but loads the DB more.', flow: [['web', 'db'], ['web', 'cache']] },
    { text: 'Static files such as images, JS and CSS come from a CDN, a server close to the user.', add: ['cdn'], flow: [['u', 'cdn']], ok: ['cdn'] },
    { text: 'The cache server goes down completely.', down: ['cache'], ask: ['What happens when the cache goes down?', ['Every request hits the DB, which strains', 'The whole site shuts down completely', 'The cached data is lost forever', 'The CDN goes down along with it']] },
    { text: 'All the load lands on the DB: so run several cache servers, and evict (e.g. LRU) when memory fills.', down: ['cache'], flow: [['web', 'db']] },
  ],
  summary: ['Cache-aside: cache first; on a miss, fetch from the DB and store it', 'Short TTL = fresh data but more DB load; long TTL = the opposite', 'Static files on a CDN; the cache must not become a SPOF itself'],
  play: {
    kind: 'missions', intro: 'Three decisions: TTL, eviction and hit-rate arithmetic.',
    missions: [
      ['Prices change often and a wrong price is unacceptable. How do you cache?', ['Short TTL, or invalidate on change', 'One-day TTL, wipe it all at night', 'Never expire, always serve cache', 'Never cache prices under any case'], 'When freshness matters, use a short TTL or invalidate at write time.'],
      ['The cache is full. What do you evict to keep the hit rate high?', ['What nobody asked for longest (LRU)', 'The item that was added most recently', 'Always the first item that was added', 'The largest item, judged by its size'], 'LRU: least recently used. Something asked for recently is likely to be asked for again.'],
      ['Hit rate 90%, 10,000 reads a second. How many reach the DB?', ['1,000', '9,000', '10,000', '100'], '10% miss = 10,000 × 0.1 = 1,000.'],
    ],
  },
  boss: [
    ['What should you not put in a cache?', ['Exact data such as wallet balances', 'Product images and full descriptions', 'The list of categories and names', 'Homepage banners and offers'], 'Cached data can be slightly stale; money cannot take that risk.'],
    ['You change a JS file on the CDN. How do users avoid the old copy?', ['A version in the file name, or invalidation', 'An infinite TTL to keep everything', 'Ask users to clear their browser cache', 'Turn the CDN off for a while'], 'A new name is a new object; the old one simply stops being used.'],
    ['What if there is only one cache server?', ['A SPOF; run several cache servers', 'No problem, the DB is still there', 'DB load actually goes down', 'With a CDN its failure goes unnoticed'], 'The book\'s advice: several cache servers, and a little extra memory.', 'Remember the word from the last level'],
    ['How much does caching help write-heavy, rarely read data?', ['Little, the cache keeps going stale', 'A lot, writes become faster', 'A lot, the DB is not needed', 'The same as for read-heavy data'], 'A cache pays off when the same data is read often but changes rarely.'],
    ['Tracking status page: 10 seconds stale is fine. Best balance of staleness and DB load?', ['A TTL of about 10 seconds', 'No cache, read all from DB', 'A TTL of one whole week', 'Clear the cache on every request'], 'How stale you can tolerate is what sets the TTL.'],
  ],
});

export const l3 = level({
  id: 3, chapter: 1, simulator: 'estimation',
  title: 'The investor\'s question', concept: 'Estimation · Interview framework',
  story: 'An investor asks how many servers you need',
  briefing: 'At the investor meeting: "With ten million customers, how many servers and how much storage?" No calculator, in your head, in five minutes. You will also learn how to split the 45 minutes of an interview.',
  ref: refs.p1,
  predict: ['10 million DAU, 10 requests each per day. Average QPS, roughly?', ['~1,200', '~120', '~12,000', '~10 million']],
  nodes: [
    ['dau', 'DAU', 'user', 10, 40], ['req', 'Requests/day', 'step', 30, 40], ['qps', 'QPS', 'step', 50, 40],
    ['peak', 'Peak QPS', 'step', 70, 40], ['st', 'Storage', 'store', 90, 40],
    ['f1', 'Requirements', 'step', 14, 82], ['f2', 'High-level', 'step', 38, 82], ['f3', 'Deep dive', 'step', 62, 82], ['f4', 'Wrap-up', 'step', 86, 82],
  ],
  steps: [
    { text: 'Start with DAU: say 10 million users come every day.', add: ['dau'], badges: { dau: '10 million' } },
    { text: '10 requests each per day: 100 million a day.', add: ['req'], flow: [['dau', 'req']], badges: { req: '100 million' } },
    { text: 'A day is ~100,000 seconds (86,400). 100 million ÷ 100,000 ≈ 1,000–1,200 QPS.', add: ['qps'], flow: [['req', 'qps']], badges: { qps: '~1,200' } },
    { text: 'Now the busiest moment of the day.', add: ['peak'], ask: ['What peak QPS do you assume?', ['About 2× the average: ~2,400', 'Same as the average: ~1,200', '10× the average: ~12,000', 'Half the average: ~600']] },
    { text: 'Peak is usually taken as 2× the average (the book\'s rule).', flow: [['qps', 'peak']], badges: { peak: '~2,400' } },
    { text: '10 million new records a day × 10 KB ≈ 100 GB/day; ~180 TB over 5 years.', add: ['st'], flow: [['peak', 'st']], badges: { st: '~100 GB/day' } },
    { text: 'The maths is done. Now the shape of the interview.', add: ['f1', 'f2', 'f3', 'f4'], focus: ['f1'], ask: ['What do you do in the first 3–10 minutes?', ['Ask questions to pin down needs and scale', 'Pick the database straight away', 'Start writing the API code', 'Draw the biggest possible design first']] },
    { text: 'Four steps: understand the requirements → agree a high-level design → go deep → finish with bottlenecks and improvements.', focus: ['f1', 'f2', 'f3', 'f4'], flow: [['f1', 'f2'], ['f2', 'f3'], ['f3', 'f4']] },
  ],
  summary: ['QPS ≈ DAU × requests per person ÷ 100,000 seconds', 'Peak ≈ 2× the average; storage = new records × size × time', 'Interview: requirements → high-level → deep dive → wrap-up'],
  play: {
    kind: 'missions', intro: 'Three estimates, in your head. Use round numbers.',
    missions: [
      ['5 million DAU, 2 posts each per day. Write QPS?', ['~100', '~10', '~1,000', '~10,000'], '5 million × 2 = 10 million; ÷ ~100,000 seconds ≈ 100.'],
      ['1 million photos a day, 500 KB on average. Storage per day?', ['~500 GB', '~5 GB', '~50 TB', '~500 MB'], '10^6 × 5 × 10^5 bytes = 5 × 10^11 = 500 GB.'],
      ['Reading from memory vs a disk seek: which is faster?', ['Memory (ns vs ms)', 'Disk seek (it is sequential)', 'They are about the same', 'Depends on the CPU model'], 'A memory reference is ~100 ns, a disk seek ~10 ms: about a hundred-thousand-fold gap.'],
    ],
  },
  boss: [
    ['Which questions help most when pinning down requirements?', ['How many users, which features, growth rate', 'Which programming language is preferred', 'How many engineers are in the team', 'Which cloud provider is in use'], 'Designing without knowing scope and scale is a shot in the dark.'],
    ['300 million MAU, 50% daily, 2 posts each a day. Post QPS?', ['~3,500', '~350', '~35,000', '~700'], '150 million × 2 = 300 million; ÷ 86,400 ≈ 3,500.', 'Work out DAU first'],
    ['If the average QPS is 3,500, what peak do you assume?', ['~7,000', '~3,500', '~350', '~700,000'], 'Peak ≈ average × 2.'],
    ['What do you do in the deep dive?', ['Bottlenecks and trade-offs in key parts', 'Every component in equal detail', 'Add new features to show off', 'Re-explain the earlier diagram'], 'Time is short: two or three parts in depth, the rest at a glance.'],
    ['Which is a good habit when estimating?', ['Round numbers, stated assumptions, units', 'Exact maths to four decimal places', 'Only the final answer, no assumptions', 'Numbers alone, without any units'], 'The interviewer watches the process more than the result.'],
  ],
});

export const l4 = level({
  id: 4, chapter: 1, simulator: 'ratelimit',
  title: 'Bot flood', concept: 'Rate limiter',
  story: 'A bot is flooding the API',
  briefing: '2 a.m.: a thousand requests a second from one IP. Real customers cannot place orders. You need a doorkeeper out front who counts people in.',
  ref: refs.p1,
  predict: ['A thousand requests a second from one IP. First move?', ['Add a rate limiter to block the excess', 'Add more servers to absorb it', 'Switch to a faster database', 'Clear the cache and refill it']],
  nodes: [
    ['bot', 'Bot', 'bot', 8, 28], ['u', 'Customer', 'user', 8, 72], ['rl', 'Rate limiter', 'lb', 40, 50],
    ['api', 'API server', 'server', 72, 50], ['redis', 'Redis counter', 'cache', 40, 88], ['drop', '429', 'step', 72, 14],
  ],
  steps: [
    { text: 'The bot\'s requests are drowning the API, and real customers are stuck too.', add: ['bot', 'u', 'api'], flow: [['bot', 'api'], ['u', 'api']], down: ['api'] },
    { text: 'A rate limiter in front of the API (middleware or an API gateway). Each client\'s count lives in Redis.', add: ['rl', 'redis'], flow: [['bot', 'rl'], ['u', 'rl'], ['rl', 'api'], ['rl', 'redis']] },
    { text: 'Token bucket: tokens drip into a bucket at a fixed rate; each request spends one.', flow: [['u', 'rl'], ['rl', 'api']], badges: { rl: 'bucket: 4 tokens' } },
    { text: 'The bot has used up every token.', add: ['drop'], badges: { rl: 'bucket: 0 tokens' }, ask: ['What happens to a new request when the bucket is empty?', ['Rejected: 429 Too Many Requests', 'Waits in a queue however long it takes', 'Passes, the token is taken later', 'The rate limiter restarts itself']] },
    { text: 'No token → 429. A header tells the client how long to wait before trying again.', flow: [['bot', 'rl'], ['rl', 'drop']], down: ['drop'] },
    { text: 'Another algorithm: fixed window, 5 per minute.', badges: { rl: 'fixed window' }, ask: ['5 requests at 0:59 and 5 more at 1:00?', ['10 get in within one second', '5 get in, 5 are rejected', 'None get in at that time', 'All 10 rejected, window closed']] },
    { text: 'Twice the limit gets in at a window edge. A sliding window log or counter closes that gap.', badges: { rl: 'sliding window' }, ok: ['rl'] },
    { text: 'With many rate limiter servers, keep the count in one place (Redis); use a Lua script or sorted set to avoid race conditions.', focus: ['redis', 'rl'] },
  ],
  summary: ['Token bucket: bursts allowed, average rate capped', 'Fixed window lets double through at the edge; a sliding window fixes it', 'Rejected requests get 429 and a retry header; counts live in Redis'],
  play: {
    kind: 'missions', intro: 'Pick the algorithm that fits the situation.',
    missions: [
      ['Short bursts are fine, but the average rate is capped. Which algorithm?', ['Token bucket', 'Fixed window counter', 'No limiter at all', 'Random drop'], 'Saved-up tokens let several requests through at once.'],
      ['Requests must be processed at a steady rate (e.g. sent to a bank). Which?', ['Leaking bucket', 'Fixed window counter', 'Sliding window log', 'Token bucket'], 'Leaking bucket: a FIFO queue drained at a steady rate.'],
      ['Most accurate, but uses the most memory?', ['Sliding window log', 'Token bucket', 'Fixed window counter', 'Leaking bucket'], 'It stores a timestamp for every request, so memory use is high.'],
    ],
  },
  boss: [
    ['There is already an API gateway. Where does the rate limiter go?', ['In the API gateway', 'In every browser', 'In the database', 'In the CDN\'s images'], 'A client-side limiter can be bypassed; the gateway is already out front.'],
    ['What do you tell a rejected client?', ['429 with a retry-after header', '200 OK with an empty response', '500 Internal Server Error', 'Nothing, drop it silently'], 'The client learns when it may try again.'],
    ['Two limiter servers read the same counter and both add 1; it rises once. What is this?', ['A race condition; needs atomic operations', 'A deadlock; a lock must be released', 'A cache miss; the TTL must grow', 'Replication lag; add more replicas'], 'If the read and the write are not one atomic step, this happens.', 'Two at once…'],
    ['The biggest weakness of a fixed window?', ['More than the limit gets in at the edge', 'It must store the time of every request', 'Bursts are not allowed at all', 'It cannot run without Redis'], 'The two sides of an edge add up to double.'],
    ['What can a rate limit be keyed on?', ['User ID, IP or API key', 'Only the browser\'s name', 'Only the time of day', 'Random, by request size'], 'The rule depends on whom you want to stop.'],
  ],
});
