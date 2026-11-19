import { level } from '../../dsl';

/* Chapter 7 (bonus) · seven more DDIA chapters: data models, replication, sharding, transactions, distributed trouble, batch, stream (English) */

const ddia = (ch: number, label: string) => ({ label: `DDIA chapter ${ch}: ${label}`, url: `./#/xu/d-${ch}` });

export const l35 = level({
  id: 35, chapter: 7,
  title: 'Which shape for data', concept: 'Relational · Document · Graph · Event log',
  story: 'An order page, and "who knows whom"',
  briefing: 'An order page needs the customer, the items and the address together. One camp says many tables and joins, another says one document. Then a question like "where can I get from this hub in three hops" is a different beast. Which shape for which data?',
  ref: ddia(3, 'Data models'),
  predict: ['An order page needs customer, items and address. Which model makes one read return everything most easily?', ['Document: all nested in one place', 'Relational: each in its own table', 'Graph: each a separate dot', 'No model can']],
  nodes: [
    ['app', 'App', 'user', 8, 50], ['ord', 'Orders', 'db', 34, 18], ['cus', 'Customers', 'db', 34, 50], ['itm', 'Items', 'db', 34, 82],
    ['doc', 'Order document', 'store', 62, 18], ['hub', 'Hub', 'service', 62, 62], ['zone', 'Zone', 'service', 90, 44], ['rid', 'Rider', 'service', 90, 82],
  ],
  steps: [
    { text: 'Relational: order, customer and item live in separate tables. Opening the page means joining them.', add: ['app', 'ord', 'cus', 'itm'], flow: [['app', 'ord'], ['app', 'cus'], ['app', 'itm']] },
    { text: 'Document: everything about one order sits inside one document. One read gets the whole page.', add: ['doc'], flow: [['app', 'doc']], focus: ['doc'] },
    { text: 'But the customer\'s address was copied into every order document. Now the customer moves.', badges: { doc: 'copied address' }, ask: ['What must happen now?', ['Update every copy', 'Change it once and all is fine', 'Nothing at all', 'The database figures it out']] },
    { text: 'Normalizing keeps the address in one place (cheap to change, joins on read). Denormalizing copies it (cheap to read, costly to change). The work moves from reads to writes.', focus: ['cus', 'doc'] },
    { text: 'A different kind of question: from this hub, which zones and riders can be reached in three hops? Here the relationships are the point.', add: ['hub', 'zone', 'rid'], flow: [['hub', 'zone'], ['hub', 'rid'], ['zone', 'rid']], focus: ['hub', 'zone', 'rid'] },
    { text: 'If the number of hops is not known in advance, neither is the number of joins.', badges: { hub: '?' }, ask: ['Which model handles "how many hops" questions most easily?', ['A graph model', 'One huge document', 'A CSV file', 'None of them']] },
    { text: 'For analytics, a star schema: a fact table of events in the middle, descriptive tables around it. And event sourcing stores the events, not the state: history is kept and new views can be built.', focus: ['ord', 'itm'] },
  ],
  summary: ['Relational: many relationships and joins; document: one thing, all in one place', 'Denormalizing makes reads cheap, but keeping copies right is on you', 'Relationships first means a graph; wanting history means an event log'],
  play: {
    kind: 'missions', intro: 'Three kinds of data, three shapes.',
    missions: [
      ['A merchant has many orders, and the address changes now and then. Where should it live?', ['A separate table, orders hold just an ID', 'Copied into every single order', 'Packed into one long free-text note', 'Kept in the app\'s memory only'], 'What changes often belongs in one place.'],
      ['Riders and zones are many-to-many. How does a document model cope?', ['Awkwardly: copies or manual joins', 'The easiest case, no extra work', 'Impossible, it cannot be stored at all', 'No joins needed, so no trouble'], 'Where joins are weak, many-to-many is hard.'],
      ['At month end: late deliveries per zone. Which schema?', ['Star: deliveries in the middle, zone and date around', 'One huge document holding every single month', 'Graph: each delivery stored as a single dot', 'A separate database kept for every zone'], 'Analytics means facts and dimensions.'],
    ],
  },
  boss: [
    ['When does a document model fit best?', ['One thing read together as a whole', 'Many many-to-many links between things', 'Many joins whose shape is unknown', 'Deep links of unknown length'], 'Tree-shaped data with locality.'],
    ['What does denormalizing cost?', ['Keeping every copy right on each change', 'Many extra joins every time you read', 'New writes stop working completely', 'Addresses cannot be stored this way'], 'Work moves from reads to writes.'],
    ['Which question does a graph model win?', ['The number of hops is not known up front', 'The sum over one column of a table', 'A read of one value by one key', 'Storing a very large photo file'], 'Following relationships step by step.'],
    ['What sits in the middle of a star schema?', ['Facts: one row per event', 'Only user profile photos', 'Only a list of merchant names', 'No data, just a single index'], 'Dimension tables surround it.'],
    ['Where is the current state in event sourcing?', ['Built by replaying the event log', 'Read directly from a single row', 'Kept forever in a shared cache', 'Stored on the client device'], 'The log only grows, never changes.'],
  ],
});

