import { level } from '../../dsl';
import { refs } from '../../refs';

/* Chapter 2 · Foundations of distributed systems — Vol 1, ch 5–7 (English) */

export const l5 = level({
  id: 5, chapter: 2, simulator: 'hashring',
  title: 'The cache ring', concept: 'Consistent hashing',
  story: 'Add a cache server and everything misses',
  briefing: 'In the Eid rush you added one more cache server. The very next minute almost every request was a cache miss and the database nearly collapsed. Why did adding one server break everything?',
  ref: refs.p2,
  predict: ['4 cache servers, keys placed by hash % 4. Add one more (% 5)?', ['Most keys move: a flood of misses', 'Only new keys go to the new server', 'About 20% of keys move, the rest stay', 'Every key is wiped and refilled']],
  nodes: [
    ['m0', 'Server 0', 'cache', 16, 28], ['m1', 'Server 1', 'cache', 39, 28], ['m2', 'Server 2', 'cache', 62, 28], ['m3', 'Server 3', 'cache', 85, 28],
    ['keys', '8 keys', 'key', 50, 78],
    ['r0', 'S0', 'ring', 50, 12], ['r1', 'S1', 'ring', 82, 50], ['r2', 'S2', 'ring', 50, 88], ['r3', 'S3', 'ring', 18, 50],
    ['k', 'key', 'key', 72, 22],
  ],
  steps: [
    { text: '4 cache servers; each key goes to server number hash(key) % 4.', add: ['m0', 'm1', 'm2', 'm3', 'keys'], flow: [['keys', 'm0'], ['keys', 'm1'], ['keys', 'm2'], ['keys', 'm3']] },
    { text: 'Server 3 goes down, so now it is % 3.', down: ['m3'], ask: ['How many of the 8 keys change place?', ['Most of them (about 6)', 'Only the 2 that were on server 3', 'Not a single one', 'All 8, guaranteed']] },
    { text: '6 keys moved, though the failed server held only 2. Hence a huge burst of cache misses.', down: ['m3'], badges: { keys: '6 moved' } },
    { text: 'Now place the servers on a ring (a hash ring).', hide: ['m0', 'm1', 'm2', 'm3', 'keys'], add: ['r0', 'r1', 'r2', 'r3'] },
    { text: 'A key walks clockwise and lives on the first server it meets.', add: ['k'], flow: [['k', 'r1']], badges: { k: '→ clockwise' } },
    { text: 'S1 goes down.', down: ['r1'], ask: ['Which keys move when S1 falls?', ['Only S1\'s keys, to S2', 'All keys are reshuffled', 'S0\'s keys, into S1\'s place', 'None, until S1 comes back']] },
    { text: 'Only S1\'s share moved to its neighbour. On average just k/n keys move.', down: ['r1'], flow: [['k', 'r2']], ok: ['r2'] },
    { text: 'The problem: shares are uneven. The fix is virtual nodes: each server sits at many points on the ring, so shares even out.', badges: { r0: 'big share', r2: 'small share' } },
  ],
  summary: ['With modulo hashing, changing the servers moves almost every key', 'On a ring a key goes to the first server clockwise; a change moves only the neighbour\'s share', 'Virtual nodes even out shares; a stronger server gets more of them'],
  play: {
    kind: 'missions', intro: 'Three decisions about the ring.',
    missions: [
      ['10 servers, 1 million keys. About how many keys move when you add one?', ['~100,000 (k/n)', '~500,000 (half)', '~900,000 (nearly all)', '0 (none)'], 'The new server takes roughly its own share: 1,000,000 / 11 ≈ 90,000.'],
      ['What happens when you add more virtual nodes?', ['Even shares, more memory for metadata', 'Uneven shares, but less memory', 'More keys move every time', 'The number of servers goes down'], 'More points means smaller slices, which average out evenly.'],
      ['One server is twice as powerful as the rest. To give it more load?', ['Give it more virtual nodes', 'Never place it on the ring twice', 'Go back to modulo hashing', 'Remove the others from the ring'], 'Number of virtual nodes = size of the share.'],
    ],
  },
  boss: [
    ['Where is consistent hashing used?', ['Partitioning in Cassandra/Dynamo', 'Storing passwords as hashes', 'Sorting a very large list', 'Generating encryption keys'], 'Anywhere data is split over many nodes and nodes come and go.'],
    ['One celebrity\'s key is overloading a server. Does consistent hashing fix it?', ['No, one key still lives in one place', 'Yes, the ring spreads the load itself', 'Yes, just add more virtual nodes', 'Yes, by going back to modulo'], 'A hotspot key is a separate problem.'],
    ['Where does a key go on the ring?', ['The first server clockwise', 'Split across the two nearest servers', 'The first server counter-clockwise', 'Always the first server on the ring'], 'That is the rule.'],
    ['The core problem with modulo hashing?', ['Changing servers moves nearly every key', 'Computing the hash is far too slow', 'Some keys are lost for good', 'New servers can never be added'], 'Change n and hash % n changes for almost everyone.'],
    ['How do you decide how many virtual nodes?', ['More evens shares; balance against memory', 'One is enough; more makes lookup slow', 'Always exactly the number of servers', 'The fewer there are, the more even'], 'The book\'s numbers: ~10% standard deviation at 100 virtual nodes, ~5% at 200.', 'As the count grows, the deviation…'],
  ],
});

