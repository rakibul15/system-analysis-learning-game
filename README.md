# System analysis learning with playing games

ParcelGo: delivery city-তে খেলে system design শেখা (Alex Xu-র *System Design Interview* Vol 1 ও 2 অবলম্বনে)।

এখন **pilot**: শুধু Level ৩ (Traffic controller · load balancer) পুরো খেলা যায়।

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
  pages/          map/, level/
  widgets/        traffic-stage/ (stage + useTrafficRound hook)
  entities/       progress/ (Zustand, localStorage-এ, versioned)
  shared/lib/     বাংলা সংখ্যা, easing
  simulators/     traffic/ — খাঁটি TypeScript engine, UI ছাড়া, test সহ
  content/        level-এর ডেটা, Zod schema দিয়ে যাচাই
```

### Traffic engine

সব traffic-ধাঁচের level একটাই engine-এ চলে; level শুধু নিয়ম বদলায়
(`TrafficRules`: কতগুলো hub, ধারণক্ষমতা, parcel কত দ্রুত আসে, কোন hub কখন বিগড়ায়,
কে route করে: player না round robin, health check আছে কি না)।
নতুন level = `src/content/levels/` এ নতুন নিয়ম + লেখা, engine-এ হাত দিতে হয় না।