export const l36 = level({
  id: 36, chapter: 7,
  title: 'Keeping copies right', concept: 'Leader · Replication lag · Quorum',
  story: 'The address saved, but did not show',
  briefing: 'Three copies of the data: one can die and reads are shared. But a merchant saved an address, refreshed, and saw the old one. How do copies stay in step, and when do they not?',
  ref: ddia(6, 'Replication'),
  predict: ['With async replication, the leader says "done" and then you read from a follower. What can you see?', ['An old value, possibly', 'Always the new value', 'The data is deleted', 'The follower stops writes']],
  nodes: [
    ['w', 'Write', 'user', 8, 50], ['ld', 'Leader', 'db', 34, 50], ['f1', 'Follower 1', 'db', 64, 22], ['f2', 'Follower 2', 'db', 64, 78], ['rd', 'Read', 'user', 90, 22], ['q', 'Quorum w+r>n', 'key', 90, 78],
  ],
  steps: [
    { text: 'Single leader: every write goes to the leader, which ships its change log to the followers.', add: ['w', 'ld', 'f1', 'f2'], flow: [['w', 'ld'], ['ld', 'f1'], ['ld', 'f2']] },
    { text: 'Async: the leader said "done" without waiting. Follower 1 is a little behind.', badges: { f1: 'behind' }, ask: ['The merchant now reads from Follower 1. What do they see?', ['The old address', 'The new address', 'No address at all', 'An error']] },
    { text: 'That is replication lag: not seeing your own write. The fix: read what you just changed from the leader for a while.', add: ['rd'], flow: [['ld', 'rd']], ok: ['ld'] },
    { text: 'If the leader dies, a failover picks a new one. With async you may lose the latest writes; with two leaders by mistake, you get split brain.', down: ['ld'], badges: { ld: 'down' } },
    { text: 'Leaderless: nobody is the boss. A write goes to w of n copies, a read asks r. If w + r > n, the two sets overlap in at least one copy.', add: ['q'], ok: ['ld'], focus: ['q', 'f1', 'f2'], badges: { q: 'n=3, w=2, r=2' }, ask: ['With n = 3, w = 2, r = 2, is a fresh value guaranteed?', ['Yes, because 2 + 2 > 3', 'No, because 2 + 2 is below 3', 'No, it only works when w = 3', 'No, there is never a guarantee']] },
    { text: 'Multi-leader (several datacenters): writes stay close, but the same data changed in two places conflicts. The resolution rule has to be decided in advance.', focus: ['f1', 'f2'] },
  ],
  summary: ['Single leader is simple; async brings lag and a risk of loss', 'Fix lag by reading your own writes from the leader', 'Quorum needs w + r > n; multi-leader needs conflict rules'],
  play: {
    kind: 'missions', intro: 'Three incidents.',
    missions: [
      ['A merchant saves, refreshes, and sees the old value?', ['Read recent writes from the leader', 'Do nothing, it fixes itself soon', 'Turn off every follower replica', 'Extend the cache lifetime further'], 'Read-your-writes.'],
      ['The leader died and an async follower took over. The risk?', ['The last few writes may be lost', 'There is no risk of any kind', 'All of the data is doubled up', 'A new leader never fails again'], 'Async means delivery is not guaranteed.'],
      ['Dhaka and Singapore changed the same parcel address independently?', ['A conflict rule decided beforehand', 'Keep whichever clock says later', 'Delete both', 'Nothing'], 'Clocks drift: pick the rule in advance.'],
    ],
  },
  boss: [
    ['Sync versus async replication?', ['Sync waits for copies; async does not', 'Async has no followers at all', 'Sync has no leader at all', 'There is no difference between them'], 'Sync is safer but slower or can stall.'],
    ['The best-known symptom of replication lag?', ['Not seeing your own write', 'Data doubling', 'The disk filling', 'The network dropping'], 'A follower is behind.'],
    ['What is split brain in a failover?', ['Two nodes both think they lead', 'All followers fall asleep at once', 'A disk breaks and loses the data', 'The network suddenly gets faster'], 'Two writers corrupt the data.'],
    ['With n = 5, w = 3, r = 2, is there a quorum guarantee?', ['No: 3 + 2 = 5, which is not above 5', 'Yes, since 3 is more than half', 'Only while reading, not writing', 'Only while writing, not reading'], 'You need w + r > n.'],
    ['Why do conflicts arise in multi-leader setups?', ['The same data changes in two places at once', 'It happens whenever there is no leader', 'It happens when the network is small', 'It happens when the disk is small'], 'A merge rule is needed later.'],
  ],
});