export const l6 = level({
  id: 6, chapter: 2, simulator: 'quorum',
  title: 'The stale data mystery', concept: 'Key-value store · CAP',
  story: 'One node down and data looks old',
  briefing: 'A merchant changed a price, but some customers still see the old one. The data is kept on three nodes, so where did the old value come from? Today: quorum, CAP and vector clocks.',
  ref: refs.p2,
  predict: ['Writes go to three copies. Why does a read return an old value when one node lags?', ['The read came from the lagging copy', 'The hash function computed it wrong', 'The disk was full, so it never wrote', 'The client\'s clock shows the wrong time']],
  nodes: [
    ['c', 'Client', 'user', 8, 50], ['co', 'Coordinator', 'lb', 36, 50],
    ['a', 'Node A', 'db', 74, 18], ['b', 'Node B', 'db', 80, 50], ['n3', 'Node C', 'db', 74, 82],
  ],
  steps: [
    { text: 'Each key is stored on 3 nodes (N = 3).', flow: [['c', 'co'], ['co', 'a'], ['co', 'b'], ['co', 'n3']], badges: { co: 'N = 3' } },
    { text: 'A write counts as successful once 2 nodes ack (W = 2).', ok: ['a', 'b'], flow: [['co', 'a'], ['co', 'b']], badges: { co: 'W = 2' } },
    { text: 'Now a read: take answers from 2 nodes (R = 2).', badges: { co: 'R = 2' }, ask: ['W = 2, R = 2, N = 3. Is a read sure to get the new value?', ['Yes, because W + R > N', 'No, because W + R < N', 'Only if you are lucky', 'Yes, but only when R = 3']] },
    { text: 'When W + R > N, the read set and the write set overlap somewhere: strong consistency.', ok: ['b'], flow: [['co', 'b'], ['co', 'n3']] },
    { text: 'Node C goes down and the network splits (a partition).', down: ['n3'], ask: ['What does CAP say now?', ['Consistency or availability, pick one', 'You get both, just a bit slower', 'A partition means deleting data', 'Only partition tolerance is lost']] },
    { text: 'Choose AP and the two sides may take different writes; vector clocks tell which came first, or that they conflict.', down: ['n3'], badges: { a: 'v1 [A:1]', b: 'v2 [A:1,B:1]' } },
    { text: 'When the node returns, hinted handoff and Merkle trees bring the lagging data back in line (anti-entropy).', ok: ['n3'], flow: [['b', 'n3']] },
  ],
  summary: ['N copies, write on W acks, read from R answers; W + R > N means strong', 'In a partition, consistency or availability: CP or AP', 'Vector clocks detect conflicts; Merkle trees and hinted handoff reconcile'],
  play: {
    kind: 'missions', intro: 'Three situations about N, W, R and CAP.',
    missions: [
      ['R = 1, W = 3, N = 3. What is it good for?', ['Fast reads', 'Fast writes', 'Both are slow', 'Neither'], 'One answer is enough for a read; a write waits for everyone.'],
      ['W = 1, R = 1, N = 3. Consistency?', ['Eventual (W + R ≤ N)', 'Strong (W + R > N)', 'Always linearizable', 'CP, since it is a single ack'], 'The read and write nodes may not overlap.'],
      ['Payment-like data, a wrong value is unacceptable. CP or AP?', ['CP: better down than wrong', 'AP: staying up matters most', 'Both work equally well', 'CAP does not apply here'], 'With money, a wrong value is dangerous.'],
    ],
  },
  boss: [
    ['Vector clocks [A:2, B:1] and [A:1, B:2]. How are they related?', ['A conflict: neither came first', 'The first is newer, A is higher', 'The second is newer, B is higher', 'They are the same version'], 'One is newer only if every counter is ≥ the other\'s; here each is ahead on one.', 'Compare each counter separately'],
    ['How does everyone learn a node is down (with no central server)?', ['Gossip: spreading heartbeats', 'The load balancer tells everyone', 'By changing a DNS record', 'The coordinator emails everyone'], 'Each node sends its list to a few others; the news spreads.'],
    ['What do sloppy quorum and hinted handoff solve?', ['Accepting writes while a node is down', 'Making disk writes go faster', 'Preventing two keys\' hashes colliding', 'Keeping replica data encrypted'], 'Another node takes over for a while and hands back when it returns.'],
    ['On the write path, where does data go first?', ['Commit log → memtable → SSTable', 'Straight to SSTable, then the log', 'Memtable → commit log → disk', 'Only memory, to disk someday'], 'Even after a crash it can be recovered from the commit log.'],
    ['On a read, how do you quickly tell which SSTable has a key?', ['Bloom filter', 'Merkle tree', 'Vector clock', 'Gossip'], 'A Bloom filter says "not here" for certain and "here" probably.'],
  ],
});

