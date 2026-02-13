import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function readRawBody(req) {
  if (req.body) {
    if (Buffer.isBuffer(req.body)) return req.body;
    if (typeof req.body === "string") return Buffer.from(req.body, "utf8");
    if (typeof req.body === "object") return Buffer.from(JSON.stringify(req.body), "utf8");
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export function getBearerToken(req) {
  const h = req.headers?.authorization || req.headers?.Authorization;
  if (!h || typeof h !== "string") return null;
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} manquant`);
  return v;
}

export function getSupabaseAdmin() {
  const url = requireEnv("SUPABASE_URL");
  const anon = requireEnv("SUPABASE_ANON_KEY");
  return createClient(url, anon);
}

export function getSupabaseServiceRole() {
  const url = requireEnv("SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getStripeClient() {
  const key = requireEnv("STRIPE_SECRET_KEY");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

export async function ensureProfileRow(adminSb, userId) {
  const { data, error } = await adminSb.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data;
  const { data: created, error: insErr } = await adminSb
    .from("profiles")
    .insert({ user_id: userId })
    .select("*")
    .maybeSingle();
  if (insErr) throw new Error(insErr.message);
  return created;
}

export function isProEntitled(profile) {
  const status = String(profile?.subscription_status || "none").toLowerCase();
  if (status === "active" || status === "trialing") return true;
  const plan = String(profile?.plan || "free").toLowerCase();
  return plan === "pro";
}

export async function enforceDailyQuotaOrThrow(adminSb, userId, { dailyLimit }) {
  const today = new Date();
  const day = today.toISOString().slice(0, 10);
  const { data: prof, error: profErr } = await adminSb
    .from("profiles")
    .select("plan, subscription_status, trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (profErr) throw new Error(profErr.message);

  const profile = prof || (await ensureProfileRow(adminSb, userId));
  if (isProEntitled(profile)) return { ok: true, plan: "pro", remaining: null, used: null };

  const { data: usedCount, error: rpcErr } = await adminSb.rpc("check_and_increment_usage_daily", {
    p_user_id: userId,
    p_day: day,
    p_limit: Number(dailyLimit || 0),
  });
  if (rpcErr) throw new Error(rpcErr.message);

  const used = Number(usedCount || 0);
  if (Number.isFinite(used) && used > Number(dailyLimit || 0)) {
    const remaining = Math.max(0, Number(dailyLimit || 0) - (used - 1));
    const err = new Error("Quota quotidien atteint");
    err.code = "PAYWALL";
    err.dailyLimit = Number(dailyLimit || 0);
    err.used = used - 1;
    err.remaining = remaining;
    throw err;
  }

  return { ok: true, plan: "free", remaining: Math.max(0, Number(dailyLimit || 0) - used), used };
}

export async function requireUser(req) {
  const token = getBearerToken(req);
  if (!token) return { error: "Non autorisé" };

  const url = requireEnv("SUPABASE_URL");
  const anon = requireEnv("SUPABASE_ANON_KEY");
  const sb = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) return { error: "Non autorisé" };
  return { sb, user: data.user, token };
}

export function sanitizeConfig(input) {
  const cfg = {
    contactName: "Assistant",
    persona: "friend",
    gender: "neutral",
    context: "",
    sourcesEnabled: false,
  };

  if (input && typeof input === "object") {
    if (typeof input.contactName === "string") cfg.contactName = input.contactName.slice(0, 60).trim() || cfg.contactName;
    if (typeof input.persona === "string") cfg.persona = input.persona;
    if (typeof input.gender === "string") cfg.gender = input.gender;
    if (typeof input.context === "string") cfg.context = input.context.slice(0, 2000).trim();
    if (typeof input.sourcesEnabled === "boolean") cfg.sourcesEnabled = input.sourcesEnabled;
  }

  const allowedPersonas = new Set(["friend", "employer", "partner", "customer_support", "custom"]);
  if (!allowedPersonas.has(cfg.persona)) cfg.persona = "friend";

  const allowedGenders = new Set(["neutral", "female", "male"]);
  if (!allowedGenders.has(cfg.gender)) cfg.gender = "neutral";

  return cfg;
}

export function looksLikeRealtimeRequest(text) {
  const t = String(text || "").toLowerCase();
  if (!t.trim()) return false;
  const patterns = [
    /\b(aujourd['’]hui|hier|demain|maintenant|en ce moment|cette semaine|ce mois-ci)\b/i,
    /\b(actu|actualité|news|derni(è|e)res? nouvelles?)\b/i,
    /\b(prix|cours|cotations?|crypto|bitcoin|btc|ethereum|eth)\b/i,
    /\b(météo|temp(é|e)rature|pluie|neige|vent)\b/i,
    /\b(élection|sondage|résultat)s?\b/i,
    /\b(score|match|résultat du match)\b/i,
    /\b(taux|inflation|bourse|nasdaq|cac ?40|sp ?500)\b/i,
  ];
  return patterns.some((p) => p.test(t));
}

export function classifyContent(text) {
  const t = String(text || "").toLowerCase();
  if (!t.trim()) return { category: "none", blocked: false };

  const explicitSexual = [
    /\b(porn|porno|pornographie)\b/i,
    /\bsexe\b/i,
    /\b(nude|nudes|nudité)\b/i,
    /\b(rapport sexuel|faire l['’]amour)\b/i,
  ];

  const selfHarm = [
    /\b(suicide|me suicider|me tuer|me faire du mal)\b/i,
    /\b(automutilation|mutiler|scarification)\b/i,
  ];

  const hateOrViolence = [
    /\b(tuer|assassiner|faire exploser|bombe)\b/i,
    /\b(haine|exterminer)\b/i,
  ];

  if (explicitSexual.some((p) => p.test(t))) return { category: "explicit_sexual", blocked: true };
  if (selfHarm.some((p) => p.test(t))) return { category: "self_harm", blocked: false };
  if (hateOrViolence.some((p) => p.test(t))) return { category: "hate_violence", blocked: false };
  return { category: "none", blocked: false };
}

export function refusalMessageForCategory(category) {
  if (category === "explicit_sexual") {
    return "Je ne peux pas aider avec des demandes à caractère sexuel explicite. Si tu veux, décris plutôt ce que tu cherches de façon non-explicite (relation, émotions, limites, communication).";
  }
  if (category === "self_harm") {
    return "Je suis désolé, je ne peux pas aider sur l'automutilation ou le suicide. Si tu es en danger immédiat, appelle les urgences locales. Si tu peux, parle à une personne de confiance ou à un professionnel. Je peux t'aider à trouver des ressources dans ton pays.";
  }
  if (category === "hate_violence") {
    return "Je ne peux pas aider pour des demandes violentes ou haineuses. Si tu veux, je peux proposer des alternatives plus sûres (désescalade, sécurité, prévention).";
  }
  return "Je ne peux pas répondre à cette demande. Si tu veux, reformule avec plus de contexte.";
}

export function buildSystemPrompt(cfg) {
  const base =
    "Tu es un agent conversationnel type SMS. Réponses courtes, claires, naturelles. Pose des questions si nécessaire. Pas de blabla.";

  const personaTextByKey = {
    friend: "Tu joues le rôle d'un(e) ami(e) proche, chaleureux(se), naturel(le).",
    employer: "Tu joues le rôle d'un employeur/recruteur: professionnel, direct, bienveillant.",
    partner: "Tu joues le rôle d'un(e) partenaire: attentionné(e), complice, naturel(le).",
    customer_support: "Tu joues le rôle d'un support client: poli, efficace, orienté solution.",
    custom: "",
  };

  const genderTextByKey = {
    neutral: "",
    female: "Tu t'exprimes comme une femme.",
    male: "Tu t'exprimes comme un homme.",
  };

  const parts = [base];
  const p = personaTextByKey[cfg.persona];
  if (p) parts.push(p);
  const g = genderTextByKey[cfg.gender];
  if (g) parts.push(g);
  if (cfg.contactName) parts.push(`Ton nom affiché est: ${cfg.contactName}.`);
  if (cfg.context) parts.push(`Contexte/scénario: ${cfg.context}`);

  return parts.join("\n");
}

export async function callGrok(messages) {
  const apiKey = requireEnv("XAI_API_KEY");
  let baseUrl = process.env.XAI_BASE_URL || "https://api.x.ai";
  baseUrl = String(baseUrl).trim();
  baseUrl = baseUrl.replace(/\/+$/, "");
  baseUrl = baseUrl.replace(/\/(v1)(\/v1)+$/i, "/v1");
  if (!/\/v1$/i.test(baseUrl)) baseUrl = `${baseUrl}/v1`;

  const resp = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.XAI_MODEL || "grok-3-mini",
      messages,
      temperature: 0.7,
    }),
  });

  if (!resp.ok) {
    const errTxt = await resp.text();
    throw new Error(`Grok API error: ${resp.status} ${errTxt}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  return (typeof text === "string" ? text : "").trim() || "(réponse vide)";
}