export const l37 = level({
  id: 37, chapter: 7,
  title: 'Splitting the data', concept: 'Key range · Hash · Hot spot · Rebalancing',
  story: 'Today\'s shard is overloaded alone',
  briefing: 'Parcel data no longer fits on one machine, so it is sharded. At first the key was the creation date. On sale day one shard took all the load. How do you split so the load spreads?',
  ref: ddia(7, 'Sharding'),
  predict: ['If the shard key is the date-time, where do all new parcel writes go?', ['To today\'s one shard', 'Evenly to all shards', 'Randomly', 'Nowhere']],
  nodes: [
    ['c', 'Client', 'user', 8, 50], ['r', 'Router', 'lb', 32, 50], ['s1', 'Shard 1', 'db', 62, 18], ['s2', 'Shard 2', 'db', 62, 50], ['s3', 'Shard 3', 'db', 62, 82], ['map', 'Map', 'key', 90, 50],
  ],
  steps: [
    { text: 'The router consults a map to decide which key lives on which shard.', add: ['c', 'r', 'map', 's1', 's2', 's3'], flow: [['c', 'r'], ['r', 's2']] },
    { text: 'Key = date: every new parcel lands on today\'s shard while the others sit idle.', down: ['s1'], flow: [['r', 's1']], badges: { s1: 'hot spot' }, ask: ['To remove the hot spot, what do you change the key to?', ['A hash of the parcel ID first', 'An even older date instead', 'Keep today\'s date as the key', 'Reduce the number of shards']] },
    { text: 'Hashing spreads evenly. But neighbouring keys scatter, so a range query must ask every shard.', ok: ['s1'], flow: [['r', 's1'], ['r', 's2'], ['r', 's3']] },
    { text: 'Compound key: merchant ID hash first, then time. Writes spread, yet one merchant\'s time range stays easy.', focus: ['r', 'map'] },
    { text: 'One famous merchant\'s key draws everyone. Even with hashing, one key lives on one shard.', down: ['s3'], flow: [['r', 's3']], badges: { s3: 'popular key' } },
    { text: 'Adding shards: with hash mod N, nearly all data moves.', ok: ['s3'], ask: ['Going from four machines to five with hash mod N, how much data moves?', ['About 80%', 'About 20%', 'Exactly 1%', 'None']] },
    { text: 'With fixed partitions (many created in advance), only the new machine\'s fair share, about 20%, moves. And for secondary indexes: local is cheap to write but reads ask everyone; global is the reverse.', focus: ['r'] },
  ],
  summary: ['Range: easy range queries but hot spots; hash: even spread', 'A hot key needs its own trick', 'Not hash mod N; rebalance with fixed partitions'],
  play: {
    kind: 'missions', intro: 'Three decisions.',
    missions: [
      ['We want spread-out writes but also a merchant\'s time range. The key?', ['Merchant hash, then time', 'Time alone, nothing else', 'Parcel ID alone, nothing else', 'Keep everything on one machine'], 'A compound key.'],
      ['One hot key gets huge reads and writes. What do you do?', ['Append a random suffix to split it', 'Do nothing and wait it out', 'Reduce the number of shards', 'Swap in a different hash function'], 'Reads must join the parts, so only for the hot key.'],
      ['We search parcels by zone but shard by parcel ID. With a local index?', ['Ask every shard and merge', 'One shard answers directly', 'It cannot be searched by zone', 'No index is needed here'], 'Scatter/gather.'],
    ],
  },
  boss: [
    ['The benefit of key-range sharding?', ['Range queries are easy', 'No hot spots', 'Always an even split', 'No benefit'], 'Nearby keys stay together.'],
    ['The price of hash sharding?', ['Range queries touch every shard', 'Every write becomes much slower', 'Some data is lost for good', 'You can never add more shards'], 'Neighbouring keys scatter.'],
    ['Adding shards with hash mod N?', ['Nearly all data moves', 'Nothing moves', 'Only the new shard', 'Half'], 'Changing N changes the rule.'],
    ['With fixed partitions, a new node arrives. What happens?', ['Some partitions move from each node', 'Every partition is reshuffled', 'No partition ever moves', 'Old node data is erased at once'], 'A key\'s partition never changes.'],
    ['The cost of a global secondary index?', ['A write touches several shards', 'Reads are always much slower', 'There is no extra cost at all', 'The index does not store anything'], 'Cheap reads, heavy writes.'],
  ],
});

