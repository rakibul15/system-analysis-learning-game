import { level } from '../../dsl';
import { refs } from '../../refs';

/* Chapter 3 · ParcelGo's apps — Vol 1, ch 8–15 (English) */

export const l8 = level({
  id: 8, chapter: 3, simulator: 'shortener',
  title: 'Short link', concept: 'URL shortener',
  story: 'Tracking links in SMS are too long',
  briefing: 'Every SMS carries a 120-character tracking link, so the SMS splits in two and costs double. The link must be short: pgo.to/zn9edcu.',
  ref: refs.p3,
  predict: ['Which characters for the short code?', ['0–9, a–z, A–Z: 62 of them', 'Only 0–9: 10 of them', 'a–z and 0–9: 36 of them', 'All of ASCII: 128 of them']],
  nodes: [
    ['u', 'User', 'user', 8, 50], ['web', 'Web server', 'server', 36, 50], ['cache', 'Cache', 'cache', 64, 20],
    ['db', 'Database', 'db', 88, 50], ['id', 'ID generator', 'step', 64, 82],
  ],
  steps: [
    { text: 'A long URL arrives: first get a unique ID (snowflake style).', add: ['u', 'web', 'id', 'db'], flow: [['u', 'web'], ['web', 'id']], badges: { id: '2009215674938' } },
    { text: 'Write the ID in base 62.', badges: { web: 'base 62 → ?' }, ask: ['Roughly how long is 2009215674938 in base 62?', ['7 characters', '2 characters', '20 characters', '13 characters']] },
    { text: 'zn9edcu: 7 characters. 62^7 ≈ 3.5 trillion, enough for many years.', flow: [['web', 'db']], badges: { web: 'zn9edcu' } },
    { text: 'A click on the short link: cache first, otherwise the long URL from the DB.', add: ['cache'], flow: [['u', 'web'], ['web', 'cache']], ok: ['cache'], badges: { cache: 'hit' } },
    { text: 'The server sends a redirect: 301 or 302.', ask: ['After the browser gets a 301 once, where does the second click go?', ['Straight to the long URL', 'Back to our server again', 'Cache first, then the DB', 'The browser shows an error']] },
    { text: '301 = permanent, the browser remembers it (less load). 302 = temporary, every click comes to us (clicks can be counted).', flow: [['u', 'web']], badges: { web: '301 vs 302' } },
  ],
  summary: ['Unique ID → base 62 → a 7-character code', 'Click: cache → DB → redirect', '301 cuts load; 302 gives analytics'],
  play: {
    kind: 'missions', intro: 'Redirects, arithmetic and risks.',
    missions: [
      ['You need click analytics. 301 or 302?', ['302', '301', 'Neither', '200'], 'Clicks can only be counted if each one reaches the server.'],
      ['100 million new URLs a day for 10 years. Total?', ['~365 billion', '~365 million', '~3.65 billion', '~100 million'], '10^8 × 365 × 10 = 3.65 × 10^11.'],
      ['One drawback of base 62 conversion?', ['The next code can be guessed', 'Collisions happen often', 'The code length never changes', 'No separate ID generator needed'], 'Sequential IDs mean sequential codes; someone could walk every link.'],
    ],
  },
  boss: [
    ['How many characters for 365 billion URLs?', ['7', '5', '10', '3'], '62^6 ≈ 56 billion (too few), 62^7 ≈ 3.5 trillion (enough).', 'What is 62^6?'],
    ['The problem with taking the first 7 characters of a hash (CRC32/MD5)?', ['Collisions; you must check it is unused', 'The code ends up longer than 7', 'Computing the hash takes far too long', 'The same URL gets two different codes'], 'Truncated, two URLs can end up with the same code.'],
    ['The same long URL arrives twice?', ['Check if it exists and return the old code', 'Always a new code, delete the old one', 'Return an error: it already exists', 'Keep both codes and return both'], 'It saves space: same link, same code.'],
    ['Reads far outnumber writes (10:1). What do you add?', ['A cache (short → long)', 'More write servers', 'A message queue', 'More ID generators'], 'Popular links come straight from memory.'],
    ['To prevent abuse?', ['A rate limiter and unguessable codes', 'Put even more characters in codes', 'Drop 301 and use only 302', 'Skip the database, keep it in memory'], 'No one should be able to create or crawl a million links.'],
  ],
});

