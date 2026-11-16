import { level } from '../../dsl';
import { refs } from '../../refs';

/* Chapter 6 · Getting ready for the big day — architecture guide and final (English) */

export const l29 = level({
  id: 29, chapter: 6, simulator: 'resilience',
  title: 'Rules for staying up', concept: 'Outbox · Circuit breaker · Resilience',
  story: 'Keeping the whole system alive',
  briefing: 'All the separate parts are now wired together. But one slow dependency is slowing the whole site, and an order sits in the DB while its event never went out. The rules for surviving production.',
  ref: refs.p7,
  predict: ['Writing the order to the DB and sending the event to Kafka are two separate steps. A crash in between?', ['One happens, the other does not', 'Nothing, both happen', 'Both are lost', 'The DB sends the event itself']],
  nodes: [
    ['svc', 'Order service', 'service', 8, 50], ['db', 'DB: orders', 'db', 36, 28], ['ob', 'DB: outbox', 'db', 36, 74], ['rl', 'Relay', 'worker', 64, 74],
    ['kq', 'Kafka', 'queue', 90, 74], ['dep', 'Payment dependency', 'service', 64, 22], ['cb', 'Circuit breaker', 'lb', 90, 22],
  ],
  steps: [
    { text: 'Outbox: the order and the event are written in the same DB transaction.', add: ['svc', 'db', 'ob'], flow: [['svc', 'db'], ['svc', 'ob']], badges: { db: 'one transaction' } },
    { text: 'A relay reads the outbox, sends to Kafka, and marks what was sent.', add: ['rl', 'kq'], flow: [['ob', 'rl'], ['rl', 'kq']] },
    { text: 'The relay crashed.', down: ['rl'], ask: ['What happens now?', ['The event waits; sent later', 'The event is lost forever', 'The order is deleted too', 'The database crashes']] },
    { text: 'At-least-once: the relay sends it when it is back; safe if consumers are idempotent.', ok: ['rl'], flow: [['rl', 'kq']] },
    { text: 'The payment dependency is slow; every request holds a thread while it waits.', add: ['dep', 'cb'], down: ['dep'], flow: [['svc', 'cb']], badges: { cb: 'closed' } },
    { text: 'The error rate has shot up.', badges: { cb: '?' }, ask: ['What does a circuit breaker do?', ['Opens: straight to the fallback', 'Sends even more requests', 'Restarts the server', 'Nothing']] },
    { text: 'While open, fall back immediately. After a while, half-open: test with a few requests; if they succeed, close again.', badges: { cb: 'open → half-open' }, ok: ['cb'] },
  ],
  summary: ['Outbox: DB write and event in one transaction; a relay sends later', 'Circuit breaker: closed → open → half-open', 'Timeouts, retries with backoff, bulkheads: stop failures spreading'],
  play: {
    kind: 'missions', intro: 'Three incidents. Pick the first move.',
    missions: [
      ['One dependency is slow and the whole site is slow. First move?', ['Timeouts and a circuit breaker', 'Add more threads', 'Double the retry count', 'Wait until it recovers'], 'Do not let the slow part drag the rest down.'],
      ['A storm of retries is drowning the dependency further?', ['Backoff + jitter, a retry cap', 'Retry more and more', 'Everyone retries at once', 'Nothing, it will stop itself'], 'Everyone retrying together is a thundering herd.'],
      ['One slow feature is eating every thread?', ['Bulkhead: separate pools', 'One big pool for everyone', 'Add more servers', 'Restart the service'], 'Separate, like a ship\'s compartments.'],
    ],
  },
  boss: [
    ['Errors rise after a deploy?', ['Roll back fast', 'Wait, it will fix itself', 'Another deploy', 'Restart the database'], 'Put out the fire first, find the cause later.'],
    ['Kafka consumer lag is growing?', ['Add consumers, find the slow work', 'Shut the producer down', 'Delete the topic and recreate it', 'Nothing, it will shrink by itself'], 'Remember level 19.'],
    ['The cache is completely empty and everyone hits the DB at once (thundering herd)?', ['Request coalescing and a slow warm-up', 'Send more requests to refill faster', 'Leave cache off, read all from DB', 'Shut the DB for a while'], 'Only one request per key goes to the DB.'],
    ['With replica lag, a user cannot see their own new order?', ['Read their own writes from the master', 'Clear the cache', 'Nothing, they will see it later', 'Turn the replica off'], 'Everyone else can keep reading replicas.'],
    ['A whole region goes down?', ['Fail over to another region', 'Wait, the region will return', 'Wipe the data and start again', 'Nothing'], 'The end of the story that began at level 1.'],
  ],
});