export const l38 = level({
  id: 38, chapter: 7,
  title: 'Two cashiers, one item left', concept: 'ACID · Isolation · Lost update · Write skew',
  story: 'One item, two buyers',
  briefing: 'One item left in the shop. Two cashiers sold it at almost the same moment and both got "sold". Transactions exist to tame this kind of collision, but how strict must isolation be?',
  ref: ddia(8, 'Transactions'),
  predict: ['Two cashiers both read stock = 1 and both write 0. What happens?', ['Both complete a sale', 'Only one sells', 'The database hangs', 'No difference']],
  nodes: [
    ['a', 'Cashier A', 'user', 10, 22], ['b', 'Cashier B', 'user', 10, 78], ['st', 'Stock = 1', 'db', 46, 50], ['lk', 'Lock / atomic', 'key', 78, 22], ['ser', 'Serializable', 'service', 78, 78],
  ],
  steps: [
    { text: 'A reads stock = 1. B, almost at once, also reads stock = 1.', add: ['a', 'b', 'st'], flow: [['a', 'st'], ['b', 'st']] },
    { text: 'Both write "1 − 1 = 0". Both are told "sold".', badges: { st: 'two sales, one item' }, down: ['st'], ask: ['What is this mistake called?', ['Lost update', 'Dirty read', 'Phantom', 'Deadlock']] },
    { text: 'The fix: do not read-modify-write apart; use one atomic update: "stock = stock − 1 where stock > 0".', add: ['lk'], ok: ['st'], flow: [['a', 'lk'], ['lk', 'st']], focus: ['lk'] },
    { text: 'Another kind: "at least one rider must stay on duty". Two riders take leave at once, each updating a different row.', badges: { st: 'both off duty' } },
    { text: 'That is write skew: nobody changed anyone else\'s row, so lost-update protection misses it. Even snapshot isolation allows it.', add: ['ser'], focus: ['ser'], ask: ['Which level prevents write skew?', ['Serializable', 'Read committed', 'Snapshot alone', 'None of them']] },
    { text: 'Serializable comes three ways: literally one at a time on a single thread, two-phase locking (locks, with deadlocks), and SSI (optimistic, checked at commit).', ok: ['ser'] },
    { text: 'A distributed transaction (two-phase commit) gets everyone to agree, but if the coordinator dies, participants are "in doubt" and hold their locks.', focus: ['st'] },
  ],
  summary: ['Lost update: an atomic operation or a lock', 'Write skew: different rows, needs serializable', 'In two-phase commit, a dead coordinator stalls everyone'],
  play: {
    kind: 'missions', intro: 'Three incidents.',
    missions: [
      ['A counter app reads then writes, and sometimes it goes down. The simplest fix?', ['Atomic: counter = counter + 1', 'Add a few more servers', 'Buffer it in a cache first', 'Nothing needs to be done'], 'Let the database do it.'],
      ['Two people booked the last meeting room, in different time-slot rows?', ['Serializable, or a lock on the condition', 'Read committed is enough here', 'Nothing needs to be done here', 'Check a cache beforehand to be sure'], 'Read a condition, write other rows: write skew.'],
      ['Payments and orders are two databases. To commit both together?', ['Two-phase commit, or idempotent retries', 'Hope that both writes succeed', 'Two separate writes, one after another', 'Reconcile by hand afterwards'], 'Mind the dying coordinator.'],
    ],
  },
  boss: [
    ['What does read committed prevent?', ['Dirty reads and dirty writes', 'Lost updates and write skew', 'Phantoms and deadlocks together', 'It prevents nothing at all'], 'The rest remain.'],
    ['What does Atomicity in ACID mean?', ['If it breaks midway, everything rolls back', 'Everything finishes much faster than before', 'All of the data lives on one machine', 'Only read operations are ever allowed'], 'No half-done work.'],
    ['Write skew versus lost update?', ['Different rows versus the same row', 'No difference, only the name', 'One happens only during reads', 'One happens only on replicas'], 'So row-level protection misses it.'],
    ['In 2PL, two transactions each wait for the other\'s lock. What happens?', ['Deadlock; one is aborted', 'Both transactions win quietly', 'Nothing happens, they wait on', 'All the data is erased'], 'The database cancels one.'],
    ['In two-phase commit, the coordinator dies. Then?', ['Participants are in doubt, holding locks', 'Everyone commits on their own anyway', 'Everyone aborts on their own anyway', 'Nothing happens, everything is just fine'], 'After saying yes, you cannot back out.'],
  ],
});

