function extractJson(text) {
  if (!text) throw new Error("Empty model text");
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fence ? fence[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON object in model output");
  return JSON.parse(raw.slice(start, end + 1));
}

function collectText(content) {
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text)
    .join("\n");
}

export async function runScout(system, user, {
  maxTokens = 4096,
  maxSearch = 6,
  maxFetch = 6,
  model: modelOverride,
} = {}) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.includes("REPLACE")) {
    throw new Error("Set ANTHROPIC_API_KEY in .env.local");
  }
  const model =
    modelOverride ||
    process.env.ANTHROPIC_SEARCH_MODEL ||
    process.env.ANTHROPIC_MODEL ||
    "claude-sonnet-4-6";
  const version = process.env.ANTHROPIC_VERSION || "2023-06-01";

  const tools = [];
  if (maxSearch > 0) {
    tools.push({ type: "web_search_20260209", name: "web_search", max_uses: maxSearch, allowed_callers: ["direct"] });
  }
  if (maxFetch > 0) {
    tools.push({ type: "web_fetch_20260209", name: "web_fetch", max_uses: maxFetch, allowed_callers: ["direct"] });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": version,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      tools,
      messages: [{ role: "user", content: user }],
    }),
  });

  const body = await res.text();
  if (!res.ok) {
    let msg = body.slice(0, 180);
    try {
      const j = JSON.parse(body);
      msg = j.error?.error?.message || j.error?.message || j.message || msg;
    } catch {}
    throw new Error(msg);
  }
  const data = JSON.parse(body);
  const text = collectText(data.content);
  const json = extractJson(text);
  return {
    json,
    model,
    usage: data.usage || null,
    stop_reason: data.stop_reason,
  };
}
