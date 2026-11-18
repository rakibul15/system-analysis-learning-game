import type { XuNote } from './types';

const GREEN = '#0B8A7A', RED = '#E0483E', YELLOW = '#FFC02E';

/** Vol 1, chapter 1 (Scale From Zero To Millions Of Users), in our words with ParcelGo. */
export const note: XuNote = {
  id: 'v1-1',
  goals: [
    'এক server থেকে লাখো user পর্যন্ত design-টা ধাপে ধাপে আঁকতে পারবেন, আর বলতে পারবেন কোন অংশ কেন এল।',
    'প্রতিটা অংশ যে নতুন ঝামেলা আনে (replication lag, পুরোনো cache, sticky session, resharding) তা আগেই বলতে পারবেন।',
    'Interview-এ "design X" প্রশ্নের প্রথম খসড়া এই কাঠামো থেকে শুরু করতে পারবেন।',
  ],
  related: ['caching', 'replication', 'sharding'],
  blocks: [
    { kind: 'p', text: 'পুরো অধ্যায়টা একটা গল্প। শুরু একটা server-এ। তারপর যখনই কিছু ভাঙে, একটা নতুন অংশ যোগ হয়। প্রতিটা অংশের জন্য দুটো জিনিস মনে রাখুন: কোন সমস্যা মেটায়, আর কোন নতুন ঝামেলা আনে। Interview-এ দ্বিতীয়টাই আপনাকে আলাদা করে।' },

    { kind: 'h', text: 'একটা request-এর যাত্রা' },
    { kind: 'p', text: 'আগে দেখে নিই একজন customer parcel-এর অবস্থা দেখতে চাইলে কী কী ঘটে। পরের সব আলোচনা এই পথের কোনো না কোনো ধাপকে শক্ত করার কথা।' },
    { kind: 'seq', label: 'Customer PG-4821 parcel-টা কোথায় দেখতে চাইলেন', actors: ['Browser', 'DNS', 'Load balancer', 'Web', 'Cache', 'DB'], steps: [
      { from: 0, to: 1, msg: 'parcelgo.com কোথায়?', note: 'DNS নামকে IP-তে বদলায়। উত্তরটা browser কিছুক্ষণ মনে রাখে, তাই প্রতিবার জিজ্ঞেস করতে হয় না।' },
      { from: 1, to: 0, msg: '203.0.113.10 (load balancer-এর public IP)' },
      { from: 0, to: 2, msg: 'GET /track/PG-4821' },
      { from: 2, to: 3, msg: 'সুস্থ একটা web server বেছে পাঠাল', note: 'Web server-রা private IP-তে থাকে; internet থেকে কেউ সরাসরি ওদের কাছে যেতে পারে না।' },
      { from: 3, to: 4, msg: 'PG-4821 আছে?' },
      { from: 4, to: 3, msg: 'নেই (miss)', tone: 'bad', note: 'প্রথমবার কেউ দেখছে, বা আগের কপির মেয়াদ শেষ।' },
      { from: 3, to: 5, msg: 'PG-4821-এর অবস্থা দাও', note: 'শুধু পড়া, তাই replica থেকেও আনা যায়।' },
      { from: 5, to: 3, msg: 'পথে · মিরপুর hub' },
      { from: 3, to: 4, msg: 'রেখে দাও, ৬০ সেকেন্ড', note: 'পরের ৬০ সেকেন্ডে যত মানুষ এটা দেখবে, সবাই cache থেকে পাবে; DB-তে আর যেতে হবে না।' },
      { from: 3, to: 0, msg: '200 OK · JSON', tone: 'ok' },
    ] },

    { kind: 'h', text: 'ধাপে ধাপে বড় হওয়া' },
    { kind: 'p', text: 'নিচের ছবিতে ParcelGo বড় হচ্ছে। প্রতিটা ধাপে হলুদ দাগ দেওয়া box-গুলো নতুন। আগে "যা ভাঙল" পড়ুন, তারপর ভাবুন আপনি কী যোগ করতেন, তারপর মিলিয়ে নিন।' },
    { kind: 'stages', label: 'ParcelGo বড় হচ্ছে: প্রতিটা ধাপে কী ভাঙল, কী যোগ হলো', stages: [
      {
        title: 'এক server',
        problem: 'কিছুই না, এটা শুরু। প্রথম মাসে কয়েকশো merchant।',
        fix: 'Web app আর database একই machine-এ। DNS নাম থেকে IP দেয়, browser সেখানে request পাঠায়।',
        cost: 'Machine বসে গেলে পুরো ParcelGo বন্ধ। আর web-এর ভিড় আর database-এর কাজ একই CPU-র জন্য লড়ে।',
        nodes: [{ id: 'user', label: 'User', x: 12, y: 17 }, { id: 'srv', label: 'Server', sub: 'web + DB', x: 58, y: 17, w: 22 }],
        links: [{ from: 'user', to: 'srv', rate: 3 }],
      },
      {
        title: 'Database আলাদা',
        problem: 'রাতের report চালালেই web ধীর হয়ে যায়: দুটো একই machine-এ।',
        fix: 'Web server (traffic সামলায়) আর database (data রাখে) আলাদা machine-এ। যার চাপ বেশি, শুধু সেটাকেই বাড়ানো যায়।',
        cost: 'দুটোই এখনো একটা করে। যেকোনোটা বসলে site বন্ধ।',
        nodes: [{ id: 'user', label: 'User', x: 10, y: 17 }, { id: 'web', label: 'Web server', x: 46, y: 17 }, { id: 'db', label: 'Database', x: 84, y: 17 }],
        links: [{ from: 'user', to: 'web', rate: 3 }, { from: 'web', to: 'db', rate: 3 }],
      },
      {
        title: 'Load balancer',
        problem: 'এক web server-এ সন্ধ্যার ভিড় ধরে না, আর deploy-এর সময় site বন্ধ থাকে।',
        fix: 'Load balancer traffic দুটো web server-এ ভাগ করে। একটা বসলে সব অন্যটায় যায়; ভিড় বাড়লে pool-এ server যোগ করলেই হয়।',
        cost: 'Web tier-এ বিকল্প এল, কিন্তু database এখনো একা। আর load balancer নিজেও একটা: সাধারণত জোড়ায় রাখা হয়।',
        nodes: [{ id: 'user', label: 'User', x: 8, y: 17 }, { id: 'lb', label: 'Load balancer', x: 30, y: 17, w: 20 }, { id: 'web1', label: 'Web ১', x: 56, y: 8 }, { id: 'web2', label: 'Web ২', x: 56, y: 26 }, { id: 'db', label: 'Database', x: 86, y: 17 }],
        links: [{ from: 'user', to: 'lb', rate: 4 }, { from: 'lb', to: 'web1', rate: 2 }, { from: 'lb', to: 'web2', rate: 2 }, { from: 'web1', to: 'db', rate: 2 }, { from: 'web2', to: 'db', rate: 2 }],
      },
      {
        title: 'Replication',
        problem: 'Database বসলে সব বন্ধ, আর tracking page-এর পড়ার চাপে সে হাঁপায়।',
        fix: 'একটা primary শুধু লেখা নেয়; replica-রা তার কপি রাখে আর পড়া সামলায়। বেশিরভাগ app-এ পড়া অনেক বেশি, তাই replica কয়েকটা।',
        cost: 'Replica একটু পিছিয়ে থাকে (replication lag): সদ্য লেখা জিনিস replica-তে তখনো নেই। Primary বসলে একটা replica-কে primary বানাতে হয়।',
        nodes: [{ id: 'lb', label: 'LB', x: 8, y: 17, w: 12 }, { id: 'web1', label: 'Web ১', x: 32, y: 8 }, { id: 'web2', label: 'Web ২', x: 32, y: 26 }, { id: 'db', label: 'Primary', sub: 'শুধু লেখা', x: 62, y: 7 }, { id: 'r1', label: 'Replica', sub: 'পড়া', x: 62, y: 27 }, { id: 'r2', label: 'Replica', sub: 'পড়া', x: 89, y: 27 }],
        links: [
          { from: 'lb', to: 'web1', rate: 2 }, { from: 'lb', to: 'web2', rate: 2 },
          { from: 'web1', to: 'db', rate: 0.8, color: RED }, { from: 'web2', to: 'db', rate: 0.8, color: RED },
          { from: 'web1', to: 'r1', rate: 2 }, { from: 'web2', to: 'r2', rate: 2 },
          { from: 'db', to: 'r1', rate: 1.2, color: YELLOW, secs: 0.7 }, { from: 'db', to: 'r2', rate: 1.2, color: YELLOW, secs: 0.9 },
        ],
      },
      {
        title: 'Cache আর CDN',
        problem: 'একই parcel-এর অবস্থা দিনে হাজারবার পড়া হয়, অথচ বদলায় পাঁচবার। আর রংপুরের merchant-এর কাছে ছবি আসতে দেরি।',
        fix: 'Cache: বারবার চাওয়া উত্তর memory-তে, DB-তে যায় শুধু miss হলে। CDN: ছবি, JS, CSS user-এর কাছের server থেকে।',
        cost: 'Cache-এর কপি পুরোনো হতে পারে: মেয়াদ (TTL) কত হবে আর বদলালে কী করবেন ঠিক রাখতে হয়। CDN-এর খরচ আছে, পুরোনো file সরাতে হয়।',
        nodes: [{ id: 'user', label: 'User', x: 8, y: 25 }, { id: 'cdn', label: 'CDN', sub: 'ছবি, JS, CSS', x: 8, y: 7 }, { id: 'lb', label: 'LB', x: 30, y: 25, w: 12 }, { id: 'web1', label: 'Web', x: 52, y: 17 }, { id: 'cache', label: 'Cache', sub: 'বেশিরভাগ এখানেই', x: 80, y: 7 }, { id: 'db', label: 'DB', sub: 'শুধু miss হলে', x: 80, y: 27 }],
        links: [{ from: 'user', to: 'cdn', rate: 4, color: YELLOW }, { from: 'user', to: 'lb', rate: 3 }, { from: 'lb', to: 'web1', rate: 3 }, { from: 'web1', to: 'cache', rate: 4, color: GREEN }, { from: 'web1', to: 'db', rate: 0.7, color: RED }],
      },
      {
        title: 'Stateless web tier',
        problem: 'Login session web server-এর memory-তে। Deploy দিলেই সবাই logout, আর load balancer-কে প্রতিটা user-কে একই server-এ পাঠাতে হয় (sticky session)।',
        fix: 'Session বের করে একটা shared store-এ। এখন যেকোনো server যেকোনো user-কে চেনে, তাই ভিড় দেখে server যোগ-বাদ (autoscaling) সহজ।',
        cost: 'Session store-কেও টিকিয়ে রাখতে হয়, আর প্রতিটা request-এ একবার সেখানে যাওয়া।',
        nodes: [{ id: 'user', label: 'User', x: 8, y: 17 }, { id: 'lb', label: 'LB', x: 28, y: 17, w: 12 }, { id: 'web1', label: 'Web ১', x: 52, y: 8 }, { id: 'web2', label: 'Web ২', x: 52, y: 26 }, { id: 'sess', label: 'Session store', sub: 'সবার জন্য এক', x: 84, y: 17, w: 22 }],
        links: [{ from: 'user', to: 'lb', rate: 4 }, { from: 'lb', to: 'web1', rate: 2 }, { from: 'lb', to: 'web2', rate: 2 }, { from: 'web1', to: 'sess', rate: 1.5 }, { from: 'web2', to: 'sess', rate: 1.5 }],
      },
      {
        title: 'দুই data center',
        problem: 'পুরো data center-এ বিদ্যুৎ গেলে সব বন্ধ; আর বিদেশের merchant-দের জন্য সব ধীর।',
        fix: 'দুটো data center। geoDNS user-কে কাছেরটায় পাঠায়; একটা বসলে সবাইকে অন্যটায়। Data দুই জায়গায় কপি হয়।',
        cost: 'দুই জায়গার data মিলিয়ে রাখা (সাধারণত একটু দেরিতে, asynchronous), আর test-deploy দুই জায়গাতেই একই রকম রাখা।',
        nodes: [{ id: 'user', label: 'User', x: 8, y: 17 }, { id: 'dns', label: 'geoDNS', x: 32, y: 17 }, { id: 'dc1', label: 'ঢাকা DC', sub: 'কাছের', x: 64, y: 7 }, { id: 'dc2', label: 'সিঙ্গাপুর DC', sub: 'বিকল্প', x: 64, y: 27, w: 20 }],
        links: [{ from: 'user', to: 'dns', rate: 4 }, { from: 'dns', to: 'dc1', rate: 3 }, { from: 'dns', to: 'dc2', rate: 1 }, { from: 'dc1', to: 'dc2', rate: 1, color: YELLOW, secs: 1.6 }],
      },
      {
        title: 'Queue আর worker',
        problem: 'Order নেওয়ার সময়ই label ছাপানো, SMS পাঠানো, ছবি ছোট করা: customer অপেক্ষা করে, আর SMS gateway ধীর হলে order-ও আটকায়।',
        fix: 'Web শুধু কাজটা queue-তে রাখে আর সাথে সাথে উত্তর দেয়। Worker-রা নিজের গতিতে তুলে নিয়ে করে।',
        cost: 'কাজ একটু পরে হয়, আর কখনো দুবার হতে পারে: worker-কে এমনভাবে লিখতে হয় যাতে দুবার করলেও ক্ষতি নেই।',
        nodes: [{ id: 'web1', label: 'Web', x: 10, y: 17 }, { id: 'queue', label: 'Queue', sub: 'কাজ জমা থাকে', x: 44, y: 17, w: 20 }, { id: 'wk1', label: 'Worker', x: 82, y: 6 }, { id: 'wk2', label: 'Worker', x: 82, y: 17 }, { id: 'wk3', label: 'Worker', x: 82, y: 28 }],
        links: [{ from: 'web1', to: 'queue', rate: 5 }, { from: 'queue', to: 'wk1', rate: 1.4 }, { from: 'queue', to: 'wk2', rate: 1.4 }, { from: 'queue', to: 'wk3', rate: 1.4 }],
      },
      {
        title: 'নজর আর automation',
        problem: 'Server এখন বিশটা। কোনটায় error হচ্ছে কেউ জানে না, merchant ফোন করে জানায়।',
        fix: 'সব server-এর log এক জায়গায়; CPU, latency, ঘণ্টায় কত order তার metrics; গোলমালে alert। আর প্রতিটা code বদল আপনা থেকে test হয়ে deploy (CI/CD)।',
        cost: 'এগুলোও system: খরচ আছে, আর বেশি alert হলে মানুষ alert শোনা বন্ধ করে দেয়।',
        nodes: [{ id: 'web1', label: 'Web ১', x: 12, y: 9 }, { id: 'web2', label: 'Web ২', x: 12, y: 26 }, { id: 'log', label: 'Log', sub: 'এক জায়গায়', x: 50, y: 6 }, { id: 'met', label: 'Metrics', x: 50, y: 17 }, { id: 'ci', label: 'CI/CD', sub: 'test → deploy', x: 50, y: 28 }, { id: 'team', label: 'On-call', sub: 'alert', x: 87, y: 17 }],
        links: [{ from: 'web1', to: 'log', rate: 2 }, { from: 'web2', to: 'log', rate: 2 }, { from: 'web1', to: 'met', rate: 2 }, { from: 'web2', to: 'met', rate: 2 }, { from: 'met', to: 'team', rate: 0.6, color: RED }, { from: 'ci', to: 'web2', rate: 0.5, color: YELLOW }],
      },
      {
        title: 'Sharding',
        problem: 'Primary database-এ আর লেখা ধরে না, disk-ও ভরে আসছে। আরও বড় machine-এর দামও আকাশছোঁয়া, আর সীমাও আছে।',
        fix: 'Data ভাগ করে কয়েকটা database-এ (shard)। কোন merchant কোন shard-এ, ঠিক করে একটা key, যেমন merchant_id % 4।',
        cost: 'Shard সংখ্যা বদলালে প্রায় সব data সরাতে হয় (resharding)। একজন বড় merchant একটা shard-কে বসিয়ে দেয় (hotspot)। আর আলাদা shard-এর data join করা কঠিন।',
        h: 38,
        nodes: [{ id: 'web1', label: 'Web', x: 12, y: 19 }, { id: 's0', label: 'Shard ০', sub: '% 4 = 0', x: 72, y: 5 }, { id: 's1', label: 'Shard ১', sub: '% 4 = 1', x: 72, y: 14 }, { id: 's2', label: 'Shard ২', sub: 'বড় merchant!', x: 72, y: 23, tone: 'hot' }, { id: 's3', label: 'Shard ৩', sub: '% 4 = 3', x: 72, y: 32 }],
        links: [{ from: 'web1', to: 's0', rate: 1.5 }, { from: 'web1', to: 's1', rate: 1.5 }, { from: 'web1', to: 's2', rate: 5, color: RED }, { from: 'web1', to: 's3', rate: 1.5 }],
      },
    ] },

    { kind: 'h', text: 'SQL না NoSQL' },
    { kind: 'p', text: 'Relational database data রাখে table আর row-তে, table join করা যায়, আর transaction দেয়। বহু বছরের পরীক্ষিত, তাই বেশিরভাগ ক্ষেত্রে এটাই ভালো শুরু। NoSQL-এর চার ধরন: key-value, document, wide-column, graph; সাধারণত join নেই।' },
    { kind: 'list', items: [
      'NoSQL ভাবুন যখন: latency খুব কম লাগবে, data-র কাঠামো ঢিলেঢালা বা সম্পর্কহীন, শুধু JSON রেখে আবার পড়তে হবে, বা data-র পরিমাণ বিশাল।',
      'SQL রাখুন যখন: টাকা, order, booking, seat: একটার সাথে আরেকটা জড়ানো, আর একই slot দুজনকে না দেওয়ার জন্য transaction লাগে।',
      'ParcelGo-তে: order আর payment SQL-এ; rider-এর প্রতি ৫ সেকেন্ডের location একটা key-value বা time-series store-এ।',
    ] },

    { kind: 'h', text: 'Vertical বনাম horizontal' },
    { kind: 'table', head: ['', 'Vertical (scale up)', 'Horizontal (scale out)'], rows: [
      ['মানে', 'একই machine-এ বেশি CPU আর RAM', 'আরও machine'],
      ['কখন ভালো', 'শুরুতে, traffic কম থাকলে: সবচেয়ে সহজ', 'বড় system-এ: সীমা প্রায় নেই'],
      ['সীমা', 'Hardware-এর একটা ছাদ আছে, আর দাম দ্রুত বাড়ে', 'অংশ বেশি, তাই ভাগ করা আর মেলানোর ঝামেলা'],
      ['বসে গেলে', 'এক machine বসলে সব বন্ধ', 'বাকিরা কাজ চালায়'],
    ] },
    { kind: 'p', text: 'Web server-কে horizontal করা সহজ (stateless রাখলেই হয়)। Database-কে horizontal করা অনেক কঠিন: সেটাই শেষ ধাপের sharding।' },

    { kind: 'h', text: 'Primary বসে গেলে কী হয়' },
    { kind: 'seq', label: 'Primary database হঠাৎ বন্ধ: কে কী করে', actors: ['Web', 'Primary', 'Replica ক', 'Replica খ'], steps: [
      { from: 0, to: 1, msg: 'নতুন order লেখো: PG-4822' },
      { from: 1, to: 2, msg: 'কপি পাঠাল' },
      { from: 1, to: 1, msg: '✕ disk নষ্ট, বন্ধ', tone: 'bad', note: 'Replica খ-এর কাছে PG-4822 পৌঁছানোর আগেই।' },
      { from: 0, to: 1, msg: 'লেখা যাচ্ছে না', tone: 'bad', note: 'এই কয়েক সেকেন্ড নতুন order নেওয়া যায় না; পড়া অবশ্য replica থেকে চলছে।' },
      { from: 2, to: 2, msg: 'আমি এখন primary', tone: 'ok', note: 'সবচেয়ে এগিয়ে থাকা replica-কে primary বানানো হয় (failover)।' },
      { from: 0, to: 2, msg: 'লেখা এখন এখানে', tone: 'ok' },
      { from: 2, to: 3, msg: 'আমার থেকে কপি নাও, PG-4822 সহ', note: 'নতুন primary-ও যদি পিছিয়ে থাকত, শেষ কয়েকটা লেখা হারাত: তখন recovery script লাগে।' },
    ] },
    { kind: 'list', items: [
      'Replica বসলে: পড়া বাকি replica-গুলোতে যায়। একটাই থাকলে কিছুক্ষণ primary-ই পড়া সামলায়, তারপর নতুন replica।',
      'Primary বসলে: একটা replica primary হয়। পিছিয়ে থাকলে হারানো লেখা উদ্ধার করতে হয়।',
      'বইয়ে নাম master আর slave; এখন বেশি বলা হয় primary আর replica (বা leader আর follower)।',
    ] },

    { kind: 'h', text: 'Cache-এর পাঁচ প্রশ্ন' },
    { kind: 'table', head: ['প্রশ্ন', 'মূল কথা', 'ভুল হলে কী ভাঙে'], rows: [
      ['কখন রাখবেন', 'পড়া বেশি, লেখা কম এমন data। Memory মুছে যেতে পারে, তাই জরুরি data database-এই।', 'Restart-এ data হারাবে'],
      ['মেয়াদ (TTL)', 'খুব ছোটও না, খুব বড়ও না', 'ছোট: DB-তে চাপ; বড়: পুরোনো উত্তর'],
      ['মিল রাখা', 'DB আর cache-এ লেখা এক transaction-এ হয় না', 'দুই জায়গায় দুই রকম data'],
      ['Cache বসলে', 'একটাই cache server হলে সেটাই দুর্বল বিন্দু; কয়েকটা রাখুন, memory একটু বেশি', 'সব চাপ হঠাৎ DB-তে'],
      ['ভরে গেলে', 'কোনটা বাদ যাবে: LRU (অনেকক্ষণ কেউ চায়নি), LFU (সবচেয়ে কম চাওয়া), FIFO', 'নতুন data জায়গা পায় না'],
    ] },

    { kind: 'h', text: 'CDN আর stateless web' },
    { kind: 'p', text: 'CDN হলো পৃথিবীজুড়ে ছড়ানো server, যারা ছবি, video, JS, CSS user-এর কাছ থেকে দেয়। প্রথম request-এ CDN মূল server (origin) থেকে file এনে মেয়াদ পর্যন্ত রাখে; পরের সবাই কাছ থেকেই পায়। CDN বসলে client সোজা origin থেকে আনবে: ধীর, কিন্তু ভাঙবে না।' },
    { kind: 'tip', title: 'File-এর নামে version', text: 'মেয়াদের আগে file বদলাতে চাইলে URL-এ version দিন (logo.png?v=2)। React build-এ main.a8f3c.js-এর মতো hash-যুক্ত নামও একই কৌশল: নতুন build মানে নতুন নাম, পুরোনোটা আর কেউ চায় না।' },

    { kind: 'h', text: 'Sharding-এর তিন ঝামেলা' },
    { kind: 'list', items: [
      'Resharding: merchant_id % 4 থেকে % 5 করলে প্রায় ৮০% merchant-এর shard বদলে যায়। সমাধান consistent hashing (অধ্যায় ৫)।',
      'Hotspot (বইয়ে celebrity problem): এক বড় merchant-এর order একাই একটা shard ভরায়। সমাধান: তাকে আলাদা shard দেওয়া, দরকারে আরও ভাগ।',
      'Join: আলাদা shard-এর table join করা কঠিন। সমাধান: denormalize করা, মানে দরকারি data একই row-তে কপি করে রাখা (কপিগুলো মিলিয়ে রাখার দায় সহ)।',
      'Key বাছাইয়ের মূল নিয়ম: data যেন সমানভাবে ছড়ায়, আর বেশিরভাগ query যেন একটা shard-এই শেষ হয়।',
    ] },

    { kind: 'story', title: 'চাঁদরাতে ParcelGo বন্ধ', steps: [
      'ঈদের আগের রাত, order স্বাভাবিকের তিন গুণ।',
      'একমাত্র database-এর disk ভরে গেল; লেখা বন্ধ।',
      'Web server-রা চালু, কিন্তু প্রতিটা request database-এর অপেক্ষায় থেকে timeout।',
      'Replica ছিল না, failover-ও না: ৪০ মিনিট site বন্ধ, merchant-রা একের পর এক ফোন করছে।',
    ], fix: 'অন্য zone-এ অন্তত একটা replica, failover আগে থেকে অনুশীলন করা, আর disk ৭০% ভরলেই alert। বড় দিনের আগে load test।' },

    { kind: 'h', text: 'এক নজরে' },
    { kind: 'table', head: ['অংশ', 'কোন সমস্যা মেটায়', 'কী নতুন ঝামেলা আনে'], rows: [
      ['Load balancer', 'এক web server-এর সীমা, তার বসে যাওয়া', 'নিজেই একটা; জোড়ায় রাখতে হয়'],
      ['Replication', 'DB বসলে site বন্ধ; পড়ার চাপ', 'Replication lag, failover-এ হারানো লেখা'],
      ['Cache', 'একই প্রশ্নে বারবার DB', 'পুরোনো উত্তর, মেয়াদ ঠিক করা'],
      ['CDN', 'দূরের user-এর কাছে ছবি ধীর', 'খরচ, পুরোনো file সরানো'],
      ['Stateless web', 'Sticky session, server যোগ-বাদ কঠিন', 'Session store টিকিয়ে রাখা'],
      ['একাধিক data center', 'পুরো region বসে গেলে, দূরের user', 'Data মেলানো, সব জায়গায় deploy'],
      ['Message queue', 'ধীর কাজে user-এর অপেক্ষা', 'কাজ দেরিতে বা দুবার'],
      ['Log, metrics, CI/CD', 'কী হচ্ছে না জানা, হাতে deploy', 'খরচ, alert-এর ভিড়'],
      ['Sharding', 'এক DB-তে লেখা আর data ধরে না', 'Resharding, hotspot, join'],
    ] },
    { kind: 'tip', title: 'আগে দরকার, তারপর অংশ', text: 'প্রতিটা অংশ আসে আগের ধাপে কিছু ভাঙলে। শুরুতেই sharding বা দশটা service বানানো over-engineering; অনেক বড় site-ও বহু বছর একটা primary database আর কয়েকটা replica-তে চলেছে। Interview-এ বলুন কোন সংখ্যায় পৌঁছালে পরের ধাপ লাগবে।' },

    { kind: 'mistakes', items: [
      'Load balancer বসিয়ে ভাবা কাজ শেষ, অথচ database এখনো একা।',
      'Cache-কে মূল data ভাবা: cache পুরো মুছে গেলেও কিছু হারানো চলবে না।',
      'Session web server-এর memory-তে রেখে autoscale করা: প্রতিটা deploy-এ সবাই logout।',
      'Replica থেকে পড়ে ধরে নেওয়া যে সদ্য লেখা জিনিসটা দেখা যাবে।',
      'শুরুতেই sharding, কোনো সংখ্যা ছাড়াই।',
    ] },
    { kind: 'check', items: [
      { q: 'Load balancer বসানোর পরও কোন অংশে কোনো বিকল্প নেই?', a: 'Data tier: database এখনো একটা। সমাধান replication: primary আর কয়েকটা replica।' },
      { q: 'Merchant নিজের সদ্য বদলানো ঠিকানা দেখতে পাচ্ছেন না। কেন, আর কী করবেন?', a: 'লেখা গেছে primary-তে, পড়া আসছে এমন replica থেকে যেখানে বদলটা তখনো পৌঁছায়নি (replication lag)। সমাধান: লেখার পর কিছুক্ষণ সেই merchant-এর পড়া primary থেকে।' },
      { q: 'নতুন version deploy করতেই সবাই logout। কারণ?', a: 'Session ছিল web server-এর memory-তে। Server restart হতেই হারিয়েছে। Session shared store-এ রাখলে হতো না।' },
      { q: 'কোন কাজ queue-তে দেওয়া ঠিক না?', a: 'যার ফল user-কে তখনই লাগবে আর যেখানে মিল থাকা জরুরি, যেমন pickup slot খালি আছে কিনা দেখে তখনই নিশ্চিত করা।' },
      { q: 'merchant_id % 4 থেকে % 5 করলে কী হয়?', a: 'প্রায় ৮০% merchant-এর shard বদলায়: প্রতি ২০টা id-র মধ্যে মাত্র ৪টার (২০ দিয়ে ভাগশেষ ০ থেকে ৩) দুই হিসাবে একই ভাগশেষ। তাই বিপুল data সরাতে হয়; এজন্যই consistent hashing।' },
    ] },
  ],
};
