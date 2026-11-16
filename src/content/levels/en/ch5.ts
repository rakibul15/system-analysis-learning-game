import { level } from '../../dsl';
import { refs } from '../../refs';

/* Chapter 5 · Money, slots and the warehouse — Vol 2, ch 7–13 (English) */

export const l22 = level({
  id: 22, chapter: 5, simulator: 'reservation',
  title: 'One slot, two people', concept: 'Reservation · Concurrency',
  story: 'The same pickup slot to two merchants',
  briefing: 'Two merchants booked the last 4 p.m. pickup slot at the same time, and both saw "success". One rider, two people waiting. Your first meeting with a race condition.',
  ref: refs.p6,
  predict: ['Two people booked the last slot at once and both succeeded. Why?', ['Both read first, then both wrote', 'The database was broken', 'The network was too fast', 'The merchants pressed wrongly']],
  nodes: [
    ['u1', 'Merchant 1', 'user', 8, 26], ['u2', 'Merchant 2', 'user', 8, 74], ['svc', 'Reservation service', 'service', 40, 50],
    ['db', 'Inventory DB', 'db', 76, 50], ['lk', 'Lock / version', 'step', 76, 14],
  ],
  steps: [
    { text: 'Both read at the same moment: 1 left.', add: ['u1', 'u2', 'svc', 'db'], flow: [['u1', 'svc'], ['u2', 'svc'], ['svc', 'db']], badges: { db: '1 left' } },
    { text: 'Both see "free" and go to write.', ask: ['If both write, how many are reserved?', ['2 (of 1): overbooking', '1, the last one wins', '0, both cancelled', '3, a retry adds one']] },
    { text: 'Reserved 2, total 1: overbooking.', down: ['db'], badges: { db: 'reserved 2 / total 1' } },
    { text: 'Pessimistic lock: lock the row when reading (SELECT … FOR UPDATE); the other one waits.', add: ['lk'], flow: [['u1', 'svc'], ['svc', 'lk']], badges: { lk: 'pessimistic' } },
    { text: 'Optimistic lock: a version number on the row.', badges: { lk: 'optimistic: version' }, ask: ['It read version 5 and goes to write, but the DB is now at version 6. What happens?', ['It fails; read again and retry', 'It succeeds, new version 6', 'The DB crashes', 'It reverts to version 5']] },
    { text: 'On failure, read again and retry. A database constraint also works: reserved ≤ total, roll back if broken.', ok: ['db'], badges: { lk: 'DB constraint' } },
    { text: 'With little contention optimistic is better (no locks); with heavy contention it fails again and again. And the same user clicking twice? An idempotency key.', focus: ['svc'] },
  ],
  summary: ['Read-then-write = a race condition and overbooking', 'Pessimistic lock, optimistic version, or a DB constraint', 'An idempotency key for double clicks'],
  play: {
    kind: 'missions', intro: 'Choosing a lock.',
    missions: [
      ['Which DB for reservation data?', ['Relational (ACID)', 'Key-value only', 'A CSV file', 'Cache only'], 'You need transactions and constraints.'],
      ['The same merchant pressed "Book" twice?', ['The second is dropped by idempotency key', 'It becomes two separate bookings', 'The second always shows an error', 'The second wipes out the first'], 'Generate the reservation ID up front and send it.'],
      ['Contention is low. Which lock?', ['Optimistic', 'Pessimistic', 'Global lock', 'No lock'], 'Most of the time there is no clash.'],
    ],
  },
  boss: [
    ['Huge contention in a flash sale. The problem with optimistic locking?', ['Many failures and endless retries', 'It never fails, all succeed', 'Deadlock freezes everything', 'Data is silently lost'], 'The version keeps changing.'],
    ['The risk of pessimistic locking?', ['Deadlocks and poor scaling', 'Overbooking', 'No risk at all', 'The version keeps rising'], 'Holding a lock keeps everyone else waiting.'],
    ['Keeping inventory in a cache?', ['Fast reads, final check in the DB', 'All in cache, drop the DB', 'Caching it is strictly forbidden', 'The cache is the truth, not the DB'], 'The cache can be slightly stale.'],
    ['Reservation and payment are separate services and DBs?', ['Saga or 2PC', 'Nothing is needed', 'Put both in one table', 'Reconcile with a cache'], 'No single transaction spans two DBs.', 'In depth at level 27'],
    ['Overbook by 10% on purpose (for no-shows)?', ['Constraint at total × 110%', 'Impossible, constraints forbid it', 'Remove the lock and it works', 'Drop some bookings at random'], 'A standard hotel practice, covered in the book.'],
  ],
});

