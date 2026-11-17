import { level } from '../../dsl';

/* Chapter 7 · Bonus: deeper into DDIA — storage, analytics, encoding, consensus (English) */

const note = (id: string, label: string) => ({ label: `Notes: ${label}`, url: `./#/notes/${id}` });

export const l31 = level({
  id: 31, chapter: 7,
  title: 'How data sits on disk', concept: 'LSM-tree · B-tree · Index',
  story: 'A storm of rider locations',
  briefing: '50,000 riders send their position every 5 seconds; the order table is written rarely and read constantly. One database is not equally good at both. Where the two inner structures, LSM and B-tree, win.',
  ref: note('storage', 'Storage engines'),
  predict: ['10,000 writes a second, very few reads. Which structure fits better?', ['LSM-tree: buffered, sequential writes', 'B-tree: update pages in place', 'An index on every single column', 'One big JSON file on disk']],
  nodes: [
    ['w', 'Writes', 'user', 8, 50], ['log', 'Commit log', 'store', 32, 22], ['mem', 'Memtable', 'cache', 32, 72], ['ss', 'SSTable file', 'db', 60, 72],
    ['bf', 'Bloom filter', 'key', 60, 30], ['cmp', 'Compaction', 'worker', 86, 72], ['bt', 'B-tree page', 'db', 86, 26],
  ],
  steps: [
    { text: 'A write is first appended to the commit log, so it can be recovered after a crash.', add: ['w', 'log'], flow: [['w', 'log']] },
    { text: 'Then into a sorted structure in memory (the memtable).', add: ['mem'], flow: [['w', 'mem']] },
    { text: 'The memtable is full.', badges: { mem: 'full' }, ask: ['What happens now?', ['It goes to disk as a new sorted file', 'Old writes are deleted for room', 'Writes stop', 'It moves to a cache']] },
    { text: 'One sequential write to disk as an SSTable: that is why writes are fast.', add: ['ss'], flow: [['mem', 'ss']] },
    { text: 'To say "not in this file" quickly, each file has a Bloom filter; in the background, compaction merges old files.', add: ['bf', 'cmp'], flow: [['bf', 'ss'], ['ss', 'cmp']] },
    { text: 'B-tree: fixed-size pages updated in place; reads are steady and predictable. For tables like orders and payments.', add: ['bt'], focus: ['bt'], badges: { bt: 'steady reads' }, ask: ['Which structure suits the order and payment tables?', ['B-tree', 'Bloom filter', 'Memtable', 'Commit log']] },
    { text: 'Rule of thumb: write-heavy with few reads, LSM; read-heavy needing steady latency, B-tree.', focus: ['ss', 'bt'] },
  ],
  summary: ['LSM: buffer in memory, write sequentially, compact later', 'B-tree: update pages in place, steady reads', 'Every index adds work to every write'],
  play: {
    kind: 'missions', intro: 'Three kinds of data, three decisions.',
    missions: [
      ['Rider locations: thousands of writes a second, rare reads?', ['An LSM-based store', 'A B-tree with an index on every column', 'A spreadsheet', 'Browser storage only'], 'Sequential writes win for write-heavy work.'],
      ['Dashboard query: filter by merchant_id, sort by created_at?', ['One index on (merchant_id, created_at)', 'Separate indexes on each column', 'No index', 'An index on every column'], 'Match the index to the query.'],
      ['You deleted a key in an LSM store, yet disk did not free up. Why?', ['A delete marker first, compaction later', 'The disk has quietly broken down', 'The delete operation failed', 'The Bloom filter blocked it'], 'Tombstones, then compaction.'],
    ],
  },
  boss: [
    ['Why are LSM writes fast?', ['Buffered in memory, written in order', 'They never touch the disk at all', 'They keep no index whatsoever', 'They need no network round trips'], 'Sequential writes beat random ones by far.'],
    ['A Bloom filter says "not here". Then?', ['Definitely absent; skip the disk', 'Maybe present; check the disk', 'Certainly present; read it', 'Ask the filter again later'], 'It can be wrong about "maybe", never about "not here".'],
    ['What does compaction do?', ['Merges files, dropping stale values', 'Pauses all new writes for a while', 'Builds a fresh index on disk', 'Empties the cache to save memory'], 'Space comes back and reads get faster.'],
    ['Where does a B-tree fit best?', ['Read-heavy work with steady latency', 'An endless stream of writes', 'An append-only log file', 'Storing large video files'], 'The backbone of relational databases.'],
    ['An index on every column means?', ['Every write slows; more disk', 'Every query is faster, for free', 'Data gets lost', 'Nothing changes'], 'Indexes help reads and cost writes.'],
  ],
});