export const l39 = level({
  id: 39, chapter: 7,
  title: 'No answer', concept: 'Timeout · Clock · Process pause · Fencing token',
  story: 'Two workers, both "the boss"',
  briefing: 'A call got no reply. Was the request lost, the server dead, or the reply lost on the way back? Two workers also both believe the lock is theirs. With many machines, something is always broken. So what must a design assume?',
  ref: ddia(9, 'The trouble with distributed systems'),
  predict: ['You sent a request and got no reply. What do you know?', ['Nothing for sure: it may have been done', 'It certainly was not done', 'The server certainly crashed', 'The network certainly works fine']],
  nodes: [
    ['cl', 'Client', 'user', 8, 50], ['nw', 'Network', 'lb', 32, 50], ['sv', 'Server', 'server', 56, 50], ['ck', 'Clock', 'clock', 82, 20], ['lk', 'Lock service', 'key', 56, 82], ['stg', 'Storage', 'db', 90, 82],
  ],
  steps: [
    { text: 'The client sends a request. No reply comes.', add: ['cl', 'nw', 'sv'], flow: [['cl', 'nw'], ['nw', 'sv']], badges: { cl: 'silence' }, ask: ['What could explain the silence?', ['Request or reply lost, server down, or already done', 'Only the request was lost on the way there', 'Only the server has crashed and stopped', 'Only a mistake somewhere in the client code']] },
    { text: 'The client cannot tell the four apart. The only tool is a timeout, plus idempotent requests so retries are safe.', focus: ['cl'] },
    { text: 'A short timeout calls a healthy but slow node dead; a long one is slow to catch a broken node.', badges: { sv: 'slow, not dead' } },
    { text: 'Clocks cannot be trusted either: two machines drift apart. The time-of-day clock can jump backwards; to measure elapsed time use a monotonic clock.', add: ['ck'], focus: ['ck'], badges: { ck: 'drift' } },
    { text: 'Process pause: a worker holds a lock, then freezes for 15 seconds in garbage collection. The lease expires and another worker gets the lock.', add: ['lk', 'stg'], down: ['sv'], flow: [['sv', 'lk']], badges: { sv: 'paused' } },
    { text: 'The old worker wakes and tries to write, still believing the lock is its own.', ok: ['sv'], flow: [['sv', 'stg']], ask: ['How do you stop that stale write?', ['A fencing token: storage rejects smaller ones', 'Check the clock again just before writing', 'Trust the worker and let the write through', 'Make the lock timeout a lot longer still']] },
    { text: 'The truth is settled by a majority (quorum), never by one node\'s own opinion.', focus: ['lk', 'stg'], ok: ['stg'] },
  ],
  summary: ['Silence has four causes: use timeouts and idempotent retries', 'Never order events by clock; measure time with monotonic', 'Pair every lock with a fencing token'],
  play: {
    kind: 'missions', intro: 'Three incidents.',
    missions: [
      ['A payment call timed out. If you retry?', ['Without an idempotency key it may charge twice', 'It is guaranteed to charge exactly once', 'Retrying carries no risk of any kind', 'Retrying should never be attempted'], 'It may already have happened.'],
      ['Two machines\' timestamps decide last write wins. The risk?', ['A write from the slower clock is dropped', 'No risk, clocks are synchronized', 'Every write gets doubled up', 'The disk fills up quickly'], 'Clocks disagree.'],
      ['A lock holder froze in GC and then wrote. The safeguard?', ['A fencing token', 'A longer lease', 'Syncing clocks', 'Nothing'], 'Storage rejects the old token.'],
    ],
  },
  boss: [
    ['The price of a short timeout?', ['Calling slow healthy nodes dead', 'Broken nodes go unnoticed', 'The network grows', 'No price'], 'Needless failovers.'],
    ['What is a monotonic clock for?', ['Measuring elapsed time', 'Showing the date', 'Ordering events across machines', 'Nothing'], 'It never goes backwards.'],
    ['Why is a process pause dangerous?', ['The lease expired and the process does not know', 'The disk suddenly breaks down underneath it', 'The network gets cut off from everything', 'Memory keeps growing on its own over time'], 'It wakes up thinking it still holds the lock.'],
    ['What does a fencing token do?', ['A rising number; smaller ones are rejected', 'It shortens the lock\'s lifetime', 'It synchronizes all machine clocks', 'It hides the worker\'s name'], 'It stops the old holder doing harm.'],
    ['Why use a quorum?', ['One node\'s own judgement is not trustworthy', 'It is only done to make things faster', 'It is only done to save storage space', 'There is simply no special reason'], 'The majority decides.'],
  ],
});

