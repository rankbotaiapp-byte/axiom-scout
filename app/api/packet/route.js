import { toAxiomConfig, configToJs, outreachEmail } from "../../../lib/toConfig";
import { toBusinessPacket } from "../../../lib/toBusiness";

export async function POST(req) {
  try {
    const body = await req.json();
    const prospect = body.prospect || {};
    const name = (prospect.businessName || "").trim();
    if (!name) return Response.json({ error: "businessName required" }, { status: 400 });

    const city = body.city || prospect.city || "";
    const packet = toBusinessPacket(prospect, {
      city,
      nicheId: body.nicheId,
      nicheLabel: body.nicheLabel,
    });
    const config = toAxiomConfig(prospect, { city });
    return Response.json({
      ok: true,
      shallow: true,
      prospect,
      config,
      configJs: configToJs(config),
      business: packet.business,
      businessTs: packet.businessTs,
      photoPlan: packet.photoPlan,
      outreach: outreachEmail(prospect),
    });
  } catch (err) {
    return Response.json({ error: err.message || "Packet failed" }, { status: 500 });
  }
}
