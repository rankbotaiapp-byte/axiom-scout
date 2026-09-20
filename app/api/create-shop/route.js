import { slugify } from "../../../lib/toBusiness";

export const runtime = "nodejs";

const OWNER = process.env.GITHUB_OWNER || "rankbotaiapp-byte";
const TEMPLATE = process.env.TEMPLATE_REPO || "axiomHalotemplate";

export async function POST(req) {
  try {
    const body = await req.json();
    const token = process.env.GITHUB_TOKEN;
    const name = slugify(body.name || body.id || "client-shop");
    const businessTs = body.businessTs || "";
    if (!businessTs.includes("export const BUSINESS")) {
      return Response.json({ error: "Click the shop first so Scout can build business.ts." }, { status: 400 });
    }

    const templateUrl = `https://github.com/${OWNER}/${TEMPLATE}/generate`;
    const pastePath = "src/config/business.ts";

    if (!token) {
      return Response.json({
        ok: false,
        needsToken: true,
        repoName: name,
        templateUrl,
        pastePath,
        hint: "Copy business.ts, then Use this template on axiomHalotemplate, name the repo after the shop, paste the file, deploy that repo.",
      });
    }

    const gen = await fetch(`https://api.github.com/repos/${OWNER}/${TEMPLATE}/generate`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        owner: OWNER,
        name,
        private: true,
        include_all_branches: false,
        description: `AXIOM shop: ${body.name || name}`,
      }),
    });
    const genJson = await gen.json();
    if (!gen.ok) {
      const msg = genJson.message || "GitHub would not create the repo";
      const extra = /template/i.test(msg)
        ? " Open axiomHalotemplate → Settings → check Template repository, then try again."
        : "";
      return Response.json({
        ok: false,
        error: msg + extra,
        templateUrl,
        repoName: name,
        pastePath,
      }, { status: 502 });
    }

    let sha = "";
    for (let i = 0; i < 8; i++) {
      await new Promise((r) => setTimeout(r, 800));
      const file = await fetch(`https://api.github.com/repos/${OWNER}/${name}/contents/${pastePath}`, {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      if (file.ok) {
        const j = await file.json();
        sha = j.sha;
        break;
      }
    }
    if (!sha) {
      return Response.json({
        ok: true,
        partial: true,
        repoName: name,
        htmlUrl: genJson.html_url,
        pastePath,
        hint: "Repo created. Paste business.ts into src/config/business.ts yourself.",
      });
    }

    const put = await fetch(`https://api.github.com/repos/${OWNER}/${name}/contents/${pastePath}`, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: `Scout: seed ${body.name || name}`,
        content: Buffer.from(businessTs, "utf8").toString("base64"),
        sha,
        branch: genJson.default_branch || "main",
      }),
    });
    const putJson = await put.json();
    if (!put.ok) {
      return Response.json({
        ok: true,
        partial: true,
        repoName: name,
        htmlUrl: genJson.html_url,
        error: putJson.message,
        hint: "Repo created. Paste business.ts by hand.",
      });
    }

    return Response.json({
      ok: true,
      repoName: name,
      htmlUrl: genJson.html_url,
      pastePath,
    });
  } catch (err) {
    return Response.json({ error: err.message || "Create shop failed" }, { status: 500 });
  }
}
