import { NICHES } from "../../../lib/niches";
import { SEARCH_SYSTEM, searchUserPrompt, townSearchPrompt } from "../../../lib/prompts";
import { runScout } from "../../../lib/anthropic";
import { getRegion, allTowns } from "../../../lib/regions";

export const runtime = "nodejs";
export const maxDuration = 60;

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function prospectKey(p) {
  const site = String(p.website || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  if (site && site.length > 4) return `web:${site}`;
  return `name:${norm(p.businessName)}|${norm(p.city)}`;
}

function mergeUsage(parts) {
  const usage = { input_tokens: 0, output_tokens: 0 };
  for (const u of parts) {
    if (!u) continue;
    usage.input_tokens += u.input_tokens || 0;
    usage.output_tokens += u.output_tokens || 0;
  }
  return usage;
}

function sortProspects(list) {
  return list.slice().sort((a, b) => {
    const sa = a.alreadyHasAi ? -1 : a.candidate?.score || 0;
    const sb = b.alreadyHasAi ? -1 : b.candidate?.score || 0;
    if (sb !== sa) return sb - sa;
    return String(a.city || "").localeCompare(String(b.city || ""));
  });
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const p of list) {
    if (!p || !p.businessName) continue;
    const k = prospectKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

async function sweepRegion(niche, region) {
  const results = await Promise.allSettled(
    region.clusters.map((cluster) =>
      runScout(SEARCH_SYSTEM, countySweepPrompt({ niche, cluster, limit: 25 }), {
        maxTokens: 6000,
        maxSearch: 6,
        maxFetch: 3,
      }).then((result) => ({ cluster, result }))
    )
  );

  const prospects = [];
  const clusters = [];
  const usages = [];
  let model = "";
  const errors = [];

  for (const item of results) {
    if (item.status !== "fulfilled") {
      errors.push(item.reason?.message || "cluster failed");
      continue;
    }
    const { cluster, result } = item.value;
    model = result.model || model;
    usages.push(result.usage);
    const found = Array.isArray(result.json.prospects) ? result.json.prospects : [];
    for (const p of found) {
      if (!p.county) p.county = cluster.county;
      if (!p.clusterId) p.clusterId = cluster.id;
      prospects.push(p);
    }
    clusters.push({
      id: cluster.id,
      label: cluster.label,
      county: cluster.county,
      count: found.length,
    });
  }

  return {
    prospects: sortProspects(dedupe(prospects)),
    clusters,
    usage: mergeUsage(usages),
    model,
    errors,
    towns: allTowns(region),
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    const nicheId = body.nicheId;
    const niche = NICHES.find((n) => n.id === nicheId);
    if (!niche) return Response.json({ error: "Pick a niche." }, { status: 400 });

    const regionId = body.regionId || "";
    const region = regionId ? getRegion(regionId) : null;

    const town = (body.town || "").trim();
    if (region && town) {
      const cluster = region.clusters.find((c) =>
        c.towns.some((t) => t.toLowerCase() === town.toLowerCase())
      );
      const county = body.county || cluster?.county || region.counties[0];
      const result = await runScout(
        SEARCH_SYSTEM,
        townSearchPrompt({ niche, town, county, limit: 12 }),
        {
          maxTokens: 1800,
          maxSearch: 1,
          maxFetch: 0,
          model: process.env.ANTHROPIC_SEARCH_MODEL || "claude-haiku-4-5",
        }
      );
      const found = Array.isArray(result.json.prospects) ? result.json.prospects : [];
      for (const p of found) {
        if (!p.city) p.city = town;
        if (!p.county) p.county = county;
      }
      return Response.json({
        ok: true,
        mode: "town",
        nicheId: niche.id,
        nicheLabel: niche.label,
        regionId: region.id,
        regionLabel: region.label,
        town,
        county,
        prospects: sortProspects(dedupe(found)),
        usage: result.usage,
        model: result.model,
      });
    }

    const city = (body.city || process.env.DEFAULT_CITY || "").trim();
    const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 40);
    if (city.length < 3) return Response.json({ error: "Pick a county area or enter a city." }, { status: 400 });

    const result = await runScout(
      SEARCH_SYSTEM,
      searchUserPrompt({ niche, city, limit }),
      { maxTokens: 1800, maxSearch: 1, maxFetch: 0, model: process.env.ANTHROPIC_SEARCH_MODEL || "claude-haiku-4-5" }
    );
    const prospects = sortProspects(
      dedupe(Array.isArray(result.json.prospects) ? result.json.prospects : [])
    );
    return Response.json({
      ok: true,
      mode: "city",
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
