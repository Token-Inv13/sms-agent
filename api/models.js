import { json, requireEnv } from "./_lib.js";

export default async function handler(req, res) {
  try {
    const apiKey = requireEnv("XAI_API_KEY");
    const baseUrl = process.env.XAI_BASE_URL || "https://api.x.ai/v1";

    const resp = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) {
      const errTxt = await resp.text();
      return json(res, 500, { error: `Grok API error: ${resp.status} ${errTxt}` });
    }

    const data = await resp.json();
    return json(res, 200, data);
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
