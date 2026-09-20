"use client";

import { useState } from "react";

export default function ShopActions({ dossier }) {
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  async function copy(text, label) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2500);
  }

  async function createShop() {
    if (!dossier?.businessTs) {
      setError("Click the shop first so Scout can build the file.");
      return;
    }
    setCreating(true);
    setError("");
    setCreated(null);
    try {
      const res = await fetch("/api/create-shop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: dossier.prospect.businessName,
          id: dossier.business?.id,
          businessTs: dossier.businessTs,
        }),
      });
      const data = await res.json();
      if (data.needsToken || (data.ok === false && data.templateUrl)) {
        await navigator.clipboard.writeText(dossier.businessTs);
        setCopied("business.ts copied");
        setCreated(data);
        if (data.templateUrl) window.open(data.templateUrl, "_blank");
        return;
      }
      if (!res.ok || (data.error && !data.htmlUrl)) {
        throw new Error(data.error || "Could not make the shop repo");
      }
      setCreated(data);
      if (data.htmlUrl) window.open(data.htmlUrl, "_blank");
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  if (!dossier?.prospect) return null;

  return (
    <>
      <div className="actions">
        <button className="go" type="button" onClick={() => copy(dossier.businessTs, "business.ts copied")}>
          Copy business.ts
        </button>
        <button className="go" type="button" onClick={createShop} disabled={creating}>
          {creating ? "Making shop repo…" : "Make shop repo"}
        </button>
        <button className="ghost" type="button" onClick={() => copy(dossier.outreach?.body || "", "email copied")}>
          Copy email
        </button>
        <button className="ghost" type="button" onClick={() => copy(dossier.outreach?.sms || "", "SMS copied")}>
          Copy SMS
        </button>
      </div>
      {copied ? <div className="banner saved">{copied}</div> : null}
      {error ? <div className="banner err">{error}</div> : null}
      {created?.htmlUrl ? (
        <div className="banner saved">
          Shop repo ready — <a href={created.htmlUrl} target="_blank" rel="noreferrer">{created.repoName}</a>. Connect that repo on Vercel.
        </div>
      ) : null}
      {created?.templateUrl && !created.htmlUrl ? (
        <div className="banner maybe">
          business.ts is on your clipboard. Name the new repo after the shop, create it, paste over src/config/business.ts, deploy that repo.{" "}
          <a href={created.templateUrl} target="_blank" rel="noreferrer">Open template</a>
        </div>
      ) : null}
    </>
  );
}