export const l9 = level({
  id: 9, chapter: 3, simulator: 'crawler',
  title: 'Pulling shop listings', concept: 'Web crawler',
  story: 'Pulling products from merchants\' shops',
  briefing: 'Product lists must be pulled regularly from a thousand merchant websites. Pull too hard and their sites go down, and fetching the same page again and again is waste.',
  ref: refs.p3,
  predict: ['A crawler hits one site with hundreds of requests a second?', ['The site strains or blocks it', 'Done quickly, no problem at all', 'Fewer URLs are found', 'DNS stops working']],
  nodes: [
    ['seed', 'Seed URL', 'step', 8, 50], ['fr', 'URL frontier', 'queue', 28, 50], ['dl', 'Downloader', 'worker', 48, 50],
    ['pa', 'Parser', 'service', 68, 26], ['seen', 'Content seen?', 'store', 68, 76], ['ex', 'URL extractor', 'service', 90, 26], ['us', 'URL seen?', 'store', 90, 76],
  ],
  steps: [
    { text: 'Start from seed URLs; everything goes into the URL frontier (a queue).', add: ['seed', 'fr', 'dl'], flow: [['seed', 'fr'], ['fr', 'dl']] },
    { text: 'Download the page, parse it, then check whether the same content was seen before (by hash).', add: ['pa', 'seen'], flow: [['dl', 'pa'], ['pa', 'seen']] },
    { text: 'Extract the new links.', add: ['ex', 'us'], flow: [['pa', 'ex'], ['ex', 'us']], badges: { us: 'seen before' }, ask: ['This URL was visited before. Does it enter the frontier?', ['No, the URL-seen filter drops it', 'Yes, again for freshness', 'Yes, but at the back of the queue', 'Only if its content changed']] },
    { text: 'Already-seen URLs are dropped (Bloom filter or hash table); the rest go back to the frontier.', flow: [['us', 'fr']] },
    { text: 'Inside the frontier there are two layers: front queues (priority) and back queues.', focus: ['fr'], badges: { fr: 'front + back queues' }, ask: ['Two URLs from the same host arrive in a row?', ['Same queue, with a delay between', 'Two workers fetch them at once', 'The second one is dropped', 'Both jump to the front']] },
    { text: 'One back queue per host, one worker, a delay in between. Priority comes from PageRank and update rate.', focus: ['fr', 'dl'], flow: [['fr', 'dl']] },
    { text: 'Respect robots.txt, cache DNS, set timeouts, and cap URL length to avoid spider traps (endless links).', focus: ['dl'] },
  ],
  summary: ['Frontier → download → parse → content seen → extract → URL seen → frontier', 'Politeness: one queue per host, one worker, a delay', 'Bloom filter, DNS cache, robots.txt, spider-trap caution'],
  play: {
    kind: 'missions', intro: 'Three decisions for running a crawler.',
    missions: [
      ['BFS or DFS?', ['BFS: goes wide', 'DFS: dives deep, ends fast', 'Random: halfway between', 'Both the same, no difference'], 'The web graph is very deep; BFS advances broadly.'],
      ['The trade-off of a Bloom filter?', ['Little memory, some false positives', 'Never wrong, uses lots of memory', 'Gives false negatives at times', 'Only works on small data'], 'It may drop a few new URLs, thinking they were seen.'],
      ['What is a spider trap?', ['A page that generates endless links', 'A page full of spam emails', 'A host that gives wrong DNS', 'A page banned in robots.txt'], 'Avoided with a URL length cap and monitoring.'],
    ],
  },
  boss: [
    ['10 workers pull from one host\'s queue. To fix politeness?', ['One queue per host, one worker, a delay', 'Add more workers to finish faster', 'Turn off the DNS cache to slow down', 'One shared queue for all hosts'], 'Only one connection to a host at a time.'],
    ['Which pages do you recrawl first?', ['Those that change often or matter most', 'Always whichever is oldest', 'Random, everyone gets a turn', 'Whichever are largest in size'], 'Freshness: update rate and importance.'],
    ['DNS resolution is slow (10–200 ms). What do you do?', ['Keep a DNS cache, refreshed regularly', 'Resolve afresh on every request', 'Hard-code the IPs forever', 'Go by host name without DNS'], 'DNS can become the crawler\'s bottleneck.'],
    ['The same content at different URLs (~30%). How do you spot it?', ['Compare hashes of the content', 'Compare the length of the URLs', 'Compare the page titles', 'No need, keep both copies'], 'A hash instead of comparing full text.'],
    ['To scale the crawler?', ['Many servers, near the hosts', 'One much bigger server', 'Only grow the cache', 'Fewer threads, run slower'], 'Distributed crawling, from servers close to the hosts.'],
  ],
});

