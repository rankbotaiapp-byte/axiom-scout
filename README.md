# Axiom Scout

Operator desk for **New Era Apps**. Search a city, enrich a shop, copy `business.ts` into a clone of [axiom-business-template](https://github.com/rankbotaiapp-byte/axiom-business-template). Walk in with a live halo demo.

Not a client site. Not for the shop owner.

## Run (Vercel)

1. Import this repo on Vercel.
2. In Claude Console → **API keys** → Create key.
3. Add that key as `ANTHROPIC_API_KEY` on the Vercel project (Production + Preview). Do not paste keys into chat.
4. Open the Scout URL. Niche → city → **Search businesses**.
5. Click a shop. Wait for enrich.
6. If verdict is **skip**, stop. They already have an AI desk.
7. **Copy business.ts**. In a new repo from axiom-business-template, paste over `src/config/business.ts`. Drop photos into `public/business/`. Deploy that clone. That is the demo you walk in with.

## Local

```
cp .env.example .env.local
# put the Anthropic key in ANTHROPIC_API_KEY
npm install
npm run dev
```

## What it does

- Niche + city → live web search
- List with a 0–100 demo score and an AI flag
- Enrich: hours, services, phone, image URLs, skip/prime verdict
- Copy `business.ts` for the halo template
- Copy owner email / SMS (does not send)

## What it does not do

- Create the GitHub client repo
- Deploy the shop demo
- Download photos into the repo (URLs are references)
- Invent prices or hours — blanks stay blank
- Guarantee the shop has no AI (evidence only)
