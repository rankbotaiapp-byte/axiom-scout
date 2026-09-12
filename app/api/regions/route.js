import { REGIONS, DEFAULT_REGION } from "../../../lib/regions";

export async function GET() {
  return Response.json({
    defaultId: DEFAULT_REGION,
    regions: REGIONS.map((r) => ({
      id: r.id,
      label: r.label,
      counties: r.counties,
      towns: r.clusters.flatMap((c) => c.towns),
    })),
  });
}
