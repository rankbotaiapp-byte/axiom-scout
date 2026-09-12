import { ENRICH_SYSTEM, enrichUserPrompt } from "../../../lib/prompts";
import { runScout } from "../../../lib/anthropic";
import { toAxiomConfig, configToJs, outreachEmail } from "../../../lib/toConfig";
import { toBusinessPacket } from "../../../lib/toBusiness";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req) {
  try {
    const body = await req.json();
    const name = (body.businessName || "").trim();
    if (!name) return Response.json({ error: "businessName required" }, { status: 400 });

    const result = await runScout(
      ENRICH_SYSTEM,
      enrichUserPrompt({
        name,
        website: body.website || "",
        city: body.city || "",
        niche: body.nicheLabel || body.nicheId || "",
      }),
      { maxTokens: 5000, maxSearch: 6, maxFetch: 6 }
    );

    const prospect = result.json;
    const config = toAxiomConfig(prospect, {
      city: body.city,
      formspree: process.env.FORMSPREE_ENDPOINT || "",
    });
    const packet = toBusinessPacket(prospect, {
      city: body.city,
      nicheId: body.nicheId,
      nicheLabel: body.nicheLabel,
    });
    return Response.json({
      ok: true,
      prospect,
      config,
      configJs: configToJs(config),
      business: packet.business,
      businessTs: packet.businessTs,
      photoPlan: packet.photoPlan,
      outreach: outreachEmail(prospect),
      usage: result.usage,
      model: result.model,
    });
  } catch (err) {
    return Response.json({ error: err.message || "Enrich failed" }, { status: 500 });
  }
}