export const l10 = level({
  id: 10, chapter: 3, simulator: 'notify',
  title: 'SMS twice', concept: 'Notification system',
  story: 'SMS goes twice, or not at all',
  briefing: 'Some people get the "parcel delivered" SMS twice, some never. The provider goes down now and then, and retries are not handled properly.',
  ref: refs.p3,
  predict: ['The SMS provider failed once. The risk of retrying?', ['The same SMS may go twice', 'The SMS will never be sent', 'The provider will block us', 'Retrying carries no risk']],
  nodes: [
    ['svc', 'Order service', 'service', 8, 50], ['ns', 'Notification server', 'server', 30, 50], ['q', 'Queue', 'queue', 52, 50],
    ['w', 'Worker', 'worker', 72, 50], ['p', 'SMS provider', 'service', 92, 26], ['log', 'Notification log', 'db', 92, 78],
  ],
  steps: [
    { text: 'Order service → notification server → queue → worker → provider. Separate queues for SMS, push and email.', add: ['svc', 'ns', 'q', 'w', 'p'], flow: [['svc', 'ns'], ['ns', 'q'], ['q', 'w'], ['w', 'p']] },
    { text: 'With a queue in the middle, nothing is lost when the provider is slow or down, and each part scales on its own.', focus: ['q'] },
    { text: 'The provider failed.', down: ['p'], ask: ['What does the worker do?', ['Put it back on the queue and retry later', 'Delete it immediately', 'Try 10 times in a row right now', 'Email the user about it']] },
    { text: 'On failure, back to the queue and retry later (with backoff).', down: ['p'], flow: [['w', 'q']] },
    { text: 'The retry is running.', add: ['log'], flow: [['w', 'log']], ask: ['How do you stop a retry sending the same SMS twice?', ['Dedupe by event ID', 'Always send twice to be sure', 'Turn retries off completely', 'A different provider each time']] },
    { text: 'Every event ID goes in the log; if seen before, skip it. Exactly-once is still not guaranteed: duplicates can happen on the provider side too.', ok: ['p'], flow: [['w', 'p'], ['w', 'log']] },
    { text: 'Also: user settings (opt-out), templates, rate limits (no spamming), open/click tracking.', focus: ['ns'] },
  ],
  summary: ['Service → notification server → a queue per type → worker → provider', 'On failure, back to the queue and retry with backoff', 'Dedupe by event ID; at-least-once, not exactly-once'],
  play: {
    kind: 'missions', intro: 'Before, during and after sending.',
    missions: [
      ['iOS push notifications go through whom?', ['APNs', 'FCM', 'Twilio', 'SMTP'], 'Apple\'s APNs; FCM on Android.'],
      ['A user has turned off one kind of notification. Where do you check?', ['The settings table, before sending', 'Ask the provider about it', 'Look at the log after sending', 'No need, send to everyone'], 'Honouring opt-outs is mandatory.'],
      ['One user gets 100 notifications an hour?', ['Rate-limit or batch them together', 'Send them all, drop none', 'Turn notifications off in the app', 'Shut the queue down'], 'Too many and the user turns them all off.'],
    ],
  },
  boss: [
    ['Why is exactly-once not possible?', ['An ack can be lost; so at-least-once', 'It is, if retries are turned off', 'The provider guarantees exactly-once', 'It is, once the queue is big enough'], 'In a distributed system there is no way to be sure which happened.'],
    ['Where does the notification server get device tokens and contacts?', ['User info from cache and DB', 'From the provider each time', 'The user sends it every request', 'Hard-coded in the source'], 'Users\' devices and contacts are stored ahead of time.'],
    ['The SMS provider is down. What happens to push notifications?', ['No effect, separate queue', 'All notifications stop', 'Push gets stuck in the SMS queue', 'Push is sent as SMS instead'], 'Separate queues stop one failure spreading.'],
    ['To avoid losing data?', ['Keep a log in the DB, and retry', 'Keep it only in memory', 'Keep no log, to save space', 'Try once, then give up'], 'With a log you know what went and what did not.'],
    ['To handle more notifications?', ['Add workers behind the queue', 'Add more providers', 'Drop the queue, go direct', 'Add database servers'], 'Workers are stateless and scale out.'],
  ],
});

