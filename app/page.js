"use client";

import { useEffect, useMemo, useState } from "react";

function scoreClass(p) {
  const v = p.candidate?.verdict || (p.alreadyHasAi ? "skip" : p.candidate?.score >= 70 ? "prime" : "maybe");
  if (v === "prime" || (p.candidate?.score || 0) >= 70) return "prime";
  if (v === "skip" || p.alreadyHasAi === true) return "skip";
  return "maybe";
}

export default function Page() {
  const [niches, setNiches] = useState([]);
  const [nicheId, setNicheId] = useState("barber");
  const [city, setCity] = useState("Grants Pass, OR");
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [error, setError] = useState("");
  const [pack, setPack] = useState(null);
  const [selected, setSelected] = useState(null);
  const [dossier, setDossier] = useState(null);

  useEffect(() => {
    fetch("/api/niches")
      .then((r) => r.json())
      .then((d) => setNiches(d.niches || []))
      .catch(() => setNiches([]));
  }, []);

  const nicheLabel = useMemo(
    () => niches.find((n) => n.id === nicheId)?.label || nicheId,
    [niches, nicheId]
  );

  async function search() {
    setError("");
    setDossier(null);
    setSelected(null);
    setLoading(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nicheId, city, limit: 6 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setPack(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enrich failed");
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

  return (
    <div className="shell">
      <div className="top">
        <div className="halo" />
        <div>
          <h1>AXIOM SCOUT</h1>
          <div className="sub">Search a booking niche. Copy business.ts into axiom-business-template. Skip if they already have an AI desk.</div>
        </div>
      </div>

      <div className="card">
        <div className="search-row">
          <div>
            <label>Niche</label>
            <select value={nicheId} onChange={(e) => setNicheId(e.target.value)}>
              {niches.map((n) => (
                <option key={n.id} value={n.id}>{n.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label>City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Grants Pass, OR" />
          </div>
          <button className="go" onClick={search} disabled={loading}>
            {loading ? "Searching…" : "Search businesses"}
          </button>
        </div>
        {error ? <div className="err">{error}</div> : null}
        {pack?.usage ? (
          <div className="meta">
            {pack.prospects?.length || 0} listings · {pack.model} · in {pack.usage.input_tokens} / out {pack.usage.output_tokens}
          </div>
        ) : null}
      </div>

      <div className="grid">
        <div className="card list">
          {!pack ? (
            <div className="empty">Pick a niche and city, then search. Results stay on this machine until you copy them.</div>
          ) : (
            (pack.prospects || []).map((p, i) => (
              <button
                key={i}
                className={`row ${selected?.businessName === p.businessName ? "active" : ""}`}
                onClick={() => enrich(p)}
              >
                <span className={`score ${scoreClass(p)}`}>
                  {p.candidate?.score ?? "—"} {p.alreadyHasAi ? "AI" : ""}
                </span>
                <h3>{p.businessName}</h3>
                <p>{[p.city, p.phone, p.website].filter(Boolean).join(" · ")}</p>
                <p>{p.candidate?.why || p.oneLiner}</p>
              </button>
            ))
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