export const l23 = level({
  id: 23, chapter: 5, simulator: 'email',
  title: 'Receipts in spam', concept: 'Email service',
  story: 'Receipts are landing in spam',
  briefing: 'Half of customers\' delivery receipt emails land in the spam folder. Nobody sees them and complaints are rising. Which way does email travel, and who decides inbox or spam?',
  ref: refs.p6,
  predict: ['The core protocol for sending email?', ['SMTP', 'HTTP only', 'FTP', 'SSH']],
  nodes: [
    ['app', 'ParcelGo', 'service', 8, 50], ['ws', 'Web server', 'server', 28, 50], ['q', 'Outgoing queue', 'queue', 48, 50],
    ['sm', 'SMTP worker', 'worker', 68, 50], ['ot', 'Recipient mail server', 'server', 90, 26], ['ib', 'Inbox / spam', 'store', 90, 78],
  ],
  steps: [
    { text: 'Email goes into an outgoing queue; an SMTP worker sends it.', add: ['app', 'ws', 'q', 'sm'], flow: [['app', 'ws'], ['ws', 'q'], ['q', 'sm']] },
    { text: 'Over SMTP to the recipient\'s mail server.', add: ['ot'], flow: [['sm', 'ot']] },
    { text: 'It has reached the recipient\'s side.', add: ['ib'], ask: ['Where does the spam check happen?', ['At the recipient\'s mail server', 'At our SMTP worker', 'At the DNS server', 'In our outgoing queue']] },
    { text: 'The recipient checks SPF, DKIM, DMARC and sender reputation to decide inbox or spam.', flow: [['ot', 'ib']], badges: { ib: 'spam?' } },
    { text: 'Lots of mail suddenly from a new IP = suspicious. Ramp up slowly (warm-up), and use separate IPs for receipts and marketing.', badges: { sm: 'IP warm-up' } },
    { text: 'Many people are marking receipts as spam.', ask: ['The effect?', ['Reputation drops, more lands in spam', 'Nothing, only that one email', 'Email arrives even faster', 'Bounces drop below before']] },
    { text: 'Watch bounces and complaints to keep the list clean; make unsubscribing easy.', ok: ['ib'] },
  ],
  summary: ['App → queue → SMTP worker → recipient server → inbox/spam', 'SPF, DKIM, DMARC and reputation', 'IP warm-up, separate IPs, handle bounces and complaints'],
  play: {
    kind: 'missions', intro: 'Three deliverability questions.',
    missions: [
      ['What does DKIM do?', ['Signs mail: proves it is unaltered', 'Encrypts the entire email', 'Says which IPs may send', 'Searches the spam folder'], 'The recipient verifies it with the domain\'s public key.'],
      ['Marketing and receipts from the same IP?', ['Keep separate IPs', 'One IP, it is simpler', 'No IP needed, a domain will do', 'Change IP every hour'], 'Protect the reputation of transactional email.'],
      ['The same address bounces again and again?', ['Suppression list: stop sending', 'Keep sending until it arrives', 'Send it to the spam folder', 'Try from a different IP'], 'Many bounces lower your reputation.'],
    ],
  },
  boss: [
    ['A million emails on day one from a new domain. The mistake?', ['No IP/domain warm-up', 'Too many SPF records', 'A DKIM signature too long', 'Too many images in the email'], 'Trust is earned slowly.'],
    ['Where do attachments go?', ['Object storage, linked from metadata', 'As binary inside a database row', 'Inside the outgoing queue message', 'In the cache server\'s memory'], 'Large binaries are kept apart.'],
    ['Which DB for huge mail metadata?', ['Bigtable/Cassandra NoSQL', 'One big MySQL server', 'Only Redis memory', 'One CSV file per day'], 'The book\'s choice.'],
    ['New mail instantly in the web client?', ['WebSocket', 'Polling every ms', 'Email', 'Reload'], 'A real-time two-way connection.'],
    ['Searching millions of emails?', ['A search index (Elasticsearch)', 'A full scan of all mail each time', 'Keep all mail in cache and search', 'Delete old mail to shrink search'], 'Write-heavy search needs careful design.'],
  ],
});