export const l32 = level({
  id: 32, chapter: 7,
  title: 'The separate world of analytics', concept: 'OLTP vs OLAP · Column store · Materialized view',
  story: 'The month-end report',
  briefing: 'On the first of the month every merchant opens their report: millions of rows read, three columns needed. Run on the live order DB, it slows order taking. Analytics needs its own shape.',
  ref: note('storage', 'Storage engines'),
  predict: ['Sum 3 columns over 50 million rows of 40 columns. Which storage?', ['Column-oriented', 'Row-oriented with every index', 'Key-value', 'A message queue']],
  nodes: [
    ['oltp', 'Order DB (OLTP)', 'db', 12, 50], ['cdc', 'CDC', 'queue', 36, 50], ['wh', 'Warehouse (column)', 'store', 62, 50], ['mv', 'Daily rollup', 'cache', 86, 26], ['dash', 'Merchant dashboard', 'user', 86, 76],
  ],
  steps: [
    { text: 'The live order DB: small reads and writes, one order at a time (OLTP).', add: ['oltp'] },
    { text: 'What if reports run right here?', ask: ['Big scans on the live DB?', ['Order taking slows into timeouts', 'Nothing; the DB copes fine', 'Reports get a lot faster', 'The DB splits itself in two']] },
    { text: 'Changes flow through CDC into a separate warehouse.', add: ['cdc', 'wh'], flow: [['oltp', 'cdc'], ['cdc', 'wh']] },
    { text: 'The warehouse stores columns: it reads only the columns needed, and similar values side by side compress very well.', focus: ['wh'], badges: { wh: 'by column' }, ask: ['If 3 of 40 columns are needed, what does a column store read?', ['Only those 3 columns', 'Whole 40-column rows', 'Only the index', 'Nothing at all']] },
    { text: 'Instead of redoing the same sums, keep a pre-computed daily rollup; dashboards read that.', add: ['mv', 'dash'], flow: [['wh', 'mv'], ['mv', 'dash']] },
  ],
  summary: ['OLTP and analytics loads differ; run them in different places', 'Column store: read only the needed columns, compress well', 'Materialized views and rollups: no repeated sums'],
  play: {
    kind: 'missions', intro: 'Three report problems.',
    missions: [
      ['The monthly report times out the live API?', ['A separate warehouse for reports', 'Add more API servers right away', 'Turn the reports off for good', 'Add more indexes to the DB'], 'Different jobs, different places.'],
      ['Every dashboard view redoes the same monthly sum?', ['Keep a pre-computed rollup', 'Sum raw rows every time', 'Compute it in the browser', 'Estimate from a sample'], 'A materialized view.'],
      ['How does data reach the warehouse?', ['CDC or a regular ETL', 'CSV files by hand', 'Users send it', 'It does not'], 'Capture the live DB\'s changes.'],
    ],
  },
  boss: [
    ['The core difference between OLTP and OLAP?', ['Small targeted work versus big scans', 'They are exactly the same thing', 'OLAP only writes, never reads', 'OLTP keeps no indexes at all'], 'Different kinds of load.'],
    ['Why is a column store fast for analytics?', ['It reads only needed columns', 'It reads every column anyway', 'It needs no index at all', 'It needs no memory at all'], 'Less to read, less disk.'],
    ['What sits at the centre of a star schema?', ['A fact table of events', 'A table of all users', 'A shared cache layer', 'An append-only log file'], 'Dimensions around it.'],
    ['What is a materialized view?', ['A result computed in advance', 'A separate cache server', 'A special kind of index', 'A message queue topic'], 'It saves repeating the same work.'],
    ['How do you keep the warehouse current?', ['CDC or ETL', 'Query the live DB every time', 'Copy by hand', 'Nothing'], 'Capture the live DB\'s changes.'],
  ],
});

