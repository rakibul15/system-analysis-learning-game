import type { Incident } from './incidents';

/** English version of the incidents; same ids, numbers and option order as the Bangla file. */
const t = (...v: number[]) => v;

export const enIncidents: Incident[] = [
  {
    id: 'stampede', title: 'The 9 a.m. collapse', level: 2, severity: 'SEV-1',
    alert: 'Since 09:00 product page p99 latency is 8 seconds and database CPU is at 100%.',
    series: [
      { label: 'Cache hit rate', unit: '%', values: t(94, 95, 94, 95, 3, 8, 21, 40, 61, 80, 90, 93), bad: true },
      { label: 'DB CPU', unit: '%', values: t(32, 30, 33, 31, 100, 100, 99, 95, 80, 60, 41, 35), bad: true },
      { label: 'Requests / s', unit: '', values: t(900, 920, 910, 950, 960, 940, 930, 950, 940, 960, 950, 945) },
    ],
    logs: ['08:59:58 cache-warmer: loaded 50,000 product keys, ttl=3600s', '09:00:00 db: active connections 2000/2000', '09:00:01 api: timeout reading product 18842 from db', '07:59:58 cache-warmer: loaded 50,000 product keys, ttl=3600s'],
    stages: [
      { prompt: 'Traffic did not grow, yet the DB collapsed. Which graph do you look at first?', options: ['Cache hit rate, it dropped exactly at 9', 'Requests / s, how much traffic grew', 'DB CPU, which query is slowest', 'Memory use on the API servers'], explain: 'Traffic is flat but DB load jumped: requests are no longer being stopped by the cache.' },
      { prompt: 'From the logs, what is the root cause?', options: ['Every key went in with the same TTL and expired together', 'The cache server restarted at 9 and lost its data', 'Someone changed every product price at 9 sharp', 'A key DB index was dropped overnight by mistake'], explain: 'Every hour the warmer loads 50,000 keys with the same ttl. They all expire in one second and every request hits the DB together: a cache stampede.' },
      { prompt: 'The best fix so it never happens again?', options: ['Random TTL jitter, and coalesce misses into one DB read', 'Raise the TTL to 24 hours so misses are rarer', 'Double the DB connection limit to absorb it', 'Turn the cache warmer off and let users fill it'], explain: 'Jitter spreads expiry out; request coalescing turns a thousand misses for one key into a single DB read.' },
    ],
  },
  {
    id: 'hotshard', title: 'One shard has a fever', level: 5, severity: 'SEV-2',
    alert: 'Order database shard-3 is at 95% CPU; the other seven are under 20%.',
    series: [
      { label: 'shard-3 CPU', unit: '%', values: t(25, 30, 48, 70, 88, 95, 96, 95, 94, 96, 95, 95), bad: true },
      { label: 'Average CPU of other shards', unit: '%', values: t(22, 21, 20, 19, 20, 18, 19, 20, 19, 18, 19, 20) },
      { label: 'Total orders / s', unit: '', values: t(400, 420, 610, 800, 950, 990, 1000, 980, 990, 1010, 1000, 995) },
    ],
    logs: ['11:02 marketing: flash sale started for merchant_id=777 (Mega Mart)', 'shard-router: merchant_id=777 → shard-3', '11:05 shard-3: slow query: INSERT INTO orders ... merchant_id=777'],
    stages: [
      { prompt: 'Total traffic grew but only one shard suffers. The first question?', options: ['Which key the extra orders use; what the shard key is', 'How full shard-3\'s disk is, and if it is running out', 'Why the other shards are idle and get no work', 'How much bandwidth there is, and where it chokes'], explain: 'If the sharding key piles onto one value, that shard takes all the load.' },
      { prompt: 'The cause?', options: ['One merchant\'s flash sale; shard key is merchant_id', 'Shard-3 has weak hardware and tires out quickly', 'The consistent hashing ring broke and piled up', 'Replica lag is putting extra load on the primary'], explain: 'A hot key: every Mega Mart order goes to shard-3 via merchant_id=777.' },
      { prompt: 'What do you do long term?', options: ['Salt big merchants\' keys across several shards', 'Give shard-3 a bigger, more expensive machine', 'Stop taking new orders while a flash sale runs', 'Merge every shard back into one big database'], explain: 'Spread the key and you spread the load; a bigger machine just breaks at the next big sale.' },
    ],
  },
  {
    id: 'leakylimit', title: 'Over the limit', level: 4, severity: 'SEV-2',
    alert: 'A bot is sending 3,000 requests a minute to the merchant API, though the limit is 1,000.',
    series: [
      { label: 'Bot\'s successful requests / min', unit: '', values: t(990, 1000, 995, 2000, 2010, 2990, 3000, 2995, 3000, 3010, 2990, 3000), bad: true },
      { label: 'API servers', unit: '', values: t(1, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3) },
      { label: '429 responses / min', unit: '', values: t(400, 410, 405, 50, 40, 0, 0, 0, 0, 0, 0, 0) },
    ],
    logs: ['autoscaler: api replicas 1 → 2', 'autoscaler: api replicas 2 → 3', 'ratelimiter: using in-process counter (map size 1,204)'],
    stages: [
      { prompt: 'Which two graphs move together?', options: ['Server count and the bot\'s successes rise in step', '429s and the server count both rise together', 'DB latency climbs whenever bot requests climb', 'No two graphs move up or down together at all'], explain: 'Every new server gives the bot another 1,000.' },
      { prompt: 'Why?', options: ['Each server keeps its own counter in memory', 'The token bucket refills too fast', 'The bot keeps changing IPs', 'The limit is misconfigured to 3,000'], explain: 'In-process counters: three servers means three separate buckets.' },
      { prompt: 'How do you fix it?', options: ['Counters in a shared store (Redis), atomic increments', 'Turn autoscaling off and keep a single server', 'Divide the limit by the number of servers', 'Block the bot\'s IP address at the firewall'], explain: 'With a central counter every server sees the same count; atomic increments stop races.' },
    ],
  },
  {
    id: 'doublesms', title: 'SMS twice', level: 10, severity: 'SEV-2',
    alert: 'Support complaints: the "parcel on its way" SMS is arriving twice.',
    series: [
      { label: 'SMS provider timeouts', unit: '%', values: t(1, 1, 2, 9, 14, 15, 13, 14, 12, 3, 2, 1), bad: true },
      { label: 'SMS sent / order', unit: '', values: t(1, 1, 1, 1.3, 1.5, 1.5, 1.4, 1.5, 1.4, 1.1, 1, 1), bad: true },
      { label: 'Queue length', unit: '', values: t(20, 25, 22, 40, 60, 55, 50, 48, 40, 30, 22, 20) },
    ],
    logs: ['worker-2: send sms msg=8812 → timeout after 3s, retrying', 'provider callback: msg=8812 delivered (attempt 1)', 'provider callback: msg=8812 delivered (attempt 2)'],
    stages: [
      { prompt: 'Which number matches the double SMS?', options: ['SMS per order rose exactly when timeouts did', 'SMS per order rose exactly when the queue grew', 'SMS per order rose exactly when orders rose', 'SMS per order rose exactly when worker CPU did'], explain: 'The more timeouts, the more extra SMS.' },
      { prompt: 'The cause, from the logs?', options: ['A timeout is not a failure: sent, no reply, retried', 'Two workers took the same message off the queue', 'The customer has two phone numbers on the account', 'The provider\'s own rule sends every SMS twice'], explain: 'Attempt 1 was delivered too: after the timeout, the retry sent the same SMS again.' },
      { prompt: 'The fix?', options: ['An idempotency key per message, or dedupe before sending', 'Turn retries off and send each SMS just once', 'Raise the timeout from 3 to 30 seconds', 'Move everything to a different SMS provider'], explain: 'Keep retries (or messages get lost), but never send the same ID twice.' },
    ],
  },
  {
    id: 'replicalag', title: 'The old address', level: 6, severity: 'SEV-2',
    alert: 'Customers save a new address but see the old one on the next page.',
    series: [
      { label: 'Replica lag', unit: 's', values: t(0.2, 0.3, 0.2, 2, 6, 8, 8, 7, 8, 6, 3, 0.4), bad: true },
      { label: 'Primary writes / s', unit: '', values: t(300, 310, 320, 900, 1500, 1600, 1550, 1500, 1520, 1100, 600, 320) },
      { label: 'Reads / s', unit: '', values: t(5000, 5100, 5050, 5200, 5100, 5000, 5100, 5050, 5100, 5000, 5050, 5100) },
    ],
    logs: ['batch-job: re-indexing 2M orders (started 14:00)', 'api: GET /me/address → replica-2', 'api: PUT /me/address → primary'],
    stages: [
      { prompt: 'Which graph matches the problem?', options: ['Replica lag, up to several seconds', 'Reads / s, which suddenly shot up', 'Primary CPU, which is maxed out', 'Error rate, which is slowly rising'], explain: 'Writes go to the primary, reads to a replica that is 8 seconds behind.' },
      { prompt: 'Why did the lag grow?', options: ['A batch job floods the primary; replicas cannot keep up', 'More reads are overwhelming the replicas', 'Customers keep pressing save twice by mistake', 'The old address is stuck in the cache'], explain: 'Writes went up five-fold, exactly while the batch job ran.' },
      { prompt: 'The most direct way to fix the customer experience?', options: ['After a write, read that user from the primary briefly', 'From now on, read every user from the primary', 'Turn the replicas off and run only the primary', 'Move the batch job to night and do nothing else'], explain: 'Read-your-writes; moving the batch job helps too, but lag will come back.' },
    ],
  },
  {
    id: 'poison', title: 'The stuck queue', level: 19, severity: 'SEV-1',
    alert: 'Order event consumer lag passed 200,000; the merchant dashboard is 40 minutes behind.',
    series: [
      { label: 'Consumer lag', unit: '', values: t(50, 60, 4000, 20000, 60000, 110000, 160000, 200000, 210000, 215000, 220000, 230000), bad: true },
      { label: 'Consumer restarts', unit: '', values: t(0, 0, 3, 9, 12, 12, 11, 12, 12, 12, 12, 12), bad: true },
      { label: 'Produced / s', unit: '', values: t(800, 820, 810, 800, 790, 810, 800, 805, 800, 810, 800, 805) },
    ],
    logs: ['consumer-1: processing offset 9918231', 'consumer-1: panic: invalid utf-8 in field "note"', 'consumer-1: restarting… resuming at offset 9918231'],
    stages: [
      { prompt: 'Production is normal. Which graph is the real clue?', options: ['The consumer keeps restarting', 'Produced / s jumped up', 'The broker disk is almost full', 'Network latency rose a lot'], explain: 'Lag grows because the consumer cannot move forward at all.' },
      { prompt: 'The cause?', options: ['One bad message keeps crashing it at the same offset', 'Too few partitions, so consumers get no share', 'The producer sends far faster than consumers read', 'The broker is quietly losing some messages'], explain: 'Panic after panic at offset 9918231: a poison message.' },
      { prompt: 'The fix?', options: ['After a few failures, move it to a dead-letter queue', 'Add more consumers to drain the lag faster', 'Empty the whole queue and start over', 'Shorten retention so old messages are deleted'], explain: 'The DLQ can be inspected later; the other hundreds of thousands are not held up.' },
    ],
  },
  {
    id: 'doublecharge', title: 'Charged twice', level: 26, severity: 'SEV-1',
    alert: '38 customers say their delivery fee was taken twice.',
    series: [
      { label: 'Mobile network errors', unit: '%', values: t(1, 1, 1, 7, 9, 8, 2, 1, 1, 1, 1, 1), bad: true },
      { label: 'Charges / order', unit: '', values: t(1, 1, 1, 1.06, 1.09, 1.08, 1.01, 1, 1, 1, 1, 1), bad: true },
      { label: 'PSP latency', unit: 'ms', values: t(300, 310, 320, 330, 320, 310, 300, 310, 300, 320, 310, 300) },
    ],
    logs: ['app: POST /pay order=55120 → network error, retrying', 'payment-svc: charge created order=55120 psp_id=ch_91', 'payment-svc: charge created order=55120 psp_id=ch_92'],
    stages: [
      { prompt: 'Which number matches the double charges?', options: ['Charges per order rose with mobile network errors', 'Charges per order rose with PSP latency', 'Charges per order rose with the number of orders', 'Charges per order rose with server CPU'], explain: 'Whenever the network is bad, extra charges appear.' },
      { prompt: 'The cause?', options: ['A lost reply makes the app retry: a "new" charge', 'The PSP charges the same payment twice by mistake', 'The customer impatiently pressed pay twice', 'Duplicate rows for the order in the database'], explain: 'Two different psp_ids for one order: the server has no idea it is the same attempt.' },
      { prompt: 'The fix?', options: ['The app sends an idempotency key with each payment', 'Turn retries off whenever the network is bad', 'Disable the pay button on a weak network', 'Work out the extra at day end and refund it'], explain: 'An idempotency key makes retries safe.' },
    ],
  },
  {
    id: 'clockskew', title: 'The same ID twice', level: 7, severity: 'SEV-1',
    alert: 'Order inserts are failing: "duplicate key orders_pkey", only from id-server-4.',
    series: [
      { label: 'Duplicate key errors', unit: '', values: t(0, 0, 0, 0, 37, 12, 0, 0, 0, 0, 0, 0), bad: true },
      { label: 'id-server-4 clock offset', unit: 'ms', values: t(0, 0, 0, 0, -800, -400, 0, 0, 0, 0, 0, 0), bad: true },
      { label: 'Orders / s', unit: '', values: t(500, 510, 505, 500, 498, 502, 500, 505, 500, 510, 500, 505) },
    ],
    logs: ['ntpd(id-server-4): step time -0.812s', 'id-server-4: generated 1845521098817536 (again)', 'db: duplicate key value violates unique constraint "orders_pkey"'],
    stages: [
      { prompt: 'Which two things happened together?', options: ['id-server-4\'s clock went back, and duplicates appeared', 'Orders rose and duplicates appeared', 'The database slowed and duplicates appeared', 'Errors on every ID server'], explain: 'A −800 ms clock offset, in exactly the minute of the duplicates.' },
      { prompt: 'Why did snowflake produce a duplicate?', options: ['IDs start with a timestamp; a clock going back repeats it', 'Two servers were given the same machine ID', 'The 12-bit sequence ran out within one ms', 'There is a bug in the database\'s unique index'], explain: 'Same timestamp + same machine + sequence from 0 = an earlier ID.' },
      { prompt: 'The fix?', options: ['Pause issuing IDs until the clock passes the last one', 'Add more machine bits to make more room', 'Drop the timestamp part from the ID entirely', 'Quietly retry the insert whenever it duplicates'], explain: 'The generator remembers its last timestamp; if the clock goes back it waits or errors, never issuing an ID from the past.' },
    ],
  },
  {
    id: 'retrystorm', title: 'The storm that would not stop', level: 29, severity: 'SEV-1', fix: 'retrystorm',
    alert: 'The payment provider was down for 30 seconds and recovered 10 minutes ago. Yet the payment service is still drowning and 80% of checkouts fail.',
    series: [
      { label: 'Requests to payment / s', unit: '', values: t(1000, 1020, 2900, 8800, 9100, 9000, 9200, 8900, 9100, 9000, 9050, 9100), bad: true },
      { label: 'Provider error rate', unit: '%', values: t(1, 1, 100, 2, 1, 1, 1, 1, 1, 1, 1, 1) },
      { label: 'Checkouts that succeed', unit: '%', values: t(99, 99, 10, 15, 18, 20, 19, 20, 21, 19, 20, 20), bad: true },
    ],
    logs: ['10:01:30 provider: 503 Service Unavailable (30s)', '10:02:00 provider: recovered', 'gateway: retry=3 backoff=none', 'order-service: retry=3 backoff=none', 'payment-service: retry=3 on provider timeout', '10:12:00 payment-service: thread pool 400/400, queue 52,000'],
    stages: [
      { prompt: 'The provider is fine again, yet the storm goes on. Which graph first?', options: ['Requests to payment, stuck at 9× normal', 'Provider error rate, how high it still is', 'Checkout success, when it started falling', 'Payment server memory and GC pauses'], explain: 'Users did not grow, yet payment gets 9× the requests: something is manufacturing them.' },
      { prompt: 'From the logs, what is the root cause?', options: ['Three layers retry 3 times each; load multiplies', 'The provider is not fully healed and keeps failing', 'A campaign suddenly brought many new users', 'A bug in the latest payment service deploy'], explain: 'Each layer retries on its own: up to 4 × 4 × 4 = 64× in the worst case. As payment slows, more fails, more retries: the storm feeds itself.' },
      { prompt: 'The best fix so it never happens again?', options: ['Retry in one place, a retry budget, jittered backoff', 'Double the payment servers to absorb the load', 'Turn off all retries and give up on first failure', 'Switch to a bigger payment provider'], explain: 'Retries in a single layer, a cap on total retries (a budget) and random delays: then retries help instead of creating storms. More servers alone just drown in the next storm.' },
    ],
  },
  {
    id: 'cascade', title: 'One slow service, the whole app down', level: 29, severity: 'SEV-1', fix: 'resilience',
    alert: 'The homepage does not load, and neither do orders. Yet only the "when will it arrive" (ETA) service got slow.',
    series: [
      { label: 'ETA service p99', unit: 's', values: t(0.2, 0.2, 0.3, 8, 25, 30, 30, 31, 30, 30, 29, 30), bad: true },
      { label: 'Busy order-service threads', unit: '%', values: t(12, 13, 15, 60, 100, 100, 100, 100, 100, 100, 100, 100), bad: true },
      { label: 'Homepage success', unit: '%', values: t(100, 100, 100, 70, 5, 2, 1, 2, 1, 1, 2, 1), bad: true },
    ],
    logs: ['14:03 eta-service: p99 latency 30s (map provider slow)', 'order-service: http client timeout=60s, retries=2', '14:05 order-service: thread pool exhausted 200/200', 'homepage: calls order-service for "your active orders" widget'],
    stages: [
      { prompt: 'All three graphs are red. Where do you start?', options: ['Order-service threads, all 200 stuck', 'ETA service CPU, how busy it is', 'Homepage request count, whether it fell', 'The load balancer health-check log'], explain: 'The homepage does not need ETA. The order service in the middle being stuck is what links the two.' },
      { prompt: 'What is the cause?', options: ['Threads stuck on a 60 s timeout to the slow ETA', 'ETA is completely down, so all requests fail', 'A big lock in the order service database', 'A new large image was added to the homepage'], explain: 'Every ETA call holds a thread for 30 seconds, and the timeout is even longer. All 200 threads are used up, so the order service cannot answer anyone: one slow part took down the whole app.' },
      { prompt: 'The best fix?', options: ['Short timeouts, a breaker, orders work without ETA', 'Add more ETA servers to make it faster', 'Give the order service 10× more threads', 'Close the whole site until ETA recovers'], explain: 'Short timeouts free threads, a breaker stops calling the slow service, and without ETA the app shows "soon" and keeps taking orders (graceful degradation). ETA was slow because of the map provider, so more servers would not help.' },
    ],
  },
  {
    id: 'overload', title: 'Drowned by the Eid sale', level: 4, severity: 'SEV-1', fix: 'overload',
    alert: 'As the 8 p.m. sale starts, server CPU hits 100% but successful orders fall to almost zero. The average wait is 40 seconds.',
    series: [
      { label: 'Incoming requests / s', unit: '', values: t(1500, 1600, 4800, 5000, 5100, 4900, 5000, 5100, 5000, 4900, 5000, 5000), bad: true },
      { label: 'Orders finished in time / s', unit: '', values: t(1500, 1600, 1500, 600, 180, 90, 60, 70, 60, 50, 60, 55), bad: true },
      { label: 'Average wait', unit: 's', values: t(0.1, 0.1, 2, 9, 18, 26, 33, 38, 40, 41, 40, 41) },
    ],
    logs: ['20:00 marketing: Eid sale live', 'api: request queue length 310,000 (no limit)', 'app: client timeout 2s, then "try again" button', '20:04 api: 96% of finished requests had no client waiting'],
    stages: [
      { prompt: 'The servers run flat out, yet no orders. What do you check first?', options: ['Orders finished in time, near zero as the crowd grew', 'Incoming requests, exactly how much the crowd grew', 'Server CPU, whether it is truly at 100%', 'How long the payment provider takes to answer'], explain: 'The real measure is not how much work got done but how much finished in time to help someone (goodput).' },
      { prompt: 'What is the cause?', options: ['An unbounded queue: work on requests users already left', 'Too few servers, so every request runs a bit slower', 'The database connection pool filled up and blocked all', 'The CDN cache went off and all traffic hits servers'], explain: 'The queue has no limit, so the wait is 40 seconds. Users leave after 2 seconds and tap again; the servers labour on requests nobody is waiting for any more.' },
      { prompt: 'The best fix?', options: ['Bound the queue, turn extras away at once, checkout first', 'Keep autoscaling on so new servers arrive with crowds', 'Raise the app timeout from 2 to 60 seconds', 'Close browsing on sale day and open checkout only'], explain: 'Past the limit, answer "try again shortly" at once (load shedding), and put checkout first: whoever gets in is served in time. New servers take minutes; crowds arrive in a second.' },
    ],
  },
];