export const l24 = level({
  id: 24, chapter: 5, simulator: 'objectStore',
  title: 'The cost of POD photos', concept: 'Object storage (S3)',
  story: 'The cost of keeping proof-of-delivery photos',
  briefing: 'Every delivery\'s proof photo must legally be kept for 5 years. Keeping three copies of each triples the storage bill. Can it be just as safe for less?',
  ref: refs.p6,
  predict: ['3 copies to stay safe (replication). How much extra storage?', ['200% (3× in total)', '50% (1.5× in total)', '100% (2× in total)', '300% (4× in total)']],
  nodes: [
    ['obj', 'Object', 'store', 10, 24], ['rep', '3 copies', 'store', 40, 24], ['ec', 'Erasure coding 8+4', 'worker', 72, 24],
    ['d', '8 data chunks', 'store', 54, 62], ['p', '4 parity', 'store', 86, 62], ['dk', 'Failed disk', 'db', 70, 90],
  ],
  steps: [
    { text: 'Replication: 3 copies, 200% extra space, fast reads.', add: ['obj', 'rep'], flow: [['obj', 'rep']], badges: { rep: 'cost 3×' } },
    { text: 'Erasure coding: 8 data + 4 parity chunks, only 50% extra.', add: ['ec', 'd', 'p'], flow: [['obj', 'ec'], ['ec', 'd'], ['ec', 'p']], badges: { ec: 'cost 1.5×' } },
    { text: 'Several disks in a rack failed.', add: ['dk'], down: ['dk'], ask: ['With 8+4, how many chunks can be lost and the data survive?', ['4', '1', '8', '0']] },
    { text: 'Lose any 4 and it can be rebuilt from the other 8. But reads must fetch from many nodes, so they are slower.', down: ['dk'], ok: ['ec'] },
    { text: 'Metadata is separate: bucket and object name → which data node, which offset.', focus: ['obj'] },
    { text: 'Tens of millions of small photos.', ask: ['The problem if each photo is its own file?', ['Inodes and metadata run out', 'No problem, a file is a file', 'Each photo\'s quality drops', 'No photo can be read without a CDN']] },
    { text: 'Small objects are appended into one big file (like a WAL), with offsets in the metadata.', focus: ['d'] },
  ],
  summary: ['Replication 3×: fast, expensive; erasure coding 1.5×: cheap, slower', '8+4 means losing 4 is fine', 'Separate metadata; pack small objects into big files'],
  play: {
    kind: 'missions', intro: 'Which for which data.',
    missions: [
      ['Data read often, latency matters?', ['Replication', 'Erasure coding', 'Tape', 'Neither'], 'The whole object from one place.'],
      ['Archive, rarely read, cost matters (POD photos)?', ['Erasure coding', 'Five copies', 'Keep in memory', 'Keep in cache'], 'POD photos are the textbook case.'],
      ['The benefit of immutable objects?', ['Simpler design, only new versions', 'Fast in-place updates', 'Every write needs a lock', 'No benefit at all'], 'In S3 objects are never changed in place.'],
    ],
  },
  boss: [
    ['To raise durability, where do copies go?', ['Separate failure domains (rack/AZ)', 'Different parts of one disk', 'Different disks in one server', 'The next server in the same rack'], 'One power cut must not take everything.'],
    ['To detect data corruption?', ['Checksums', 'Just more copies', 'A cache', 'Nothing'], 'Verify the checksum on read.'],
    ['Delete with versioning on?', ['A delete marker; old versions remain', 'Every version is wiped', 'Error: versioned objects cannot be deleted', 'The whole bucket is deleted'], 'Even an accidental delete can be undone.'],
    ['Uploading a large file?', ['Multipart upload', 'One single upload', 'As an email attachment', 'Compress, then one upload'], 'If a part fails, redo only that part.'],
    ['Why garbage collection?', ['Reclaim space from deleted parts', 'Make reads faster than before', 'Keep the cache always warm', 'Not needed, disks are cheap'], 'Deleted pieces of packed files are cleaned up later.'],
  ],
});

