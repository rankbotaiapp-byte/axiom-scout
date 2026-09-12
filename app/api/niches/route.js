import { NICHES } from "../../../lib/niches";

export async function GET() {
  return Response.json({ niches: NICHES });
}
