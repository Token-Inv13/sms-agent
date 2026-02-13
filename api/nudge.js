import {
  buildSystemPrompt,
  callGrok,
  enforceDailyQuotaOrThrow,
  getSupabaseServiceRole,
  json,
  readJsonBody,
  requireUser,
  sanitizeConfig,
} from "./_lib.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Méthode non autorisée" });

    const auth = await requireUser(req);
    if (auth.error) return json(res, 401, { error: auth.error });

    const { sb, user } = auth;

    const body = await readJsonBody(req);
    if (body === null) return json(res, 400, { error: "JSON invalide" });

    const conversationId = body?.conversationId && String(body.conversationId);
    if (!conversationId) return json(res, 400, { error: "conversationId requis" });

    const { error: convoErr } = await sb
      .from("conversations")
      .upsert({ id: conversationId, user_id: user.id }, { onConflict: "id" });

    if (convoErr) return json(res, 500, { error: convoErr.message });

    const { data: cfgRow, error: cfgErr } = await sb
      .from("configs")
      .select("contact_name, persona, gender, context, sources_enabled")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (cfgErr) return json(res, 500, { error: cfgErr.message });

    const cfg = cfgRow
      ? {
          contactName: cfgRow.contact_name,
          persona: cfgRow.persona,
          gender: cfgRow.gender,
          context: cfgRow.context,
          sourcesEnabled: Boolean(cfgRow.sources_enabled),
        }
      : sanitizeConfig(null);

    const { data: historyRows, error: histErr } = await sb
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(30);

    if (histErr) return json(res, 500, { error: histErr.message });

    const history = Array.isArray(historyRows) ? historyRows.slice(-20) : [];

    const system = { role: "system", content: buildSystemPrompt(cfg) };
    const nudgeInstruction = {
      role: "user",
      content:
        "Envoie un message spontané, court, naturel (style SMS), comme si tu relançais la conversation. " +
        "Pas de question longue, pas de paragraphe. 1 à 2 phrases max. " +
        "Si tu manques de contexte, fais une relance neutre et bienveillante.",
    };

    const messages = [system, ...history, nudgeInstruction];

    try {
      const adminSb = getSupabaseServiceRole();
      await enforceDailyQuotaOrThrow(adminSb, user.id, { dailyLimit: 20 });
    } catch (e) {
      if (e?.code === "PAYWALL") {
        return json(res, 402, {
          error: "Quota gratuit atteint (20 messages/jour).",
          code: "PAYWALL",
          dailyLimit: e.dailyLimit,
          used: e.used,
          remaining: e.remaining,
        });
      }
      throw e;
    }

    const assistantText = await callGrok(messages);

    const cleaned = (typeof assistantText === "string" ? assistantText : "").trim();
    if (!cleaned) return json(res, 200, { assistantMessage: "" });

    const { error: insertBotErr } = await sb.from("messages").insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: "assistant",
      content: cleaned,
    });

    if (insertBotErr) return json(res, 500, { error: insertBotErr.message });

    return json(res, 200, { assistantMessage: cleaned });
  } catch (e) {
    return json(res, 500, { error: String(e?.message || e) });
  }
}
