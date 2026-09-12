# Axiom Scout — implementation brief

## 1. Product
Axiom Scout is an operator web app that searches booking-first local businesses with your Anthropic account and returns only the fields needed to paste into an AXIOM `config.js`.

## 2. Who it is for
- Eric / New Era Apps when sourcing demo targets
- Same person who clones a client repo and edits one file: `config.js`
- Not the shop owner

## 3. Out of scope
- Customer-facing AXIOM chat
- Auto “Use this template” + Vercel deploy
- Sending email/SMS
- Scraping behind logins
- Storing owner photos as if you own them
- Claiming licensed / bonded / medical diagnosis
- Ranking political anything

## 4. Minimum-possibility slice
Niche picker + city + Search → 6 grounded listings → click one → dossier with services/hours/phone/image URLs/AI verdict + Copy config.js + Copy email.

## 5. Screens
- Search bar: niche, city, Search businesses
- Result list: name, city, phone, score, AI flag
- Dossier: verdict, chips, images, outreach, config.js preview

## 6. Data model
v0 is stateless besides browser memory.
- Request body: `{ nicheId, city, limit }`
- Prospect JSON (see `lib/prompts.js`)
- Derived: `config` object + `configJs` string + `outreach`

No database. Optional later: `data/prospects.json` or a `prospects` table.

## 7. Build sequence
1. Copy `axiom-scout/` 
2. `cp .env.example .env.local` and set `ANTHROPIC_API_KEY`
3. `npm install && npm run dev`
4. Hit Search on Barbershop / Grants Pass, OR
5. Click one row
6. Copy config.js into `rankbotaiapp-byte/<client>/config.js` — do not edit `app.js`

Files:
- `app/page.js` UI
- `app/globals.css` field + halo tokens
- `app/api/search/route.js` niche search
- `app/api/enrich/route.js` one-business extract
- `lib/anthropic.js` Messages API + web_search_20260209 + web_fetch_20260209
- `lib/toConfig.js` maps extract → `window.APP_CONFIG`
- `lib/niches.js` booking niches
- `lib/prompts.js` extract-only instructions

## 8. Acceptance
- FAIL if search runs without a city
- FAIL if config invents a price that was not on a source page (blank is required)
- PASS if a known shop returns name + at least one of phone/website
- PASS if `alreadyHasAi` is true when the site advertises an AI receptionist
- PASS if Copy config.js puts `window.APP_CONFIG` on the clipboard
- PASS if UI stays near-black with teal→cyan→blue halo (no purple)

## 9. Risks
- Anthropic web search is billed per search (~$10 / 1k) plus tokens. Cap `max_uses`.
- Model can still hallucinate a phone. Treat empty as empty; verify before outreach.
- TCPA: do not auto-text scraped mobiles. Copy-only.
- Image URLs are references, not your assets. Don’t commit them as originals.
- `Master-Template` repo 404’d. Clone from a known good client (`shear-skill-barber`) until the template repo exists.
- AI verdict is evidence-based, not a legal or competitive guarantee.

## 10. Next slice
One-click: create `clientname` repo from template, write `config.js`, print the Vercel URL. Still no auto-send.
