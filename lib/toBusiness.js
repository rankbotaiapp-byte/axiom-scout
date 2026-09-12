function slugify(name) {
  return String(name || "business")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "item";
}

function priceNum(v) {
  if (v == null || v === "") return 0;
  const m = String(v).replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  return m ? Math.round(Number(m[1])) : 0;
}

function guessTimezone(city) {
  const s = String(city || "").toLowerCase();
  if (/hawaii|honolulu|maui/.test(s)) return "Pacific/Honolulu";
  if (/alaska|anchorage/.test(s)) return "America/Anchorage";
  if (/\baz\b|arizona|phoenix/.test(s)) return "America/Phoenix";
  if (/mountain|denver|utah|colorado|montana|wyoming|idaho|new mexico/.test(s)) return "America/Denver";
  if (/chicago|dallas|houston|austin|texas|illinois|minnesota|wisconsin|missouri/.test(s)) return "America/Chicago";
  if (/new york|boston|miami|atlanta|florida|georgia|carolina|virginia|pennsylvania/.test(s)) return "America/New_York";
  return "America/Los_Angeles";
}

const DURATION = {
  barber: 40,
  salon: 60,
  tattoo: 90,
  spa: 75,
  nails: 50,
  auto: 60,
  detail: 90,
  hvac: 60,
  plumber: 60,
  electric: 60,
  lawn: 90,
  photo: 90,
  fitness: 55,
  vet: 30,
  dental: 45,
  foodtruck: 30,
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_ALIAS = {
  sun: "Sun", sunday: "Sun",
  mon: "Mon", monday: "Mon",
  tue: "Tue", tues: "Tue", tuesday: "Tue",
  wed: "Wed", wednesday: "Wed",
  thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu",
  fri: "Fri", friday: "Fri",
  sat: "Sat", saturday: "Sat",
};

function to24(token) {
  const t = String(token).trim().toLowerCase().replace(/\s+/g, "");
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] || "00";
  const ap = m[3];
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (!ap && h <= 7) h += 12;
  return `${String(h).padStart(2, "0")}:${min}`;
}

function expandDays(a, b) {
  const ia = DAYS.indexOf(a);
  const ib = DAYS.indexOf(b);
  if (ia < 0 || ib < 0) return [a];
  const out = [];
  let i = ia;
  while (true) {
    out.push(DAYS[i]);
    if (i === ib) break;
    i = (i + 1) % 7;
    if (out.length > 7) break;
  }
  return out;
}

