# System analysis learning with playing games

ParcelGo: delivery city-তে খেলে system design শেখা (Alex Xu-র *System Design Interview* Vol 1 ও 2 অবলম্বনে)।

ছয় অধ্যায়ে ৩০টা level। প্রতিটা level-এ ছয় ধাপ: ব্রিফিং → অনুমান → animated lesson (দুটো checkpoint) → খেলা (Level ১-এ traffic simulator, বাকিগুলোতে ৩টা mission) → boss (৫ প্রশ্ন) → ফল। নম্বর confidence marking-এ (নিশ্চিত/আন্দাজ)।

Screen: শহরের map (অধ্যায় অনুযায়ী), level, review (spaced repetition ১/৩/৭/১৬/৩৫ দিন), practice (estimation drill, design challenge, মুখে বলা), প্রোফাইল (readiness, দখল, export/import)।

**জানা ঘাটতি:** অনেক প্রশ্নে সঠিক উত্তরটা অন্য বিকল্পের চেয়ে অনেক লম্বা, ফলে আন্দাজ করা সহজ। `content.test.ts` এটা মাপে; পরের content pass-এ distractor লেখা ঠিক করতে হবে। Level ১ ছাড়া কোনো level-এর নিজস্ব simulator এখনো নেই।

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
  pages/          map/, level/, review/, practice/, profile/
  widgets/        traffic-stage/, lesson-player/, city-map/
  features/       estimation drill, practice prompts
  entities/       progress/ (Zustand, localStorage-এ, versioned)
  shared/lib/     বাংলা সংখ্যা, easing
  simulators/     traffic/ — খাঁটি TypeScript engine, UI ছাড়া, test সহ
  content/        ৩০ level-এর ডেটা (levels/ch1–ch6.ts), Zod schema দিয়ে যাচাই; প্রথম option-ই সঠিক, UI shuffle করে
```

### Traffic engine

সব traffic-ধাঁচের level একটাই engine-এ চলে; level শুধু নিয়ম বদলায়
(`TrafficRules`: কতগুলো hub, ধারণক্ষমতা, parcel কত দ্রুত আসে, কোন hub কখন বিগড়ায়,
কে route করে: player না round robin, health check আছে কি না)।
নতুন level = `src/content/levels/` এ নতুন নিয়ম + লেখা, engine-এ হাত দিতে হয় না।