export const l25 = level({
  id: 25, chapter: 5, simulator: 'leaderboard',
  title: 'Rider ranking', concept: 'Leaderboard',
  story: 'Rider ranking',
  briefing: 'The month\'s best riders get a bonus. The app needs a live ranking: every delivery raises a score, and everyone sees their own rank.',
  ref: refs.p6,
  predict: ['An SQL sort over hundreds of thousands of scores for every rank lookup?', ['Slow; you need a sorted set', 'Fast, with an index', 'Fine, if run at night', 'Fast, no cache needed']],
  nodes: [
    ['rd', 'Rider', 'user', 8, 50], ['api', 'Leaderboard service', 'service', 32, 50], ['zs', 'Redis sorted set', 'cache', 62, 50],
    ['my', 'MySQL (history)', 'db', 88, 22], ['top', 'Top 10', 'step', 88, 78],
  ],
  steps: [
    { text: 'A finished delivery raises the score: ZINCRBY.', add: ['rd', 'api', 'zs'], flow: [['rd', 'api'], ['api', 'zs']], badges: { zs: 'ZINCRBY +1' } },
    { text: 'Inside a sorted set is a skip list + hash: insert and rank in O(log n).', focus: ['zs'] },
    { text: 'Top 10: ZREVRANGE 0 9.', add: ['top'], flow: [['zs', 'top']] },
    { text: 'A rider wants to see their own rank.', badges: { rd: 'score 420' }, ask: ['How do you get this rider\'s rank?', ['ZREVRANK (O(log n))', 'Sort the whole set', 'Scan MySQL', 'Impossible']] },
    { text: 'ZREVRANK gives the rank instantly. Permanent history lives in MySQL; if Redis falls it can be rebuilt.', add: ['my'], flow: [['api', 'my']] },
    { text: 'The user count grew 100×.', badges: { zs: '100× scale' }, ask: ['If it no longer fits in one Redis?', ['Shard by range or hash', 'A bigger Redis forever', 'Back to SQL', 'Drop the cache']] },
    { text: 'Shard by score range and top-k comes from one shard; shard by hash and you must merge every shard\'s top-k.', ok: ['zs'] },
  ],
  summary: ['Redis sorted set: ZINCRBY, ZREVRANGE, ZREVRANK', 'A skip list inside: O(log n)', 'When it grows, shard: by score range or by hash'],
  play: {
    kind: 'missions', intro: 'Memory and rules.',
    missions: [
      ['25 million MAU × 26 bytes. How much memory?', ['~650 MB', '~65 GB', '~65 MB', '~6.5 TB'], '2.5 × 10^7 × 26 ≈ 6.5 × 10^8 bytes.'],
      ['Redis crashes. The data?', ['Replicas, or rebuild from MySQL', 'Lost for good, start again', 'It lives on in another cache', 'Nothing happens, Redis never falls'], 'The sorted set can be rebuilt.'],
      ['Equal scores: who comes first?', ['Whoever got there first', 'Random', 'In name order', 'Both share one rank'], 'Blend the time into the score.'],
    ],
  },
  boss: [
    ['Top 10 when sharded by hash?', ['Fetch every shard\'s top 10 and merge', 'Looking at one shard is enough', 'Impossible, hash has no order', 'Fetch it from MySQL'], 'More round trips.'],
    ['The advantage of sharding by score range?', ['Top-k comes from one shard', 'The split is always even', 'It uses less memory', 'No advantage at all'], 'But a changing score can move shards.'],
    ['100× scale (250,000 QPS, 65 GB)?', ['Shard (range or hash)', 'One bigger Redis', 'Go back to SQL', 'Drop the cache'], 'The book\'s numbers.'],
    ['Why not an SQL sort?', ['Sorting huge tables on every query', 'SQL cannot sort at all', 'SQL is faster, so it is wasteful', 'Indexes cannot be built'], 'Computing rank is O(n log n).'],
    ['A new leaderboard every month?', ['A new key named after the month', 'One key, wiped at month end', 'Only in MySQL', 'Never a new one'], 'leaderboard_2026_11.'],
  ],
});

