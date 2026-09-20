# Axiom Scout

Find a shop. Click it. Copy `business.ts` into a clone of [axiomHalotemplate](https://github.com/rankbotaiapp-byte/axiomHalotemplate), or use **Make shop repo**.

Not a client site. Not for the shop owner.

## The loop

1. Open Scout (this app).
2. Pick Barber / Tattoo / Food truck. Sweep the town.
3. Click a shop. Skip if it already has an AI desk.
4. **Copy business.ts** — that file is the exact paste for `src/config/business.ts` in the halo template.
5. **Make shop repo**
   - If a GitHub token is on this Vercel project, Scout creates a private repo from axiomHalotemplate and writes the file.
   - If not, it copies the file and opens GitHub’s “use this template” page. You name the repo, create it, paste the file.
6. On Vercel: Import **that new repo**. Deploy. Customer link is the shop. Owner uses `/admin` and PIN `4242`.

Do not put a real client’s name into axiomHalotemplate itself.

## Vercel

1. Import this repo.
2. Add `ANTHROPIC_API_KEY`.
3. Optional, for one-click repos:
   - `GITHUB_TOKEN` — a classic token with `repo` scope
   - `GITHUB_OWNER=rankbotaiapp-byte`
   - `TEMPLATE_REPO=axiomHalotemplate`
4. On axiomHalotemplate → Settings → check **Template repository**. Without that, GitHub will not clone it as a template.

## Local

```
cp .env.example .env.local
npm install
npm run dev
```