export const l40 = level({
  id: 40, chapter: 7,
  title: 'The big nightly sum', concept: 'Batch · MapReduce · Shuffle · Skew',
  story: 'One merchant, all night',
  briefing: 'Every night, the day\'s millions of deliveries are totalled per merchant. No instant answer is needed; it is big work over big data, rerunnable if it breaks. But one merchant stalled the whole job.',
  ref: ddia(11, 'Batch processing'),
  predict: ['One task of a batch job died midway. The simplest response?', ['Just rerun that task', 'Delete everything', 'Never run it again', 'Guess the result']],
  nodes: [
    ['in', 'Input (object store)', 'store', 8, 50], ['m1', 'Map 1', 'worker', 34, 24], ['m2', 'Map 2', 'worker', 34, 76], ['sh', 'Shuffle', 'queue', 60, 50], ['r1', 'Reduce (hot key)', 'worker', 88, 24], ['r2', 'Reduce', 'worker', 88, 76],
  ],
  steps: [
    { text: 'The input is immutable; the work is cut into pieces across many workers.', add: ['in', 'm1', 'm2'], flow: [['in', 'm1'], ['in', 'm2']] },
    { text: 'Map turns each record into (merchant, 1) pairs.', focus: ['m1', 'm2'] },
    { text: 'Shuffle: sort by key so all pairs of one merchant reach one reducer. The heaviest step: data goes from every node to every node.', add: ['sh'], flow: [['m1', 'sh'], ['m2', 'sh']], ask: ['Which step is the heaviest?', ['Shuffle: everything crosses the network', 'Map: reading each record exactly once', 'Reading the input files from disk', 'None of them is especially heavy']] },
    { text: 'Reduce combines the values for each key.', add: ['r1', 'r2'], flow: [['sh', 'r1'], ['sh', 'r2']] },
    { text: 'One huge merchant: all its records go to a single reducer. The others finish and it runs alone (skew).', down: ['r1'], ok: ['r2'], badges: { r1: 'for hours' }, ask: ['To reduce skew?', ['Split the hot key, count parts, merge', 'Reduce the number of workers', 'Cut the input data in half', 'Do nothing and just wait it out']] },
    { text: 'Joining with a small table: broadcast it, send the small table to every worker, and skip the shuffle.', ok: ['r1'], focus: ['sh'] },
    { text: 'Dataflow engines like Spark pass intermediate results straight along instead of writing files. And output is best built whole and swapped in at once, not written record by record.', focus: ['in'] },
  ],
  summary: ['Input is immutable, so a failure reruns just that task', 'Shuffle is heaviest; skew stalls on the slowest task', 'Broadcast joins, dataflow engines, swap output in at once'],
  play: {
    kind: 'missions', intro: 'Three decisions.',
    missions: [
      ['Twenty minutes in, all tasks but one are done, and it runs all night?', ['Skew: split the hot key', 'Add even more workers', 'Shrink the input further', 'Do nothing and just wait'], 'A job ends with its slowest task.'],
      ['Joining a huge delivery table with a small merchant table?', ['A broadcast hash join', 'Shuffle both', 'Copy to make it bigger', 'Nothing'], 'Send the small one everywhere and skip the shuffle.'],
      ['How do you load batch output into the live database?', ['Build it whole, then swap it in at once', 'Write it record by record', 'Push it straight into the app', 'Never load it into the database'], 'The app should never see a half state.'],
    ],
  },
  boss: [
    ['Batch versus online?', ['Batch: big data, throughput is the measure', 'Batch gives an instant answer each time', 'Online systems simply hold no data', 'There is no difference between them'], 'It is measured by throughput.'],
    ['What do map and reduce do?', ['Map makes pairs; reduce combines by key', 'Map combines; reduce splits them up', 'They are the same job, named twice', 'Both only copy files around'], 'A shuffle sits between.'],
    ['Why is shuffle heavy?', ['Data moves from every node to every node', 'Only a single disk read happens', 'Only CPU arithmetic is involved', 'It is not heavy at all'], 'It is network-heavy.'],
    ['Why are dataflow engines faster?', ['They pass results on instead of writing files', 'They begin with far less data overall', 'They use even more disk at each step', 'There is no particular reason for it'], 'The whole job is one graph.'],
    ['Why does skew slow a job?', ['One task gets an uneven load, the rest wait', 'Every worker happens to be slow at once', 'A small disk ends up blocking everything', 'There is no particular reason for it'], 'It ends with the slowest.'],
  ],
});