export const l26 = level({
  id: 26, chapter: 5, simulator: 'payment',
  title: 'Charged twice', concept: 'Payment system',
  story: 'An online payment was taken twice',
  briefing: 'A customer pressed pay, the network dropped, they pressed again. Charged twice! A mistake like this in payments ends trust. A lesson in idempotency and ledgers.',
  ref: refs.p6,
  predict: ['After pressing pay the network dropped and the user pressed again. The risk?', ['Charged twice', 'Never charged at all', 'The order is cancelled', 'Nothing']],
  nodes: [
    ['u', 'Customer', 'user', 8, 50], ['pay', 'Payment service', 'service', 34, 50], ['psp', 'PSP (bKash/card)', 'service', 62, 50],
    ['lg', 'Ledger', 'db', 88, 22], ['wl', 'Wallet', 'db', 88, 78], ['ik', 'Idempotency key', 'key', 34, 86],
  ],
  steps: [
    { text: 'Customer → payment service → PSP.', add: ['u', 'pay', 'psp'], flow: [['u', 'pay'], ['pay', 'psp']] },
    { text: 'The PSP took the money, but the response was lost on the way.', down: ['pay'], badges: { u: 'response lost' } },
    { text: 'The user presses again: the same request.', flow: [['u', 'pay']], ask: ['Without idempotency, how many times is the money taken?', ['Twice', 'Once', 'Zero', 'Three times']] },
    { text: 'An idempotency key (one UUID per order): if seen before, return the earlier result; do not charge again.', add: ['ik'], flow: [['pay', 'ik']], ok: ['pay'], badges: { ik: 'seen before' } },
    { text: 'On success, update the wallet and the ledger. The ledger is double-entry: every debit has an equal credit.', add: ['lg', 'wl'], flow: [['pay', 'lg'], ['pay', 'wl']] },
    { text: 'At month end we add up the ledger.', badges: { lg: 'debit 500, credit 450' }, ask: ['Debit 500, credit 450 means?', ['There is a wrong entry somewhere', 'All is fine, this is normal', 'A profit of 50 taka', 'An expense of 50 taka']] },
    { text: 'Reconcile nightly against the PSP\'s settlement file; catch mismatches and fix them.', ok: ['lg'] },
  ],
  summary: ['An idempotency key stops a retry charging twice', 'Double-entry ledger: debits = credits', 'Reconciliation against the PSP\'s file'],
  play: {
    kind: 'missions', intro: 'Retries and safety.',
    missions: [
      ['How long to wait between retries?', ['Exponential backoff', 'Again every ms', 'Never retry', 'A thousand at once'], 'Grow the wait so the load does not.'],
      ['A message keeps failing?', ['Into a dead letter queue to investigate', 'Delete it, never try again', 'Retry it forever and ever', 'Put it back at the head of the queue'], 'A poison message must not block the rest.'],
      ['Where do card numbers live?', ['As PSP tokens; never store raw cards', 'In our own DB as plain text', 'In log files, for debugging', 'In the cache, for fast reads'], 'Avoid the burden of PCI DSS.'],
    ],
  },
  boss: [
    ['The rule of double-entry?', ['Debits and credits sum to equal', 'Debits are always larger', 'Credits are always larger', 'There is no fixed rule'], 'If the total is not zero, something is wrong.'],
    ['Why reconciliation?', ['To match our books with the PSP\'s', 'To make payments go faster', 'To keep the cache filled with data', 'Not needed, the PSP is always right'], 'In a distributed system mismatches will happen.'],
    ['The PSP request timed out: success or failure, unknown?', ['Check status / retry with the same key', 'A new request with a new key', 'Assume it succeeded', 'Assume it failed'], 'Same key, so it is safe.'],
    ['In payments, consistency or availability first?', ['Consistency', 'Availability', 'Both equal', 'Neither'], 'With money, being wrong is the costliest outcome.'],
    ['Pay-in and pay-out?', ['Money in from customers, out to merchants', 'Both the same, only names differ', 'Two names for refunds only', 'Only internal bank accounting'], 'ParcelGo\'s COD has both.'],
  ],
});

