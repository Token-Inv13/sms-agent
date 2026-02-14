import crypto from "crypto";
import { getSupabaseServiceRole, json, requireEnv } from "../_lib.js";

function base64urlToBuffer(str) {
  const b64 = String(str || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, "base64");
}

function base64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function verifyAndParseState(state, secret) {
  const parts = String(state || "").split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = base64url(crypto.createHmac("sha256", secret).update(payload).digest());
  const a = base64urlToBuffer(sig);
  const b = base64urlToBuffer(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  try {
    const obj = JSON.parse(Buffer.from(base64urlToBuffer(payload)).toString("utf8"));
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

function getBaseUrl(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  const host = String(req.headers.host || "");
  return `${proto}://${host}`;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") return json(res, 405, { error: "Méthode non autorisée" });

    const fullUrl = new URL(req.url, "http://localhost");
    const code = String(fullUrl.searchParams.get("code") || "").trim();
    const state = String(fullUrl.searchParams.get("state") || "").trim();

    if (!code || !state) {
      res.statusCode = 302;
      res.setHeader("Location", "/settings?smartnote=error");
      res.end();
      return;
    }

    const base = String(requireEnv("SMARTNOTE_BASE_URL") || "").trim().replace(/\/+$/, "");
    const secret = String(requireEnv("SMARTNOTE_LINKING_SECRET") || "");

    const parsed = verifyAndParseState(state, secret);
    const uid = parsed?.uid;
    const ts = Number(parsed?.ts || 0);
    if (!uid || !ts) {
      res.statusCode = 302;
      res.setHeader("Location", "/settings?smartnote=error_state");
      res.end();
      return;
    }

    if (Date.now() - ts > 10 * 60 * 1000) {
      res.statusCode = 302;
      res.setHeader("Location", "/settings?smartnote=expired");
      res.end();
      return;
    }

    const exchangeUrl = `${base}/integrations/sms-agent/exchange`;
    const callbackUrl = `${getBaseUrl(req)}/api/smartnote/callback`;

    const resp = await fetch(exchangeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirect_uri: callbackUrl }),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      res.statusCode = 302;
      res.setHeader("Location", "/settings?smartnote=error_exchange");
      res.end();
      return;
    }

    const accessToken = typeof data?.accessToken === "string" ? data.accessToken.trim() : "";
    const scopes = Array.isArray(data?.scopes) ? data.scopes.map((s) => String(s)).slice(0, 20) : [];

    if (!accessToken) {
      res.statusCode = 302;
      res.setHeader("Location", "/settings?smartnote=error_token");
      res.end();
      return;
    }

    const adminSb = getSupabaseServiceRole();
    const { error } = await adminSb.from("smartnote_integrations").upsert(
      {
        user_id: uid,
        access_token: accessToken,
        scopes,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      res.statusCode = 302;
      res.setHeader("Location", "/settings?smartnote=error_db");
      res.end();
      return;
    }

    res.statusCode = 302;
    res.setHeader("Location", "/settings?smartnote=linked");
    res.end();
  } catch (e) {
    res.statusCode = 302;
    res.setHeader("Location", "/settings?smartnote=error");
    res.end();
  }
}
