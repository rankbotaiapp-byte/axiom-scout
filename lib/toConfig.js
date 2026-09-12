function slugify(name) {
  return String(name || "business")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function money(v) {
  if (!v) return "Call";
  const s = String(v).trim();
  if (/^\$|call|quote|varies|free/i.test(s)) return s;
  if (/^\d/.test(s)) return `$${s}`;
  return s;
}

function toAxiomConfig(p, opts = {}) {
  const name = p.businessName || "Business";
  const city = p.city || opts.city || "";
  const phone = p.phone || "";
  const email = p.email || "";
  const services = Array.isArray(p.services) && p.services.length
    ? p.services
    : [{ name: "Primary service", price: "Call", desc: "" }];
  const serviceLine = services
    .map((s) => `${s.name}${s.price ? ` ${money(s.price)}` : ""}`)
    .join("; ");
  const hours = p.hours || "Call for hours";
  const address = p.address || city;
  const tagline = p.tagline || p.oneLiner || "";
  const endpoint = opts.formspree || process.env.FORMSPREE_ENDPOINT || "";

  return {
    meta: {
      mode: "demo",
      leadId: slugify(name),
      demoExpiresAt: opts.demoExpiresAt || "2026-12-31T23:59:59-07:00",
      contactName: p.ownerName || "",
      contactEmail: email,
      sourceUrl: p.website || "",
      scoutScore: p.candidate?.score || null,
    },
    business: {
      name,
      tagline,
      phone,
      email,
      logo: p.logoUrl || "axiommaster3.webp",
    },
    branding: {
      primary: p.primaryColor || "#0E7C7B",
      accent: p.accentColor || "#5EEAD4",
      theme: "ocean",
      neon: { on: true, color: "match", width: 3 },
    },
    modules: {
      hero: true,
      axiomIntro: true,
      bannerStrips: !!(p.serviceImages && p.serviceImages.length),
      services: true,
      about: true,
      contact: true,
      bookingForm: true,
      nav: true,
      stats: false,
      hours: !!p.hours,
      reviews: false,
      gallery: !!(p.serviceImages && p.serviceImages.length >= 3),
      faq: !!(p.commonQs && p.commonQs.length),
    },
    content: {
      hero: {
        banner: (p.heroImage && p.heroImage.url) || "",
        headline: tagline || name,
        subtext: p.about || p.oneLiner || "",
        buttons: [
          { label: "See Prices", icon: "list", link: "#services" },
          { label: "Book", icon: "calendar-check", link: "#book" },
        ],
      },
      axiomIntro: {
        heading: "Meet AXIOM — Your 24/7 Front Desk",
        subtext: `AXIOM is the AI receptionist that never sleeps. It books appointments and answers customers even when ${name} is closed.`,
        points: [
          { icon: "clock", text: "Books appointments 24/7, even after hours" },
          { icon: "calendar-check", text: "Turns missed calls into booked jobs" },
          { icon: "bell", text: "Sends every new booking straight to your phone" },
          { icon: "trending-up", text: "Covers the phone when you are on a job" },
        ],
      },
      bannerStrips: (p.serviceImages || []).slice(0, 2).map((img, i) => ({
        image: img.url,
        headline: img.caption || (i === 0 ? "Real work. Real bookings." : "See the menu."),
        subtext: img.kind || "",
      })),
      services: services.map((s) => ({
        name: s.name,
        price: money(s.price),
        icon: "calendar-check",
        desc: s.desc || "",
      })),
      about: {
        heading: `About ${name}`,
        body: p.about || `${name} ${city ? `in ${city}` : ""}. ${tagline}`.trim(),
      },
      nav: [
        { label: "Prices", icon: "list", link: "#services" },
        { label: "Book", icon: "calendar-check", link: "#book" },
        { label: "Find Us", icon: "map-pin", link: "#contact" },
      ],
    },
    forms: { endpoint },
    demoLeads: [],
    orb: {
      on: true,
      label: "AXIOM",
      teaser: {
        delay: 2500,
        messages: [
          `I'm AXIOM — I book for ${name} 24/7`,
          "Ask me about prices or availability",
          "Book with one tap",
        ],
      },
    },
    reception: {
      greeting: `Welcome to ${name}! I'm AXIOM. Want prices, a booking, or directions?`,
      quickButtons: [
        { label: "See prices", text: "What are your prices?" },
        { label: "Book", text: "How do I book an appointment?" },
        { label: "Where are you?", text: "Where are you located?" },
      ],
      bookingNotify: endpoint,
      knowledge: {
        persona: `You are AXIOM, the friendly AI receptionist for ${name}. Be warm and brief. Help with services (${serviceLine}), booking, hours (${hours}), and location (${address}). Never invent prices, hours, or details you were not given.`,
        address,
        phone,
        hours,
        ordering: p.bookingStyle || "Book ahead or call",
        services: serviceLine,
        prices: serviceLine,
        commonQs: Array.isArray(p.commonQs) ? p.commonQs.map((q) => `${q.q} ${q.a}`).join(" | ") : (p.commonQs || ""),
        doNotDo: p.doNotDo || "",
      },
    },
  };
}

function configToJs(config) {
  return `window.APP_CONFIG = ${JSON.stringify(config, null, 2)};\n`;
}

function outreachEmail(p) {
  const name = p.businessName || "the shop";
  const owner = p.ownerName ? p.ownerName.split(" ")[0] : "there";
  const city = p.city || "town";
  const gap = (p.candidate && p.candidate.why) || "after-hours calls still go to voicemail";
  return {
    subject: `${name} after-hours bookings`,
    body: `${owner} — saw ${name} in ${city}. ${gap}\n\nI stood up a 7-day AXIOM demo on your real services and hours. It answers the phone questions and takes the name / phone / service / time. You get every booking. No contract for the trial window.\n\nI need one thing: the best number to text a live link.\n\nEric · New Era Apps · 541-890-8126`,
    sms: `${name}: 7-day AXIOM demo that books after hours. Link + off-ramp. Eric 541-890-8126`,
  };
}

export { slugify, toAxiomConfig, configToJs, outreachEmail };
