function slugify(name) {
  return String(name || "business")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "item";
}

function priceCents(v) {
  if (v == null || v === "") return 0;
  const m = String(v).replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return 0;
  return n >= 1000 ? Math.round(n) : Math.round(n * 100);
}

const NICHE_MAP = {
  barber: "barber",
  salon: "barber",
  nails: "barber",
  tattoo: "tattoo",
  spa: "tattoo",
  foodtruck: "food_truck",
  food_truck: "food_truck",
};

const HALO = {
  barber: "ember",
  tattoo: "ink",
  food_truck: "solstice",
};

const DURATION = {
  barber: 40,
  salon: 60,
  tattoo: 90,
  spa: 75,
  nails: 50,
  foodtruck: 30,
  food_truck: 30,
};

function mapNiche(id) {
  return NICHE_MAP[id] || "barber";
}

function js(value, indent = 2) {
  return JSON.stringify(value, null, indent).replace(/"([A-Za-z0-9_]+)":/g, "$1:");
}

function toBusinessPacket(p, opts = {}) {
  const rawNiche = opts.nicheId || "barber";
  const niche = mapNiche(rawNiche);
  const name = p.businessName || "Business";
  const id = slugify(name);
  const city = p.city || opts.city || "";
  const locationName = p.address || city || "";
  const hoursRaw = p.hours || "";
  const duration = DURATION[rawNiche] || DURATION[niche] || 45;
  const kind = niche === "food_truck" ? "menu" : "service";

  const rawServices = Array.isArray(p.services) ? p.services.filter((s) => s && s.name) : [];
  const offerings = rawServices.slice(0, 8).map((s) => ({
    member: 1,
    title: s.name,
    description: s.desc || s.description || "",
    minutes: Number(s.durationMin) || duration,
    cents: priceCents(s.price),
    kind,
  }));

  const team = p.ownerName
    ? [{ name: p.ownerName, role: niche === "tattoo" ? "Artist" : niche === "food_truck" ? "Kitchen" : "Barber", bio: "" }]
    : [];

  const business = {
    active: true,
    id,
    name,
    niche,
    tagline: p.tagline || p.oneLiner || "Book through the night.",
    about: p.about || p.oneLiner || p.tagline || `${name}${city ? ` in ${city}` : ""}.`,
    halo: HALO[niche],
    pin: "4242",
    locationName,
    locationNote: hoursRaw || "",
    heroImage: null,
    team,
    offerings,
    posts: [],
  };

  const photoPlan = [];
  if (p.heroImage?.url) photoPlan.push({ file: "hero (owner upload in Desk)", url: p.heroImage.url, note: "reference only" });
  (p.serviceImages || []).slice(0, 6).forEach((img, i) => {
    photoPlan.push({ file: `work-${i + 1}`, url: img.url, note: img.caption || "work" });
  });

  const header = `/**
 * AXIOM HALO TEMPLATE — Scout packet for ${name}.
 * Paste this file over src/config/business.ts in a clone of
 * https://github.com/rankbotaiapp-byte/axiomHalotemplate
 * Then deploy that clone. Owner photos go in Desk after PIN 4242.
 *
 * Verdict: ${p.candidate?.verdict || "n/a"} · ${p.candidate?.why || ""}
 * Source: ${p.website || ""}
 * Hours as published: ${hoursRaw || "(not found — confirm in Desk)"}
 * Phone (not shown on the public shop until owner opts in): ${p.phone || "(none)"}
 */
`;

  const types = `import type { HaloTheme, Niche } from "@/lib/axiom/types";

`;

  const photoComment =
    photoPlan.length
      ? "\n" + photoPlan.map((x) => `// ${x.file}  <-  ${x.note}${x.url ? `  ${x.url}` : ""}`).join("\n") + "\n\n"
      : "\n";

  const businessTs =
    header + types + photoComment + `export const BUSINESS = ${js(business)} as const;\n`;

  return { business, businessTs, photoPlan, repoName: id };
}

export { slugify, toBusinessPacket, mapNiche };
