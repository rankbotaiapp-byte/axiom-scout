"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  packKey,
  dossierKey,
  savePack,
  loadPack,
  saveDossier,
  loadDossier,
  listPacks,
  exportAll,
  importAll,
} from "../lib/store";

function scoreClass(p) {
  const v = p.candidate?.verdict || (p.alreadyHasAi ? "skip" : p.candidate?.score >= 70 ? "prime" : "maybe");
  if (v === "prime" || (p.candidate?.score || 0) >= 70) return "prime";
  if (v === "skip" || p.alreadyHasAi === true) return "skip";
  return "maybe";
}

async function readJson(res, kind = "search") {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    if (res.status === 504 || /error occurred/i.test(text) || /timeout/i.test(text)) {
      throw new Error(
        kind === "enrich"
          ? "Full scrape timed out. Listing packet is ready — copy it, or click the shop again."
          : "That town timed out. Shops already found stay in the library."
      );
    }
    throw new Error(kind === "enrich" ? "Click the shop again." : `Search failed (${res.status}).`);
  }
}

function prospectKey(p) {
  const site = String(p.website || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  if (site && site.length > 4) return `web:${site}`;
  return `name:${String(p.businessName || "").toLowerCase()}|${String(p.city || "").toLowerCase()}`;
}

function mergeProspects(a, b) {
  const seen = new Set((a || []).map(prospectKey));
  const out = [...(a || [])];
  for (const p of b || []) {
    const k = prospectKey(p);
    if (!p?.businessName || seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

function countyOf(p) {
  const c = String(p.county || "").toLowerCase();
  if (c.includes("joseph")) return "Josephine";
  if (c.includes("jackson")) return "Jackson";
  return "Other";
}

function groupByCounty(list) {
  const counties = new Map();
  for (const p of list || []) {
    const co = countyOf(p);
    if (!counties.has(co)) counties.set(co, new Map());
    const cities = counties.get(co);
    const city = p.city || "Unspecified";
    if (!cities.has(city)) cities.set(city, []);
    cities.get(city).push(p);
  }
  return ["Josephine", "Jackson", "Other"]
    .filter((co) => counties.has(co))
    .map((co) => ({
      county: co,
      cities: [...counties.get(co).entries()].sort((a, b) => a[0].localeCompare(b[0])),
    }));
}

export default function Page() {
  const [niches, setNiches] = useState([]);
  const [regions, setRegions] = useState([]);
  const [nicheId, setNicheId] = useState("barber");
  const [regionId, setRegionId] = useState("jackson-josephine");
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState("");
  const [pack, setPack] = useState(null);
  const [selected, setSelected] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [cityFilter, setCityFilter] = useState("all");
  const [savedAt, setSavedAt] = useState(null);
  const [library, setLibrary] = useState([]);
  const fileRef = useRef(null);


  useEffect(() => {
    const key = packKey(nicheId, regionId, city);
    const row = loadPack(key);
    if (row?.pack) {
      setPack(row.pack);
      setSavedAt(row.savedAt);
    } else {
      setPack(null);
      setSavedAt(null);
    }
    setDossier(null);
    setSelected(null);
    setLibrary(listPacks());
  }, [nicheId, regionId]);

  useEffect(() => {
    fetch("/api/niches")
      .then((r) => r.json())
      .then((d) => setNiches(d.niches || []))
      .catch(() => setNiches([]));
    fetch("/api/regions")
      .then((r) => r.json())
      .then((d) => {
        setRegions(d.regions || []);
        if (d.defaultId) setRegionId(d.defaultId);
      })
      .catch(() => setRegions([]));
  }, []);

  const nicheLabel = useMemo(
    () => niches.find((n) => n.id === nicheId)?.label || nicheId,
    [niches, nicheId]
  );
  const region = regions.find((r) => r.id === regionId);
  const customCity = regionId === "custom";

  const visible = useMemo(() => {
    const list = pack?.prospects || [];
    if (cityFilter === "all") return list;
    if (cityFilter === "prime") return list.filter((p) => scoreClass(p) === "prime");
    if (cityFilter === "maybe") return list.filter((p) => scoreClass(p) === "maybe");
    if (cityFilter === "skip") return list.filter((p) => scoreClass(p) === "skip");
    return list.filter((p) => (p.city || "") === cityFilter);
  }, [pack, cityFilter]);

  const grouped = useMemo(() => groupByCounty(visible), [visible]);
  const cities = useMemo(() => {
    const set = new Set((pack?.prospects || []).map((p) => p.city).filter(Boolean));
    return [...set].sort();
  }, [pack]);

  async function search() {
    setError("");
    setDossier(null);
    setSelected(null);
    setCityFilter("all");
    setLoading(true);
    setProgress("");
    try {
      if (customCity) {
        setProgress("Searching city…");
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nicheId, city, limit: 20 }),
        });
        const { ok, data } = await readJson(res);
        if (!ok) throw new Error(data.error || "Search failed");
        setPack(data);
        setSavedAt(savePack(packKey(nicheId, regionId, city), data));
        setLibrary(listPacks());
        return;
      }
      const area = region;
      const jobs = (area?.clusters || []).flatMap((c) =>
        (c.towns || []).map((town) => ({ town, county: c.county, cluster: c.label }))
      );
      if (!jobs.length) throw new Error("Area list still loading — try Sweep again.");
      let packAcc = {
        ok: true,
        mode: "county",
        nicheId,
        nicheLabel,
        regionId: area.id,
        regionLabel: area.label,
        counties: area.counties,
        prospects: [],
        errors: [],
      };
      setPack(packAcc);
      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        setProgress(`Sweeping ${job.town} (${i + 1}/${jobs.length}) · ${packAcc.prospects.length} shops so far`);
        try {
          const res = await fetch("/api/search", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              nicheId,
              regionId: area.id,
              town: job.town,
              county: job.county,
            }),
          });
          const { ok, data } = await readJson(res);
          if (!ok) throw new Error(data.error || "Search failed");
          packAcc = {
            ...packAcc,
            prospects: mergeProspects(packAcc.prospects, data.prospects),
            errors: packAcc.errors,
            model: data.model || packAcc.model,
          };
          setPack({ ...packAcc });
          setSavedAt(savePack(packKey(nicheId, regionId, city), packAcc));
          setLibrary(listPacks());
        } catch (e) {
          packAcc = {
            ...packAcc,
            errors: [...packAcc.errors, `${job.town}: ${e.message}`],
          };
          setPack({ ...packAcc });
        }
      }
      if (packAcc.prospects.length) {
        setSavedAt(savePack(packKey(nicheId, regionId, city), packAcc));
        setLibrary(listPacks());
      }
      if (!packAcc.prospects.length && packAcc.errors.length) {
        throw new Error(packAcc.errors.join(" · "));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  async function enrich(p) {
    setSelected(p);
    setError("");
    const cached = loadDossier(dossierKey(p));
    if (cached?.dossier && !cached.dossier.shallow) {
      setDossier(cached.dossier);
      return;
    }
    setEnriching(true);
    try {
      const stubRes = await fetch("/api/packet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prospect: p, city: p.city || city, nicheId, nicheLabel }),
      });
      const stub = await readJson(stubRes, "enrich");
      if (stub.ok) setDossier(stub.data);
    } catch {
      /* listing packet is best-effort */
    }
    try {
      const res = await fetch("/api/enrich", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          businessName: p.businessName,
          website: p.website,
          city: p.city || city,
          nicheId,
          nicheLabel,
        }),
      });
      const { ok, data } = await readJson(res, "enrich");
      if (!ok) throw new Error(data.error || "Enrich failed");
      setDossier(data);
      saveDossier(dossierKey(p), data);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnriching(false);
    }
  }

  async function copy(text) {
    await navigator.clipboard.writeText(text);
  }

  function downloadLibrary() {
    const blob = new Blob([exportAll()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `axiom-scout-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function onImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    importAll(await file.text());
    const row = loadPack(packKey(nicheId, regionId, city));
    if (row?.pack) {
      setPack(row.pack);
      setSavedAt(row.savedAt);
    }
    setLibrary(listPacks());
    e.target.value = "";
  }

  const images = dossier?.prospect?.serviceImages || [];
  const hero = dossier?.prospect?.heroImage?.url;
  const primeCount = (pack?.prospects || []).filter((p) => scoreClass(p) === "prime").length;
  const maybeCount = (pack?.prospects || []).filter((p) => scoreClass(p) === "maybe").length;
  const skipCount = (pack?.prospects || []).filter((p) => scoreClass(p) === "skip").length;
  const josephineCount = (pack?.prospects || []).filter((p) => countyOf(p) === "Josephine").length;
  const jacksonCount = (pack?.prospects || []).filter((p) => countyOf(p) === "Jackson").length;

  return (
    <div className="shell">
      <div className="top">
        <div className="halo" />
        <div>
          <h1>AXIOM SCOUT</h1>
          <div className="sub">
            Sweep Jackson and Josephine County. Copy business.ts into the halo template. Skip shops that already have an AI desk.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="search-row">
          <div>
            <label>Niche</label>
            <select value={nicheId} onChange={(e) => setNicheId(e.target.value)} disabled={loading}>
              {niches.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Area</label>
            <select value={regionId} onChange={(e) => setRegionId(e.target.value)} disabled={loading}>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
              <option value="custom">Custom city…</option>
            </select>
          </div>
          {customCity ? (
            <div>
              <label>City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Medford, OR" />
            </div>
          ) : null}
          <button className="go" onClick={search} disabled={loading}>
            {loading ? (progress || "Sweeping…") : pack?.prospects?.length ? "Refresh sweep" : customCity ? "Search city" : "Sweep all shops"}
          </button>
        </div>
        {!customCity && region ? (
          <div className="meta">
            Covers {region.towns?.join(" · ")}
          </div>
        ) : null}
        {savedAt ? (
          <div className="banner saved">
            Saved {new Date(savedAt).toLocaleString()} · {pack?.prospects?.length || 0} shops in this browser. Click a shop — no need to sweep again.
          </div>
        ) : null}
        <div className="actions" style={{ marginTop: 10 }}>
          <button className="ghost" onClick={downloadLibrary} type="button">Download library</button>
          <button className="ghost" type="button" onClick={() => fileRef.current?.click()}>Import JSON</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={onImport} />
        </div>
        {library.length ? (
          <div className="chips">
            {library.map((row) => (
              <span className="chip book" key={row.key}>
                {row.nicheLabel || row.nicheId} · {row.regionLabel || "area"} · {row.count}
              </span>
            ))}
          </div>
        ) : null}
        <div className="legend">
          <span className="key prime">Teal · Prime (build this)</span>
          <span className="key maybe">Gold · Maybe</span>
          <span className="key skip">Coral · Already has AI (skip)</span>
          <span className="key josephine">Mint · Josephine Co</span>
          <span className="key jackson">Blue · Jackson Co</span>
        </div>
        {progress ? <div className="banner progress">{progress}</div> : null}
        {error ? <div className="banner err">{error}</div> : null}
        {pack ? (
          <div className="stats">
            <span className="stat">{pack.prospects?.length || 0} shops</span>
            {josephineCount ? <span className="stat josephine">{josephineCount} Josephine</span> : null}
            {jacksonCount ? <span className="stat jackson">{jacksonCount} Jackson</span> : null}
            {primeCount ? <span className="stat prime">{primeCount} prime</span> : null}
            {maybeCount ? <span className="stat maybe">{maybeCount} maybe</span> : null}
            {skipCount ? <span className="stat skip">{skipCount} skip</span> : null}
          </div>
        ) : null}
        {pack?.errors?.length ? (
          <div className="banner err">{pack.errors.length} towns missed · {pack.errors[pack.errors.length - 1]}</div>
        ) : null}
      </div>

      <div className="grid">
        <div className="card list">
          {!pack ? (
            <div className="empty">Pick a niche. Default area is Jackson + Josephine County — Grants Pass, Medford, Ashland, Cave Junction, and every town in between.</div>
          ) : (
            <>
              <div className="chips" style={{ marginTop: 0 }}>
                <button className={`chip ${cityFilter === "all" ? "on" : ""}`} onClick={() => setCityFilter("all")}>All</button>
                <button className={`chip prime ${cityFilter === "prime" ? "on" : ""}`} onClick={() => setCityFilter("prime")}>Prime</button>
                <button className={`chip maybe ${cityFilter === "maybe" ? "on" : ""}`} onClick={() => setCityFilter("maybe")}>Maybe</button>
                <button className={`chip skip ${cityFilter === "skip" ? "on" : ""}`} onClick={() => setCityFilter("skip")}>Already AI</button>
                {cities.map((c) => (
                  <button key={c} className={`chip ${cityFilter === c ? "on" : ""}`} onClick={() => setCityFilter(c)}>{c}</button>
                ))}
              </div>
              {grouped.map((block) => (
                <div key={block.county} className={`county-block ${block.county.toLowerCase()}`}>
                  <div className={`county-head ${block.county.toLowerCase()}`}>{block.county} County</div>
                  {block.cities.map(([town, rows]) => (
                    <div key={town}>
                      <div className="city-head">{town} · {rows.length}</div>
                      {rows.map((p, i) => (
                        <button
                          key={`${town}-${i}`}
                          className={`row ${scoreClass(p)} ${selected?.businessName === p.businessName ? "active" : ""}`}
                          onClick={() => enrich(p)}
                        >
                          <span className={`score ${scoreClass(p)}`}>
                            {scoreClass(p) === "prime" ? "PRIME" : scoreClass(p) === "skip" ? "SKIP" : "MAYBE"} {p.candidate?.score ?? ""}
                          </span>
                          <h3>{p.businessName}</h3>
                          <p>{[p.phone, p.website].filter(Boolean).join(" · ")}</p>
                          <p>{p.candidate?.why || p.oneLiner}</p>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card dossier">
          {!selected && <div className="empty">Click a business to pull services, hours, photos, AI verdict, business.ts, and the owner email.</div>}
          {selected && enriching && !dossier && <div className="empty">Fetching site + listings for {selected.businessName}…</div>}
          {dossier && (
            <>
              <h2>{dossier.prospect.businessName}</h2>
              {enriching ? <div className="banner progress">Scraping the live site for hours and prices…</div> : null}
              {dossier.shallow && !enriching ? (
                <div className="banner maybe">Listing packet — hours/prices may be thin. Click the shop again for a full scrape.</div>
              ) : null}
              <div className={`banner ${scoreClass(dossier.prospect)}`}>
                {scoreClass(dossier.prospect) === "prime" ? "PRIME — build a demo" : scoreClass(dossier.prospect) === "skip" ? "SKIP — already has AI" : "MAYBE — thin data or mixed signals"}
                {dossier.prospect.candidate?.why ? ` · ${dossier.prospect.candidate.why}` : ""}
              </div>
              <div className="chips">
                {(dossier.prospect.bookingSignals || []).map((s, i) => <span className="chip book" key={`b${i}`}>{s}</span>)}
                {(dossier.prospect.aiSignals || []).map((s, i) => <span className="chip skip" key={`a${i}`}>{s}</span>)}
              </div>
              <p className="sub">
                {dossier.prospect.phone || "no phone"} · {dossier.prospect.address || dossier.prospect.city || ""}
              </p>
              <p className="sub" style={{ marginTop: 6 }}>{dossier.prospect.hours || "hours unknown"}</p>

              {(hero || images.length) ? (
                <div className="imgs">
                  {hero ? <img src={hero} alt="hero" /> : null}
                  {images.map((img, i) => (
                    <img key={i} src={img.url} alt={img.caption || img.kind || "asset"} title={img.caption} />
                  ))}
                </div>
              ) : <p className="sub" style={{ margin: "10px 0" }}>No public menu/service images found.</p>}

              {(dossier.prospect.alreadyHasAi || dossier.prospect.candidate?.verdict === "skip") ? (
                <div className="err" style={{ margin: "12px 0" }}>
                  Skip this shop — they already have an AI front desk. Do not build a demo.
                </div>
              ) : null}
              <div className="actions">
                <button className="go" onClick={() => copy(dossier.businessTs)}>Copy business.ts</button>
                <button className="ghost" onClick={() => copy(dossier.outreach.body)}>Copy email</button>
                <button className="ghost" onClick={() => copy(dossier.outreach.sms)}>Copy SMS</button>
                <button className="ghost" onClick={() => copy(dossier.configJs)}>Copy legacy config.js</button>
              </div>
              <p className="sub" style={{ marginBottom: 8 }}>{dossier.outreach.subject}</p>
              <pre>{dossier.outreach.body}</pre>
              <p className="sub" style={{ margin: "12px 0 6px" }}>
                Paste over src/config/business.ts in a clone of axiom-business-template. Drop photos into public/business/.
              </p>
              <pre>{dossier.businessTs}</pre>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