function parseHours(raw, blocks) {
  if (Array.isArray(blocks) && blocks.length) {
    return blocks
      .map((b) => ({
        days: (b.days || []).filter((d) => DAYS.includes(d)),
        open: to24(b.open) || b.open,
        close: to24(b.close) || b.close,
      }))
      .filter((b) => b.days.length && b.open && b.close);
  }
  const text = String(raw || "");
  const found = [];
  const re =
    /\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b(?:\s*[-–to]+\s*(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday))?[^0-9]{0,12}(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/gi;
  let m;
  while ((m = re.exec(text))) {
    const a = DAY_ALIAS[m[1].toLowerCase()];
    const b = m[2] ? DAY_ALIAS[m[2].toLowerCase()] : a;
    const open = to24(m[3]);
    const close = to24(m[4]);
    if (!a || !open || !close) continue;
    found.push({ days: expandDays(a, b), open, close });
  }
  return found;
}

function js(value, indent = 2) {
  return JSON.stringify(value, null, indent).replace(/"([A-Za-z0-9_]+)":/g, "$1:");
}

function toBusinessPacket(p, opts = {}) {
  const nicheId = opts.nicheId || "barber";
  const kind = opts.nicheLabel || "Shop";
  const name = p.businessName || "Business";
  const city = p.city || opts.city || "";
  const location = p.address || city;
  const timezone = p.timezone || guessTimezone(city);
  const hours = parseHours(p.hours, p.hoursBlocks);
  const duration = DURATION[nicheId] || 45;

  const rawServices = Array.isArray(p.services) ? p.services.filter((s) => s && s.name) : [];
  const services = rawServices.slice(0, 8).map((s, i) => {
    const id = slugify(s.name);
    return {
      id: id || `service-${i + 1}`,
      name: s.name,
      tag: s.tag || s.name.split(" ")[0] || kind,
      price: priceNum(s.price),
      durationMin: Number(s.durationMin) || duration,
      image: `/business/service-${id || i + 1}.jpg`,
      description: s.desc || s.description || "",
    };
  });

  const rawProducts = Array.isArray(p.products) ? p.products.filter((x) => x && x.name) : [];
  const products = rawProducts.slice(0, 6).map((s, i) => {
    const id = slugify(s.name);
    return {
      id: id || `product-${i + 1}`,
      name: s.name,
      tag: s.tag || "Retail",
      price: priceNum(s.price),
      image: `/business/product-${id || i + 1}.jpg`,
      description: s.desc || s.description || "",
    };
  });

  const prompts = Array.isArray(p.commonQs) && p.commonQs.length
    ? p.commonQs.slice(0, 3).map((q) => q.q || q).filter(Boolean)
    : ["Do you take walk-ins?", "What do you charge?", "Are you open Saturday?"];

  const photoPlan = [];
  if (p.heroImage?.url) photoPlan.push({ file: "hero.jpg", url: p.heroImage.url, note: p.heroImage.caption || "hero" });
  services.forEach((s, i) => {
    const src = (p.serviceImages && p.serviceImages[i] && p.serviceImages[i].url) || "";
    photoPlan.push({ file: s.image.replace("/business/", ""), url: src, note: s.name });
  });
  products.forEach((s, i) => {
    const src = (p.productImages && p.productImages[i] && p.productImages[i].url) || "";
    photoPlan.push({ file: s.image.replace("/business/", ""), url: src, note: s.name });
  });

  const story = p.about || p.oneLiner || p.tagline || "";
  const hoursRaw = p.hours || "";
  const walkins = p.bookingStyle || "Book ahead. Walk-ins when a chair opens.";

  const business = {
    name,
    kind,
    location,
    timezone,
    tagline: p.tagline || p.oneLiner || name,
    story,
    heroImage: "/business/hero.jpg",
    phone: p.phone || "",
    email: p.email || "",
    bookingIntervalMin: 30,
    hours,
    afterHoursLabel: "After hours",
    afterHoursNote: hoursRaw
      ? `Published hours: ${hoursRaw}. The desk still answers when the shop is closed.`
      : "After close, the desk still answers.",
    walkins,
    policies: [p.doNotDo, "Confirm prices on the chair if a number was not published."]
      .filter(Boolean)
      .slice(0, 4),
    services,
    products,
    prompts,
    axiomName: "Axiom",
    axiomVoice:
      "You are the desk at this shop. Short, warm, exact. Never invent a price, hour, or policy that is not listed. If they want a chair, point them to Book now.",
  };

  const header = `/**
 * AXIOM BUSINESS TEMPLATE — Scout packet for ${name}.
 * Paste this file over src/config/business.ts in a clone of axiom-business-template.
 *
 * Verdict: ${p.candidate?.verdict || "n/a"} · ${p.candidate?.why || ""}
 * Source: ${p.website || ""}
 * Hours as published: ${hoursRaw || "(not found — confirm before walk-in)"}
 *
 * Photos: drop shop/service images into public/business/ using the names below.
 * Do not commit scraped photos as if you own them — retake or generate.
 */
`;

  const types = `export type Weekday = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

export type Service = {
  id: string;
  name: string;
  tag: string;
  price: number;
  durationMin: number;
  image: string;
  description: string;
};

export type Product = {
  id: string;
  name: string;
  tag: string;
  price: number;
  image: string;
  description: string;
};

export type HourBlock = {
  days: Weekday[];
  open: string;
  close: string;
};

export type Business = {
  name: string;
  kind: string;
  location: string;
  timezone: string;
  tagline: string;
  story: string;
  heroImage: string;
  phone: string;
  email: string;
  bookingIntervalMin: number;
  hours: HourBlock[];
  afterHoursLabel: string;
  afterHoursNote: string;
  walkins: string;
  policies: string[];
  services: Service[];
  products: Product[];
  prompts: string[];
  axiomName: string;
  axiomVoice: string;
};

`;

  const photoComment =
    "\n" +
    photoPlan
      .map((x) => `// ${x.file}  <-  ${x.note}${x.url ? `  ${x.url}` : "  (need a photo)"}`)
      .join("\n") +
    "\n\n";

  const businessTs =
    header + types + photoComment + `export const business: Business = ${js(business)};\n`;

  return { business, businessTs, photoPlan };
}

export { slugify, toBusinessPacket, parseHours, guessTimezone };