export const l41 = level({
  id: 41, chapter: 7,
  title: 'The stream of events', concept: 'Log broker · CDC · Event time · Exactly-once',
  story: 'The SMS that ran twice',
  briefing: 'A batch result arrives next day, but the SMS must go the moment a parcel is "Delivered". In a stream, events never end. After a job crashed, 600 people got the same SMS twice. How does a stream run without such mistakes?',
  ref: ddia(12, 'Stream processing'),
  predict: ['Writing to the database and the search index separately (a dual write): what can go wrong?', ['One fails and the two disagree', 'They always stay in agreement', 'It is fast with no risk at all', 'The index repairs itself later']],
  nodes: [
    ['db', 'Orders DB', 'db', 8, 50], ['cdc', 'CDC', 'worker', 30, 50], ['lg', 'Log (broker)', 'queue', 54, 50], ['ix', 'Search index', 'db', 82, 22], ['sms', 'SMS job', 'worker', 82, 78], ['ck', 'Event time', 'clock', 54, 14],
  ],
  steps: [
    { text: 'The app writes only to the database. Other places need the news too.', add: ['db'], focus: ['db'] },
    { text: 'CDC reads the database\'s own change log and turns it into events: the database is the one place that is written, and everyone else follows in the same order.', add: ['cdc', 'lg'], flow: [['db', 'cdc'], ['cdc', 'lg']], ask: ['Why is CDC better than a dual write?', ['Everyone follows one order; no drift', 'It is simply a good deal faster', 'It is simply a good deal cheaper', 'There is no real advantage at all']] },
    { text: 'A log-based broker keeps events, and a consumer only moves its offset. So the index and the SMS job read independently.', add: ['ix', 'sms'], flow: [['lg', 'ix'], ['lg', 'sms']] },
    { text: 'A phone was offline. An event from 10:02 arrives at 10:09. Which window does it belong to?', add: ['ck'], focus: ['ck'], ask: ['By event time, which window does the 10:02 event fall in?', ['10:00–10:05 (when it happened)', '10:05–10:10 (when it arrived)', 'Neither', 'Both']] },
    { text: 'A watermark says "assume everything before this time has arrived", then the window closes. Events arriving later need separate handling.', focus: ['ck', 'lg'] },
    { text: 'The SMS job crashed, came back from its checkpoint, and replayed 600 events. Those 600 people got the same SMS twice.', down: ['sms'], badges: { sms: 'second time' } },
    { text: 'Exactly-once means the effect happens once: an idempotency key from the event ID, or the result and the offset in one transaction.', ok: ['sms'], focus: ['sms'] },
  ],
  summary: ['CDC: everyone follows the database log in one order', 'Event time and watermarks put late events in the right window', 'Exactly-once means an idempotent effect'],
  play: {
    kind: 'missions', intro: 'Three incidents.',
    missions: [
      ['The search index often disagrees with the database because of separate writes?', ['Follow the database log with CDC', 'Write to both places even more', 'Delete the search index entirely', 'Do nothing and wait it out'], 'One source, one order.'],
      ['The consumer is slower than the arrival rate and the backlog grows?', ['Add consumers or find the slow step', 'Stop the producer completely', 'Delete the log and start over', 'Do nothing and wait it out'], 'It must be faster than arrivals to catch up.'],
      ['After a job crash, the SMS goes out twice?', ['An idempotency key from the event ID', 'Take fewer checkpoints than before', 'Turn the SMS feature off', 'Do nothing and assume it is fine'], 'An outside effect cannot be undone.'],
    ],
  },
  boss: [
    ['Queue versus log-based broker?', ['A log keeps events; they can be reread', 'A queue can be reread, a log cannot', 'They are the same thing renamed', 'A log deletes events once read'], 'The offset moves; events stay.'],
    ['What is CDC?', ['Sending database changes as events', 'Turning a cache completely off', 'Deleting an old search index', 'Syncing client clocks together'], 'It reads the replication log.'],
    ['Event time versus processing time?', ['When it happened versus when it arrived', 'They are the same thing', 'They are two names for a file', 'They have nothing to do with clocks'], 'The gap matters for late events.'],
    ['What does a watermark say?', ['Everything before this time has arrived', 'Delete all of the events right now', 'Make the window a great deal bigger', 'It does not actually say anything'], 'A signal to close a window.'],
    ['How is exactly-once possible?', ['By making the effect idempotent', 'Events never run twice anywhere', 'The network is perfectly reliable', 'It is simply not possible'], 'It may run twice inside; the effect lands once.'],
  ],
});
