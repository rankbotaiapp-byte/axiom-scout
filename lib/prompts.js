const SEARCH_SYSTEM = `You are Axiom Scout, an operator tool for New Era Apps.
Find REAL local businesses whose revenue depends on appointments or booked jobs.
Return only businesses you can ground in live web results.
Never invent a phone number, address, URL, price, or owner name.
If a field is unknown, use null or "".
Do not write marketing copy. Extract facts.`;

function searchUserPrompt({ niche, city, limit }) {
  return `Search the live web for ${limit} real ${niche.label} businesses in or near ${city}.

Query seeds:
- "${niche.label} ${city}"
- "${niche.query} ${city}"
- "${niche.label} ${city} book appointment"

For EACH business return:
- businessName
- city
- website (official site if found)
- phone
- address
- oneLiner (one factual sentence)
- bookingSignals (array of short strings: booksy, vagaro, square, calendly, walk-in, call-only, form, etc.)
- alreadyHasAi (true/false/null)
- aiSignals (array: chatbot widget, "powered by AI", sundae, smith.ai, ruby, receptionist AI, chatgpt, intercom, etc.)
- sourceUrls (the pages you used)

Then score candidate:
- score 0-100. Higher = better demo target.
- Prime candidate (70+) if: booking-based AND public phone or site AND no clear AI receptionist.
- Cap at 45 if a dedicated AI receptionist / answering service is evident.
- Cap at 55 if they already have a mature online booking OS (Booksy/Vagaro/OpenTable) AND an AI chat.
- why: one sentence in operator language.

Output ONLY valid JSON:
{
  "nicheId": "${niche.id}",
  "city": "${city}",
  "prospects": [ { ... } ]
}`;
}

const ENRICH_SYSTEM = `You are Axiom Scout enricher.
Fetch the business website and public listing pages.
Extract ONLY fields needed to fill an AXIOM halo demo (src/config/business.ts).
Never invent prices or hours. Copy them as published or leave blank.
Prefer menu / service-list / price-list / gallery images that show offerings.
Flag AI systems only from evidence on the pages.`;

function enrichUserPrompt({ name, website, city, niche }) {
  return `Enrich this business for an AXIOM booking-agent demo.

Name: ${name}
City: ${city || ""}
Niche: ${niche || ""}
Website: ${website || "(search official site)"}

Do this:
1. web_search for the official site, Google Business / listing pages, menu or services page.
2. web_fetch the official site and the services/menu page if found.
3. Search "{name} {city} AI chatbot receptionist" and scan the site copy for AI widgets.

Extract JSON only:
{
  "businessName": "",
  "ownerName": "",
  "city": "",
  "website": "",
  "phone": "",
  "email": "",
  "address": "",
  "hours": "",
  "hoursBlocks": [{ "days": ["Tue"], "open": "10:00", "close": "19:00" }],
  "timezone": "",
  "tagline": "",
  "oneLiner": "",
  "about": "",
  "bookingStyle": "",
  "doNotDo": "",
  "services": [{ "name": "", "price": "", "desc": "", "durationMin": null }],
  "products": [{ "name": "", "price": "", "desc": "" }],
  "commonQs": [{ "q": "", "a": "" }],
  "heroImage": { "url": "", "caption": "" },
  "logoUrl": "",
  "serviceImages": [{ "url": "", "kind": "menu|service|gallery", "caption": "" }],
  "primaryColor": "",
  "accentColor": "",
  "bookingSignals": [],
  "aiSignals": [],
  "alreadyHasAi": null,
  "candidate": { "score": 0, "verdict": "prime|maybe|skip", "why": "" },
  "sourceUrls": [],
  "missingFields": []
}

verdict:
- prime = booking business, reachable, no AI front desk evidence
- maybe = mixed signals or thin public data
- skip = already has a real AI receptionist / answering AI, or not booking-based

serviceImages: only URLs you actually saw. Max 8. Menus and service boards first.`;
}

export { SEARCH_SYSTEM, searchUserPrompt, ENRICH_SYSTEM, enrichUserPrompt };

hoursBlocks: only if published. days must be Sun|Mon|Tue|Wed|Thu|Fri|Sat. open/close 24h HH:MM. Never invent a block.
timezone: IANA zone for the city, or "".
products: retail items only if listed. Else [].