export const l11 = level({
  id: 11, chapter: 3, simulator: 'feed',
  title: 'Merchant feed', concept: 'News feed',
  story: 'The merchant feed is slow',
  briefing: 'Customers see new offers from the merchants they follow in their feed. But the feed takes 5 seconds to open, and when a big merchant posts, everything jams.',
  ref: refs.p3,
  predict: ['Two ways to get a post into followers\' feeds?', ['Push at write time, or pull at read time', 'Email only, or SMS only', 'Copy the database, or copy files', 'Clear the cache, or clear the DB']],
  nodes: [
    ['au', 'Merchant', 'user', 8, 50], ['ps', 'Post service', 'service', 28, 50], ['fo', 'Fanout', 'worker', 50, 50],
    ['fc', 'Feed cache', 'cache', 76, 22], ['gr', 'Follower graph', 'db', 50, 86], ['rd', 'Follower', 'user', 92, 50],
  ],
  steps: [
    { text: 'When a post arrives, the fanout service fetches the follower list.', add: ['au', 'ps', 'fo', 'gr'], flow: [['au', 'ps'], ['ps', 'fo'], ['fo', 'gr']] },
    { text: 'Push (fanout on write): write the post ID into each follower\'s feed cache.', add: ['fc'], flow: [['fo', 'fc']] },
    { text: 'When a follower opens their feed, it comes straight from cache.', add: ['rd'], flow: [['rd', 'fc']], ok: ['fc'] },
    { text: 'Now a big merchant with 5 million followers posts.', badges: { au: '5M followers' }, ask: ['How many writes with push?', ['5 million, one per follower', 'One, just for the post', '100, for first-page followers', 'Zero, written when opened']] },
    { text: '5 million writes for one post: a hotkey problem, and fanout crawls.', down: ['fo'] },
    { text: 'Hybrid: ordinary users\' posts are pushed; big merchants\' posts are pulled at read time.', ok: ['fo'], flow: [['rd', 'ps']], badges: { au: 'pull' } },
    { text: 'What goes in the feed cache?', focus: ['fc'], ask: ['The whole post in the feed cache, or just the ID?', ['Just the post ID', 'The whole post and all images', 'Only the merchant\'s name', 'The post\'s HTML page']] },
    { text: 'Keep only IDs in the feed cache; posts and user data live in separate caches, so memory stays small and posts are not stored over and over.', focus: ['fc'], ok: ['fc'] },
  ],
  summary: ['Push: into everyone\'s feed at write time; pull: gather at read time', 'Push is costly for celebrities, hence hybrid', 'Feed cache holds post IDs only; other data in separate caches'],
  play: {
    kind: 'missions', intro: 'Push, pull and cache.',
    missions: [
      ['Most followers are rarely active. Where does push waste effort?', ['Building feeds for inactive users', 'No waste, all of it gets used', 'The waste is in pull, not push', 'Reads get slower for everyone'], 'Writes for feeds no one will open.'],
      ['The problem with pull?', ['Opening the feed is slow', 'Far too many writes', 'Gets stuck on celebrities', 'You cannot cache at all'], 'Gathering from many places every time.'],
      ['What goes in the feed cache?', ['<post_id, user_id> pairs', 'The whole post and its images', 'Only the merchant\'s name', 'The post\'s full HTML page'], 'Kept small, it holds far more feeds.'],
    ],
  },
  boss: [
    ['In hybrid, whose posts are pulled?', ['Users with very many followers', 'Push for everyone, no exceptions', 'Pull for everyone, it is simpler', 'Random, different for each post'], 'Setting the limit is a design decision.'],
    ['Fanout work is slow. What do you add?', ['A message queue and fanout workers', 'A few more feed cache servers', 'A follower index in the database', 'Put the whole feed on the CDN'], 'The post responds fast; fanout happens later, separately.'],
    ['What is the graph DB for?', ['Storing and querying follower links', 'Storing post images and videos', 'Storing login sessions and tokens', 'Collecting feed-open logs'], 'Who follows whom, quickly.'],
    ['How many posts of a feed are cached?', ['The latest few hundred; older from DB', 'Every post, cached forever', 'Only the single latest post', 'None, read from the DB each time'], 'People rarely scroll far back.'],
    ['Why authentication and rate limits on publishing?', ['Spam and security', 'To publish posts faster', 'To fill the feed cache', 'Not needed, all are trusted'], 'Spam in the feed ruins it for everyone.'],
  ],
});

