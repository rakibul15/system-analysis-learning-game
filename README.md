# System analysis learning with playing games

ParcelGo: delivery city-তে খেলে system design শেখা (Alex Xu-র *System Design Interview* Vol 1 ও 2 অবলম্বনে)।

ছয় অধ্যায়ে ৩০টা level। প্রতিটা level-এ ছয় ধাপ: ব্রিফিং → অনুমান → animated lesson (দুটো checkpoint) → simulator (প্রতিটা level-এর নিজের, ৩টা mission) → boss (৫ প্রশ্ন) → ফল। নম্বর confidence marking-এ (নিশ্চিত/আন্দাজ)।

Screen:
- **শহর**: অধ্যায় অনুযায়ী map
- **Level**: ছয় ধাপ
- **Practice**: estimation drill, design challenge, মুখে বলা, simulator lab (যেকোনো simulator আবার)
- **Builder**: অংশ বসিয়ে তীর টেনে architecture আঁকা, নিয়ম দিয়ে যাচাই (৬টা brief)
- **Incident**: production alert, dashboard আর log পড়ে তিনটা সিদ্ধান্ত (৮টা incident)
- **Mock**: ৪৫ মিনিটের interview, পাঁচ ধাপ, interviewer-এর প্রশ্ন, শেষে rubric
- **Review**: spaced repetition ১/৩/৭/১৬/৩৫ দিন
- **প্রোফাইল**: interview readiness, দখল, export/import

Install করা যায় (PWA), একবার খোলার পর offline-এ চলে। শব্দ আছে, header থেকে বন্ধ করা যায়।

**জানা ঘাটতি:** English mode নেই; সব content বাংলায়।

## চালানো

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine-এর test
npm run build      # dist/ — যেকোনো static host-এ চলে (hash URL)
```

## গঠন (Feature-Sliced Design + simulators + content)

```
src/
  app/            router, global style, design tokens (Tailwind @theme)
  pages/          map/, level/, review/, practice/, builder/, incident/, mock/, profile/
  widgets/        traffic-stage/, lesson-player/, city-map/
  features/       estimation drill, practice prompts, builder rules, incidents, mock script
  entities/       progress/ (Zustand, localStorage-এ, versioned)
  shared/lib/     বাংলা সংখ্যা, easing
  simulators/     traffic/ — খাঁটি TypeScript engine, test সহ
                  frame/ — সব simulator-এর এক layout (control, ছবি, সংখ্যা, mission)
                  sims/ — ১১টা হাতে বানানো simulator (cache, rate limiter, hash ring …)
                  knob/ — declarative engine + ১৮টা spec; test প্রমাণ করে প্রতিটা mission সম্ভব
                  registry.ts — level-এর `simulator` id থেকে lazy-loaded component
  content/        ৩০ level-এর ডেটা (levels/ch1–ch6.ts), Zod schema দিয়ে যাচাই; প্রথম option-ই সঠিক, UI shuffle করে
```

### Traffic engine

সব traffic-ধাঁচের level একটাই engine-এ চলে; level শুধু নিয়ম বদলায়
(`TrafficRules`: কতগুলো hub, ধারণক্ষমতা, parcel কত দ্রুত আসে, কোন hub কখন বিগড়ায়,
কে route করে: player না round robin, health check আছে কি না)।
নতুন level = `src/content/levels/` এ নতুন নিয়ম + লেখা, engine-এ হাত দিতে হয় না।
