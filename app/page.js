"use client";

import { useEffect, useMemo, useState } from "react";

function scoreClass(p) {
  const v = p.candidate?.verdict || (p.alreadyHasAi ? "skip" : p.candidate?.score >= 70 ? "prime" : "maybe");
  if (v === "prime" || (p.candidate?.score || 0) >= 70) return "prime";
  if (v === "skip" || p.alreadyHasAi === true) return "skip";
  return "maybe";
}

async function readJson(res) {
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    if (res.status === 504 || /error occurred/i.test(text) || /timeout/i.test(text)) {
      throw new Error("That area timed out. Scout keeps going through the other towns.");
    }
    throw new Error(`Search failed (${res.status}). Try Sweep again.`);
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

function groupByCity(list) {
  const map = new Map();
  for (const p of list || []) {
    const city = p.city || "Unspecified";
    if (!map.has(city)) map.set(city, []);
    map.get(city).push(p);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
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
    if (cityFilter === "skip") return list.filter((p) => scoreClass(p) === "skip");
    return list.filter((p) => (p.city || "") === cityFilter);
  }, [pack, cityFilter]);

  const grouped = useMemo(() => groupByCity(visible), [visible]);
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
        } catch (e) {
          packAcc = {
            ...packAcc,
            errors: [...packAcc.errors, `${job.town}: ${e.message}`],
          };
          setPack({ ...packAcc });
        }
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
    setEnriching(true);
    setError("");
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
      const { ok, data } = await readJson(res);
      if (!ok) throw new Error(data.error || "Enrich failed");
      setDossier(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setEnriching(false);
    }
  }

  async function copy(text) {
    await navigator.clipboard.writeText(text);
  }

  const images = dossier?.prospect?.serviceImages || [];
  const hero = dossier?.prospect?.heroImage?.url;
  const primeCount = (pack?.prospects || []).filter((p) => scoreClass(p) === "prime").length;
  const skipCount = (pack?.prospects || []).filter((p) => scoreClass(p) === "skip").length;

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
            {loading ? (progress || "Sweeping…") : customCity ? "Search city" : "Sweep all shops"}
          </button>
        </div>
        {!customCity && region ? (
          <div className="meta">
            Covers {region.towns?.join(" · ")}
          </div>
        ) : null}
        {progress ? <div className="meta">{progress}</div> : null}
        {error ? <div className="err">{error}</div> : null}
        {pack ? (
          <div className="meta">
            {pack.prospects?.length || 0} shops
            {pack.regionLabel ? ` in ${pack.regionLabel}` : pack.city ? ` in ${pack.city}` : ""}
            {primeCount ? ` · ${primeCount} prime` : ""}
            {skipCount ? ` · ${skipCount} already have AI` : ""}
            {pack.model ? ` · ${pack.model}` : ""}
            {pack.usage ? ` · in ${pack.usage.input_tokens} / out ${pack.usage.output_tokens}` : ""}
          </div>
        ) : null}
        {pack?.errors?.length ? <div className="err">{pack.errors.join(" · ")}</div> : null}
      </div>

      <div className="grid">
        <div className="card list">
          {!pack ? (
            <div className="empty">Pick a niche. Default area is Jackson + Josephine County — Grants Pass, Medford, Ashland, Cave Junction, and every town in between.</div>
          ) : (
            <>
              <div className="chips" style={{ marginTop: 0 }}>
                <button className={`chip ${cityFilter === "all" ? "on" : ""}`} onClick={() => setCityFilter("all")}>All</button>
                <button className={`chip ${cityFilter === "prime" ? "on" : ""}`} onClick={() => setCityFilter("prime")}>Prime</button>
                <button className={`chip ${cityFilter === "skip" ? "on" : ""}`} onClick={() => setCityFilter("skip")}>Already AI</button>
                {cities.map((c) => (
                  <button key={c} className={`chip ${cityFilter === c ? "on" : ""}`} onClick={() => setCityFilter(c)}>{c}</button>
                ))}
              </div>
              {grouped.map(([town, rows]) => (
                <div key={town}>
                  <div className="city-head">{town} · {rows.length}</div>
                  {rows.map((p, i) => (
                    <button
                      key={`${town}-${i}`}
                      className={`row ${selected?.businessName === p.businessName ? "active" : ""}`}
                      onClick={() => enrich(p)}
                    >
                      <span className={`score ${scoreClass(p)}`}>
                        {p.candidate?.score ?? "—"} {p.alreadyHasAi ? "AI" : ""}
                      </span>
                      <h3>{p.businessName}</h3>
                      <p>{[p.county ? `${p.county} Co` : null, p.phone, p.website].filter(Boolean).join(" · ")}</p>
                      <p>{p.candidate?.why || p.oneLiner}</p>
                    </button>
                  ))}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card dossier">
          {!selected && <div className="empty">Click a business to pull services, hours, photos, AI verdict, business.ts, and the owner email.</div>}
          {selected && enriching && <div className="empty">Fetching site + listings for {selected.businessName}…</div>}
          {dossier && !enriching && (
            <>
              <h2>{dossier.prospect.businessName}</h2>
              <div className="sub">{dossier.prospect.candidate?.verdict} · {dossier.prospect.candidate?.why}</div>
              <div className="chips">
                {(dossier.prospect.bookingSignals || []).map((s, i) => <span className="chip" key={`b${i}`}>{s}</span>)}
                {(dossier.prospect.aiSignals || []).map((s, i) => <span className="chip" key={`a${i}`}>{s}</span>)}
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