export const l12 = level({
  id: 12, chapter: 3, simulator: 'chat',
  title: 'Talking to the rider', concept: 'Chat system',
  story: 'Chat between rider and merchant',
  briefing: 'A rider cannot find the address and messages the merchant. The message arrives 30 seconds later! You need real-time chat that loses nothing even when someone is offline.',
  ref: refs.p4,
  predict: ['Best way to push a new message from server to client instantly?', ['WebSocket', 'Polling every second', 'Email', 'Page reload']],
  nodes: [
    ['a', 'Rider', 'user', 8, 42], ['b', 'Merchant', 'user', 92, 42], ['c1', 'Chat server 1', 'server', 32, 42], ['c2', 'Chat server 2', 'server', 68, 42],
    ['kv', 'Message store', 'db', 50, 86], ['sq', 'Sync queue', 'queue', 50, 12], ['pr', 'Presence', 'service', 30, 82],
  ],
  steps: [
    { text: 'Polling: the client keeps asking, and most answers are "nothing new". Wasteful.', add: ['a', 'b', 'c1', 'c2'], flow: [['a', 'c1']] },
    { text: 'WebSocket: connect once, then messages flow both ways over a persistent connection.', flow: [['a', 'c1'], ['c1', 'a']], badges: { a: 'WebSocket' } },
    { text: 'A message: server 1 → sync queue → server 2 → merchant; also saved in the message store.', add: ['kv', 'sq'], flow: [['a', 'c1'], ['c1', 'sq'], ['sq', 'c2'], ['c2', 'b'], ['c1', 'kv']] },
    { text: 'The merchant is now offline.', down: ['b'], ask: ['Where does the message go?', ['It stays in the store, synced later', 'It is lost', 'It goes back to the rider', 'It stays only in server memory']] },
    { text: 'Saved in the store; an offline user gets a push notification. On return, sync from the last-read ID.', down: ['b'], flow: [['c1', 'kv']] },
    { text: 'Presence: the client sends a heartbeat every few seconds; if none arrives in time, they are offline.', add: ['pr'], flow: [['a', 'pr']], badges: { pr: 'heartbeat' }, ask: ['The rider loses signal in a lift for 3 seconds. What does presence show?', ['Online, unless the timeout passes', 'Offline straight away', 'The rider is logged out of the app', 'An error in the status']] },
    { text: 'A heartbeat timeout stops brief blips from flipping someone online/offline.', ok: ['pr'] },
  ],
  summary: ['WebSocket: a persistent two-way connection', 'Message → sync queue → the other chat server; everything in a key-value store', 'Presence via heartbeats, with a timeout'],
  play: {
    kind: 'missions', intro: 'Protocol, storage and IDs.',
    missions: [
      ['Which store for chat history?', ['A key-value store (Cassandra)', 'A single MySQL table', 'Only the chat server\'s memory', 'The client\'s phone storage'], 'The book\'s pick: horizontal scale and low latency.'],
      ['The problem with long polling?', ['Hard to tell when a client disconnects', 'Too fast, so very wasteful', 'The server can keep no state', 'Message order always flips'], 'And the connection hangs until timeout even with no message.'],
      ['What must a message ID be?', ['Unique and ordered by time', 'Just random and unguessable', 'Unique only, order not needed', 'Ordered only, duplicates allowed'], 'Level 7\'s snowflake, or a local sequence.'],
    ],
  },
  boss: [
    ['How does a message spread in a small group chat?', ['A copy into each member\'s queue', 'One shared queue for everyone', 'Only into the group admin\'s queue', 'An email copy to everyone'], 'Copies are easy for small groups; costly for large ones.'],
    ['Who decides which chat server a client connects to?', ['Service discovery (Zookeeper)', 'Random, a new server each time', 'The user picks a server', 'DNS round robin alone'], 'After login, the best server\'s address is handed out.'],
    ['The difference between chat servers and API servers?', ['Chat stateful, the rest stateless', 'Every server is stateless', 'Every server is stateful', 'API stateful, chat stateless'], 'Keep the stateful part small.'],
    ['Messages on both phone and laptop?', ['Sync each device from its last-read ID', 'Only on the last device used', 'An email copy on every device', 'Only one device works at a time'], 'Fetch everything after cur_max_message_id.'],
    ['The core trick against presence flicker?', ['Heartbeats and a timeout', 'Change status every second', 'Stop showing presence', 'Offline as soon as disconnected'], 'Ignore temporary breaks.'],
  ],
});