export const l33 = level({
  id: 33, chapter: 7,
  title: 'Old and new, side by side', concept: 'Encoding · Compatibility · Expand-contract',
  story: 'In the middle of a rolling deploy',
  briefing: 'A new "landmark" field is being added. Some servers are new, some old; millions of phones run the old app. Add a field the wrong way and you lose data or crash.',
  ref: note('encoding', 'Encoding'),
  predict: ['During a deploy, an old server reads a row with the new field and writes it back. The risk?', ['The unknown field may be dropped', 'No risk; old code is careful', 'The row gets duplicated', 'The DB shuts itself down']],
  nodes: [
    ['v2', 'Server v2', 'server', 14, 26], ['v1', 'Server v1', 'server', 14, 74], ['db', 'DB', 'db', 50, 50], ['app', 'Old app', 'user', 86, 26], ['sch', 'Schema', 'key', 86, 74],
  ],
  steps: [
    { text: 'v2 writes with the new field; v1 is still running.', add: ['v2', 'v1', 'db'], flow: [['v2', 'db']], badges: { db: '+landmark' } },
    { text: 'v1 reads the row, changes it, writes it back.', flow: [['db', 'v1'], ['v1', 'db']], ask: ['If v1 drops fields it does not know?', ['landmark is lost', 'Nothing happens', 'v1 crashes', 'landmark is doubled']] },
    { text: 'Rule 1: old code keeps unknown fields intact (forward compatibility).', ok: ['v1'] },
    { text: 'Rule 2: new fields are optional with a default; new code can read old data (backward compatibility).', add: ['sch'], focus: ['sch'], ask: ['New code reads an old row without landmark?', ['It uses the default', 'It crashes', 'It deletes the row', 'It calls an old server']] },
    { text: 'The old app also gets the new response and ignores the unknown field.', add: ['app'], flow: [['db', 'app']] },
    { text: 'Schema changes go expand → copy → reads → writes → contract; each step can be undone.', focus: ['db'], badges: { db: 'expand → contract' } },
  ],
  summary: ['Backward: new code reads old data; forward: old code reads new data', 'New fields optional with defaults; never reuse a field number', 'Schema changes in expand-contract steps'],
  play: {
    kind: 'missions', intro: 'Three deploy decisions.',
    missions: [
      ['You must rename a column, with a rolling deploy?', ['Add new, write both, drop old later', 'Rename it in the same deploy', 'Take the app down at night', 'Never rename a column at all'], 'Expand, then contract.'],
      ['Drop Protobuf field 7 and give number 7 to a new field?', ['No: a new number; reserve 7', 'Yes, that is perfectly fine', 'Only if both are strings', 'Only for night-time deploys'], 'Old data would be read with the wrong meaning.'],
      ['A 19-digit order ID in JSON?', ['As a string', 'As a number', 'As a float', 'Split in two'], 'JavaScript is exact only up to 53 bits.'],
    ],
  },
  boss: [
    ['Which compatibility does a rolling deploy need?', ['Both backward and forward', 'Backward compatibility only', 'Forward compatibility only', 'Neither is really needed'], 'Old and new run together.'],
    ['The safe way to add a field?', ['Optional, with a default', 'Required', 'Under an old field\'s name', 'In a separate DB'], 'Old data and old clients keep working.'],
    ['Protobuf field numbers?', ['Never reuse them', 'Change them freely', 'New ones every deploy', 'They are not needed'], 'The number is the identity.'],
    ['Reading old data in Avro?', ['Match writer and reader schemas', 'Use the reader schema only', 'Read it with no schema', 'Old data cannot be read'], 'Two schemas are matched up.'],
    ['The safe order for a column rename?', ['Expand first, contract last', 'Rename, then deploy the code', 'Contract first, expand after', 'Everything in one deploy'], 'A way back at every step.'],
  ],
});

