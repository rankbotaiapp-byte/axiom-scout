import { NICHES } from "../../../lib/niches";
import { SEARCH_SYSTEM, searchUserPrompt } from "../../../lib/prompts";
import { runScout } from "../../../lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  try {
    const body = await req.json();
    const nicheId = body.nicheId;
    const city = (body.city || process.env.DEFAULT_CITY || "").trim();
    const limit = Math.min(Number(body.limit) || 6, 8);
    const niche = NICHES.find((n) => n.id === nicheId);
    if (!niche) return Response.json({ error: "Pick a niche." }, { status: 400 });
    if (city.length < 3) return Response.json({ error: "Enter a city." }, { status: 400 });

    const result = await runScout(
      SEARCH_SYSTEM,
      searchUserPrompt({ niche, city, limit }),
      { maxTokens: 3500, maxSearch: 5, maxFetch: 2 }
    );

    const prospects = Array.isArray(result.json.prospects) ? result.json.prospects : [];
    return Response.json({
      ok: true,
      nicheId: niche.id,
      nicheLabel: niche.label,
      city,
      prospects,
      usage: result.usage,
      model: result.model,
    });
  } catch (err) {
    return Response.json({ error: err.message || "Search failed" }, { status: 500 });
  }
}