export const l13 = level({
  id: 13, chapter: 3, simulator: 'autocomplete',
  title: 'Finding addresses', concept: 'Search autocomplete',
  story: 'Address search is slow',
  briefing: 'Suggestions should appear as soon as a customer starts typing an address. Right now every letter searches the whole database, and suggestions arrive after typing is done.',
  ref: refs.p4,
  predict: ['A LIKE query over the whole database on every keypress?', ['Slow; you need a prebuilt structure', 'Fast, fine with an index', 'Fine, it just needs a cache', 'Slow, but more servers fix it']],
  nodes: [
    ['root', 'root', 'step', 50, 10], ['t', 't', 'step', 32, 36], ['w', 'w', 'step', 76, 36],
    ['tr', 'tr', 'step', 20, 62], ['to', 'to', 'step', 44, 62], ['tre', 'tree', 'key', 20, 88], ['toy', 'toy', 'key', 44, 88],
  ],
  steps: [
    { text: 'A trie: every node is a prefix.', add: ['root', 't', 'w'] },
    { text: 'To find "tree", walk down from the root letter by letter.', add: ['tr', 'to', 'tre', 'toy'], flow: [['root', 't'], ['t', 'tr'], ['tr', 'tre']] },
    { text: 'Cache the top-k popular words at every node: an almost instant answer on each keypress.', badges: { t: 'top: tree, toy, try' } },
    { text: '"toy" became more popular.', badges: { toy: '+1 search' }, ask: ['Which nodes\' caches may change?', ['Every node on the path root → toy', 'Only toy\'s own cache', 'Only the root\'s cache', 'None until the end of the week']] },
    { text: 'Top-k can change on every node along the path, so the trie is not updated live but rebuilt weekly.', focus: ['root', 't', 'to', 'toy'], flow: [['toy', 'to'], ['to', 't'], ['t', 'root']] },
    { text: 'Lots of users start with "a".', focus: ['root'], ask: ['How do you shard the trie?', ['By past data, for even load', 'An equal share per letter', 'A random split', 'Everything on one server']] },
    { text: 'A shard map manager splits by past distribution. Data: search logs → aggregator → trie DB → trie cache.', focus: ['root'] },
  ],
  summary: ['Walk the trie by prefix; cache top-k at each node', 'Updates are costly, so rebuild the trie in batches', 'Browser cache and debounce cut requests; shard by past data'],
  play: {
    kind: 'missions', intro: 'Three trie trade-offs.',
    missions: [
      ['The trade-off of a top-k cache?', ['Fast queries, more space', 'Less space, slower queries', 'There is no trade-off', 'Fast updates, slow queries'], 'Memory to keep a list at every node.'],
      ['Why cap prefix length (e.g. 50)?', ['Short lookups, constant time', 'It looks nicer that way', 'To use more memory', 'Not needed, just a rule'], 'People do not type very long prefixes.'],
      ['To cut requests while typing?', ['Browser cache and debounce', 'A new DB query per letter', 'More servers', 'Drop the index'], 'Ask for the same prefix again and the browser answers.'],
    ],
  },
  boss: [
    ['Updating the trie on every search?', ['Costly, so do it in batches', 'Fast, no problem at all', 'Fine, only the leaf changes', 'Impossible, tries never change'], 'Count the update cost: every cache along the path, every search.'],
    ['Keeping harmful words out of suggestions?', ['A filter before the trie cache', 'Ask users to report them', 'Delete the search logs', 'Wipe the trie every week'], 'They can be dropped without rebuilding the trie.'],
    ['Real-time trending (this hour\'s news)?', ['Weight recent data more heavily', 'Once a week is enough', 'It should never be shown', 'By clearing browser caches'], 'The book\'s core design is weekly; trending needs a separate path.'],
    ['Who builds the trie from search logs?', ['The aggregator, then workers', 'The viewer\'s own browser', 'The CDN\'s edge servers', 'The load balancer itself'], 'Logs → aggregated data → trie DB.'],
    ['Which store for the trie DB?', ['A document or key-value store', 'An Excel file', 'The CDN\'s cache', 'A message queue topic'], 'The book shows both options.'],
  ],
});

