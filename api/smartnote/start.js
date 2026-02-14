import crypto from "crypto";
import { json, requireEnv, requireUser } from "../_lib.js";

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signState(payloadObj, secret) {
  const payload = base64url(JSON.stringify(payloadObj));
  const sig = base64url(crypto.createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}

function getBaseUrl(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const host = String(req.headers.host || "");
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { error: "Méthode non autorisée" });

    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { user } = auth;

    const base = String(requireEnv("SMARTNOTE_BASE_URL") || "").trim().replace(/\/+$/, "");
    const secret = String(requireEnv("SMARTNOTE_LINKING_SECRET") || "");

    const now = Date.now();
    const nonce = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : crypto.randomUUID();

    const state = signState({ uid: user.id, ts: now, nonce }, secret);

    const callbackUrl = `${getBaseUrl(req)}/api/smartnote/callback`;

    const clientId = process.env.SMARTNOTE_CLIENT_ID ? String(process.env.SMARTNOTE_CLIENT_ID) : "";
    const authorizeUrl = new URL(`${base}/integrations/sms-agent/authorize`);
    authorizeUrl.searchParams.set("redirect_uri", callbackUrl);
    authorizeUrl.searchParams.set("state", state);
    if (clientId) authorizeUrl.searchParams.set("client_id", clientId);

    return json(res, 200, { url: authorizeUrl.toString() });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
