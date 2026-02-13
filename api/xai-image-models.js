import { json, requireEnv, requireUser } from "./_lib.js";

function normalizeXaiBaseUrl(raw) {
  let baseUrl = raw || "https://api.x.ai";
  baseUrl = baseUrl.replace(/\/+$/, "");
  baseUrl = baseUrl.replace(/\/v1$/, "");
  return baseUrl;
}

async function xaiFetch(path) {
  const key = requireEnv("XAI_API_KEY");
  const rawBaseUrl = process.env.XAI_BASE_URL || "https://api.x.ai";
  const baseUrl = normalizeXaiBaseUrl(rawBaseUrl);
  const resp = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const data = await resp.json().catch(() => ({}));
  return { ok: resp.ok, status: resp.status, data };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { error: "Méthode non autorisée" });

    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const rawBaseUrl = process.env.XAI_BASE_URL || "https://api.x.ai";
    const baseUrl = normalizeXaiBaseUrl(rawBaseUrl);
    const configuredModel = process.env.XAI_IMAGE_MODEL || "grok-imagine-image";

    const imageModelsList = await xaiFetch("/v1/image-generation-models");
    const imageModelSelected = await xaiFetch(`/v1/image-generation-models/${encodeURIComponent(configuredModel)}`);
    const modelsList = await xaiFetch("/v1/models");

    return json(res, 200, {
      rawBaseUrl,
      baseUrl,
      configuredModel,
      imageModelsList,
      imageModelSelected,
      modelsList,
      notes:
        imageModelsList.status === 404
          ? "xAI ne semble pas exposer l'API 'image-generation-models' pour cette clé/compte. C'est généralement un manque d'entitlement/capability côté compte (Imagine API non activée)."
          : null,
    });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