export const l7 = level({
  id: 7, chapter: 2, simulator: 'snowflake',
  title: 'Same ID twice', concept: 'Unique ID generator',
  story: 'Two servers gave out the same parcel ID',
  briefing: 'Two database servers were counting independently, and today two parcels got the same ID. One parcel\'s tracking shows the other\'s address! You need IDs that never collide and are sorted by time.',
  ref: refs.p2,
  predict: ['Auto-increment on two databases. The problem?', ['Both produce the same numbers', 'IDs are not sorted by time', 'Both databases slow down', 'IDs grow beyond 64 bits']],
  nodes: [
    ['s1', 'Server A', 'server', 30, 16], ['s2', 'Server B', 'server', 70, 16],
    ['sign', '1 bit', 'step', 9, 58], ['ts', 'Timestamp 41', 'clock', 30, 58], ['dc', 'Datacenter 5', 'step', 52, 58], ['mc', 'Machine 5', 'server', 71, 58], ['seq', 'Sequence 12', 'step', 91, 58],
  ],
  steps: [
    { text: 'Two servers counting on their own hand out the same ID.', add: ['s1', 's2'], down: ['s2'], badges: { s1: '#1001', s2: '#1001' } },
    { text: 'Twitter snowflake: build the ID by splitting 64 bits.', hide: ['s1', 's2'], add: ['sign', 'ts', 'dc', 'mc', 'seq'] },
    { text: '41-bit timestamp (milliseconds): IDs sort by time; lasts ~69 years.', focus: ['ts'] },
    { text: 'Datacenter and machine ID: every machine is different, so there are no collisions.', focus: ['dc', 'mc'] },
    { text: 'The same machine asks for another ID in the same millisecond.', focus: ['seq'], ask: ['Which part of the ID changes this time?', ['The sequence goes up by 1', 'The timestamp goes up', 'The machine ID changes', 'The ID stays the same']] },
    { text: 'The sequence goes up; one machine can give out up to 4,096 IDs in a millisecond.', focus: ['seq'], badges: { seq: '0 → 1' } },
    { text: 'The server\'s clock suddenly jumps backwards.', down: ['ts'], ask: ['What is the risk when the clock goes back?', ['Duplicates or broken order; must wait', 'Nothing, the sequence handles it', 'The IDs just get bigger', 'The machine ID changes by itself']] },
    { text: 'NTP keeps clocks in sync. Other options: UUID (128 bits, unordered), a ticket server (a SPOF).', ok: ['ts'] },
  ],
  summary: ['Snowflake: sign | timestamp 41 | datacenter 5 | machine 5 | sequence 12', 'The timestamp sorts IDs by time; the sequence allows 4,096 per ms', 'UUID is simple but 128 bits and unordered; a ticket server is a SPOF'],
  play: {
    kind: 'missions', intro: 'Three decisions about splitting 64 bits.',
    missions: [
      ['IDs must sort by time and fit in 64 bits. Which?', ['Snowflake', 'UUID', 'Random number', 'Email address'], 'The timestamp comes first, so numbers grow with time.'],
      ['One machine needs 10,000 IDs in one ms. Is a 12-bit sequence enough?', ['No, 12 bits give only 4,096', 'Yes, 12 bits give 16,384', 'Yes, the timestamp copes', 'No, add more machine bits'], '2^12 = 4,096 < 10,000; you need 14 bits (16,384).'],
      ['The weakness of UUIDs?', ['128 bits, no ordering', 'They collide often', 'Servers must coordinate', 'Very slow to generate'], 'Collisions are negligible, but they fail if you need 64 bits and order.'],
    ],
  },
  boss: [
    ['The problem with a ticket server (Flickr style)?', ['Every ID from one place: a SPOF', 'IDs are 128 bits, too much space', 'IDs do not sort by time', 'Each server gives its own numbers'], 'Every ID comes from one place.'],
    ['What do you lose by using fewer timestamp bits?', ['How many years it lasts', 'The number of machines', 'IDs per millisecond', 'Nothing, it is just shorter'], '41 bits of ms ≈ 69 years; fewer runs out sooner.'],
    ['Machine bits are 5 (32 machines). You need 100 machines?', ['More machine bits, take them elsewhere', 'Nothing, 32 machines is plenty', 'Only add more timestamp bits', 'Adding sequence bits solves it'], 'The total is fixed at 64 bits, so growing one part shrinks another.', '2^5 = ?'],
    ['The problem with multi-master auto-increment (step by k)?', ['Hard to add or remove; no time order', 'The same ID often comes up twice', 'Every ID is very slow to make', 'IDs become 128 bits long'], 'k is fixed, so changing the servers breaks the rule.'],
    ['Why is there a sign bit at the front of a snowflake?', ['Reserved for the future, always 0', 'The highest bit of the timestamp', 'It flips to 1 when there is an error', 'The first bit of the datacenter ID'], 'To avoid signed-number trouble, and for future use.'],
  ],
});