export const l27 = level({
  id: 27, chapter: 5, simulator: 'wallet',
  title: 'Payout halfway', concept: 'Digital wallet · Distributed transaction',
  story: 'A merchant payout fails halfway',
  briefing: 'Money was taken from a merchant\'s wallet, but the system fell over before it reached their bank account. Where is the money? A lesson in transactions across two databases.',
  ref: refs.p6,
  predict: ['Two separate DBs: debit A, credit B. A crash in between?', ['Debited, not credited: inconsistent', 'Nothing, the DBs reconcile themselves', 'Both are refunded together', 'It is credited twice']],
  nodes: [
    ['co', 'Coordinator', 'lb', 50, 14], ['a', 'Wallet DB A', 'db', 22, 54], ['b', 'Wallet DB B', 'db', 78, 54], ['cp', 'Compensation', 'worker', 50, 88],
  ],
  steps: [
    { text: 'Debit 1,000 from A, credit B: two DBs.', flow: [['co', 'a'], ['co', 'b']] },
    { text: '2PC: first prepare (both lock and agree), then commit. Slow, and the coordinator is a SPOF.', badges: { co: '2PC' } },
    { text: 'Saga: steps one after another, each its own local transaction.', badges: { co: 'Saga' }, flow: [['co', 'a']], ok: ['a'] },
    { text: 'The credit to B fails.', down: ['b'], ask: ['What does the saga do?', ['Compensate: refund A', 'Nothing, it runs once B is fixed', 'Debit A again', 'Force the write into B']] },
    { text: 'Compensating transactions run backwards.', add: ['cp'], flow: [['cp', 'a']], down: ['b'] },
    { text: 'The books must be trustworthy.', badges: { a: 'event log' }, ask: ['How do you rebuild wallet balances reliably?', ['Replay every event', 'Read them from cache', 'Look at the last balance', 'Guess without a log']] },
    { text: 'Event sourcing: every change kept forever as an event; replay to get the balance at any moment.', ok: ['a', 'b'] },
  ],
  summary: ['No single transaction across two DBs: 2PC, TC/C, Saga', 'When a saga fails, compensate backwards', 'Event sourcing: replay for the state at any time'],
  play: {
    kind: 'missions', intro: 'Pick a path for distributed transactions.',
    missions: [
      ['The weakness of 2PC?', ['Long locks, stuck on the coordinator', 'Too fast, so more mistakes happen', 'Every step needs a compensation', 'It needs a separate event store'], 'A blocking protocol.'],
      ['At what level does TC/C (try-confirm/cancel) work?', ['The application level', 'Inside the database', 'The network level', 'The UI level'], 'Like 2PC, but without DB locks.'],
      ['Who drives the order of a saga?', ['An orchestrator, or events', 'The database by itself', 'The user, by hand', 'Nobody, random order'], 'The two kinds of saga.'],
    ],
  },
  boss: [
    ['A payout with few steps, easy rollback, no locks: which?', ['Saga', '2PC', 'No transaction', 'A global lock'], 'Without locks, with compensation.'],
    ['Can others see a saga\'s in-between state?', ['Yes, there is no isolation', 'No, sagas provide isolation', 'Never, locks are held', 'Only inside the DB'], 'E.g. debited first, credited later.'],
    ['A wallet at 1 million TPS?', ['Partitions + event log + Raft', 'One big database server', 'Only in Redis cache', 'A CSV file per day'], 'The book\'s final design.'],
    ['Why Raft?', ['Consensus between log copies', 'Computing hashes quickly', 'Keeping the data encrypted', 'Keeping the cache warm'], 'If the leader falls, a new leader is chosen.'],
    ['Command versus event?', ['Command = a request; event = a fact', 'They are the same', 'Event = a request; command = a fact', 'Commands never fail'], 'Events never change.'],
  ],
});