export const l34 = level({
  id: 34, chapter: 7,
  title: 'Everyone agrees', concept: 'Linearizability · CAP · Raft · Fencing',
  story: 'One owner for each payout',
  briefing: 'Two payout workers must never pay the same merchant at once; the wallet log has several copies, yet everyone agrees on one order. Consensus underpins it all.',
  ref: note('consensus', 'Consensus'),
  predict: ['A 5-node Raft cluster keeps accepting writes after losing how many nodes?', ['2', '4', '0', '3']],
  nodes: [
    ['c', 'Client', 'user', 8, 50], ['l', 'Leader', 'server', 38, 50], ['f1', 'Follower 1', 'server', 68, 18], ['f2', 'Follower 2', 'server', 68, 50],
    ['f3', 'Follower 3', 'server', 68, 82], ['st', 'Storage (fencing)', 'db', 92, 50],
  ],
  steps: [
    { text: 'The client sends a write to the leader; the leader logs it and sends it to the followers.', add: ['c', 'l', 'f1', 'f2', 'f3'], flow: [['c', 'l'], ['l', 'f1'], ['l', 'f2'], ['l', 'f3']] },
    { text: 'When is it committed?', ask: ['When does the leader treat the write as committed?', ['When a majority has it logged', 'As soon as it writes it', 'When everyone has it', 'When the client says so']] },
    { text: 'Three of four including itself is a majority, so it commits; one slow follower does not matter.', badges: { l: 'commit' }, down: ['f3'] },
    { text: 'The leader dies; the rest elect a new one, and only a candidate with an up-to-date log can win.', down: ['l'], ok: ['f3'], badges: { f1: 'new leader' }, ask: ['Who can become the new leader?', ['Up-to-date log, majority vote', 'Whoever wakes up first', 'The oldest node in the cluster', 'Whoever the client picks']] },
    { text: 'The old leader returns thinking it still leads. Storage sees a higher term or token and rejects its write.', add: ['st'], ok: ['l'], flow: [['l', 'st']], badges: { st: 'old token rejected' } },
  ],
  summary: ['Linearizable: as if there were one copy; once anyone sees new, everyone does', 'Raft: commit on a majority; 2f+1 nodes tolerate f failures', 'In a network split choose consistency or availability; for money, consistency'],
  play: {
    kind: 'missions', intro: 'Three problems of agreement.',
    missions: [
      ['Payouts need a lock. What do you use?', ['A lock from etcd or ZooKeeper, with fencing tokens', 'A home-made Redis lock with a timeout', 'A flag in app memory', 'Nothing'], 'Never build consensus yourself.'],
      ['The link between two data centres is cut. The wallet?', ['The minority side stops writing', 'Both sides keep accepting writes', 'Shut everything down at once', 'Wipe the data and restart'], 'For money, consistency comes first.'],
      ['How many nodes in a consensus cluster?', ['3 or 5 nodes', '2 or 4 nodes', 'Just 1 node', '100 nodes'], 'An odd number keeps a clear majority.'],
    ],
  },
  boss: [
    ['Linearizable means?', ['As if there were one copy', 'Every replica may differ', 'Only reads are fast', 'There is no ordering'], 'Once new is seen, old never returns.'],
    ['When does Raft commit?', ['When a majority has logged it', 'When the leader writes it', 'When every node has it', 'When the client says'], 'The majority decides.'],
    ['A money system in a network partition?', ['Chooses consistency', 'Chooses availability', 'Gets both', 'Gets neither'], 'Late beats wrong money.'],
    ['What does a fencing token stop?', ['A late write from an old owner', 'A write from the new owner', 'Every write, old or new', 'Nothing; it only logs'], 'The bigger token wins.'],
    ['What do Lamport timestamps give?', ['A causal total order', 'Real wall-clock time', 'Instant uniqueness checks', 'Encryption of messages'], 'A counter plus a node number.'],
  ],
});