export const l14 = level({
  id: 14, chapter: 3, simulator: 'video',
  title: 'Training video', concept: 'Video streaming (YouTube)',
  story: 'Uploading rider training videos',
  briefing: 'Training videos for new riders. They upload, but will not play on some phones, burn through others\' data, and the CDN bill is sky-high.',
  ref: refs.p4,
  predict: ['Can a video play on every phone as soon as it is uploaded?', ['No, it needs transcoding first', 'Yes, every phone plays every format', 'Only if the file is small', 'Only on Wi-Fi']],
  nodes: [
    ['up', 'Uploader', 'user', 8, 50], ['raw', 'Raw storage', 'store', 28, 50], ['dag', 'Transcoding DAG', 'worker', 50, 50],
    ['enc', 'Encoded storage', 'store', 72, 50], ['cdn', 'CDN', 'cdn', 92, 26], ['v', 'Viewer', 'user', 92, 80],
  ],
  steps: [
    { text: 'The video goes straight to blob storage (via a pre-signed URL).', add: ['up', 'raw'], flow: [['up', 'raw']] },
    { text: 'The video is split into GOP chunks; DAG tasks: encode video, audio, thumbnail, watermark.', add: ['dag'], flow: [['raw', 'dag']], badges: { dag: 'chunks' }, ask: ['Which tasks can run at the same time?', ['Video, audio and thumbnail', 'None, all one after another', 'Only watermark and audio', 'Only the thumbnail, first']] },
    { text: 'Tasks with no dependencies run in parallel in the DAG. Output in several resolutions (360p–1080p) and formats goes to encoded storage.', add: ['enc'], flow: [['dag', 'enc']] },
    { text: 'Popular videos stream from the CDN; resolution follows the user\'s network (adaptive bitrate).', add: ['cdn', 'v'], flow: [['enc', 'cdn'], ['cdn', 'v']] },
    { text: 'The month-end CDN bill arrives.', badges: { cdn: 'costly' }, ask: ['To cut CDN costs?', ['Only popular videos on the CDN', 'Keep every video on the CDN', 'Drop the CDN entirely', 'Raise every video\'s resolution']] },
    { text: 'Popular ones on the CDN; rarely watched videos from your own servers in fewer formats; partner with ISPs in some regions.', flow: [['enc', 'v']], ok: ['cdn'] },
  ],
  summary: ['Upload → raw storage → DAG transcoding → encoded storage → CDN', 'Independent DAG tasks in parallel; adaptive bitrate', 'CDN cost: only the popular ones on the CDN'],
  play: {
    kind: 'missions', intro: 'Upload and pipeline.',
    missions: [
      ['To make uploads fast and reliable?', ['Upload in small chunks', 'The whole file at once', 'Email it first', 'Send it uncompressed'], 'If the network drops, only that chunk is redone.'],
      ['How does the client learn transcoding is done?', ['A callback when the pipeline ends', 'The client asks every second', 'An admin tells them by hand', 'The client never finds out'], 'An event when the pipeline finishes.'],
      ['Where do you stop copyrighted or harmful videos?', ['At the pipeline\'s inspection step', 'At the CDN edge', 'In the viewer\'s browser', 'Nowhere, rely on reports'], 'Before it is published.'],
    ],
  },
  boss: [
    ['Three ways to cut CDN costs?', ['Popular on CDN, the rest in fewer formats', 'Every video on CDN in every format', 'Raise bitrate to cut request counts', 'Turn the CDN off at night, fewer viewers'], 'The book\'s long-tail argument.'],
    ['A transcoding server crashes?', ['Retry the task from the queue', 'Delete the video', 'Ask the user to upload again', 'Nothing'], 'The task stays in the queue, so it is not lost.'],
    ['Why a pre-signed URL?', ['The client uploads straight to storage', 'The URL looks short and neat', 'Search engines can find the video', 'The video gets cached automatically'], 'The upload\'s huge data never touches the API servers.'],
    ['What is adaptive bitrate streaming?', ['Resolution changes with the network', 'Always plays at the top 4K', 'Audio first, the video later', 'Resolution fixed once at start'], 'Lower resolution on a slow network, less buffering.'],
    ['Where do metadata such as title and likes go?', ['A metadata DB and cache', 'Inside the video file', 'At the CDN edge', 'In the upload queue'], 'Small data and big binaries are kept apart.'],
  ],
});