export const l28 = level({
  id: 28, chapter: 5, simulator: 'exchange',
  title: 'Fastest matching', concept: 'Stock exchange',
  story: 'Fastest matching',
  briefing: 'A new feature: riders bid for delivery jobs, and the lowest price that came first wins. Hundreds of thousands of bids matched in microseconds, just like a stock exchange.',
  ref: refs.p6,
  predict: ['Will order matching be faster spread across many servers?', ['No, one place in memory is better', 'Yes, more servers is always faster', 'It makes no difference', 'Yes, and order is never lost']],
  nodes: [
    ['br', 'Broker', 'user', 8, 50], ['gw', 'Gateway', 'lb', 28, 50], ['sq', 'Sequencer', 'step', 48, 50],
    ['ob', 'Order book', 'store', 70, 50], ['md', 'Market data', 'service', 92, 26], ['rp', 'Reporter', 'service', 92, 78],
  ],
  steps: [
    { text: 'Orders come in through the gateway; the sequencer gives each one a sequence number.', add: ['br', 'gw', 'sq'], flow: [['br', 'gw'], ['gw', 'sq']] },
    { text: 'Order book: buys and sells sorted by price.', add: ['ob'], flow: [['sq', 'ob']], badges: { ob: 'buy 100 @ ৳50' } },
    { text: 'A new sell order arrives.', badges: { ob: 'sell 50 @ ৳50' }, ask: ['What does this sell order match with?', ['50 against the buy at ৳50', 'Nothing, it is rejected', '100 against the buy at ৳50', 'The buy at ৳49']] },
    { text: 'Matched: 50 filled; at the same price, first come first served (FIFO).', ok: ['ob'], badges: { ob: 'filled 50, 50 left' } },
    { text: 'Results go to market data and the reporter.', add: ['md', 'rp'], flow: [['ob', 'md'], ['ob', 'rp']] },
    { text: 'The whole critical path on one server, in memory, via mmap: no network hops, microsecond latency.', badges: { sq: 'mmap event store' }, ask: ['The matching engine crashes?', ['Replay the event log; a standby is ready', 'Every order is lost for good', 'Start over with an empty book', 'Brokers resend all their orders']] },
    { text: 'The standby reads the primary\'s event stream and stays ready; Raft picks the leader.', ok: ['sq', 'ob'] },
  ],
  summary: ['Gateway → sequencer → order book → market data', 'Price, then time: FIFO matching', 'Critical path on one server, in memory; deterministic replay'],
  play: {
    kind: 'missions', intro: 'Three questions about the order book.',
    missions: [
      ['How do you lay out the order book to get best bid/ask fast?', ['A map by price level + lists', 'Sort the whole book on each order', 'A database query every time', 'One list in arrival order'], 'Cancels are O(1) too.'],
      ['The sequencer\'s job?', ['A sequence number on every event', 'Encrypt every order', 'Keep the market data cache warm', 'Set the price of every order'], 'Without order, replay is meaningless.'],
      ['Where does the risk check go?', ['Before matching', 'After matching', 'Never', 'In the reporter'], 'Stop bad orders before they enter the book.'],
    ],
  },
  boss: [
    ['Why everything on one server?', ['No network hops, microsecond latency', 'Server rent works out cheaper', 'Code is easier to write and test', 'The exchange\'s law requires it'], 'Every hop adds ~ms.'],
    ['An exchange\'s availability target?', ['99.99%', '99.0%', '95.0%', '90.0%'], 'The book\'s figure.'],
    ['How does everyone get market data at the same moment?', ['Multicast, equal distance', 'Whoever asks first gets it first', 'In random order', 'Big brokers first'], 'Fairness.'],
    ['Why deterministic replay?', ['Same event order, same state', 'Replay itself runs faster', 'The cache stays warm always', 'Not needed, the log is enough'], 'Like event sourcing.'],
    ['Candlestick charts from market data?', ['Time windows over the trade stream', 'From random values', 'A DB query only at day end', 'An admin draws them by hand'], 'The window idea from level 21.'],
  ],
});
