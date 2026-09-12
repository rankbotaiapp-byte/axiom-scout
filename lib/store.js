const ROOT = "axiom-scout:v1";

function readRoot() {
  if (typeof window === "undefined") return { packs: {}, dossiers: {} };
  try {
    const raw = localStorage.getItem(ROOT);
    const data = raw ? JSON.parse(raw) : {};
    return {
      packs: data.packs || {},
      dossiers: data.dossiers || {},
    };
  } catch {
    return { packs: {}, dossiers: {} };
  }
}

function writeRoot(data) {
  try {
    localStorage.setItem(ROOT, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function packKey(nicheId, regionId, city) {
  if (regionId === "custom") return `${nicheId}|city:${String(city || "").trim().toLowerCase()}`;
  return `${nicheId}|${regionId}`;
}

export function dossierKey(p) {
  return `${String(p.businessName || "").trim().toLowerCase()}|${String(p.city || "").trim().toLowerCase()}`;
}

export function savePack(key, pack) {
  const root = readRoot();
  root.packs[key] = { savedAt: new Date().toISOString(), pack };
  writeRoot(root);
  return root.packs[key].savedAt;
}

export function loadPack(key) {
  return readRoot().packs[key] || null;
}

export function saveDossier(key, dossier) {
  const root = readRoot();
  root.dossiers[key] = { savedAt: new Date().toISOString(), dossier };
  writeRoot(root);
}

export function loadDossier(key) {
  return readRoot().dossiers[key] || null;
}

export function listPacks() {
  return Object.entries(readRoot().packs).map(([key, row]) => ({
    key,
    savedAt: row.savedAt,
    nicheId: row.pack?.nicheId,
    nicheLabel: row.pack?.nicheLabel,
    regionLabel: row.pack?.regionLabel || row.pack?.city,
    count: row.pack?.prospects?.length || 0,
  }));
}

export function exportAll() {
  return JSON.stringify(readRoot(), null, 2);
}

export function importAll(json) {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  const root = readRoot();
  root.packs = { ...root.packs, ...(data.packs || {}) };
  root.dossiers = { ...root.dossiers, ...(data.dossiers || {}) };
  writeRoot(root);
}