export const l15 = level({
  id: 15, chapter: 3, simulator: 'filesync',
  title: 'Invoice sync', concept: 'File sync (Google Drive)',
  story: 'Syncing invoice files',
  briefing: 'A merchant\'s invoice file changes on the laptop, but the phone shows the old one. And changing one line in a 200 MB file uploads the whole thing again.',
  ref: refs.p4,
  predict: ['Change one line in a big file: upload the whole file again?', ['No, only the changed block', 'Yes, always the whole file', 'No, nothing is uploaded', 'Only the whole file at night']],
  nodes: [
    ['c1', 'Laptop', 'user', 8, 36], ['c2', 'Phone', 'user', 8, 82], ['api', 'API server', 'server', 36, 36], ['bs', 'Block server', 'worker', 36, 82],
    ['meta', 'Metadata DB', 'db', 66, 36], ['s3', 'Cloud storage', 'store', 66, 82], ['nt', 'Notification', 'service', 92, 58],
  ],
  steps: [
    { text: 'The file is split into blocks (4 MB), compressed and encrypted into storage.', add: ['c1', 'bs', 's3'], flow: [['c1', 'bs'], ['bs', 's3']] },
    { text: 'Block 3 of a 10-block file changed.', badges: { c1: 'block 3 changed' }, ask: ['How many blocks are sent?', ['1', '10', '5', '0']] },
    { text: 'Only the changed block: delta sync saves bandwidth.', flow: [['c1', 'bs'], ['bs', 's3']] },
    { text: 'Metadata (which file, which blocks, which version) lives in a separate DB, with strong consistency.', add: ['api', 'meta'], flow: [['c1', 'api'], ['api', 'meta']] },
    { text: 'The notification service tells other devices (long polling).', add: ['c2', 'nt'], flow: [['api', 'nt'], ['nt', 'c2']] },
    { text: 'Two people change the same file at once.', ask: ['What happens now?', ['The first wins, the other gets a conflict copy', 'Both are dropped, the old version returns', 'The last one silently overwrites the first', 'The two are merged into one file']] },
    { text: 'The version processed first wins; the other person sees both versions and chooses.', ok: ['meta'] },
  ],
  summary: ['Split into blocks, upload only changed ones (delta sync)', 'Metadata in its own DB, strongly consistent', 'Long-polling notifications; on conflict the first wins'],
  play: {
    kind: 'missions', intro: 'Three sync decisions.',
    missions: [
      ['WebSocket or long polling for notifications?', ['Long polling', 'WebSocket', 'Short polling', 'Server-sent email'], 'The book\'s reasoning: two-way real-time is not needed.'],
      ['The same block appears in two files?', ['Store it once, by hash', 'Store it twice, to be safe', 'Delete one of them', 'Skip compressing it'], 'It saves storage cost.'],
      ['Why strong consistency in the metadata DB?', ['Devices must not see different lists', 'Strong is faster', 'Strong is cheaper', 'Not needed, eventual is enough'], 'A wrong file list is as bad as losing data.'],
    ],
  },
  boss: [
    ['WebSocket or long polling, and why?', ['Long polling: one-way, infrequent', 'WebSocket: always faster', 'Polling every millisecond', 'Email notifications'], 'The simple solution is enough.'],
    ['To cut storage costs?', ['Dedupe, cap versions, cold storage', 'Keep every version forever', 'Turn off compression to save CPU', 'Keep more replicas to be safe'], 'The book\'s three tactics.'],
    ['What does the block server do?', ['Split into blocks, compress, encrypt', 'Handle user login and sessions', 'Send notifications to other devices', 'Keep file names and versions'], 'The heavy lifting of uploads happens here.'],
    ['An offline client comes back online?', ['Pull the pending changes and sync', 'Download every file again', 'Nothing, start from new changes', 'Reset the account'], 'From the offline backup queue.'],
    ['An upload fails halfway?', ['Resume from the remaining blocks', 'Start the whole thing over', 'Cancel the upload', 'Email the whole file'], 'Another win from splitting into blocks.'],
  ],
});
