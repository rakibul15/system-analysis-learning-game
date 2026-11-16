import { level } from '../../dsl';
import { refs } from '../../refs';

/* Chapter 4 · Places and streams of events — Vol 2, ch 1–6 (English) */

export const l16 = level({
  id: 16, chapter: 4, simulator: 'proximity',
  title: 'The nearest rider', concept: 'Proximity service',
  story: 'Finding the nearest rider',
  briefing: 'When an order comes in you need the nearest free rider. Searching the database by lat/lng is slow, and a rider just across the cell boundary goes unseen.',
  ref: refs.p5,
  predict: ['Two range queries on lat and lng to find nearby riders?', ['Slow; needs geohash or a quadtree', 'Fast, if both have an index', 'Fine, in a small town', 'Fast, it just needs a cache']],
  nodes: [
    ['c', 'Your cell', 'step', 50, 50],
    ['n1', 'Neighbour', 'step', 22, 18], ['n2', 'Neighbour', 'step', 50, 18], ['n3', 'Neighbour', 'step', 78, 18],
    ['n4', 'Neighbour', 'step', 22, 50], ['n5', 'Neighbour', 'step', 78, 50],
    ['n6', 'Neighbour', 'step', 22, 82], ['n7', 'Neighbour', 'step', 50, 82], ['n8', 'Neighbour', 'step', 78, 82],
    ['r', 'Rider', 'user', 66, 50],
  ],
  steps: [
    { text: 'Split the map into four again and again: each cell gets a string name (a geohash). The longer the string, the smaller the cell.', add: ['c'], badges: { c: 'geohash 6' } },
    { text: 'Length 6 ≈ 1.2 km × 0.6 km; right for a 0.5 km radius.', focus: ['c'], badges: { c: '1.2 km × 0.6 km' } },
    { text: 'A rider is in the very next cell, very close to you.', add: ['r'], ask: ['Who is missed if you search only your own cell?', ['A nearby rider across the boundary', 'Nobody, everyone is in the cell', 'Only riders very far away', 'Riders inside your own cell']] },
    { text: 'So search your own cell plus its 8 neighbours.', add: ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'], ok: ['r'] },
    { text: 'There are very few riders around.', badges: { c: 'few results' }, ask: ['What if there are not enough results?', ['Drop a character: a bigger cell', 'Add a character: a smaller cell', 'Stop searching, return nothing', 'Send any random rider']] },
    { text: 'A shorter prefix means a bigger cell. A quadtree is another way: small cells where dense, large where sparse; the tree lives in memory.', focus: ['c', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8'] },
  ],
  summary: ['Geohash: split the map in four repeatedly; string length = cell size', 'Your cell + 8 neighbours; too few results, shorten the prefix', 'A quadtree splits by density, in memory'],
  play: {
    kind: 'missions', intro: 'Radius, scale and updates.',
    missions: [
      ['A 5 km radius. Which geohash length?', ['4', '6', '8', '1'], '0.5 km → 6, 1–2 km → 5, 5–20 km → 4.'],
      ['Business data is mostly read. How to scale the database?', ['Read replicas', 'Sharding first', 'Write-heavy design', 'Drop the cache'], 'The data is small and read-heavy.'],
      ['Riders move every few seconds. Which is easier to update?', ['Geohash: only a string changes', 'Quadtree: the tree reshapes itself', 'Both are equally hard', 'Neither accepts updates'], 'With a quadtree the tree itself must change.'],
    ],
  },
  boss: [
    ['Dense city and empty countryside, k-nearest needed. Geohash or quadtree?', ['Quadtree (splits by density)', 'Geohash (equal-sized cells)', 'A plain uniform grid', 'Just a lat/lng index'], 'Geohash cells are a fixed size.'],
    ['The geohash boundary problem?', ['Two close points may share no prefix', 'Two far points always share a prefix', 'Long strings make lookups slow', 'Each cell uses a lot of memory'], 'That is why neighbouring cells are searched too.'],
    ['How much memory for a quadtree of 200 million businesses?', ['~2 GB, fits on one server', '~200 GB, needs many servers', '~2 TB, must live on disk', '~2 MB, fits on a phone'], 'The book\'s estimate is ~1.71 GB.'],
    ['Is the location service stateless?', ['Yes, read-heavy, easy to replicate', 'No, it keeps state per user', 'No, so there is only one server', 'Yes, but write-heavy'], 'So it scales out easily.'],
    ['Do you shard the geohash index table?', ['Usually not: replicas suffice', 'Of course, from day one', 'Yes, by each geohash character', 'Yes, by a random hash'], 'Sharding\'s complexity outweighs the gain.'],
  ],
});

export const l17 = level({
  id: 17, chapter: 4, simulator: 'nearby',
  title: 'Live rider', concept: 'Nearby friends',
  story: 'Live rider location',
  briefing: 'Customers want to see on the map where their rider is, moment by moment. Thousands of riders send their location every few seconds.',
  ref: refs.p5,
  predict: ['Thousands of riders send location every 30 seconds. Which connection?', ['WebSocket (two-way, persistent)', 'A new HTTP request each time', 'Polling once a minute', 'SMS']],
  nodes: [
    ['r', 'Rider', 'user', 8, 50], ['ws', 'WebSocket server', 'server', 32, 50], ['lc', 'Location cache', 'cache', 56, 18],
    ['hist', 'Location history', 'db', 56, 84], ['ps', 'Redis pub/sub', 'queue', 72, 50], ['f', 'Customer', 'user', 92, 50],
  ],
  steps: [
    { text: 'The rider sends location over a persistent WebSocket.', add: ['r', 'ws'], flow: [['r', 'ws']] },
    { text: 'The latest location goes in a cache (with a TTL), history in a separate DB.', add: ['lc', 'hist'], flow: [['ws', 'lc'], ['ws', 'hist']] },
    { text: 'Publish to the rider\'s own channel.', add: ['ps'], flow: [['ws', 'ps']] },
    { text: 'Many people are subscribed to the channel.', add: ['f'], ask: ['Who gets the update?', ['Subscribers within range', 'Every subscriber, any distance', 'Everyone in the city', 'Only the admin']] },
    { text: 'The subscriber\'s WebSocket handler measures the distance and forwards it if close.', flow: [['ps', 'ws'], ['ws', 'f']], badges: { f: 'within 5 km?' } },
    { text: 'Millions of channels. One pub/sub server is not enough.', badges: { ps: 'many servers?' }, ask: ['How do you spread channels over many Redis servers?', ['Consistent hashing: channel → server', 'Keep every channel on one server', 'A random server for each message', 'By the first letter of the channel']] },
    { text: 'Consistent hashing + service discovery. Pub/sub load is mostly CPU, not memory.', ok: ['ps'] },
  ],
  summary: ['Location over WebSocket; latest in cache, history in a DB', 'Publish to the rider\'s channel; subscribers filter by distance', 'Pub/sub channels split by consistent hashing'],
  play: {
    kind: 'missions', intro: 'Three decisions for running live location.',
    missions: [
      ['Why a TTL on the location cache?', ['Old locations delete themselves', 'Reads from cache are faster', 'It makes the cache cheaper', 'Not needed, keep everything'], 'Riders who closed the app do not linger on the map.'],
      ['WebSocket servers are stateful. How do you deploy a new version?', ['Drain: close once old connections end', 'Kill now, clients reconnect themselves', 'Never deploy', 'Log everyone out'], 'New connections go to new servers.'],
      ['Where is the main load on pub/sub?', ['CPU (fanning out messages)', 'Disk (storing messages)', 'Network (barely any)', 'Memory (holding channels)'], 'The book\'s numbers: memory is plenty, CPU is what you need more of.'],
    ],
  },
  boss: [
    ['Roughly how many Redis pub/sub servers?', ['~140 (by CPU)', '~10 (by memory)', '~10,000 (one per user)', 'Just 1'], 'The book\'s estimate.', 'CPU is the limit'],
    ['Channel memory: 100 million users × 20 friends × 20 bytes…?', ['~200 GB, so memory is not the issue', '~20 TB, so memory is a big issue', '~20 MB, fits on a phone', '~2 PB, needs disk'], 'It fits on a handful of servers.'],
    ['Adding or removing pub/sub servers?', ['Ring update; some resubscribing needed', 'Nothing, it just works', 'Every server must restart together', 'A new database is required'], 'Do it at night, when traffic is low.'],
    ['Show nearby random people rather than friends?', ['One channel per geohash cell', 'One channel per friend', 'One channel for everyone', 'No channel, a DB query'], 'Move cells and you switch channels.'],
    ['Which DB for location history?', ['Cassandra (write-heavy)', 'One big MySQL', 'Only Redis memory', 'A CSV file per day'], 'Millions of writes per second.'],
  ],
});

export const l18 = level({
  id: 18, chapter: 4, simulator: 'maps',
  title: 'Wrong ETA', concept: 'Maps · Routing',
  story: 'The ETA is wrong',
  briefing: 'The app says 15 minutes; it actually takes 45. Traffic jam news never arrives, and finding a route across the whole country\'s roads takes ages.',
  ref: refs.p5,
  predict: ['Keep the whole country\'s roads in one graph and run shortest path?', ['Too big; search tiles in layers', 'Fast, Dijkstra copes on one graph', 'Fine, it just uses more memory', 'Impossible, so no routes at all']],
  nodes: [
    ['a', 'A', 'user', 8, 88], ['b', 'B', 'user', 92, 88], ['t1', 'Small tile: lanes', 'step', 22, 66],
    ['t2', 'Medium tile: roads', 'step', 50, 40], ['t3', 'Large tile: highways', 'step', 78, 16], ['tr', 'Live traffic', 'service', 56, 84],
  ],
  steps: [
    { text: 'The road graph is split into tiles; route search starts in small tiles.', add: ['a', 'b', 't1'], flow: [['a', 't1']] },
    { text: 'To go far, move up a layer: only major roads there.', add: ['t2', 't3'], flow: [['t1', 't2'], ['t2', 't3']] },
    { text: 'Near the destination, come back down. An A*-style search.', flow: [['t3', 't2'], ['t2', 't1'], ['t1', 'b']] },
    { text: 'A sudden jam on one road.', add: ['tr'], flow: [['tr', 't1']], badges: { tr: 'jam!' }, ask: ['Whose route must change?', ['Users whose route crosses the jammed tile', 'Every active user in the city', 'Nobody, users will notice themselves', 'Only users asking for a new route']] },
    { text: 'Index active navigations by the tiles on their route; reroute users on affected tiles.', ok: ['t2'] },
    { text: 'Tiles for showing the map.', ask: ['Where do map tiles come from?', ['From a CDN, pre-rendered', 'Drawn on the server every time', 'From the database', 'The client builds them']] },
    { text: 'Pre-computed tiles from a CDN; vector tiles use even less bandwidth. The ETA comes from an ML model on live and historical traffic.', ok: ['t1', 't2', 't3'] },
  ],
  summary: ['Routing tile layers: lanes → roads → highways', 'On a jam, reroute only users on affected tiles', 'Map tiles from a CDN; ETA from live + history'],
  play: {
    kind: 'missions', intro: 'Three questions for running maps.',
    missions: [
      ['Tens of millions of location updates a second. How?', ['Batch them less often, into Kafka', 'A separate HTTP call every second', 'Each one straight into the database', 'Skip them, keep start and end only'], 'The book\'s idea: batch every 15–30 seconds.'],
      ['Roughly how big is the map data?', ['Petabyte scale', 'A few gigabytes', 'A few terabytes', 'A few megabytes'], 'Every tile up to zoom level 21.'],
      ['What does geocoding mean?', ['Address → lat/lng', 'lat/lng → tile image', 'Distance → ETA', 'Start → end route'], 'The reverse is reverse geocoding.'],
    ],
  },
  boss: [
    ['An efficient way to notify reroutes?', ['Look up navigations by their tiles', 'Notify every user over and over', 'Tell nobody, users check themselves', 'Notify some random users'], 'Walking every user on every jam is waste.'],
    ['The benefit of vector tiles?', ['Less bandwidth, smooth zoom', 'More images, better colours', 'Drawn on server, light client', 'No benefit at all'], 'The client draws them itself.'],
    ['What are location updates used for?', ['Live traffic, ETA, new roads', 'Only for showing adverts', 'Only for checking logins', 'Nothing, they are deleted'], 'One stream, many uses.'],
    ['Where are routing tiles stored?', ['Object storage + cache', 'On every client\'s phone', 'In rows of a SQL table', 'In a message queue'], 'Tiles are static files.'],
    ['What does an accurate ETA need?', ['Predictions from live and past traffic', 'Just distance ÷ the speed limit', 'Distance plus some random time', 'Average of what users guess'], 'In Dhaka, distance alone gives no ETA!'],
  ],
});

export const l19 = level({
  id: 19, chapter: 4, simulator: 'mq',
  title: 'Events going missing', concept: 'Distributed message queue',
  story: 'Events are getting lost',
  briefing: 'Order events sometimes vanish, and sometimes get processed twice. The services need a reliable pipe between them.',
  ref: refs.p5,
  predict: ['Events must never be lost, even if a consumer is slow. What is needed?', ['A log on disk and consumer offsets', 'A list in memory', 'Just one table in a database', 'Events sent by email']],
  nodes: [
    ['pr', 'Producer', 'service', 8, 50], ['p0', 'Partition 0', 'queue', 42, 22], ['p1', 'Partition 1', 'queue', 42, 50], ['p2', 'Partition 2', 'queue', 42, 78],
    ['ca', 'Consumer A', 'worker', 82, 32], ['cb', 'Consumer B', 'worker', 82, 72], ['off', 'Offset', 'step', 82, 8],
  ],
  steps: [
    { text: 'A topic is split into many partitions. The hash of the message key picks the partition.', add: ['pr', 'p0', 'p1', 'p2'], flow: [['pr', 'p1']], badges: { pr: 'key = order#7' } },
    { text: 'The same key always lands on the same partition: order is kept for that key.', flow: [['pr', 'p1']], ok: ['p1'] },
    { text: 'Consumer group: each partition is read by one consumer in the group.', add: ['ca', 'cb'], flow: [['p0', 'ca'], ['p1', 'ca'], ['p2', 'cb']] },
    { text: 'Consumer A committed up to 104, was processing 105–107, then crashed.', add: ['off'], down: ['ca'], badges: { off: 'p1: 104' }, ask: ['What happens now?', ['Restart from 105 (duplicates)', 'From 108, nothing repeated', 'Everything from the start (0)', '105–107 are lost']] },
    { text: 'The partition is handed to B; it resumes from the last commit: at-least-once.', down: ['ca'], flow: [['p0', 'cb'], ['p1', 'cb']] },
    { text: 'Each partition has a leader and follower replicas.', ask: ['What does ack = all mean?', ['Every in-sync replica has written it', 'As soon as the leader writes it', 'Success even if nobody writes', 'Only once a consumer reads it']] },
    { text: 'ack=all is safe but slow; ack=1 is in between; ack=0 is fast but can lose data.', focus: ['p0', 'p1', 'p2'] },
  ],
  summary: ['Topic → partitions; same key, same partition, order kept', 'Consumer groups and offsets; after a crash, resume from the last commit', 'ack trades durability for speed'],
  play: {
    kind: 'missions', intro: 'Pick the delivery semantics.',
    missions: [
      ['Payment events: no loss allowed, duplicates can be handled.', ['At-least-once + idempotent consumer', 'At-most-once, fast with no acks', 'Fire and forget, with no retries', 'Exactly-once, with no dedupe'], 'Twice is better than never, if the consumer can cope.'],
      ['Metric logs: losing a few is fine, speed matters.', ['At-most-once (ack=0)', 'Exactly-once', 'At-least-once ack=all', 'Sync'], 'The lightest option.'],
      ['More consumers than partitions?', ['The extras sit idle', 'Everything runs faster', 'Partitions grow by themselves', 'Consumers crash'], 'One partition, one consumer.'],
    ],
  },
  boss: [
    ['Why sequential writes to disk?', ['Sequential is fast and uses the page cache', 'Random writes are fastest on disk', 'There is no memory, so it must be disk', 'Disk is slow, so write as little as possible'], 'The secret of Kafka\'s speed.'],
    ['Pull or push consumers?', ['Pull: own pace, batching benefits', 'Push: as fast as the broker can', 'Both at once, mandatory', 'Consumers get messages by email'], 'A slow consumer is not swamped.'],
    ['How do you get close to exactly-once?', ['Idempotent producer + transactions/dedupe', 'Just keep retrying more and more', 'Send fast with ack=0', 'Keep no offsets, reread everything'], 'You need a way to recognise duplicates.'],
    ['When retention runs out?', ['Old segments are deleted', 'They stay forever', 'The consumer group is deleted', 'The producer gets an error'], 'The log does not grow forever.'],
    ['You need one order\'s events in sequence. What do you do?', ['Use the order ID as the message key', 'One partition for every event', 'A random key on each event', 'Send it without any key'], 'Same key, same partition, order kept.'],
  ],
});

export const l20 = level({
  id: 20, chapter: 4, simulator: 'alerting',
  title: 'Nobody knows the site is slow', concept: 'Metrics · Alerting',
  story: 'Nobody knows the site is slow',
  briefing: 'Yesterday checkout was slow for two hours, and the team found out from customer complaints. From now on we want to know first: numbers, graphs and timely alerts.',
  ref: refs.p5,
  predict: ['Server CPU and latency every 10 seconds. Which DB?', ['A time-series DB', 'A plain SQL table', 'A graph DB', 'Blob storage']],
  nodes: [
    ['sv', 'Servers', 'server', 8, 50], ['co', 'Collector', 'worker', 28, 50], ['kq', 'Kafka', 'queue', 48, 50],
    ['ts', 'Time-series DB', 'db', 68, 26], ['al', 'Alert manager', 'service', 90, 26], ['db', 'Dashboard', 'step', 90, 76], ['ds', 'Downsample', 'worker', 68, 76],
  ],
  steps: [
    { text: 'Collecting metrics: pull (a collector fetches) or push (an agent sends).', add: ['sv', 'co'], flow: [['sv', 'co']] },
    { text: 'Kafka in the middle: no data is lost even when the DB is slow or down.', add: ['kq', 'ts'], flow: [['co', 'kq'], ['kq', 'ts']] },
    { text: 'A dashboard (Grafana-style) queries and shows it.', add: ['db'], flow: [['ts', 'db']] },
    { text: 'I set up an alert rule.', add: ['al'], badges: { al: 'CPU > 80% for 5 min' }, ask: ['When does this rule fire?', ['Above 80% for 5 minutes straight', 'As soon as it touches 80% once', 'If it touches 80% once in 5 minutes', 'Every minute, unconditionally']] },
    { text: 'Alert only when the condition holds continuously, deduped, to email or pager.', flow: [['ts', 'al']], ok: ['al'] },
    { text: 'What to do with old data?', add: ['ds'], ask: ['Resolution for month-old data?', ['Lower, e.g. 1 hour', 'Keep it at 10 seconds', 'Raise it to 1 ms', 'Delete it all']] },
    { text: 'Downsample: 1 minute after 7 days, 1 hour after 30 days. And a user_id label creates endless series: the cardinality trap.', flow: [['ts', 'ds']] },
  ],
  summary: ['Collector → Kafka → time-series DB → dashboards and alerts', 'Alerts: sustained conditions, deduped', 'Downsample old data; keep label values bounded'],
  play: {
    kind: 'missions', intro: 'Three traps of a metrics system.',
    missions: [
      ['Why is user_id a bad metric label?', ['Endless time series, the DB bloats', 'Queries become faster than before', 'Dashboards look nicer with it', 'No problem at all, it is fine'], 'Every combination of label values is its own series.'],
      ['How do you stop an alert ringing again and again?', ['Dedupe and grouping', 'Send it every time', 'Turn all alerts off', 'Delete the rule'], 'With alert fatigue, people ignore everything.'],
      ['Metrics from a short-lived batch job?', ['Push, sent before it ends', 'Pull, the collector fetches', 'No metrics needed', 'Results by email'], 'The job ends before anyone can pull.'],
    ],
  },
  boss: [
    ['The advantage of the pull model?', ['The collector knows who is alive', 'Easier to get through firewalls', 'Best for short-lived jobs', 'No agent needed on any server'], 'If an endpoint does not answer, you know.'],
    ['Compressing metric data?', ['Delta encoding shrinks it a lot', 'It cannot be compressed at all', 'Compressing makes it bigger', 'Only images can be compressed'], 'Neighbouring values are close together.'],
    ['Which label is safe?', ['Region or service name', 'Every request ID', 'Every user email', 'The exact timestamp'], 'Avoid the cardinality trap.'],
    ['The risk of dropping Kafka?', ['Metrics are lost when the DB is down', 'Nothing, it is all the same', 'Everything gets faster', 'Costs rise, nothing is lost'], 'Without a buffer, data falls on the floor under load.'],
    ['Are metrics write-heavy or read-heavy?', ['Far more writes', 'Far more reads', 'Both equal', 'Neither happens'], 'Hence a write-optimised time-series DB.'],
  ],
});

export const l21 = level({
  id: 21, chapter: 4, simulator: 'stream',
  title: 'Parcels per minute', concept: 'Stream aggregation',
  story: 'Parcels per minute at each hub',
  briefing: 'How many parcels each hub scanned per minute must show live on a dashboard, and at month end partners are paid from these same numbers. So the counting must be exact.',
  ref: refs.p5,
  predict: ['Which minute do you count a late event in?', ['Event time (when it happened)', 'Processing time (when it arrived)', 'The time the window closed', 'The server clock\'s time']],
  nodes: [
    ['lg', 'Scan log', 'step', 8, 50], ['kq', 'Kafka', 'queue', 28, 50], ['ag', 'Aggregator', 'worker', 52, 50],
    ['out', 'Kafka (results)', 'queue', 74, 50], ['db', 'DB', 'db', 92, 50], ['raw', 'Raw store', 'store', 52, 86], ['rc', 'Reconciliation', 'service', 74, 86],
  ],
  steps: [
    { text: 'Scan events stream into the aggregator and are counted in per-minute windows.', add: ['lg', 'kq', 'ag'], flow: [['lg', 'kq'], ['kq', 'ag']] },
    { text: 'Tumbling windows: each minute is its own box.', badges: { ag: '10:01 window' } },
    { text: 'An event happened at 10:00:58 and arrived at 10:01:05.', badges: { lg: 'arrived late' }, ask: ['Which minute is this event counted in?', ['10:00, if within the watermark', '10:01, when it arrived', 'Dropped, because it was late', 'Once in each of the two minutes']] },
    { text: 'Watermark: keep the window open a little to catch late events; reconcile very late ones afterwards.', badges: { ag: 'watermark 15 s' }, ok: ['ag'] },
    { text: 'Results go back through Kafka into a DB.', add: ['out', 'db'], flow: [['ag', 'out'], ['out', 'db']] },
    { text: 'Before paying out at month end.', add: ['raw', 'rc'], ask: ['How do you check the stream\'s results?', ['Recount from raw data in a batch', 'No need, the stream is perfect', 'By looking at the dashboard graph', 'By checking a few random samples']] },
    { text: 'Recount from raw data in a nightly batch and match it against the stream\'s results.', flow: [['kq', 'raw'], ['raw', 'rc'], ['db', 'rc']] },
  ],
  summary: ['Windows by event time; the watermark catches late events', 'Aggregator → Kafka → DB; keep the raw data separately', 'Reconciliation when money is involved'],
  play: {
    kind: 'missions', intro: 'Windows and accuracy.',
    missions: [
      ['Make the watermark longer?', ['More events caught, results later', 'Fewer events caught, results faster', 'Nothing changes', 'Less memory, more accuracy'], 'Accuracy versus latency.'],
      ['Why does exactly-once counting matter?', ['Money is involved', 'It looks nicer', 'It is faster', 'It does not'], 'Over-count and you overpay; under-count and the partner loses out.'],
      ['Why keep the raw data?', ['Recompute and debug', 'Not needed, wasted space', 'To use as a cache', 'To show adverts'], 'If a bug is found, recompute from history.'],
    ],
  },
  boss: [
    ['Why is reconciliation needed?', ['To catch stream errors against a batch', 'Add a batch to make the stream faster', 'To make the dashboard look better', 'It is not, the stream is perfect'], 'The two paths\' results should match.'],
    ['The aggregator crashes?', ['Resume from snapshot + offset', 'Everything is lost, start from zero', 'Skip the last minute and carry on', 'Nothing, it copes by itself'], 'State is saved from time to time.'],
    ['One hub has a huge crowd (a hotspot)?', ['More nodes for that key', 'Nothing, just wait', 'Stop scanning at that hub', 'Cache it and count later'], 'Put the capacity where the load is.'],
    ['Lambda versus Kappa?', ['Kappa: one streaming path, replays', 'Lambda: batch only, no stream', 'Kappa: only a batch path', 'They are the same thing'], 'With Kappa there is only one codebase.'],
    ['Top 100 hubs every minute?', ['Top-k with a heap per window', 'Sort everything on every event', 'A DB query every second', 'Once at the end of the day'], 'A heap is small and fast.'],
  ],
});