export const l30 = level({
  id: 30, chapter: 6, simulator: 'interview',
  title: 'Interview day', concept: 'Final · the 45-minute interview',
  story: 'Interview day',
  briefing: 'Today is the real day. 45 minutes, one open question, one interviewer. Everything from 30 levels in one place, plus how to split your time.',
  ref: refs.hub,
  predict: ['How do you roughly split a 45-minute interview?', ['3–10 / 10–15 / 10–25 / 3–5 minutes', '1–2 / 5–8 / 30–35 / 2–3 minutes', '15–20 / 10–15 / 5–10 / 5 minutes', '5 / 25–30 / 5–10 / 2–3 minutes']],
  nodes: [
    ['ck', '45 minutes', 'clock', 50, 14], ['s1', 'Requirements', 'step', 14, 56], ['s2', 'High-level', 'step', 38, 56], ['s3', 'Deep dive', 'step', 62, 56], ['s4', 'Wrap-up', 'step', 86, 56],
  ],
  steps: [
    { text: 'Ask questions to understand scope, users and scale. Write your assumptions down.', add: ['ck', 's1'], focus: ['s1'], badges: { s1: '3–10 min' } },
    { text: 'Box diagram, API, data model; check it with the interviewer.', add: ['s2'], focus: ['s2'], flow: [['s1', 's2']], badges: { s2: '10–15 min' } },
    { text: 'Now it is time to go deep.', add: ['s3'], focus: ['s3'], ask: ['How many minutes for the deep dive?', ['10–25', '1–2', '40', 'Zero']] },
    { text: 'Go deep in two or three parts: bottlenecks and trade-offs.', focus: ['s3'], flow: [['s2', 's3']], badges: { s3: '10–25 min' } },
    { text: 'The last few minutes.', add: ['s4'], focus: ['s4'], ask: ['What do you say in the last step?', ['Bottlenecks, errors, scale, monitoring', 'Start a brand new design', 'Just say thank you and stop', 'Repeat everything said so far']] },
    { text: 'Finish with a summary, name your design\'s weaknesses yourself, and the next steps.', focus: ['s4'], flow: [['s3', 's4']], badges: { s4: '3–5 min' } },
  ],
  summary: ['Requirements → high-level → deep dive → wrap-up', 'Time: 3–10 / 10–15 / 10–25 / 3–5 minutes', 'Be open about assumptions and trade-offs; name your weaknesses yourself'],
  play: {
    kind: 'missions', intro: 'Three moments in the interview room.',
    missions: [
      ['The interviewer says "design a chat app". Your first sentence?', ['Ask about scope and scale', 'Name a database straight away', 'Start drawing a diagram', 'Think silently for minutes'], 'Scope first.'],
      ['The interviewer keeps asking about one part?', ['That is the deep dive; go there', 'Ignore it, stick to your plan', 'Change the subject', 'Argue'], 'Read the signal.'],
      ['A part you are unsure about?', ['Be open about assumptions and trade-offs', 'Make something up confidently', 'Skip it and move to the next part', 'Stay silent'], 'An honest thought process is what scores.'],
    ],
  },
  boss: [
    ['Bursts allowed, but the average rate is capped. Which thing?', ['Token bucket', 'Consistent hashing', 'Geohash', 'Outbox'], 'Level 4.'],
    ['Move fewer keys when adding a cache server?', ['Consistent hashing', 'Token bucket limiter', 'Saga pattern', 'Bloom filter'], 'Level 5.'],
    ['Finding the nearest rider?', ['Geohash/quadtree', 'Snowflake ID', 'Trie', '2PC'], 'Level 16.'],
    ['Stop a payment retry charging twice?', ['Idempotency key', 'Vector clock', 'CDN', 'Sharding'], 'Level 26.'],
    ['Guarantee a DB write and an event go together?', ['Transactional outbox', 'Leaky bucket', 'Pub/sub channel', 'Base 62 code'], 'Level 29.'],
  ],
});
